import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fetchAgmarknetRecords, seasonalFallbackRecords, type AgmarknetRecord } from "@/lib/agmarknet";
import { ANCHOR_DATE_ISO, ANCHOR_DATE_LABEL } from "@/lib/time-anchor";

function toInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function makeQueryKey(commodity: string, state: string, city: string) {
  return `${commodity.trim().toLowerCase()}::${state.trim().toLowerCase()}::${city.trim().toLowerCase()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const commodity = url.searchParams.get("commodity")?.trim() || "All";
  const state = url.searchParams.get("state")?.trim() || "All";
  const city = url.searchParams.get("city")?.trim() || "All";

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing." }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const queryKey = makeQueryKey(commodity, state, city);

  const listings = await convex.query(api.listings.listAvailable, { 
    cropName: commodity, 
    location: `${city}, ${state}`, // Passing composite string for filter index
    limit: 24 
  });

  let reasoning = "Global Discovery Mode: Showing fresh verified listings across all markets.";
  let modalPricePerQuintal = 0;
  let modalPricePerKg = 0;
  let marketSource = "global";

  // Core Market Oracle logic ONLY executes if a specific crop is targeted
  if (commodity !== "All") {
    let records: AgmarknetRecord[] = await fetchAgmarknetRecords({ commodity, state, market: city }).catch(() => []);
    marketSource = records.length > 0 ? "live" : "fallback";
    if (records.length === 0) {
      records = seasonalFallbackRecords({ 
        commodity, 
        state: state === "All" ? "Rajasthan" : state, 
        market: city === "All" ? "Jaipur" : city 
      });
    }

    const snapshot = records[0];
    modalPricePerQuintal = snapshot.modalPrice;
    modalPricePerKg = modalPricePerQuintal / 100;

    let localReasoning = "Peak harvest season supports quality and supply stability.";
    const latestOracle = await convex.query(api.marketSync.latestOracleByQuery, { queryKey }).catch(() => null);
    if (latestOracle?.reasoning) {
      localReasoning = latestOracle.reasoning;
    } else {
      const oracle = await convex
        .action(api.actions.priceOracle.runPriceOracle, {
          commodity,
          state: state === "All" ? "Rajasthan" : state, 
          city: city === "All" ? "Jaipur" : city,
          quantity: 100,
          unit: "quintal",
        })
        .catch(() => null);
      if (oracle?.reasoning) localReasoning = oracle.reasoning;
    }
    reasoning = localReasoning;
  }

  const products = listings.map((listing) => {
    const buyerPricePerKg = listing.pricePerKg;
    let belowPercent = 0;
    
    // Calculate precise discount only if a local tracking price exists
    if (modalPricePerKg > 0) {
       belowPercent = Math.max(0, ((modalPricePerKg - buyerPricePerKg) / modalPricePerKg) * 100);
    }

    return {
      id: String(listing._id),
      crop: listing.cropName,
      location: listing.location,
      farmerName: listing.farmerName,
      farmerImage: listing.farmerImage,
      quantity: listing.quantity,
      buyerPricePerKg,
      localMandiPricePerKg: modalPricePerKg,
      trustGaugeText: modalPricePerKg > 0 
        ? `₹${buyerPricePerKg.toFixed(2)}/kg - ${belowPercent.toFixed(1)}% below Mandi`
        : `Verified Farmgate - ₹${buyerPricePerKg.toFixed(2)}/kg`,
      insight: reasoning.split(".")[0]?.trim() || reasoning,
      mandiModalPrice: modalPricePerQuintal > 0 ? `₹${toInr(modalPricePerQuintal)}/quintal` : "Market Data Unlinked",
    };
  });

  return NextResponse.json({
    anchorDateIso: ANCHOR_DATE_ISO,
    anchorDateLabel: ANCHOR_DATE_LABEL,
    commodity,
    state,
    city,
    marketSource,
    modalPricePerQuintal,
    products,
  });
}
