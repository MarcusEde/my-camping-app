import { createClient } from "@/lib/supabase/server";
import { CachedPlace, Campground } from "@/types/database";

/**
 * The "Check the Fridge" Algorithm
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
    console.error("Error checking fridge:", error.message);
    return [];
  }

  // 2. Do we have data? And is it fresh?
  const hasData = cachedPlaces && cachedPlaces.length > 0;

  let isFresh = false;
  if (hasData) {
    // Check the age of the first item
    const fetchedAt = new Date(cachedPlaces[0].fetched_at);
    const now = new Date();

    // Calculate difference in hours
    // (now.getTime() - fetchedAt.getTime()) gives milliseconds
    const hoursOld = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);

    // If it's less than 24 hours old, it's fresh!
    if (hoursOld < 24) {
      isFresh = true;
    }
  }

  // 3. THE DECISION
  if (hasData && isFresh) {
    console.log("🧊 SERVING FROM CACHE! Saved $0.03");
    return cachedPlaces as CachedPlace[];
  }

  // 4. IF EXPIRED OR EMPTY: Go to the "Grocery Store" (Google API)
  // 4. IF EXPIRED OR EMPTY: Go to the "Grocery Store" (Google API)
  console.log("🛒 CACHE EMPTY OR EXPIRED. Fetching from Google...");

  // --- REAL GOOGLE API ---
  const { fetchNearbyPlaces } = await import("@/lib/google-places");
  const googleResults = await fetchNearbyPlaces(
    campground.latitude,
    campground.longitude,
  );

  if (googleResults.length === 0) {
    console.log("📭 No results from Google.");
    return [];
  }

  // Add the campground_id to each result before saving
  const placesToInsert = googleResults.map((place) => ({
    ...place,
    campground_id: campground.id,
  }));

  // Save to the fridge
  const { data: insertedPlaces, error: insertError } = await supabase
    .from("cached_places")
    .insert(placesToInsert)
    .select();

  if (insertError) {
    console.error("❌ Failed to save to cache:", insertError.message);
    return [];
  }

  console.log("✅ Saved", insertedPlaces.length, "REAL places to cache!");
  return insertedPlaces as CachedPlace[];
}
