import { createClient } from "@/lib/supabase/server";
import type {
  Announcement,
  Campground,
  InternalLocation,
} from "@/types/database";
import FacilityManager from "../FacilityManager";
import SettingsForm from "../settings/SettingsForm";

export default async function SettingsPage() {
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

  const [announcementsRes, facilitiesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("campground_id", campground.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("internal_locations")
      .select("*")
      .eq("campground_id", campground.id)
      .order("walking_minutes", { ascending: true }),
  ]);

  const announcements: Announcement[] = (announcementsRes.data ??
    []) as Announcement[];
  const facilities: InternalLocation[] = (facilitiesRes.data ??
    []) as InternalLocation[];
  const brand = campground.primary_color || "#2A3C34";

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* Settings + Announcements */}
      <SettingsForm campground={campground} announcements={announcements} />

      {/* Facilities */}
      <div>
        <div className="mb-3 px-1">
          <h2 className="text-[14px] font-black tracking-tight text-stone-900">
            🏗️ Faciliteter
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 mt-0.5">
            Toaletter, duschar & service på campingen
          </p>
        </div>
        <FacilityManager
          campgroundId={campground.id}
          facilities={facilities}
          brand={brand}
        />
      </div>
    </div>
  );
}
