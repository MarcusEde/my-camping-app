// src/lib/data/camp-loader.ts

import { formatDistance } from "@/lib/distance";
import type { RoadDistanceMap } from "@/lib/routing";
import { createClient } from "@/lib/supabase/server";
import { fetchWeather } from "@/lib/weather";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
  PromotedPartner,
} from "@/types/database";
import type { WeatherProp } from "@/types/guest";

export interface CampPageData {
  campground: Campground;
  places: CachedPlace[];
  announcements: Announcement[];
  partners: PromotedPartner[];
  internalLocations: InternalLocation[];
  weather: WeatherProp | null;
  distanceMap: RoadDistanceMap;
}

/**
 * Load a campground by slug. Returns null if not found.
 */
export async function loadCampground(slug: string): Promise<Campground | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

/**
 * Load all guest-facing data for an active campground.
 */
export async function loadCampPageData(
  campground: Campground,
): Promise<CampPageData> {
  const supabase = await createClient();

  const [placesRes, announcementsRes, partnersRes, facilitiesRes, weather] =
    await Promise.all([
      supabase
        .from("cached_places")
        .select("*")
        .eq("campground_id", campground.id)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false }),
      supabase
        .from("announcements")
        .select("*")
        .eq("campground_id", campground.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("promoted_partners")
        .select("*")
        .eq("campground_id", campground.id)
        .eq("is_active", true)
        .order("priority_rank", { ascending: false }),
      supabase
        .from("internal_locations")
        .select("*")
        .eq("campground_id", campground.id)
        .eq("is_active", true)
        .order("walking_minutes", { ascending: true }),
      fetchWeather(campground.latitude, campground.longitude),
    ]);

  const places = placesRes.data ?? [];

  const distanceMap: RoadDistanceMap = {};
  for (const place of places) {
    if (place.road_distance_km != null) {
      distanceMap[place.id] = formatDistance(place.road_distance_km);
    }
  }

  return {
    campground,
    places,
    announcements: announcementsRes.data ?? [],
    partners: partnersRes.data ?? [],
    internalLocations: facilitiesRes.data ?? [],
    weather,
    distanceMap,
  };
}

/**
 * Load minimal campground data for metadata generation.
 */
export async function loadCampMeta(slug: string): Promise<{
  name: string;
  primary_color: string | null;
  logo_url: string | null;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campgrounds")
    .select("name, primary_color, logo_url")
    .eq("slug", slug)
    .single();
  return data;
}
