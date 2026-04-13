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
