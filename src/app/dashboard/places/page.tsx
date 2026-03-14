import { createClient } from "@/lib/supabase/server";
import type { CachedPlace, Campground } from "@/types/database";
import PlacesManager from "../places/PlacesManager";

export default async function PlacesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campgroundRaw } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user!.id)
    .single();

  if (!campgroundRaw) return null;
  const campground = campgroundRaw as Campground;

  const { data: placesRaw } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false })
    .order("name", { ascending: true });

  const places: CachedPlace[] = (placesRaw ?? []) as CachedPlace[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <PlacesManager campground={campground} places={places} />
    </div>
  );
}
