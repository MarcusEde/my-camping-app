// src/lib/analytics.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { AnalyticsStats } from "@/types/database";

export async function getAnalyticsStats(
  campgroundId: string,
  days = 30,
): Promise<AnalyticsStats> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const prevStart = new Date(since);
  prevStart.setDate(prevStart.getDate() - days);

  const [
    viewsRes,
    prevViewsRes,
    feedbackRes,
    directionsRes,
    redemptionsRes,
    prevRedemptionsRes,
    infoClicksRes,
    savedPlacesRes, // ← NEW
  ] = await Promise.all([
    // ── Page views (now includes language) ──
    supabase
      .from("page_views")
      .select("tab, session_id, created_at, language")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO),
    supabase
      .from("page_views")
      .select("session_id")
      .eq("campground_id", campgroundId)
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", sinceISO),
    supabase
      .from("guest_feedback")
      .select("rating, comment, created_at")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("directions_clicks")
      .select("place_id")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO),
    supabase
      .from("redemptions")
      .select("id")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO),
    supabase
      .from("redemptions")
      .select("id")
      .eq("campground_id", campgroundId)
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", sinceISO),
    supabase
      .from("info_clicks")
      .select("id")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO),
    // ── NEW: Saved places analytics ──
    supabase
      .from("saved_places_analytics")
      .select("place_id")
      .eq("campground_id", campgroundId)
      .gte("created_at", sinceISO),
  ]);

  const views = viewsRes.data ?? [];
  const prevViews = prevViewsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];
  const directions = directionsRes.data ?? [];
  const redemptions = redemptionsRes.data ?? [];
  const prevRedemptions = prevRedemptionsRes.data ?? [];
  const infoClicks = infoClicksRes.data ?? [];
  const savedPlaces = savedPlacesRes.data ?? [];

  // ── Unique sessions ──
  const uniqueSessions = new Set(views.map((v) => v.session_id)).size;
  const prevUniqueSessions = new Set(prevViews.map((v) => v.session_id)).size;

  // ── Planner usage ──
  const plannerViews = views.filter((v) => v.tab === "planerare").length;

  // ── Tab breakdown ──
  const tabCounts = new Map<string, number>();
  for (const v of views) tabCounts.set(v.tab, (tabCounts.get(v.tab) ?? 0) + 1);
  const topTabs = Array.from(tabCounts.entries())
    .map(([tab, count]) => ({ tab, count }))
    .sort((a, b) => b.count - a.count);

  // ── Language breakdown (NEW) ──
  const langCounts = new Map<string, number>();
  for (const v of views) {
    const lang = v.language;
    if (lang) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
  }
  const topLanguages = Array.from(langCounts.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  // ── Saved places breakdown (NEW) ──
  const savedCounts = new Map<string, number>();
  for (const s of savedPlaces) {
    savedCounts.set(s.place_id, (savedCounts.get(s.place_id) ?? 0) + 1);
  }
  const topSavedIds = Array.from(savedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topSavedPlaces: { placeId: string; placeName: string; count: number }[] =
    [];
  if (topSavedIds.length > 0) {
    const { data: placeRows } = await supabase
      .from("cached_places")
      .select("id, name")
      .in(
        "id",
        topSavedIds.map(([id]) => id),
      );
    const nameMap = new Map((placeRows ?? []).map((p) => [p.id, p.name]));
    topSavedPlaces = topSavedIds.map(([id, count]) => ({
      placeId: id,
      placeName: nameMap.get(id) ?? "Okänd plats",
      count,
    }));
  }

  // ── Daily breakdown ──
  const dailyMap = new Map<string, { views: number; sessions: Set<string> }>();
  for (const v of views) {
    const date = v.created_at.split("T")[0];
    const entry = dailyMap.get(date) ?? { views: 0, sessions: new Set() };
    entry.views++;
    entry.sessions.add(v.session_id);
    dailyMap.set(date, entry);
  }
  const dailyViews = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, views: d.views, unique: d.sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Feedback ──
  const avgRating =
    feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : null;

  // ── Top directions places ──
  const placeCounts = new Map<string, number>();
  for (const d of directions)
    placeCounts.set(d.place_id, (placeCounts.get(d.place_id) ?? 0) + 1);

  const topPlaceIds = Array.from(placeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topPlaces: { placeId: string; placeName: string; clicks: number }[] = [];
  if (topPlaceIds.length > 0) {
    const { data: placeNames } = await supabase
      .from("cached_places")
      .select("id, name")
      .in(
        "id",
        topPlaceIds.map(([id]) => id),
      );
    const nameMap = new Map((placeNames ?? []).map((p) => [p.id, p.name]));
    topPlaces = topPlaceIds.map(([id, clicks]) => ({
      placeId: id,
      placeName: nameMap.get(id) ?? "Okänd",
      clicks,
    }));
  }

  // ── Week-over-week ──
  const viewsChange =
    prevViews.length > 0
      ? Math.round(((views.length - prevViews.length) / prevViews.length) * 100)
      : 0;
  const guestsChange =
    prevUniqueSessions > 0
      ? Math.round(
          ((uniqueSessions - prevUniqueSessions) / prevUniqueSessions) * 100,
        )
      : 0;
  const redemptionsChange =
    prevRedemptions.length > 0
      ? Math.round(
          ((redemptions.length - prevRedemptions.length) /
            prevRedemptions.length) *
            100,
        )
      : 0;

  return {
    totalViews: views.length,
    uniqueGuests: uniqueSessions,
    plannerUsage: plannerViews,
    avgRating,
    feedbackCount: feedback.length,
    directionsClicks: directions.length,
    totalRedemptions: redemptions.length,
    totalInfoClicks: infoClicks.length,
    topTabs,
    topPlaces,
    dailyViews,
    recentFeedback: feedback.map((f) => ({
      rating: f.rating,
      comment: f.comment,
      created_at: f.created_at,
    })),
    weekOverWeek: { viewsChange, guestsChange, redemptionsChange },
    topLanguages,
    topSavedPlaces,
  };
}

/** Quick 7-day summary for the stat cards on the dashboard */
export async function getQuickStats(campgroundId: string) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [viewsRes, feedbackRes, redemptionsRes, infoClicksRes] =
    await Promise.all([
      supabase
        .from("page_views")
        .select("session_id, tab")
        .eq("campground_id", campgroundId)
        .gte("created_at", since.toISOString()),
      supabase
        .from("guest_feedback")
        .select("rating")
        .eq("campground_id", campgroundId)
        .gte("created_at", since.toISOString()),
      supabase
        .from("redemptions")
        .select("id")
        .eq("campground_id", campgroundId)
        .gte("created_at", since.toISOString()),
      supabase
        .from("info_clicks")
        .select("id")
        .eq("campground_id", campgroundId)
        .gte("created_at", since.toISOString()),
    ]);

  const views = viewsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];
  const redemptions = redemptionsRes.data ?? [];
  const infoClicks = infoClicksRes.data ?? [];

  return {
    totalViews: views.length,
    uniqueGuests: new Set(views.map((v) => v.session_id)).size,
    plannerUses: views.filter((v) => v.tab === "planerare").length,
    avgRating:
      feedback.length > 0
        ? (
            feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
          ).toFixed(1)
        : null,
    feedbackCount: feedback.length,
    totalRedemptions: redemptions.length,
    totalInfoClicks: infoClicks.length,
  };
}
