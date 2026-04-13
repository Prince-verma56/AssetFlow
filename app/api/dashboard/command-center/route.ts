import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { fetchAgmarknetRecords, seasonalFallbackRecords, sortAgmarknetByDate, type AgmarknetRecord } from "@/lib/agmarknet";
import { ANCHOR_DATE_ISO, ANCHOR_DATE_LABEL } from "@/lib/time-anchor";

type OracleResponse = {
  fairPrice: number;
  confidence: number;
  recommendation: "sell_now" | "wait" | "negotiate";
  reasoning: string;
  forecast14: number[];
  mandiDate?: string | null;
  mandiModalPrice?: number;
};

const DEFAULT_CONTEXT = {
  commodity: "Wheat",
  state: "Rajasthan",
  city: "Jaipur",
  quantity: 120,
  unit: "quintal",
};

function toInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeQueryKey(commodity: string, state: string, city: string) {
  return `${commodity.trim().toLowerCase()}::${state.trim().toLowerCase()}::${city.trim().toLowerCase()}`;
}

function parseQuantityToNumber(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = {
    commodity: url.searchParams.get("commodity")?.trim() || DEFAULT_CONTEXT.commodity,
    state: url.searchParams.get("state")?.trim() || DEFAULT_CONTEXT.state,
    city: url.searchParams.get("city")?.trim() || DEFAULT_CONTEXT.city,
    quantity: Number(url.searchParams.get("quantity") || DEFAULT_CONTEXT.quantity),
    unit: url.searchParams.get("unit")?.trim() || DEFAULT_CONTEXT.unit,
  };

  if (!Number.isFinite(context.quantity) || context.quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing." }, { status: 500 });
  }

  console.log(`[Dashboard] Fetching Agmarknet for ${context.commodity} in ${context.city}, ${context.state}`);
  let records: AgmarknetRecord[] = await fetchAgmarknetRecords({
    commodity: context.commodity,
    state: context.state,
    market: context.city,
  }).catch((err) => {
    console.error("[Dashboard] Agmarknet fetch failed:", err);
    return [];
  });

  const marketSource = records.length > 0 ? "live" : "fallback";
  console.log(`[Dashboard] Market Source: ${marketSource}`);
  
  if (records.length === 0) {
    records = seasonalFallbackRecords({
      commodity: context.commodity,
      state: context.state,
      market: context.city,
    });
  }

  const snapshot = records[0];
  const modalPrice = snapshot.modalPrice;

  const convex = new ConvexHttpClient(convexUrl);
  
  let token: string | null = null;
  try {
    const { getToken } = await auth();
    token = await getToken({ template: "convex" });
    if (token) {
      convex.setAuth(token);
    }
  } catch (e) {
    console.warn("[Dashboard] Clerk convex JWT template missing, skipping authenticated mutations.");
  }

  let oracle: OracleResponse;
  try {
    oracle = await convex.action(api.actions.priceOracle.runPriceOracle, {
      commodity: context.commodity,
      state: context.state,
      city: context.city,
      quantity: context.quantity,
      unit: context.unit,
    });
  } catch {
    const fallbackFairPrice = Math.round(modalPrice * 1.05);
    oracle = {
      fairPrice: fallbackFairPrice,
      confidence: 50,
      recommendation: "negotiate",
      reasoning: "Oracle unavailable. Using seasonal April 2026 estimate.",
      forecast14: Array.from({ length: 14 }, (_, index) => fallbackFairPrice + Math.round(Math.sin(index / 2) * 35)),
      mandiDate: snapshot.date,
      mandiModalPrice: modalPrice,
    };
  }

  const revenue = await convex.query(api.analytics.aprilRevenueMtd, {}).catch(() => ({ totalRevenue: 0 }));

  const buyerPricePerKg = oracle.fairPrice / 100;
  const queryKey = makeQueryKey(context.commodity, context.state, context.city);

  await convex
    .mutation(api.marketSync.syncMarketRun, {
      queryKey,
      anchorDate: ANCHOR_DATE_ISO,
      commodity: context.commodity,
      state: context.state,
      city: context.city,
      quantity: context.quantity,
      unit: context.unit,
      mandiDate: oracle.mandiDate ?? snapshot.date,
      snapshots: records.map((record) => ({
        date: record.date,
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        modalPrice: record.modalPrice,
        isHistorical: record.isHistorical,
      })),
      oracle: {
        fairPrice: oracle.fairPrice,
        buyerPricePerKg,
        confidence: oracle.confidence,
        recommendation: oracle.recommendation,
        reasoning: oracle.reasoning,
        forecast14: oracle.forecast14,
      },
    })
    .catch(() => null);

  if (token) {
    await convex
      .mutation(api.listings.updateFarmerOracleData, {
        cropName: context.commodity,
        oraclePrice: oracle.fairPrice,
        mandiModalPrice: modalPrice,
        oracleRecommendation: oracle.recommendation,
        oracleConfidence: oracle.confidence,
      })
      .catch(() => null);
  }

  const listings = await convex.query(api.listings.listAvailable, {
    cropName: context.commodity,
    limit: 40,
  });

  const firstListing = listings[0];
  const listingOraclePrice = firstListing?.oraclePrice ?? oracle.fairPrice;
  const listingMandiPrice = firstListing?.mandiModalPrice ?? modalPrice;
  const listingQuantity = parseQuantityToNumber(firstListing?.quantity, context.quantity);
  const listingRecommendation =
    firstListing?.oracleRecommendation ?? oracle.recommendation;

  const potentialProfit = (listingOraclePrice - listingMandiPrice) * listingQuantity;


  const historicalData = sortAgmarknetByDate(records)
    .filter((record) => record.date <= ANCHOR_DATE_ISO)
    .map((record) => ({
      date: record.date,
      historicalPrice: record.modalPrice,
      forecastPrice: undefined as number | undefined,
    }));

  const forecastData = oracle.forecast14.map((value, index) => ({
    date: addDays(ANCHOR_DATE_ISO, index + 1),
    historicalPrice: undefined as number | undefined,
    forecastPrice: Math.round(value),
  }));

  return NextResponse.json({
    anchorDateIso: ANCHOR_DATE_ISO,
    anchorDateLabel: ANCHOR_DATE_LABEL,
    processingLabel: "Processing Rental Data...",
    context,
    marketSource,
    stats: [
      {
        id: "live-market-pulse",
        title: "Market Rental Rate",
        value: `₹${toInr(listingMandiPrice)}/quintal`,
        delta: snapshot.isHistorical ? "Historical" : "Live",
        trend: snapshot.isHistorical ? "neutral" : "up",
        subtitle: "Regional market rate",
        asOfLabel: `As of ${ANCHOR_DATE_LABEL}`,
        livePulse: !snapshot.isHistorical,
        icon: "Activity",
      },
      {
        id: "ai-fair-price",
        title: "Recommended Rental Rate",
        value: `₹${toInr(listingOraclePrice)}/quintal`,
        delta: `${(firstListing?.oracleConfidence ?? oracle.confidence).toFixed(0)}% confidence`,
        trend: listingRecommendation === "wait" ? "down" : "up",
        subtitle: "Current advisor guidance",
        icon: "Sparkles",
      },
      {
        id: "middleman-savings",
        title: "Expected Rental Value",
        value: `₹${toInr(Math.max(potentialProfit, 0))}`,
        delta: `${listingQuantity} quintal`,
        trend: potentialProfit >= 0 ? "up" : "down",
        subtitle: "(Advisor - market) x quantity",
        icon: "Wallet",
      },
      {
        id: "revenue-april",
        title: "Rental Revenue",
        value: `₹${toInr(Number(revenue.totalRevenue ?? 0))}`,
        delta: "Apr 1 - Apr 7",
        trend: "up",
        subtitle: "April 2026 earnings",
        icon: "CreditCard",
      },
    ],
    chartData: [...historicalData, ...forecastData],
    tableRows: listings.slice(0, 20).map((listing, index) => {
      const qty = parseQuantityToNumber(listing.quantity, context.quantity);
      const mandi = listing.mandiModalPrice ?? listingMandiPrice;
      const fair = listing.oraclePrice ?? listingOraclePrice;
      const rec = listing.oracleRecommendation ?? oracle.recommendation;
      const advice = rec === "sell_now" ? "Sell Now" : rec === "wait" ? "Wait" : "Negotiate";

      return {
        listingId: `LST-${index + 1}`,
        id: listing._id,
        crop: listing.cropName,
        location: listing.location,
        quantity: `${qty} ${context.unit}`,
        mandiPrice: `₹${toInr(mandi)}/quintal`,
        fairPrice: `₹${toInr(fair)}/quintal`,
        buyerPrice: `₹${(fair / 100).toFixed(2)}/kg`,
        harvestDate: addDays(ANCHOR_DATE_ISO, 4 + (index % 8)),
        oracleAdvice: advice,
        rawMandiPrice: mandi,
        rawFairPrice: fair,
        rawQuantity: qty,
      };
    }),
    oracle: {
      fairPrice: oracle.fairPrice,
      confidence: oracle.confidence,
      recommendation: oracle.recommendation,
      reasoning: oracle.reasoning,
    },
  });
}
