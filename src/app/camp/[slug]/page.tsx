import { createClient } from "@/lib/supabase/server";
import { getCurrentWeather } from "@/lib/weather";
import { notFound } from "next/navigation";
import GuestAppUI from "@/components/GuestAppUI";
import type { Metadata } from "next";
import type { Campground, CachedPlace, Announcement, PromotedPartner } from "@/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: campground } = await supabase
    .from("campgrounds")
    .select("name")
    .eq("slug", slug)
    .single();

  return {
    title: campground ? `${campground.name} – Gästguide` : "Camping Gästguide",
  };
}

export default async function CampGuestPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch campground by slug
  const { data: campground, error: campError } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("slug", slug)
    .single();

  if (campError || !campground) {
    notFound(); // Triggers a 404 page if the URL slug doesn't match a real campground
  }

  const cg = campground as Campground;

  // 2. Fetch visible places
  const { data: placesRaw } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", cg.id)
    .order("is_pinned", { ascending: false });

  const places: CachedPlace[] = (placesRaw || []) as CachedPlace[];

  // 3. Fetch announcements
  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("*")
    .eq("campground_id", cg.id)
    .order("created_at", { ascending: false });

  const announcements: Announcement[] = (announcementsRaw || []) as Announcement[];

  // 4. Fetch active promoted partners
  const { data: partnersRaw } = await supabase
    .from("promoted_partners")
    .select("*")
    .eq("campground_id", cg.id)
    .eq("is_active", true)
    .order("priority_rank", { ascending: true });

  const partners: PromotedPartner[] = (partnersRaw || []) as PromotedPartner[];

  // 5. Fetch live weather from SMHI
  const weather = await getCurrentWeather(cg.latitude, cg.longitude);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50">
      <GuestAppUI
        campground={cg}
        places={places}
        announcements={announcements}
        partners={partners}
        weather={weather}
      />
    </div>
  );
}