"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/* ── Partner Click Tracking ────────────────────────────── */

export async function trackPartnerClick(partnerId: string) {
  const cookieStore = await cookies();
  const clickKey = `partner_click_${partnerId}`;

  if (cookieStore.get(clickKey)) {
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_clicks")
    .insert({ partner_id: partnerId });

  if (error) {
    console.error("Failed to track click:", error.message);
    return { success: false, error: "Failed to track click" };
  }

  cookieStore.set(clickKey, "true", { maxAge: 60 * 60 * 24 });

  return { success: true };
}

/* ── Coupon Redemption Tracking ────────────────────────── */

export async function trackRedemption(partnerId: string, campgroundId: string) {
  const cookieStore = await cookies();
  const redeemKey = `redemption_${partnerId}`;

  // 24-hour de-bounce: same session cannot generate duplicate redemptions
  if (cookieStore.get(redeemKey)) {
    return { success: true };
  }

  // Resolve or create a persistent session id for the guest
  let sessionId = cookieStore.get("camp_session")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("camp_session", sessionId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("redemptions").insert({
    campground_id: campgroundId,
    partner_id: partnerId,
    session_id: sessionId,
  });

  if (error) {
    console.error("Failed to track redemption:", error.message);
    return { success: false, error: "Failed to track redemption" };
  }

  // Prevent duplicate inserts for this partner for 24 hours
  cookieStore.set(redeemKey, "true", {
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  return { success: true };
}
