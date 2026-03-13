// COMPLETE REPLACEMENT — copy this entire block
"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";

// SEC-003 FIX: In-memory rate limiting (works effectively per-isolate in Edge/Workers)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Use globalThis to persist across hot-reloads during dev, and maintain state in edge isolates
const rateLimits =
  (globalThis as any).rateLimits || new Map<string, RateLimitEntry>();
if (!(globalThis as any).rateLimits) {
  (globalThis as any).rateLimits = rateLimits;
}

async function isRateLimited(action: string): Promise<boolean> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const key = `${action}_${ip}`;
  const now = Date.now();

  const record = rateLimits.get(key);
  if (record && now < record.resetAt) {
    if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;
    record.count++;
    return false;
  }

  rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  return false;
}

/* ── Partner Click Tracking ────────────────────────────── */

export async function trackPartnerClick(partnerId: string) {
  if (await isRateLimited("click")) {
    return { success: false, error: "Too many requests" };
  }

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
  if (await isRateLimited("redemption")) {
    return { success: false, error: "Too many requests" };
  }

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
