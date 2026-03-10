/**
 * routing.ts
 * ─────────────────────────────────────────────────────────
 * Version 9.0 – OSRM with auto-batching.
 */

import { formatDistance, getDistanceKm } from "./distance";

const OSRM_BASE = "https://router.project-osrm.org";
const OSRM_BATCH_SIZE = 40;

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface BatchRouteResult {
  distance_km: number | null;
  duration_mins: number | null;
}

export type RoadDistanceMap = Record<string, string>;

export interface OSRMRoute {
  distanceMeters: number;
  durationSeconds: number;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number,
): Promise<Response> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`OSRM timeout after ${ms}ms`)), ms),
  );
  return Promise.race([fetch(url, options), timeout]);
}

async function osrmTableBatch(
  origin: Coordinate,
  batch: Coordinate[],
  profile: string,
): Promise<BatchRouteResult[]> {
  const coords = [origin, ...batch].map((c) => `${c.lon},${c.lat}`).join(";");
  const url = `${OSRM_BASE}/table/v1/${profile}/${coords}?sources=0&annotations=distance,duration`;

  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { Accept: "application/json" } },
      15_000,
    );
    if (!res.ok)
      return batch.map(() => ({ distance_km: null, duration_mins: null }));

    const data = await res.json();
    if (data.code !== "Ok" || !data.distances || !data.durations)
      return batch.map(() => ({ distance_km: null, duration_mins: null }));

    return batch.map((_, i) => ({
      distance_km:
        data.distances[0][i + 1] != null
          ? data.distances[0][i + 1] / 1000
          : null,
      duration_mins:
        data.durations[0][i + 1] != null
          ? Math.round(data.durations[0][i + 1] / 60)
          : null,
    }));
  } catch (err) {
    console.error("[OSRM batch] failed:", err);
    return batch.map(() => ({ distance_km: null, duration_mins: null }));
  }
}

export async function getOSRMTableMetrics(
  origin: Coordinate,
  destinations: Coordinate[],
  profile: "driving" | "walking" | "cycling" = "driving",
): Promise<BatchRouteResult[]> {
  if (destinations.length === 0) return [];

  const results: BatchRouteResult[] = [];
  for (let i = 0; i < destinations.length; i += OSRM_BATCH_SIZE) {
    const batch = destinations.slice(i, i + OSRM_BATCH_SIZE);
    const batchResults = await osrmTableBatch(origin, batch, profile);
    results.push(...batchResults);
    if (i + OSRM_BATCH_SIZE < destinations.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return results;
}

export async function buildRoadDistanceMap(
  campgroundLat: number,
  campgroundLon: number,
  places: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
  }>,
): Promise<RoadDistanceMap> {
  const routable = places.filter(
    (p) => p.latitude !== null && p.longitude !== null,
  );
  if (routable.length === 0) return {};

  const origin = { lat: campgroundLat, lon: campgroundLon };
  const destinations = routable.map((p) => ({
    lat: p.latitude!,
    lon: p.longitude!,
  }));

  const metrics = await getOSRMTableMetrics(origin, destinations);
  const result: RoadDistanceMap = {};

  routable.forEach((place, idx) => {
    const km = metrics[idx].distance_km;
    if (km != null) {
      result[place.id] = formatDistance(km);
    } else {
      result[place.id] = formatDistance(
        getDistanceKm(
          origin.lat,
          origin.lon,
          place.latitude!,
          place.longitude!,
        ),
      );
    }
  });
  return result;
}

export function filterByRoadDistance<
  T extends { id: string; latitude: number | null; longitude: number | null },
>(
  places: T[],
  campgroundLat: number,
  campgroundLon: number,
  distanceMap: RoadDistanceMap,
  maxKm = 50,
): T[] {
  return places.filter((p) => {
    if (p.latitude === null || p.longitude === null) return false;
    const km = parseFormattedDistanceKm(distanceMap[p.id] ?? "");
    if (km !== null) return km <= maxKm;
    return (
      getDistanceKm(campgroundLat, campgroundLon, p.latitude, p.longitude) <=
      maxKm
    );
  });
}

export function parseFormattedDistanceKm(formatted: string): number | null {
  const km = formatted.match(/^([\d.]+)\s*km$/);
  if (km) return parseFloat(km[1]);
  const m = formatted.match(/^(\d+)\s*m$/);
  if (m) return parseInt(m[1]) / 1000;
  return null;
}

export function buildDirectionsUrl(toLat: number, toLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${toLat},${toLon}`;
}

export async function getOSRMRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  profile: "driving" | "walking" | "cycling" = "driving",
): Promise<OSRMRoute | null> {
  const url = `${OSRM_BASE}/route/v1/${profile}/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
  try {
    const res = await fetchWithTimeout(
      url,
      { next: { revalidate: 3600 } } as RequestInit,
      5000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    return {
      distanceMeters: data.routes[0].distance,
      durationSeconds: data.routes[0].duration,
    };
  } catch (err) {
    console.error("[OSRM] single route failed:", err);
    return null;
  }
}
