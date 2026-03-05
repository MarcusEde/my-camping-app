import GuestAppUI from "@/components/GuestAppUI"; // Import the new component
import { getLocalPlaces } from "@/lib/places";
import { getCachedItinerary } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeather } from "@/lib/weather";

export default async function GuestCampgroundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!campground) return <div>Not Found</div>;

  // Parallel Data Fetching (Faster!)
  const [places, weather, partners] = await Promise.all([
    getLocalPlaces(campground),
    getCurrentWeather(campground.latitude, campground.longitude),
    supabase
      .from("promoted_partners")
      .select("*")
      .eq("campground_id", campground.id)
      .eq("is_active", true)
      .order("priority_rank", { ascending: true })
      .then((res) => res.data),
  ]);

  const itinerary = await getCachedItinerary(campground, places, weather);

  // Pass everything to the Client Component
  return (
    <GuestAppUI
      campground={campground}
      places={places}
      weather={weather}
      partners={partners}
      itinerary={itinerary}
    />
  );
}
