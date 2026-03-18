// src/lib/planner/cache.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "./time";
import type { CachedPlanEnvelope, ItineraryItem, PlanLang } from "./types";
import { CACHE_VERSION } from "./types";

const l1 = new Map<string, CachedPlanEnvelope>();
export const inflightGenerations = new Map<string, Promise<ItineraryItem[]>>();
export const inflightTranslations = new Map<string, Promise<ItineraryItem[]>>();
export const inflightPrefetches = new Map<string, Promise<void>>();
let lastCleanupDate = "";

export function mkBaseKey(campId: string, date: string, wb: string): string {
  return `v${CACHE_VERSION}|base|${campId}|${date}|${wb}`;
}

export function mkTrKey(campId: string, date: string, wb: string, lang: PlanLang): string {
  return `v${CACHE_VERSION}|tr|${campId}|${date}|${wb}|${lang}`;
}

function extractCampId(key: string): string {
  const p = key.split("|");
  return p[0].startsWith("v") ? (p[2] ?? "unknown") : (p[1] ?? "unknown");
}

export async function cacheGet(key: string): Promise<CachedPlanEnvelope | null> {
  const date = todayStr();
  const mem = l1.get(key);
  if (mem?.dateStr === date) return mem;
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("plan_cache")
      .select("envelope")
      .eq("cache_key", key)
      .returns<{ envelope: Record<string, unknown> }[]>()
      .single();
    if (data?.envelope) {
      const env = data.envelope as unknown as CachedPlanEnvelope;
      if (env.dateStr === date) { l1.set(key, env); return env; }
    }
  } catch { /* miss */ }
  return null;
}

export async function cacheSet(key: string, env: CachedPlanEnvelope): Promise<void> {
  l1.set(key, env);
  try {
    const sb = createAdminClient();
    await sb.from("plan_cache").upsert({
      cache_key: key,
      campground_id: extractCampId(key),
      envelope: env as unknown as Record<string, unknown>,
      date_str: env.dateStr,
      updated_at: new Date().toISOString(),
    }, { onConflict: "cache_key" });
  } catch (e) { console.warn("[Planner] Cache write error:", e); }
}

export async function cachePurge(campId: string, date: string): Promise<void> {
  for (const [k, v] of l1) {
    if (k.includes(campId) && v.dateStr === date) l1.delete(k);
  }
  try {
    const sb = createAdminClient();
    await sb.from("plan_cache").delete().eq("campground_id", campId).eq("date_str", date);
  } catch { /* best effort */ }
}

export function pruneL1() {
  if (l1.size < 80) return;
  const today = todayStr();
  for (const [k, v] of l1) { if (v.dateStr !== today) l1.delete(k); }
}

export async function cleanupOldCache(): Promise<void> {
  const today = todayStr();
  if (lastCleanupDate === today) return;
  lastCleanupDate = today;
  try {
    const sb = createAdminClient();
    await sb.from("plan_cache").delete().neq("date_str", today);
  } catch { lastCleanupDate = ""; }
}
