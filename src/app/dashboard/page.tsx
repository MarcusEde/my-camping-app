import { createClient } from "@/lib/supabase/server";
import type { Campground } from "@/types/database";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default async function OverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campgroundRaw } = await supabase
    .from("campgrounds")
    .select("id, primary_color")
    .eq("owner_id", user!.id)
    .single();

  if (!campgroundRaw) return null;

  const campground = campgroundRaw as Pick<Campground, "id" | "primary_color">;
  const brand = campground.primary_color || "#2A3C34";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <AnalyticsDashboard campgroundId={campground.id} brand={brand} />
    </div>
  );
}
