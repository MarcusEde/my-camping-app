/**
 * distance.ts
 * ─────────────────────────────────────────────────────────
 * GPS distance utilities.
 * REFACTOR NOTE: Previously had two identical Haversine implementations
 * (getDistanceKm + calculateDistanceKm). Consolidated to one canonical export.
 */

/**
 * Straight-line distance between two GPS coordinates via Haversine formula.
 * Used as fallback when OSRM is unavailable.
 * Returns distance in KILOMETERS.
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** @deprecated — use getDistanceKm. Kept for backwards compat during migration. */
export const calculateDistanceKm = getDistanceKm;

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Guest-facing: "350 m" or "2.4 km" */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Convenience: compute + format in one call.
 * Returns null if either coordinate is null/undefined.
 */
export function getFormattedDistance(
  fromLat: number,
  fromLon: number,
  toLat: number | null | undefined,
  toLon: number | null | undefined,
): string {
  if (toLat == null || toLon == null) return "";
  return formatDistance(getDistanceKm(fromLat, fromLon, toLat, toLon));
}

// ─── Travel Time estimates (Haversine fallback) ───────────────────────────

export interface TravelMode {
  emoji: string;
  minutes: number;
  label: string;
}

export interface TravelTimes {
  walk: TravelMode | null;
  bike: TravelMode | null;
  car: TravelMode | null;
}

/**
 * Haversine-based travel time estimates.
 * Use routing.ts#getOSRMTravelTimes for real road distances.
 *
 * Display rules:
 *   Walk  → only if ≤ 45 min
 *   Bike  → only if ≤ 30 min
 *   Drive → only if walk > 10 min (pointless to drive 2 minutes)
 */
export function getTravelTimes(distanceKm: number): TravelTimes {
  const walkMin = Math.round((distanceKm / 5) * 60);
  const bikeMin = Math.round((distanceKm / 15) * 60);
  const carMin = Math.round((distanceKm / 40) * 60);

  return {
    walk:
      walkMin <= 45
        ? { emoji: "🚶", minutes: walkMin, label: `${walkMin} min walk` }
        : null,
    bike:
      bikeMin <= 30
        ? { emoji: "🚲", minutes: bikeMin, label: `${bikeMin} min bike` }
        : null,
    car:
      walkMin > 10
        ? { emoji: "🚗", minutes: carMin, label: `${carMin} min drive` }
        : null,
  };
}
