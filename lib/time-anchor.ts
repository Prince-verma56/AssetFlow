export const ANCHOR_DATE_ISO = "2026-04-07";
export const ANCHOR_DATE_LABEL = "April 7, 2026";
export const ANCHOR_MONTH_LABEL = "April";
export const ANCHOR_SEASON_CONTEXT = "Peak Rabi Harvest";

export const ANCHOR_DATE = new Date(`${ANCHOR_DATE_ISO}T00:00:00.000Z`);
export const APRIL_2026_START = new Date("2026-04-01T00:00:00.000Z");

export function parseAgmarknetDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [dd, mm, yyyy] = normalized.split("/");
    const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDateShort(dateIso: string) {
  return new Date(`${dateIso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}
