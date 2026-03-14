// lib/tracking.ts
"use client";

import { createClient } from "@/lib/supabase/client";

export function trackPageView(
  campgroundId: string,
  sessionId: string,
  tab: string,
  language: string,
) {
  try {
    const supabase = createClient();
    void supabase
      .from("page_views")
      .insert({
        campground_id: campgroundId,
        session_id: sessionId,
        tab,
        language,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Silent — never break the guest experience
  }
}

export function trackDirectionsClick(
  campgroundId: string,
  placeId: string,
  sessionId: string,
) {
  try {
    const supabase = createClient();
    void supabase
      .from("directions_clicks")
      .insert({
        campground_id: campgroundId,
        place_id: placeId,
        session_id: sessionId,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {}
}

export function trackSavedPlace(
  campgroundId: string,
  placeId: string,
  sessionId: string,
) {
  try {
    const supabase = createClient();
    void supabase
      .from("saved_places_analytics")
      .insert({
        campground_id: campgroundId,
        place_id: placeId,
        session_id: sessionId,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Silent — never break the guest experience
  }
}

// ── NEW: Track Quick Info accordion opens ─────────────────
// Each open = one "question saved at reception". The guest found
// checkout times / trash rules / emergency info in the app instead
// of walking to the front desk.
export function trackInfoClick(
  campgroundId: string,
  sessionId: string,
  infoType: string,
) {
  try {
    const supabase = createClient();
    void supabase
      .from("info_clicks")
      .insert({
        campground_id: campgroundId,
        session_id: sessionId,
        info_type: infoType,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Silent — never break the guest experience
  }
}

export async function submitGuestFeedback(
  campgroundId: string,
  sessionId: string,
  rating: number,
  comment?: string,
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("guest_feedback").insert({
      campground_id: campgroundId,
      session_id: sessionId,
      rating,
      comment: comment?.trim() || null,
    });
    return !error;
  } catch {
    return false;
  }
}
