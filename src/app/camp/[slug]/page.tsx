import AiItinerary from "@/components/AiItinerary";
import AiItinerarySkeleton from "@/components/AiItinerarySkeleton";
import GuestAppUI from "@/components/GuestAppUI";
import { getLocalPlaces } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeather } from "@/lib/weather";
import { Suspense } from "react";

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

  if (!campground)
    return (
      <div className="p-10 text-center font-bold">Campground Not Found</div>
    );

  // 1. Fetch static data (Fast)
  const [places, weather, partners] = await Promise.all([
    getLocalPlaces(campground),
    getCurrentWeather(campground.latitude, campground.longitude),
    supabase
      .from("promoted_partners")
      .select("*")
      .eq("campground_id", campground.id)
      .eq("is_active", true)
      .order("priority_rank")
      .then((res) => res.data),
  ]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 2. Show the Main UI immediately */}
      <GuestAppUI
        campground={campground}
        places={places}
        weather={weather}
        partners={partners}
      />

      {/* 3. Stream the AI component in the background */}
      <div className="px-5 -mt-4 pb-20">
        <Suspense fallback={<AiItinerarySkeleton />}>
          <AiItinerary
            campground={campground}
            places={places}
            weather={weather}
            lang="sv"
          />
        </Suspense>
      </div>
    </div>
  );
}
