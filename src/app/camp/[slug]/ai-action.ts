// src/app/camp/[slug]/ai-action.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { CachedPlace, Campground } from "@/types/database";

// 1. RE-EXPORT TYPES USED BY CLIENT COMPONENTS
export type { CachedPlanEnvelope, ItineraryItem, PlanLang } from "@/lib/planner/types";

import type {
  CachedPlanEnvelope,
  DayContext,
  ItineraryItem,
  Period,
  PlanLang,
  Selection,
  WeatherInput,
} from "@/lib/planner/types";
import { CACHE_VERSION } from "@/lib/planner/types";

import {
  cacheGet,
  cachePurge,
  cacheSet,
  cleanupOldCache,
  inflightGenerations,
  inflightPrefetches,
  inflightTranslations,
  mkBaseKey,
  mkTrKey,
  pruneL1,
} from "@/lib/planner/cache";
import { callGemini, translatePlan } from "@/lib/planner/gemini";
import { buildFallback, buildPrompt } from "@/lib/planner/prompt";
import {
  FOOD_CATS,
  getDistStr,
  getHours,
  PERIOD_ORDER,
  scorePlaces,
  selectForPlan,
  SLOT_DEFS,
} from "@/lib/planner/scoring";
import { currentSwedishHour, getDayCtx, todayStr } from "@/lib/planner/time";
import { isWeatherDrastic, weatherBucket } from "@/lib/planner/weather-scoring";

// ═══════════════════════════════════════════════════════════════════════
// POST-VALIDATION
// ═══════════════════════════════════════════════════════════════════════

function postValidate(plan: ItineraryItem[], placesById: Map<string, CachedPlace>, dm: Record<string, string>): ItineraryItem[] {
  return plan.flatMap(item => {
    let desc = item.description;
    desc = desc.replace(/\bjust\s+away\b/gi, "nearby");
    desc = desc.replace(/\bis\s+away\b/gi, "is nearby");

    if (item.placeId) {
      const place = placesById.get(item.placeId);
      if (place) {
        const dist = getDistStr(place, dm);
        if (dist && dist !== "on site") desc = desc.replace(/\bnearby\b/i, `${dist} away`);
        else if (dist === "on site") desc = desc.replace(/\bnearby\b/i, "right here at camp");
      }
    }

    const result = { ...item, description: desc };
    if (!item.placeId) return [result];
    const place = placesById.get(item.placeId);
    if (!place) return [];

    if ((item.period === "lunch" || item.period === "evening") && !FOOD_CATS.has(place.category) && desc.toLowerCase().match(/\b(lunch|dinner|eat|meal|mat)\b/))
      return [{ ...result, placeId: undefined }];

    const h = getHours(place);
    if (h.closed) return [{ ...result, placeId: undefined }];
    if (!h.range) return [result];

    const m = item.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return [result];
    const suggested = +m[1] + +m[2] / 60;
    if (suggested >= h.range.open && suggested < h.range.close - 0.25) return [result];

    const slot = SLOT_DEFS[item.period];
    const vs = Math.max(slot.start, h.range.open);
    const ve = Math.min(slot.end, h.range.close - 0.25);
    if (vs < ve) {
      const hr = Math.floor(vs), mn = Math.round((vs - hr) * 60);
      return [{ ...result, time: `${hr.toString().padStart(2, "0")}:${mn.toString().padStart(2, "0")}` }];
    }
    return [{ ...result, placeId: undefined }];
  });
}

// ═══════════════════════════════════════════════════════════════════════
// GAP FILLING
// ═══════════════════════════════════════════════════════════════════════

function getItemMin(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : 0;
}

function fillGaps(
  plan: ItineraryItem[], sel: Selection,
  weather: { temp: number; isRaining: boolean; windSpeed?: number; description?: string } | null,
  day: DayContext,
  lang: PlanLang,
): ItineraryItem[] {
  const covered = new Set(plan.map(i => i.period));
  const missing = PERIOD_ORDER.filter(p => !covered.has(p));
  if (!missing.length) return plan;
  const filler = buildFallback(sel, weather, day, lang, missing);
  return [...plan, ...filler].sort((a, b) => getItemMin(a.time) - getItemMin(b.time));
}

// ═══════════════════════════════════════════════════════════════════════
// BASE GENERATION
// ═══════════════════════════════════════════════════════════════════════

async function generateBase(
  campground: Campground, weather: WeatherInput | null | undefined,
  places: CachedPlace[], dm: Record<string, string>,
  date: string, wb: string, lang: PlanLang, periodsToGenerate?: Period[],
): Promise<{ plan: ItineraryItem[]; periodWeather: Record<Period, string> }> {
  const day = getDayCtx(lang, campground.id);
  const scored = scorePlaces(places, weather ?? null, dm);
  const sel = selectForPlan(scored, day.seed);
  const prompt = buildPrompt(campground, sel, weather ?? null, day, periodsToGenerate);

    const rawPlan = await callGemini(prompt);
  const ws = weather ? { temp: weather.temp, isRaining: weather.isRaining, windSpeed: weather.windSpeed, description: weather.description } : null;

  // Guarantee we have a valid array, explicitly typed so map/re-assignments work
  let plan: ItineraryItem[] = (!rawPlan || rawPlan.length < 3)
    ? buildFallback(sel, ws, day, lang, periodsToGenerate)
    : rawPlan;

  const byId = new Map(places.map(p => [p.id, p]));
  plan = plan.map(item => ({ ...item, placeId: item.placeId && byId.has(item.placeId) ? item.placeId : undefined }));
  plan = postValidate(plan, byId, dm);
  if (!periodsToGenerate) plan = fillGaps(plan, sel, ws, day, lang);

  const pw: Record<Period, string> = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
  return { plan, periodWeather: pw };
}

// ═══════════════════════════════════════════════════════════════════════
// DIMMING + WEATHER CHANGE
// ═══════════════════════════════════════════════════════════════════════

function computeDimmedPeriods(items: ItineraryItem[]): Set<Period> {
  const nowMin = Math.floor(currentSwedishHour() * 60);
  const dimmed = new Set<Period>();
  for (let i = 0; i < items.length; i++) {
    const next = items[i + 1];
    const isDone = next ? nowMin >= getItemMin(next.time) : nowMin > getItemMin(items[i].time) + 90;
    if (isDone) dimmed.add(items[i].period);
  }
  return dimmed;
}

async function handleWeatherChange(
  campground: Campground, weather: WeatherInput,
  places: CachedPlace[], dm: Record<string, string>,
  existing: CachedPlanEnvelope, newWb: string,
): Promise<{ plan: ItineraryItem[]; periodWeather: Record<Period, string> }> {
  const future = PERIOD_ORDER.filter(p => !computeDimmedPeriods(existing.plan).has(p));
  if (!future.length) return { plan: existing.plan, periodWeather: existing.periodWeather };
  const toRegen = future.filter(p => isWeatherDrastic(existing.periodWeather[p], newWb));
  if (!toRegen.length) return { plan: existing.plan, periodWeather: existing.periodWeather };

  const { plan: newItems, periodWeather: newPw } = await generateBase(campground, weather, places, dm, todayStr(), newWb, "en", toRegen);
  const kept = existing.plan.filter(i => !toRegen.includes(i.period));
  const merged = [...kept, ...newItems].sort((a, b) => getItemMin(a.time) - getItemMin(b.time));
  const pw = { ...existing.periodWeather };
  for (const p of toRegen) pw[p] = newPw[p];
  return { plan: merged, periodWeather: pw };
}

// ═══════════════════════════════════════════════════════════════════════
// FIND EXISTING PLAN
// ═══════════════════════════════════════════════════════════════════════

async function findExistingPlan(campId: string, date: string): Promise<CachedPlanEnvelope | null> {
  try {
    const sb = await createClient();
    const { data } = await sb.from("plan_cache").select("envelope")
      .eq("campground_id", campId).eq("date_str", date)
      .like("cache_key", `v${CACHE_VERSION}|base|${campId}|${date}|%`)
      .order("updated_at", { ascending: false }).limit(1).single();
    if (data?.envelope) return data.envelope as CachedPlanEnvelope;
  } catch { /* miss */ }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN API: getAiPlan
// ═══════════════════════════════════════════════════════════════════════

export async function getAiPlan(
  campground: Campground,
  weather: WeatherInput | null | undefined,
  places: CachedPlace[],
  lang: PlanLang,
  _currentTimeStr?: string,
  distanceMap?: Record<string, string>,
): Promise<ItineraryItem[]> {
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const date = todayStr();
  const wb = weatherBucket(rain, temp, wind);
  const dm = distanceMap ?? {};

  const baseKey = mkBaseKey(campground.id, date, wb);
  const trKey = mkTrKey(campground.id, date, wb, lang);

  const cachedTr = await cacheGet(trKey);
  if (cachedTr) return cachedTr.plan;

  let basePlan: ItineraryItem[];
  let pw: Record<Period, string>;

  const cachedBase = await cacheGet(baseKey);
  if (cachedBase) {
    basePlan = cachedBase.plan; pw = cachedBase.periodWeather;
  } else {
    const existing = await findExistingPlan(campground.id, date);
    if (existing && weather && isWeatherDrastic(existing.weatherKey, wb)) {
      const r = await handleWeatherChange(campground, weather, places, dm, existing, wb);
      basePlan = r.plan; pw = r.periodWeather;
      await cachePurge(campground.id, date);
    } else {
      const inflight = inflightGenerations.get(baseKey);
      if (inflight) {
        basePlan = await inflight;
        pw = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
      } else {
        const promise = generateBase(campground, weather, places, dm, date, wb, "en").then(r => r.plan);
        inflightGenerations.set(baseKey, promise);
        try {
          basePlan = await promise;
          pw = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
        } finally { inflightGenerations.delete(baseKey); }
      }
    }
    await cacheSet(baseKey, { plan: basePlan, timestamp: Date.now(), dateStr: date, weatherKey: wb, periodWeather: pw });
    pruneL1();
  }

  if (lang === "en") return basePlan;

  const byId = new Map(places.map(p => [p.id, p]));
  let translated: ItineraryItem[];
  const inflightTr = inflightTranslations.get(trKey);

  try {
    if (inflightTr) {
      translated = await inflightTr;
    } else {
      const trPromise = translatePlan(basePlan, lang, byId);
      inflightTranslations.set(trKey, trPromise);
      translated = await trPromise;
      inflightTranslations.delete(trKey);
    }

    await cacheSet(trKey, { plan: translated, timestamp: Date.now(), dateStr: date, weatherKey: wb, periodWeather: pw });
    pruneL1();
    return translated;

  } catch (err) {
    console.error(`[Planner] Translation to ${lang} failed, serving base plan temporarily:`, err);
    inflightTranslations.delete(trKey);
    return basePlan;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PREFETCH
// ═══════════════════════════════════════════════════════════════════════

async function warmTranslations(
  basePlan: ItineraryItem[], campground: Campground, places: CachedPlace[],
  date: string, wb: string, pw: Record<Period, string>,
): Promise<void> {
  const byId = new Map(places.map(p => [p.id, p]));

  const langsToWarm = ["de", "da", "nl", "no"] as PlanLang[];

  await Promise.allSettled(langsToWarm.map(async lang => {
    const key = mkTrKey(campground.id, date, wb, lang);
    if (await cacheGet(key)) return;
    const inflight = inflightTranslations.get(key);
    if (inflight) { await inflight; return; }

    const promise = translatePlan(basePlan, lang, byId);
    inflightTranslations.set(key, promise);
    try {
      const tr = await promise;
      await cacheSet(key, { plan: tr, timestamp: Date.now(), dateStr: date, weatherKey: wb, periodWeather: pw });
    } catch (err) {
      console.warn(`[Planner] Pre-warming translation for ${lang} failed.`);
    } finally {
      inflightTranslations.delete(key);
    }
  }));
}

export async function prefetchAiPlan(
  campground: Campground,
  weather: WeatherInput | null | undefined,
  places: CachedPlace[],
  distanceMap?: Record<string, string>,
): Promise<void> {
  cleanupOldCache().catch(() => {});

  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const date = todayStr();
  const wb = weatherBucket(rain, temp, wind);
  const dm = distanceMap ?? {};
  const baseKey = mkBaseKey(campground.id, date, wb);

  const cached = await cacheGet(baseKey);
  if (cached) {
    await warmTranslations(cached.plan, campground, places, date, wb, cached.periodWeather);
    return;
  }

  const pfKey = `${campground.id}|${date}|${wb}`;
  const existing = inflightPrefetches.get(pfKey);
  if (existing) { await existing; return; }

  const work = (async () => {
    let basePlan: ItineraryItem[];
    let pw: Record<Period, string>;

    const old = await findExistingPlan(campground.id, date);
    if (old && weather && isWeatherDrastic(old.weatherKey, wb)) {
      const r = await handleWeatherChange(campground, weather, places, dm, old, wb);
      basePlan = r.plan; pw = r.periodWeather;
      await cachePurge(campground.id, date);
    } else {
      const inflight = inflightGenerations.get(baseKey);
      if (inflight) {
        basePlan = await inflight;
        pw = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
      } else {
        const gen = generateBase(campground, weather, places, dm, date, wb, "en").then(r => r.plan);
        inflightGenerations.set(baseKey, gen);
        try { basePlan = await gen; pw = { morning: wb, lunch: wb, afternoon: wb, evening: wb }; }
        finally { inflightGenerations.delete(baseKey); }
      }
    }

    await cacheSet(baseKey, { plan: basePlan, timestamp: Date.now(), dateStr: date, weatherKey: wb, periodWeather: pw });
    pruneL1();
    await warmTranslations(basePlan, campground, places, date, wb, pw);
  })();

  inflightPrefetches.set(pfKey, work);
  try { await work; } finally { inflightPrefetches.delete(pfKey); }
}
