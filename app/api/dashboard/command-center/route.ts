import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { ANCHOR_DATE_ISO, ANCHOR_DATE_LABEL } from "@/lib/time-anchor";

const DEFAULT_CONTEXT = {
  categoryId: "farming",
  state: "Rajasthan",
  city: "Jaipur",
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

function parseQuantityToNumber(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type DashboardListing = {
  _id: string;
  _creationTime?: number;
  title?: string;
  assetCategory?: string;
  quantity?: string;
  pricePerDay?: number;
  location: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = {
    categoryId: url.searchParams.get("categoryId")?.trim() || DEFAULT_CONTEXT.categoryId,
    state: url.searchParams.get("state")?.trim() || DEFAULT_CONTEXT.state,
    city: url.searchParams.get("city")?.trim() || DEFAULT_CONTEXT.city,
  };

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing." }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const location = `${context.city}, ${context.state}`;

  const listings = await convex
    .query(api.listings.listAvailable, {
      categoryId: context.categoryId,
      location,
      limit: 40,
    })
    .catch(() => [] as DashboardListing[]);

  const avgPricePerDay =
    listings.length > 0
      ? Math.round(listings.reduce((sum, listing) => sum + (listing.pricePerDay ?? 0), 0) / listings.length)
      : 0;

  const chartData = Array.from({ length: 30 }, (_, index) => {
    const dayOffset = index - 14;
    const date = addDays(ANCHOR_DATE_ISO, dayOffset);
    if (dayOffset <= 0) {
      return { date, historicalPrice: avgPricePerDay, forecastPrice: undefined as number | undefined };
    }
    const drift = Math.round(Math.sin(index / 3) * Math.max(10, avgPricePerDay * 0.03));
    return { date, historicalPrice: undefined as number | undefined, forecastPrice: Math.max(0, avgPricePerDay + drift) };
  });

  const prices = listings.map((l) => Number(l.pricePerDay ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return NextResponse.json({
    anchorDateIso: ANCHOR_DATE_ISO,
    anchorDateLabel: ANCHOR_DATE_LABEL,
    processingLabel: "Processing Rental Data...",
    context,
    stats: [
      {
        id: "active-listings",
        title: "Active Listings",
        value: `${listings.length}`,
        delta: "Live",
        trend: "up",
        subtitle: location,
        asOfLabel: `As of ${ANCHOR_DATE_LABEL}`,
        livePulse: true,
        icon: "Package",
      },
      {
        id: "avg-rate",
        title: "Avg Daily Rate",
        value: avgPricePerDay > 0 ? `₹${toInr(avgPricePerDay)}/day` : "—",
        delta: "Local snapshot",
        trend: "neutral",
        subtitle: "Based on filtered listings",
        icon: "Wallet",
      },
      {
        id: "price-band",
        title: "Price Band",
        value: prices.length ? `₹${toInr(minPrice)} - ₹${toInr(maxPrice)}` : "—",
        delta: "Per day",
        trend: "neutral",
        subtitle: "Low to high",
        icon: "Activity",
      },
      {
        id: "coverage",
        title: "Coverage",
        value: location,
        delta: "Region filter",
        trend: "neutral",
        subtitle: "City/Region + State",
        icon: "MapPin",
      },
    ],
    chartData,
    tableRows: listings.slice(0, 20).map((listing, index: number) => {
      const qty = parseQuantityToNumber(listing.quantity, 1);
      const listingPricePerDay = typeof listing.pricePerDay === "number" ? listing.pricePerDay : 0;
      const createdAtIso =
        typeof listing._creationTime === "number"
          ? new Date(listing._creationTime).toISOString().slice(0, 10)
          : ANCHOR_DATE_ISO;
      const advice = avgPricePerDay > 0 && listingPricePerDay > 0 && listingPricePerDay <= avgPricePerDay ? "Good Deal" : "Premium";

      return {
        listingId: `EQ-${index + 1}`,
        id: listing._id,
        equipment: listing.title ?? listing.assetCategory,
        location: listing.location,
        quantity: `${qty} units`,
        mandiPrice: avgPricePerDay > 0 ? `₹${toInr(avgPricePerDay)}/day` : "—",
        fairPrice: avgPricePerDay > 0 ? `₹${toInr(avgPricePerDay)}/day` : "—",
        buyerPrice: listingPricePerDay > 0 ? `₹${toInr(listingPricePerDay)}/day` : "—",
        availableFrom: createdAtIso,
        oracleAdvice: advice,
        rawMandiPrice: avgPricePerDay,
        rawFairPrice: avgPricePerDay,
        rawQuantity: qty,
      };
    }),
  });
}

