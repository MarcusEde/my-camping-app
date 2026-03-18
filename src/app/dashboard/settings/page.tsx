import { createClient } from "@/lib/supabase/server";
import type { Campground } from "@/types/database";
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

  const brand = campground.primary_color || "#2A3C34";

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* Settings */}
      <SettingsForm campground={campground} />
    </div>
  );
}
