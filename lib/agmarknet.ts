import { ANCHOR_DATE, APRIL_2026_START, parseAgmarknetDate } from "./time-anchor";

type AgmarknetRawRecord = {
  Date?: string;
  Commodity?: string;
  State?: string;
  District?: string;
  Market?: string;
  "Min Prize"?: string;
  "Max Prize"?: string;
  "Model Prize"?: string;
};

export type AgmarknetRecord = {
  date: string;
  commodity: string;
  state: string;
  district: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  isHistorical: boolean;
  source: "live" | "fallback";
};

export const MANDI_STATE_OPTIONS = [
  "Rajasthan",
  "Punjab",
  "Haryana",
  "Uttar Pradesh",
  "Madhya Pradesh",
] as const;

export const MANDI_MARKET_OPTIONS: Record<string, string[]> = {
  Rajasthan: ["Jaipur", "Kota", "Alwar", "Bikaner"],
  Punjab: ["Ludhiana", "Amritsar", "Patiala", "Moga"],
  Haryana: ["Karnal", "Hisar", "Sirsa", "Rohtak"],
  "Uttar Pradesh": ["Kanpur", "Lucknow", "Varanasi", "Agra"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Ujjain", "Gwalior"],
};

export const MANDI_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Rajasthan
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Kota: { lat: 25.1815, lng: 75.8323 },
  Alwar: { lat: 27.5609, lng: 76.6250 },
  Bikaner: { lat: 28.0229, lng: 73.3119 },
  // Punjab
  Ludhiana: { lat: 30.9010, lng: 75.8573 },
  Amritsar: { lat: 31.6340, lng: 74.8723 },
  Patiala: { lat: 30.3398, lng: 76.3869 },
  Moga: { lat: 30.8175, lng: 75.1729 },
  // Haryana
  Karnal: { lat: 29.6857, lng: 76.9905 },
  Hisar: { lat: 29.1492, lng: 75.7217 },
  Sirsa: { lat: 29.5312, lng: 75.0298 },
  Rohtak: { lat: 28.8955, lng: 76.5892 },
  // UP
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  // MP
  Indore: { lat: 22.7196, lng: 75.8577 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Ujjain: { lat: 23.1793, lng: 75.7849 },
  Gwalior: { lat: 26.2124, lng: 78.1772 },
};

function parsePrice(value: string | undefined) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortAgmarknetByDate(records: AgmarknetRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function fetchAgmarknetRecords(params: {
  commodity: string;
  state: string;
  market: string;
}) {
  const query = new URLSearchParams({
    commodity: params.commodity,
    state: params.state,
    market: params.market,
  });

  try {
    const response = await fetch(`http://127.0.0.1:5000/request?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[Agmarknet] Request failed for ${params.market}: ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as AgmarknetRawRecord[];
    if (!Array.isArray(payload)) return [];
    
    return payload
      .map((record) => {
        const parsedDate = parseAgmarknetDate(record.Date ?? "");
        const isoDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : ANCHOR_DATE.toISOString().slice(0, 10);

        return {
          date: isoDate,
          commodity: record.Commodity ?? params.commodity,
          state: record.State ?? params.state,
          district: record.District ?? "",
          market: record.Market ?? params.market,
          minPrice: parsePrice(record["Min Prize"]),
          maxPrice: parsePrice(record["Max Prize"]),
          modalPrice: parsePrice(record["Model Prize"]),
          isHistorical: parsedDate ? parsedDate < APRIL_2026_START : true,
          source: "live",
        } satisfies AgmarknetRecord;
      })
      .filter((record) => record.modalPrice > 0);
  } catch (error) {
    console.error(`[Agmarknet] Connection refused on 127.0.0.1:5000. Ensure scraper is running.`);
    return [];
  }
}

export function seasonalFallbackRecords(params: { commodity: string; state: string; market: string }) {
  const seed = params.commodity.length + params.market.length;
  const baseline =
    params.commodity.toLowerCase().includes("wheat")
      ? 2800
      : params.commodity.toLowerCase().includes("mustard")
        ? 6100
        : 3200;

  // Add some pseudo-randomness based on the commodity/market so it's not identical for everything
  const variance = (seed % 10) * 10; 

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date("2026-03-24T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      commodity: params.commodity,
      state: params.state,
      district: params.market,
      market: params.market,
      minPrice: baseline - 120 + variance,
      maxPrice: baseline + 180 + variance,
      modalPrice: baseline + variance + Math.round(Math.sin(index / 2) * 55),
      isHistorical: true,
      source: "fallback" as const,
    } satisfies AgmarknetRecord;
  });
}

export async function fetchAgmarknetSnapshot(params: {
  commodity: string;
  state: string;
  market: string;
}) {
  const records = await fetchAgmarknetRecords(params);
  // API contract: first record in response is the primary snapshot.
  return records[0] ?? null;
}
