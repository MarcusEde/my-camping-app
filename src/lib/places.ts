import { createClient } from "@/lib/supabase/server";
import { CachedPlace, Campground } from "@/types/database";

/**
 * The "Check the Fridge" Algorithm with explicit logging
 */
export async function getLocalPlaces(
  campground: Campground,
): Promise<CachedPlace[]> {
  const supabase = await createClient();

  // 1. Look in the fridge (Fetch from Supabase)
  const { data: cachedPlaces, error } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id);

  if (error) {
    console.error("❌ [PLACES] Error checking database:", error.message);
    return [];
  }

  // 2. Check if data exists and is fresh (under 24 hours old)
  const hasData = cachedPlaces && cachedPlaces.length > 0;
  let isFresh = false;

  if (hasData) {
    const fetchedAt = new Date(cachedPlaces[0].fetched_at);
    const now = new Date();
    const hoursOld = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) isFresh = true;
  }

  // 3. THE DECISION & LOGGING
  if (hasData && isFresh) {
    console.log(
      `🧊 [PLACES CACHE]: Found ${cachedPlaces.length} fresh places in database for "${campground.name}". Skipping Google API.`,
    );
    return cachedPlaces as CachedPlace[];
  }

  console.log(
    `🛒 [PLACES API]: Cache empty or expired for "${campground.name}". Calling Google Places API...`,
  );

  // Dynamic import to keep the main bundle light
  const { fetchNearbyPlaces } = await import("@/lib/google-places");
  const googleResults = await fetchNearbyPlaces(
    campground.latitude,
    campground.longitude,
  );

  if (googleResults.length === 0) {
    console.log("📭 [PLACES API]: Google returned 0 results nearby.");
    return [];
  }

  // Add the campground_id to each result before saving
  const placesToInsert = googleResults.map((place) => ({
    ...place,
    campground_id: campground.id,
  }));

  // Save to the database
  const { data: insertedPlaces, error: insertError } = await supabase
    .from("cached_places")
    .insert(placesToInsert)
    .select();

  if (insertError) {
    console.error(
      "❌ [PLACES] Failed to save to database:",
      insertError.message,
    );
    return [];
  }

  console.log(
    `✅ [PLACES API]: Successfully fetched and saved ${insertedPlaces.length} new places.`,
  );
  return insertedPlaces as CachedPlace[];
}
