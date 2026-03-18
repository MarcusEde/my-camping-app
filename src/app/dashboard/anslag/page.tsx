import { createClient } from "@/lib/supabase/server";
import type { Announcement, Campground } from "@/types/database";
import AnslagManager from "./AnslagManager";

export default async function AnslagPage() {
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

  const { data: announcementsRes } = await supabase
    .from("announcements")
    .select("*")
    .eq("campground_id", campground.id)
    .order("created_at", { ascending: false });

  const announcements: Announcement[] = (announcementsRes ?? []) as Announcement[];
  const brand = campground.primary_color || "#2A3C34";

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div className="mb-3 px-1">
        <h2 className="text-[20px] font-black tracking-tight text-stone-900">
          Anslagstavla
        </h2>
        <p className="text-[12px] font-medium text-stone-500 mt-1 max-w-lg leading-relaxed">
          Skapa informationsmeddelanden, notiser och varningar som visas direkt för gästerna i webbappen.
        </p>
      </div>
      <AnslagManager campground={campground} announcements={announcements} brand={brand} />
    </div>
  );
}
