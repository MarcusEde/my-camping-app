// src/lib/place-utils.ts

import type { UtforskaLabels } from "@/lib/translations";
import { calculateDistanceKm, formatDistance } from "./distance";

// ─── Types ────────────────────────────────────────────────

export interface HoursDisplay {
  text: string;
  dotColor: string;
  statusText: string;
}

export interface MapLinkResult {
  canNavigate: boolean;
  mapLink: string;
}

// ─── Opening Hours (Google Places API) ────────────────────
//
// Google stores hours at:
//   rawData.currentOpeningHours.weekdayDescriptions  (seasonal)
//   rawData.regularOpeningHours.weekdayDescriptions   (year-round)
//
// Each entry looks like:
//   "Måndag: 09:00–18:00"    (Swedish)
//   "Monday: 9:00 AM – 5:00 PM"  (English fallback)
//   "Tisdag: Stängt"
//   "Wednesday: Closed"
//   "Torsdag: Öppet dygnet runt"
//   "Friday: Open 24 hours"
//
// IMPORTANT: Google's `openNow` field is cached from fetch time
// and may be hours or days stale. We ALWAYS calculate live from
// parsed hours. `openNow` is only used as a last resort when
// the hours text is unparseable.

export function getTodaysOpeningHours(
  rawData: any,
): { text: string; isOpenNow: boolean } | null {
  if (!rawData) return null;

  const hoursSource =
    rawData.currentOpeningHours ?? rawData.regularOpeningHours;

  const descriptions: string[] | null =
    hoursSource?.weekdayDescriptions ??
    (Array.isArray(rawData.openingHours) ? rawData.openingHours : null);

  if (!descriptions || descriptions.length === 0) return null;

  const googleOpenNow: boolean | null = hoursSource?.openNow ?? null;

  const jsDay = new Date().getDay();
  const googleIndex = jsDay === 0 ? 6 : jsDay - 1;

  const todayString = descriptions[googleIndex];
  if (!todayString) return null;

  const colonIndex = todayString.indexOf(":");
  if (colonIndex === -1) return null;

  const hoursOnly = todayString.substring(colonIndex + 1).trim();
  const hoursLower = hoursOnly.toLowerCase();

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

  const match24 = hoursOnly.match(
    /(\d{1,2}):(\d{2})\s*[–\-—to]+\s*(\d{1,2}):(\d{2})/i,
  );

  if (match24) {
    const openH = parseInt(match24[1], 10);
    const openM = parseInt(match24[2], 10);
    const closeH = parseInt(match24[3], 10);
    const closeM = parseInt(match24[4], 10);
    const isOpenNow = calculateIsOpen(openH, openM, closeH, closeM);
    const displayText = `${pad(openH)}:${pad(openM)} – ${pad(closeH)}:${pad(closeM)}`;
    return { text: displayText, isOpenNow };
  }

  const match12 = hoursOnly.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-—to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );

  if (match12) {
    const openH = to24h(parseInt(match12[1], 10), match12[3]);
    const openM = parseInt(match12[2], 10);
    const closeH = to24h(parseInt(match12[4], 10), match12[6]);
    const closeM = parseInt(match12[5], 10);
    const isOpenNow = calculateIsOpen(openH, openM, closeH, closeM);
    const displayText = `${pad(openH)}:${pad(openM)} – ${pad(closeH)}:${pad(closeM)}`;
    return { text: displayText, isOpenNow };
  }

  return { text: hoursOnly, isOpenNow: googleOpenNow ?? false };
}

// ─── Opening Hours Display (UI-ready) ─────────────────────

export function getOpeningHoursDisplay(
  rawData: Record<string, unknown> | null | undefined,
  labels: UtforskaLabels,
): HoursDisplay | null {
  const hoursData = getTodaysOpeningHours(rawData);
  if (!hoursData) return null;

  const hoursLower = hoursData.text.toLowerCase();
  const isClosed =
    hoursLower.includes("stängt") || hoursLower.includes("closed");
  const is24h = hoursLower.includes("dygnet") || hoursLower.includes("24");

  if (isClosed) {
    return {
      text: labels.closedToday,
      dotColor: "bg-red-400",
      statusText: labels.closedToday,
    };
  }
  if (is24h) {
    return {
      text: labels.open24,
      dotColor: "bg-emerald-500",
      statusText: labels.open24,
    };
  }
  if (hoursData.isOpenNow) {
    return {
      text: hoursData.text,
      dotColor: "bg-emerald-500",
      statusText: labels.openNow,
    };
  }
  return {
    text: hoursData.text,
    dotColor: "bg-stone-300",
    statusText: labels.closedNow,
  };
}

// ─── Distance ─────────────────────────────────────────────

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

// ─── Map Link ─────────────────────────────────────────────

export function getMapLink(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  address: string | null | undefined,
): MapLinkResult {
  const hasCoordinates = Boolean(latitude && longitude);
  const hasAddress = Boolean(address);

  if (hasCoordinates) {
    return {
      canNavigate: true,
      mapLink: `https://maps.google.com/?q=${latitude},${longitude}`,
    };
  }
  if (hasAddress) {
    return {
      canNavigate: true,
      mapLink: `https://maps.google.com/?q=${encodeURIComponent(address!)}`,
    };
  }
  return { canNavigate: false, mapLink: "" };
}

// ─── Private Helpers ──────────────────────────────────────

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
  const svTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }),
  );
  const currentMinutes = svTime.getHours() * 60 + svTime.getMinutes();
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60;
  }

  let adjustedCurrent = currentMinutes;
  if (currentMinutes < openMinutes && closeMinutes > 24 * 60) {
    adjustedCurrent += 24 * 60;
  }

  return adjustedCurrent >= openMinutes && adjustedCurrent < closeMinutes;
}
// src/lib/place-utils.ts — append before private helpers

// ─── Search Map Link (for planner) ───────────────────────

export function buildSearchMapLink(
  lat?: number | null,
  lng?: number | null,
  name?: string,
): string | null {
  if (lat && lng)
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (name)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  return null;
}
// src/lib/place-utils.ts — append with other map link functions

// ─── Directions Map Link (for Info tab) ───────────────────

export function buildDirectionsMapLink(
  lat?: number | null,
  lng?: number | null,
  name?: string,
): string | null {
  if (lat && lng)
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (name)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  return null;
}
