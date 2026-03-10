import { calculateDistanceKm, formatDistance } from "./distance";

/**
 * Reads opening hours from Google Places API (New) raw data.
 *
 * Google stores hours at:
 *   rawData.currentOpeningHours.weekdayDescriptions  (seasonal)
 *   rawData.regularOpeningHours.weekdayDescriptions   (year-round)
 *
 * Each entry looks like:
 *   "Måndag: 09:00–18:00"    (Swedish)
 *   "Monday: 9:00 AM – 5:00 PM"  (English fallback)
 *   "Tisdag: Stängt"
 *   "Wednesday: Closed"
 *   "Torsdag: Öppet dygnet runt"
 *   "Friday: Open 24 hours"
 */
export function getTodaysOpeningHours(
  rawData: any,
): { text: string; isOpenNow: boolean } | null {
  if (!rawData) return null;

  // ── 1. Find the weekday descriptions array ──────────────
  // Prefer currentOpeningHours (seasonal), fall back to regularOpeningHours
  const hoursSource =
    rawData.currentOpeningHours ?? rawData.regularOpeningHours;

  // Also support legacy flat format: rawData.openingHours
  const descriptions: string[] | null =
    hoursSource?.weekdayDescriptions ??
    (Array.isArray(rawData.openingHours) ? rawData.openingHours : null);

  if (!descriptions || descriptions.length === 0) return null;

  // ── 2. Get "open now" from Google (most reliable) ───────
  const googleOpenNow: boolean | null = hoursSource?.openNow ?? null;

  // ── 3. Find today's entry ───────────────────────────────
  // Google uses Monday=0 index in weekdayDescriptions
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
  const googleIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Tue=1, ..., Sun=6

  const todayString = descriptions[googleIndex];
  if (!todayString) return null;

  // ── 4. Extract the time portion ─────────────────────────
  // "Måndag: 09:00–18:00" → "09:00–18:00"
  // "Monday: 9:00 AM – 5:00 PM" → "9:00 AM – 5:00 PM"
  const colonIndex = todayString.indexOf(":");
  if (colonIndex === -1) return null;

  const hoursOnly = todayString.substring(colonIndex + 1).trim();
  const hoursLower = hoursOnly.toLowerCase();

  // ── 5. Handle special cases ─────────────────────────────
  if (
    hoursLower === "closed" ||
    hoursLower === "stängt" ||
    hoursLower === "geschlossen" ||
    hoursLower === "lukket"
  ) {
    return { text: "Stängt idag", isOpenNow: false };
  }

  if (
    hoursLower.includes("open 24 hours") ||
    hoursLower.includes("öppet dygnet runt") ||
    hoursLower.includes("24 stunden") ||
    hoursLower.includes("døgnåbent")
  ) {
    return { text: "Dygnet runt", isOpenNow: true };
  }

  // ── 6. Parse time range ─────────────────────────────────
  // Handle both 24h format "09:00–18:00" and 12h "9:00 AM – 5:00 PM"

  // Try 24h format first: "09:00–18:00" or "09:00 - 18:00"
  const match24 = hoursOnly.match(
    /(\d{1,2}):(\d{2})\s*[–\-—to]+\s*(\d{1,2}):(\d{2})/i,
  );

  if (match24) {
    const openH = parseInt(match24[1], 10);
    const openM = parseInt(match24[2], 10);
    const closeH = parseInt(match24[3], 10);
    const closeM = parseInt(match24[4], 10);

    const isOpenNow =
      googleOpenNow ?? calculateIsOpen(openH, openM, closeH, closeM);

    // Format display as "09:00 – 18:00"
    const displayText = `${pad(openH)}:${pad(openM)} – ${pad(closeH)}:${pad(closeM)}`;

    return { text: displayText, isOpenNow };
  }

  // Try 12h format: "9:00 AM – 5:00 PM"
  const match12 = hoursOnly.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-—to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );

  if (match12) {
    const openH = to24h(parseInt(match12[1], 10), match12[3]);
    const openM = parseInt(match12[2], 10);
    const closeH = to24h(parseInt(match12[4], 10), match12[6]);
    const closeM = parseInt(match12[5], 10);

    const isOpenNow =
      googleOpenNow ?? calculateIsOpen(openH, openM, closeH, closeM);

    const displayText = `${pad(openH)}:${pad(openM)} – ${pad(closeH)}:${pad(closeM)}`;

    return { text: displayText, isOpenNow };
  }

  // ── 7. Fallback: return raw text ────────────────────────
  return { text: hoursOnly, isOpenNow: googleOpenNow ?? false };
}

// ─── Helpers ──────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function to24h(hour: number, ampm: string): number {
  const isPM = ampm.toUpperCase() === "PM";
  if (hour === 12) return isPM ? 12 : 0;
  return isPM ? hour + 12 : hour;
}

function calculateIsOpen(
  openH: number,
  openM: number,
  closeH: number,
  closeM: number,
): boolean {
  const now = new Date();
  // Use Swedish timezone
  const svTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }),
  );
  const currentMinutes = svTime.getHours() * 60 + svTime.getMinutes();
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  // Handle past-midnight closing (e.g. 09:00–02:00)
  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60;
  }

  let adjustedCurrent = currentMinutes;
  if (currentMinutes < openMinutes && closeMinutes > 24 * 60) {
    adjustedCurrent += 24 * 60;
  }

  return adjustedCurrent >= openMinutes && adjustedCurrent < closeMinutes;
}

export function getFormattedDistance(
  campLat: number,
  campLng: number,
  placeLat: number | null,
  placeLng: number | null,
): string | null {
  if (!placeLat || !placeLng) return null;
  const distKm = calculateDistanceKm(campLat, campLng, placeLat, placeLng);
  return formatDistance(distKm);
}
