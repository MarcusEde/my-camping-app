import { createClient } from "@/lib/supabase/server";
import type { CachedPlace, Campground, InternalLocation } from "@/types/database";
import PlacesTabs from "./PlacesTabs";

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

  const [placesRes, facilitiesRes] = await Promise.all([
    supabase
      .from("cached_places")
      .select("*")
      .eq("campground_id", campground.id)
      .order("is_pinned", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("internal_locations")
      .select("*")
      .eq("campground_id", campground.id)
      .order("walking_minutes", { ascending: true })
  ]);

  const places: CachedPlace[] = (placesRes.data ?? []) as CachedPlace[];
  const facilities: InternalLocation[] = (facilitiesRes.data ?? []) as InternalLocation[];
  const brand = campground.primary_color || "#2A3C34";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <PlacesTabs campground={campground} places={places} facilities={facilities} brand={brand} />
    </div>
  );
}
