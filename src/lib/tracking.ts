// lib/tracking.ts
"use client";

import { createClient } from "@/lib/supabase/client";

export function trackPageView(
  campgroundId: string,
  sessionId: string,
  tab: string,
) {
  try {
    const supabase = createClient();
    void supabase
      .from("page_views")
      .insert({ campground_id: campgroundId, session_id: sessionId, tab })
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
