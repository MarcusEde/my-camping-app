import { createClient } from "@/lib/supabase/server";
import type {
  CachedPlace,
  Campground,
  PromotedPartner,
  PromotedPartnerWithClicks,
} from "@/types/database";
import PartnerManager from "../PartnerManager";

export default async function PartnersPage() {
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

  const [placesRes, partnersRes] = await Promise.all([
    supabase
      .from("cached_places")
      .select("*")
      .eq("campground_id", campground.id)
      .order("name", { ascending: true }),
    supabase
      .from("promoted_partners")
      .select("*")
      .eq("campground_id", campground.id)
      .order("priority_rank", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const places: CachedPlace[] = (placesRes.data ?? []) as CachedPlace[];
  const partnersBase: PromotedPartner[] = (partnersRes.data ??
    []) as PromotedPartner[];

  /* Click counts */
  const clickCounts: Record<string, number> = {};
  const partnerIds = partnersBase.map((p) => p.id);
  if (partnerIds.length > 0) {
    const { data: clicksRaw } = await supabase
      .from("partner_clicks")
      .select("partner_id")
      .in("partner_id", partnerIds);
    if (clicksRaw) {
      for (const click of clicksRaw) {
        clickCounts[click.partner_id] =
          (clickCounts[click.partner_id] || 0) + 1;
      }
    }
  }

  const placeNameMap: Record<string, string> = {};
  for (const p of places) placeNameMap[p.id] = p.name;

  const partners: PromotedPartnerWithClicks[] = partnersBase.map((p) => ({
    ...p,
    click_count: clickCounts[p.id] || 0,
    linked_place_name: p.cached_place_id
      ? (placeNameMap[p.cached_place_id] ?? null)
      : null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
      <PartnerManager
        campground={campground}
        partners={partners}
        places={places}
      />
    </div>
  );
}
