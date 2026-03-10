/**
 * google-places.ts
 * ─────────────────────────────────────────────────────────
 * Version 11.0 – Opening hours support + road distance sync.
 *
 * Key changes from v10:
 *   • syncRoadDistances()            – batch-sync all places for a campground
 *   • syncSinglePlaceRoadDistance()   – sync one place (used when adding)
 */

import type { Database } from "@/types/database";
import { PlaceCategory } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOSRMTableMetrics, type Coordinate } from "./routing";

interface GooglePlacesResponse {
  places?: any[];
}
export interface GooglePlaceResult {
  google_place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  category: PlaceCategory;
  is_indoor: boolean;
  latitude: number;
  longitude: number;
  raw_data: any;
}

// ── CRITICAL: must include opening hours fields ──────────
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.types",
  "places.location",
  "places.currentOpeningHours",
  "places.regularOpeningHours",
].join(",");

const TYPE_MAP: Record<string, { cat: PlaceCategory; indoor: boolean }> = {
  restaurant: { cat: "restaurant", indoor: true },
  fast_food_restaurant: { cat: "restaurant", indoor: true },
  pizza_restaurant: { cat: "restaurant", indoor: true },
  seafood_restaurant: { cat: "restaurant", indoor: true },
  steak_house: { cat: "restaurant", indoor: true },
  meal_delivery: { cat: "restaurant", indoor: true },
  bar: { cat: "restaurant", indoor: true },
  cafe: { cat: "cafe", indoor: true },
  bakery: { cat: "cafe", indoor: true },
  ice_cream_shop: { cat: "cafe", indoor: true },
  coffee_shop: { cat: "cafe", indoor: true },
  supermarket: { cat: "shopping", indoor: true },
  grocery_store: { cat: "shopping", indoor: true },
  convenience_store: { cat: "shopping", indoor: true },
  market: { cat: "shopping", indoor: true },
  shopping_mall: { cat: "shopping", indoor: true },
  liquor_store: { cat: "shopping", indoor: true },
  pharmacy: { cat: "shopping", indoor: true },
  park: { cat: "park", indoor: false },
  hiking_area: { cat: "park", indoor: false },
  national_park: { cat: "park", indoor: false },
  dog_park: { cat: "park", indoor: false },
  marina: { cat: "beach", indoor: false },
  museum: { cat: "museum", indoor: true },
  art_gallery: { cat: "museum", indoor: true },
  historical_landmark: { cat: "museum", indoor: false },
  cultural_center: { cat: "museum", indoor: true },
  visitor_center: { cat: "museum", indoor: true },
  movie_theater: { cat: "cinema", indoor: true },
  amusement_park: { cat: "other", indoor: false },
  aquarium: { cat: "other", indoor: true },
  zoo: { cat: "other", indoor: false },
  bowling_alley: { cat: "bowling", indoor: true },
  swimming_pool: { cat: "swimming", indoor: true },
  spa: { cat: "spa", indoor: true },
  golf_course: { cat: "other", indoor: false },
};

function applySwedishOverrides(
  name: string,
  cat: PlaceCategory,
  indoor: boolean,
): { cat: PlaceCategory; indoor: boolean } {
  const l = name.toLowerCase();

  if (
    l.includes("café") ||
    l.includes("kafé") ||
    l.includes("cafe") ||
    l.includes("konditori") ||
    l.includes("bageri") ||
    l.includes("fika")
  )
    return { cat: "cafe", indoor: false };

  if (l.match(/\b(ica|coop|willys|hemköp|lidl|netto)\b/))
    return { cat: "shopping", indoor: true };
  if (l.includes("systembolaget")) return { cat: "shopping", indoor: true };
  if (l.includes("apotek")) return { cat: "shopping", indoor: true };

  if (
    l.includes("badplats") ||
    l.includes("havsbad") ||
    l.includes("sjöbad") ||
    l.includes("klippbad") ||
    l.includes("badklipp") ||
    l.includes("badvik") ||
    l.includes("sandstrand") ||
    (l.includes("strand") &&
      !l.includes("strandväg") &&
      !l.includes("strandgata"))
  )
    return { cat: "beach", indoor: false };

  if (
    l.includes("naturreservat") ||
    l.includes("naturområde") ||
    l.includes("nationalpark")
  )
    return { cat: "park", indoor: false };
  if (
    l.includes("vandringsled") ||
    l.includes("vandrarled") ||
    l.match(/\bleden\b/)
  )
    return { cat: "park", indoor: false };
  if (
    l.includes("utsikts") ||
    l.includes("utsiktstorn") ||
    l.includes("utkiksplats")
  )
    return { cat: "park", indoor: false };
  if (
    l.includes("vindskydd") ||
    l.includes("raststuga") ||
    l.includes("grillplats")
  )
    return { cat: "park", indoor: false };
  if (l.includes("strövområde") || l.includes("friluftsområde"))
    return { cat: "park", indoor: false };
  if (l.includes("kustpromenad") || l.includes("kustled"))
    return { cat: "park", indoor: false };
  if (l.includes("naturum")) return { cat: "park", indoor: false };
  if (l.includes("trädgård") && !l.includes("butik"))
    return { cat: "park", indoor: false };

  if (
    l.includes("gårdsbutik") ||
    l.includes("mejeri") ||
    l.includes("honung") ||
    l.includes("odlingar") ||
    l.includes("fårfarm") ||
    l.match(/\bägg\b/)
  )
    return { cat: "shopping", indoor: true };

  if (l.includes("slott") || l.includes("fästning") || l.includes("castle"))
    return { cat: "museum", indoor: false };
  if (l.includes("museum") || l.includes("utställning"))
    return { cat: "museum", indoor: true };

  if (l.includes("4h-gård") || l.includes("4h gård"))
    return { cat: "other", indoor: false };
  if (l.includes("djurpark") || l.includes("tropik"))
    return { cat: "other", indoor: false };
  if (
    l.includes("minigolf") ||
    l.includes("äventyrsgolf") ||
    l.includes("bangolf")
  )
    return { cat: "other", indoor: false };
  if (
    l.includes("kajak") ||
    l.includes("kayak") ||
    l.includes("paddling") ||
    l.includes("kano")
  )
    return { cat: "other", indoor: false };
  if (l.includes("surfing") || l.includes("surf") || l.includes("sup"))
    return { cat: "other", indoor: false };
  if (
    l.includes("ridning") ||
    l.includes("ridskola") ||
    l.includes("islandshäst")
  )
    return { cat: "other", indoor: false };
  if (l.includes("cykeluthyrning") || l.includes("hyrcykel"))
    return { cat: "other", indoor: false };

  return { cat, indoor };
}

function parsePlaces(
  rawPlaces: any[],
  categoryFallback: PlaceCategory,
): GooglePlaceResult[] {
  return rawPlaces.map((place: any) => {
    const types: string[] = place.types || [];
    const name: string = place.displayName?.text || "";

    const mapping = types.reduce(
      (acc: { cat: PlaceCategory; indoor: boolean } | null, t: string) =>
        acc || TYPE_MAP[t] || null,
      null,
    );
    let cat = mapping?.cat ?? categoryFallback;
    let indoor = mapping?.indoor ?? false;

    const override = applySwedishOverrides(name, cat, indoor);
    cat = override.cat;
    indoor = override.indoor;

    return {
      google_place_id: place.id,
      name,
      address: place.formattedAddress || null,
      rating: place.rating || null,
      category: cat,
      is_indoor: indoor,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      raw_data: place,
    };
  });
}

export async function fetchPlacesNearby(
  lat: number,
  lng: number,
  includedTypes: string[],
  categoryFallback: PlaceCategory,
  radius: number = 5000,
  rankBy: "DISTANCE" | "POPULARITY" = "DISTANCE",
  maxResults: number = 20,
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY");

  const body: Record<string, unknown> = {
    includedTypes,
    maxResultCount: Math.min(maxResults, 20),
    languageCode: "sv",
    regionCode: "SE",
    rankPreference: rankBy,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radius, 50_000),
      },
    },
  };

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json()) as GooglePlacesResponse;
    if (!data.places) return [];
    return parsePlaces(data.places, categoryFallback);
  } catch (err) {
    console.error(`[Nearby] types=${includedTypes.join(",")} failed:`, err);
    return [];
  }
}

export async function fetchPlacesByText(
  lat: number,
  lng: number,
  searchQuery: string,
  categoryFallback: PlaceCategory,
  radius: number = 5000,
  rankBy: "DISTANCE" | "RELEVANCE" = "DISTANCE",
  maxResults: number = 20,
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY");

  const latOffset = radius / 111_320;
  const lonOffset = radius / (111_320 * Math.cos((lat * Math.PI) / 180));

  const body: Record<string, unknown> = {
    textQuery: searchQuery,
    languageCode: "sv",
    maxResultCount: Math.min(maxResults, 20),
    locationRestriction: {
      rectangle: {
        low: { latitude: lat - latOffset, longitude: lng - lonOffset },
        high: { latitude: lat + latOffset, longitude: lng + lonOffset },
      },
    },
  };

  if (rankBy === "DISTANCE") {
    body.rankPreference = "DISTANCE";
  }

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json()) as GooglePlacesResponse;
    if (!data.places) return [];
    return parsePlaces(data.places, categoryFallback);
  } catch (err) {
    console.error(`[Text] "${searchQuery}" failed:`, err);
    return [];
  }
}

// ─── Road-distance sync (NEW in v11) ─────────────────────

/**
 * Batch-sync OSRM road distances for every cached_place of a
 * campground.  By default only processes rows where
 * road_distance_km IS NULL (incremental).  Pass `force = true`
 * to re-calculate all.
 *
 * Call this at the end of your place-sync job / admin action.
 */
export async function syncRoadDistances(
  supabase: SupabaseClient<Database>,
  campgroundId: string,
  campgroundLat: number,
  campgroundLon: number,
  force = false,
): Promise<{ synced: number; failed: number }> {
  let query = supabase
    .from("cached_places")
    .select("id, latitude, longitude")
    .eq("campground_id", campgroundId)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (!force) {
    query = query.is("road_distance_km", null);
  }

  const { data: places, error } = await query;

  if (error) {
    console.error("[syncRoadDistances] query error:", error);
    return { synced: 0, failed: 0 };
  }
  if (!places || places.length === 0) return { synced: 0, failed: 0 };

  console.log(
    `[syncRoadDistances] calculating distances for ${places.length} places (campground ${campgroundId})`,
  );

  const origin: Coordinate = { lat: campgroundLat, lon: campgroundLon };
  const destinations: Coordinate[] = places.map((p) => ({
    lat: p.latitude!,
    lon: p.longitude!,
  }));

  const metrics = await getOSRMTableMetrics(origin, destinations);

  let synced = 0;
  let failed = 0;

  // Fire all updates in parallel (they're tiny single-row writes)
  await Promise.all(
    places.map(async (place, idx) => {
      const km = metrics[idx]?.distance_km ?? null;
      const { error: updateErr } = await supabase
        .from("cached_places")
        .update({ road_distance_km: km })
        .eq("id", place.id);

      if (updateErr) {
        console.error(
          `[syncRoadDistances] update failed for ${place.id}:`,
          updateErr,
        );
        failed++;
      } else if (km != null) {
        synced++;
      } else {
        // OSRM returned null for this place (unreachable / no route)
        failed++;
      }
    }),
  );

  console.log(
    `[syncRoadDistances] done – synced: ${synced}, failed: ${failed}`,
  );
  return { synced, failed };
}

/**
 * Compute and persist the road distance for a single place.
 * Useful when a new place is added individually.
 *
 * Returns the distance in km, or null if OSRM could not route.
 */
export async function syncSinglePlaceRoadDistance(
  supabase: SupabaseClient<Database>,
  placeId: string,
  campgroundLat: number,
  campgroundLon: number,
  placeLat: number,
  placeLon: number,
): Promise<number | null> {
  const origin: Coordinate = { lat: campgroundLat, lon: campgroundLon };
  const dest: Coordinate = { lat: placeLat, lon: placeLon };

  const metrics = await getOSRMTableMetrics(origin, [dest]);
  const km = metrics[0]?.distance_km ?? null;

  const { error } = await supabase
    .from("cached_places")
    .update({ road_distance_km: km })
    .eq("id", placeId);

  if (error) {
    console.error(
      `[syncSinglePlaceRoadDistance] update failed for ${placeId}:`,
      error,
    );
  }

  return km;
}
