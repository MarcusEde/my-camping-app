// src/components/tabs/actions.ts
// COMPLETE REPLACEMENT — copy this entire block
"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ DISTRIBUTED RATE LIMITING (Cloudflare KV — Fixed Window)
// ═══════════════════════════════════════════════════════════════════════════
//
// WHY THIS REPLACED THE OLD APPROACH:
// The previous implementation used getCloudflareContext() to access
// NEXT_INC_CACHE_KV. That binding is managed by OpenNext for its own
// incremental cache — piggybacking on it for rate-limit keys risks
// namespace collisions and couples us to OpenNext internals.
//
// This version uses AI_PLAN_CACHE, a dedicated KV namespace we control,
// accessed via process.env (how OpenNext exposes Worker bindings).
//
// ALGORITHM: Fixed Window
// Key format: ratelimit:{action}:{ip}:{windowId}
// windowId = Math.floor(Date.now() / 60000) → rotates every 60 seconds
//
// TRADE-OFFS ACCEPTED:
// - KV is eventually consistent (~60s propagation between PoPs). A
//   distributed attacker hitting multiple PoPs simultaneously could
//   briefly exceed the limit. Acceptable for analytics protection.
// - The get-then-put is not atomic. Under extreme concurrency from the
//   same IP, a few extra requests may slip through. Acceptable given
//   the fail-open philosophy.
// ═══════════════════════════════════════════════════════════════════════════

const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Checks the distributed rate limit for a given action + client IP.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  FAIL-OPEN STRATEGY                                            │
 * │                                                                │
 * │  If KV is unreachable, the binding is missing (local dev),     │
 * │  or any error occurs, we ALLOW the request through.            │
 * │                                                                │
 * │  Rationale: A fraudulent click slipping through is a minor     │
 * │  analytics issue. A real camper seeing an error because our    │
 * │  rate-limiter's backing store hiccupped is a broken            │
 * │  experience. Analytics infra should NEVER gate the happy path. │
 * └─────────────────────────────────────────────────────────────────┘
 */
async function isRateLimited(action: string): Promise<boolean> {
  try {
    // ── Access the KV binding ──────────────────────────────────────
    // In OpenNext for Cloudflare, Worker bindings are exposed on
    // process.env as live objects (not serialized strings). We cast
    // to access the KVNamespace interface.
    const kv = (process.env as unknown as { AI_PLAN_CACHE?: KVNamespace })
      .AI_PLAN_CACHE;

    // Fail-open: binding not available (local dev, misconfiguration)
    if (!kv || typeof kv.get !== "function") {
      return false;
    }

    // ── Identify the client ────────────────────────────────────────
    // x-forwarded-for can be a comma-separated chain: "client, proxy1, proxy2"
    // We want the leftmost (original client) IP.
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    // ── Build the fixed-window key ─────────────────────────────────
    // Dividing epoch-ms by 60000 gives us a window ID that rotates
    // every 60 seconds. Example key:
    //   ratelimit:click:203.0.113.42:29495032
    const windowId = Math.floor(Date.now() / 60000);
    const key = `ratelimit:${action}:${ip}:${windowId}`;

    // ── Read current count ─────────────────────────────────────────
    const currentStr = await kv.get(key);
    const currentCount = currentStr ? parseInt(currentStr, 10) : 0;

    if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
      return true; // Over the limit — block
    }

    // ── Increment and persist ──────────────────────────────────────
    // expirationTtl: 120 seconds (2× the 60s window). Guarantees the
    // key survives the full window even if the first write arrives at
    // second 0. Cloudflare auto-deletes the key after expiration —
    // zero manual cleanup needed.
    await kv.put(key, (currentCount + 1).toString(), {
      expirationTtl: 120,
    });

    return false; // Under the limit — allow
  } catch (error) {
    // ── FAIL-OPEN ──────────────────────────────────────────────────
    console.warn(
      "[rate-limit] KV check failed — allowing request (fail-open):",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS (Rate-limited via Cloudflare KV)
// ═══════════════════════════════════════════════════════════════════════════

/* ── Partner Click Tracking ──────────────────────────────────────────── */

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

/* ── Coupon Redemption Tracking ──────────────────────────────────────── */

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
