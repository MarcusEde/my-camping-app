/**
 * Calculates the straight-line distance between two GPS coordinates.
 * Uses the Haversine formula (works on Earth's curved surface).
 *
 * Python equivalent:
 *   from math import radians, sin, cos, sqrt, atan2
 *   def haversine(lat1, lon1, lat2, lon2): ...
 *
 * Returns distance in KILOMETERS.
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
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

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * The travel time interface.
 * Each mode has a label, an emoji, and the estimated minutes.
 */
export interface TravelTimes {
  walk: { emoji: string; minutes: number; label: string } | null;
  bike: { emoji: string; minutes: number; label: string } | null;
  car: { emoji: string; minutes: number; label: string } | null;
}

/**
 * Calculates estimated travel times for walking, biking, and driving.
 *
 * Smart display rules:
 *   - Walking:  only show if under 45 min (nobody walks 3 hours)
 *   - Biking:   only show if under 30 min (reasonable bike ride)
 *   - Driving:  only show if over 10 min walk (no point driving 2 min)
 */
export function getTravelTimes(distanceKm: number): TravelTimes {
  const walkMin = Math.round((distanceKm / 5) * 60); // 5 km/h
  const bikeMin = Math.round((distanceKm / 15) * 60); // 15 km/h
  const carMin = Math.round((distanceKm / 40) * 60); // 40 km/h

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
// Räknar ut avståndet mellan två GPS-koordinater i km fågelvägen (Haversine formeln)
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Jordens radie i km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Formaterar för gästen: "350 m" eller "2.4 km"
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}