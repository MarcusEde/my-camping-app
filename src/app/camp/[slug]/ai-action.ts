// src/app/camp/[slug]/ai-action.ts
"use server";

import { getTodaysOpeningHours } from "@/lib/place-utils";
import { createClient } from "@/lib/supabase/server";
import type { CachedPlace, Campground, PlaceCategory } from "@/types/database";

// ─── Types ──────────────────────────────────────────────

export type PlanLang = "sv" | "en" | "de" | "da" | "nl" | "no";
type Period = "morning" | "lunch" | "afternoon" | "evening";

export interface ItineraryItem {
  time: string;
  period: Period;
  emoji: string;
  title: string;
  description: string;
  placeId?: string;
  tip?: string;
}

export interface CachedPlanEnvelope {
  plan: ItineraryItem[];
  weatherKey: string;
  dateStr: string;
  timestamp: number;
  periodWeather: Record<Period, string>;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    finishReason?: string;
  }[];
  error?: { message: string };
}

// ─── Timezone helpers ───────────────────────────────────

const TIMEZONE = "Europe/Stockholm";

function nowInSweden(): Date {
  const svStr = new Date().toLocaleString("en-US", { timeZone: TIMEZONE });
  return new Date(svStr);
}

function todayStr(): string {
  const sv = nowInSweden();
  const y = sv.getFullYear();
  const m = String(sv.getMonth() + 1).padStart(2, "0");
  const d = String(sv.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function currentSwedishHour(): number {
  const sv = nowInSweden();
  return sv.getHours() + sv.getMinutes() / 60;
}

function swedishDayOfWeek(): number {
  return nowInSweden().getDay();
}

function swedishMonth(): number {
  return nowInSweden().getMonth();
}

// ─── Cache layer ────────────────────────────────────────

const l1 = new Map<string, CachedPlanEnvelope>();
let lastCleanupDate = "";

async function cacheGet(key: string): Promise<CachedPlanEnvelope | null> {
  const date = todayStr();

  const mem = l1.get(key);
  if (mem && mem.dateStr === date) {
    return mem;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plan_cache")
      .select("envelope")
      .eq("cache_key", key)
      .single();

    if (data?.envelope) {
      const envelope = data.envelope as CachedPlanEnvelope;
      if (envelope.dateStr === date) {
        l1.set(key, envelope);
        return envelope;
      }
    }
  } catch {
    // cache miss
  }

  return null;
}

async function cacheSet(
  key: string,
  envelope: CachedPlanEnvelope,
): Promise<void> {
  l1.set(key, envelope);

  try {
    const supabase = await createClient();
    await supabase.from("plan_cache").upsert(
      {
        cache_key: key,
        campground_id: extractCampIdFromKey(key),
        envelope: envelope as unknown as Record<string, unknown>,
        date_str: envelope.dateStr,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch (e) {
    console.warn("[AI Planner] Supabase cache write error:", e);
  }
}

async function cacheDeleteForWeatherChange(
  campId: string,
  date: string,
): Promise<void> {
  for (const [k, v] of l1) {
    if (k.includes(campId) && v.dateStr === date) l1.delete(k);
  }

  try {
    const supabase = await createClient();
    await supabase
      .from("plan_cache")
      .delete()
      .eq("campground_id", campId)
      .eq("date_str", date);
  } catch (e) {
    console.warn("[AI Planner] Cache purge error:", e);
  }
}

function extractCampIdFromKey(key: string): string {
  const parts = key.split("|");
  return parts[1] ?? "unknown";
}

function pruneL1() {
  if (l1.size < 80) return;
  const today = todayStr();
  for (const [k, v] of l1) {
    if (v.dateStr !== today) l1.delete(k);
  }
}

async function maybeCleanupStaleCache(): Promise<void> {
  const today = todayStr();
  if (lastCleanupDate === today) return;
  lastCleanupDate = today;

  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("plan_cache")
      .delete({ count: "exact" })
      .neq("date_str", today);

    if (count && count > 0) {
      console.log(`[AI Planner] Cleaned up ${count} stale cache rows`);
    }
  } catch (e) {
    console.warn("[AI Planner] Cleanup error:", e);
    lastCleanupDate = "";
  }
}

// ── In-flight dedup ─────────────────────────────────────

const inflightGenerations = new Map<string, Promise<ItineraryItem[]>>();
const inflightTranslations = new Map<string, Promise<ItineraryItem[]>>();
const inflightPrefetches = new Map<string, Promise<void>>();

// ─── Weather bucketing ──────────────────────────────────

function weatherBucket(rain: boolean, temp: number, wind: number): string {
  const tBucket = Math.round(temp / 5) * 5;
  const wBucket = wind >= 10 ? "W" : "w";
  return `${rain ? "r" : "d"}_${tBucket}_${wBucket}`;
}

function isWeatherDrastic(oldWb: string, newWb: string): boolean {
  if (oldWb === newWb) return false;

  const parse = (wb: string) => {
    const [rw, t, w] = wb.split("_");
    return { rain: rw === "r", temp: parseInt(t), windy: w === "W" };
  };

  const o = parse(oldWb);
  const n = parse(newWb);

  if (o.rain !== n.rain) return true;
  if (o.windy !== n.windy) return true;
  if (Math.abs(o.temp - n.temp) >= 10) return true;

  return false;
}

// ─── Cache key builders ─────────────────────────────────

function mkBaseCacheKey(campId: string, date: string, wb: string): string {
  return `base|${campId}|${date}|${wb}`;
}

function mkTranslatedCacheKey(
  campId: string,
  date: string,
  wb: string,
  lang: PlanLang,
): string {
  return `tr|${campId}|${date}|${wb}|${lang}`;
}

// ─── Distance helpers ───────────────────────────────────

function getPlaceDistanceKm(
  place: CachedPlace,
  distanceMap: Record<string, string>,
): number {
  if (place.is_on_site) return 0;
  if (place.road_distance_km != null) return place.road_distance_km;

  const distStr = distanceMap[place.id];
  if (distStr) {
    const parsed = parseDistKm(distStr);
    if (parsed !== null) return parsed;
  }
  return 999;
}

function parseDistKm(dist: string): number | null {
  if (!dist) return null;
  const c = dist.replace(/\s/g, "").toLowerCase();
  if (c.includes("km")) {
    return parseFloat(c.replace("km", "").replace(",", ".")) || null;
  }
  if (c.includes("m")) {
    const meters = parseFloat(c.replace("m", "").replace(",", "."));
    return meters ? meters / 1000 : null;
  }
  return null;
}

function formatDistanceForDisplay(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ─── Opening-hours parsing ──────────────────────────────

interface TimeRange {
  open: number;
  close: number;
}

function parseTimeRange(text: string): TimeRange | null {
  if (!text) return null;

  if (/24\s*(hours|h|timmar|stunden|timer)|dygnet\s*runt|døgnåbent/i.test(text))
    return { open: 0, close: 24 };

  if (/closed|stängt|geschlossen|lukket/i.test(text)) return null;

  let m = text.match(/(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  if (m) {
    return {
      open: parseInt(m[1]) + parseInt(m[2]) / 60,
      close: parseInt(m[3]) + parseInt(m[4]) / 60,
    };
  }

  m = text.match(
    /(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)/i,
  );
  if (m) {
    let oH = parseInt(m[1]);
    const oM = m[2] ? parseInt(m[2]) : 0;
    if (m[3].toUpperCase() === "PM" && oH !== 12) oH += 12;
    if (m[3].toUpperCase() === "AM" && oH === 12) oH = 0;

    let cH = parseInt(m[4]);
    const cM = m[5] ? parseInt(m[5]) : 0;
    if (m[6].toUpperCase() === "PM" && cH !== 12) cH += 12;
    if (m[6].toUpperCase() === "AM" && cH === 12) cH = 0;

    return { open: oH + oM / 60, close: cH + cM / 60 };
  }
  return null;
}

function getPlaceHours(place: CachedPlace): {
  isClosedToday: boolean;
  text: string | null;
  range: TimeRange | null;
} {
  if (place.custom_hours) {
    const range = parseTimeRange(place.custom_hours);
    const isClosed = /closed|stängt|geschlossen|lukket/i.test(
      place.custom_hours,
    );
    return { isClosedToday: isClosed, text: place.custom_hours, range };
  }

  const data = getTodaysOpeningHours(place.raw_data);
  if (!data) return { isClosedToday: false, text: null, range: null };

  const isClosed = /closed|stängt|geschlossen|lukket/i.test(data.text);
  const range = data.text ? parseTimeRange(data.text) : null;
  return { isClosedToday: isClosed, text: data.text, range };
}

function isViableForSlot(
  place: CachedPlace,
  slotStart: number,
  slotEnd: number,
  minMinutes = 45,
): boolean {
  const h = getPlaceHours(place);
  if (h.isClosedToday) return false;
  if (!h.range) return true;

  const overlapStart = Math.max(slotStart, h.range.open);
  const overlapEnd = Math.min(slotEnd, h.range.close);
  return (overlapEnd - overlapStart) * 60 >= minMinutes;
}

function formatHoursForPrompt(place: CachedPlace): string {
  const h = getPlaceHours(place);
  if (h.isClosedToday) return "CLOSED TODAY";
  if (h.range) {
    const fmtH = (n: number) => {
      const hrs = Math.floor(n);
      const mins = Math.round((n - hrs) * 60);
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };
    return `open ${fmtH(h.range.open)}–${fmtH(h.range.close)}`;
  }
  if (h.text) return h.text;
  return "hours unknown";
}

// ─── Time-slot definitions ──────────────────────────────

interface SlotDef {
  period: Period;
  start: number;
  end: number;
  minDuration: number;
}

const SLOT_DEFS: Record<Period, SlotDef> = {
  morning: { period: "morning", start: 9, end: 11.5, minDuration: 45 },
  lunch: { period: "lunch", start: 11.5, end: 14, minDuration: 45 },
  afternoon: { period: "afternoon", start: 14, end: 17.5, minDuration: 45 },
  evening: { period: "evening", start: 18, end: 20.5, minDuration: 60 },
};

const PERIOD_ORDER: Period[] = ["morning", "lunch", "afternoon", "evening"];

// ─── Day context ────────────────────────────────────────

interface DayContext {
  dayName: string;
  isWeekend: boolean;
  isSummer: boolean;
  month: number;
  hour: number;
  season: "spring" | "summer" | "autumn" | "winter";
  /** 0–30: daily rotation for variety. Changes every day per campground. */
  rotationSeed: number;
}

function getDayCtx(lang: PlanLang, campId?: string): DayContext {
  const dow = swedishDayOfWeek();
  const month = swedishMonth();
  const hour = currentSwedishHour();

  const names: Record<PlanLang, string[]> = {
    sv: ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"],
    en: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    de: [
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
    ],
    da: [
      "søndag",
      "mandag",
      "tirsdag",
      "onsdag",
      "torsdag",
      "fredag",
      "lørdag",
    ],
    nl: [
      "zondag",
      "maandag",
      "dinsdag",
      "woensdag",
      "donderdag",
      "vrijdag",
      "zaterdag",
    ],
    no: [
      "søndag",
      "mandag",
      "tirsdag",
      "onsdag",
      "torsdag",
      "fredag",
      "lørdag",
    ],
  };

  const season: DayContext["season"] =
    month >= 5 && month <= 7
      ? "summer"
      : month >= 2 && month <= 4
        ? "spring"
        : month >= 8 && month <= 10
          ? "autumn"
          : "winter";

  // Use larger modulus for more daily variety (31 unique patterns per camp)
  const dateNum = parseInt(todayStr().replace(/-/g, ""), 10);
  const campHash = (campId ?? "")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const rotationSeed = (dateNum + campHash) % 31;

  return {
    dayName: names[lang][dow],
    isWeekend: dow === 0 || dow === 6,
    isSummer: season === "summer",
    month,
    hour,
    season,
    rotationSeed,
  };
}

// ─── Weather description mapping ────────────────────────

const WEATHER_LABELS: Record<string, string> = {
  clear: "clear skies",
  nearly_clear: "nearly clear",
  half_clear: "partly cloudy",
  partly_cloudy: "partly cloudy",
  cloudy: "cloudy",
  overcast: "overcast",
  fog: "foggy",
  light_rain: "light rain showers",
  rain: "rain",
  heavy_rain: "heavy rain",
  thunderstorm: "thunderstorm",
  light_sleet: "light sleet",
  sleet: "sleet",
  heavy_sleet: "heavy sleet",
  light_snow: "light snow",
  snow: "snow",
  heavy_snow: "heavy snow",
};

function readableWeather(descKey: string): string {
  return WEATHER_LABELS[descKey] ?? descKey;
}

// ─── Category helpers ───────────────────────────────────

const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  beach: "🏖️",
  park: "🌲",
  museum: "🏛️",
  cafe: "☕",
  restaurant: "🍽️",
  shopping: "🛍️",
  bowling: "🎳",
  swimming: "🏊",
  spa: "🧖",
  cinema: "🎬",
  activity: "🎯",
  playground: "🛝",
  sports: "🏸",
  attraction: "🎡",
  other: "⭐",
};

const INDOOR_CATS: PlaceCategory[] = [
  "museum",
  "shopping",
  "bowling",
  "swimming",
  "spa",
  "cinema",
];

const EXPOSED_OUTDOOR_CATS: PlaceCategory[] = [
  "beach",
  "playground",
  "sports",
  "park",
];

// ─── Name-based activity detection ──────────────────────

const WATER_ACTIVITY_RE =
  /\b(sup|kayak|kano|canoe|paddle|surf|sail|segel|bad|swim|dykning|dive|snork|jet.?ski|water.?ski|wakeboard|windsurf|kite|vattenski|vattensport|båt|boat|fishing|fiske)/i;

const EXPOSED_ACTIVITY_RE =
  /\b(golf|mini.?golf|klättr|climb|zip.?line|äventyr|adventure|skoter|snowmobil|riding|ridning|hike|vandr|cykel|bike|segway|paintball|laser.?tag.?out|skid|ski[^n]|skridskor|skate|rink)/i;

const TRAIL_WALK_RE =
  /\b(promenad|kustpromenad|vandringsled|trail|walk|stig|led\b|naturled|strandpromenad|coastal.?walk|nature.?walk|hiking.?trail|rundslinga|loop|spång|boardwalk)/i;

// ─── Deterministic shuffle ──────────────────────────────

/**
 * Deterministic shuffle of candidates within a score band.
 * Places within `bandSize` points of each other get shuffled
 * based on the rotation seed, so different days pick different
 * places even when scores are similar.
 */
function shuffleWithinBands<T extends { score: number }>(
  items: T[],
  seed: number,
  bandSize = 15,
): T[] {
  if (items.length <= 1) return items;

  const result: T[] = [];
  let remaining = [...items];

  while (remaining.length > 0) {
    const topScore = remaining[0].score;
    const bandEnd = remaining.findIndex(
      (item) => topScore - item.score > bandSize,
    );
    const bandItems =
      bandEnd === -1 ? remaining.splice(0) : remaining.splice(0, bandEnd);

    // Deterministic shuffle within the band using seed
    for (let i = bandItems.length - 1; i > 0; i--) {
      const j =
        (((seed * 31 + i * 17 + bandItems.length * 7) % (i + 1)) + (i + 1)) %
        (i + 1);
      [bandItems[i], bandItems[j]] = [bandItems[j], bandItems[i]];
    }

    result.push(...bandItems);
  }

  return result;
}

// ─── Scoring ────────────────────────────────────────────

interface Scored {
  place: CachedPlace;
  score: number;
  km: number;
  distStr: string;
  isClosedToday: boolean;
  hoursText: string | null;
  range: TimeRange | null;
}

function scorePlaces(
  places: CachedPlace[],
  rain: boolean,
  temp: number,
  wind: number,
  dm: Record<string, string>,
  isWeekend: boolean,
  rotationSeed: number,
): Scored[] {
  const highWind = wind >= 10;

  const scored = places
    .filter((p) => !p.is_hidden)
    .map((p): Scored => {
      let s = 50;
      const km = getPlaceDistanceKm(p, dm);
      const distStr = p.is_on_site
        ? "on site"
        : km < 999
          ? formatDistanceForDisplay(km)
          : (dm[p.id] ?? "");

      // ── Distance scoring ──
      if (p.is_on_site) s += 45;
      else if (km < 2) s += 40;
      else if (km < 5) s += 30;
      else if (km < 10) s += 20;
      else if (km < 20) s += 10;
      else if (km > 40) s -= 15;

      // ── Pinned boost ──
      if (p.is_pinned) s += 50;

      // ── Rating scoring ──
      if (p.rating) {
        if (p.rating >= 4.5) s += 25;
        else if (p.rating >= 4.0) s += 15;
        else if (p.rating >= 3.5) s += 5;
        else if (p.rating < 3.0) s -= 15;
      }

      // ── Weather scoring ──
      if (rain) {
        if (p.is_indoor) s += 30;
        if (INDOOR_CATS.includes(p.category)) s += 15;
        if (EXPOSED_OUTDOOR_CATS.includes(p.category)) s -= 35;
        if (temp < 10 && !p.is_indoor) s -= 10;
      } else {
        if (temp > 22 && p.category === "beach" && !highWind) s += 25;
        else if (temp > 18 && p.category === "beach") s += 10;
        if (temp > 20 && p.category === "park") s += 10;

        if (temp < 12 && !p.is_indoor) s -= 8;
        if (temp < 8 && !p.is_indoor) s -= 15;
        if (temp < 5 && !p.is_indoor) s -= 15;
        if (temp < 0 && !p.is_indoor) s -= 15;

        if (temp < 8 && EXPOSED_OUTDOOR_CATS.includes(p.category)) s -= 15;
        if (temp < 5 && EXPOSED_OUTDOOR_CATS.includes(p.category)) s -= 10;

        if (temp < 10 && p.is_indoor) s += 15;
        if (temp < 5 && p.is_indoor) s += 10;
        if (temp < 5 && INDOOR_CATS.includes(p.category)) s += 10;
      }

      // ── Wind scoring ──
      if (highWind && !p.is_indoor) {
        s -= 15;
        if (p.category === "beach") s -= 15;
        if (EXPOSED_OUTDOOR_CATS.includes(p.category)) s -= 5;
      }
      if (highWind && p.is_indoor) s += 10;

      // ── Name-based weather penalties ──
      const nameLower = p.name.toLowerCase();
      const isWaterActivity = WATER_ACTIVITY_RE.test(nameLower);
      const isExposedActivity = EXPOSED_ACTIVITY_RE.test(nameLower);

      if (isWaterActivity) {
        if (temp < 18) s -= 30;
        if (temp < 12) s -= 20;
        if (rain) s -= 15;
        if (highWind) s -= 20;
      }

      if (isExposedActivity && !p.is_indoor) {
        if (temp < 8) s -= 15;
        if (temp < 5) s -= 10;
        if (rain) s -= 10;
      }

      // ── Trail/walk rescue ──
      const isTrailWalk = TRAIL_WALK_RE.test(nameLower);
      if (isTrailWalk && !rain) {
        if (temp >= 0 && temp < 12) s += 25;
        if (temp >= 0 && temp < 5) s += 10;
      }
      if (isTrailWalk && rain) {
        s -= 10;
      }

      // ── Weekend boost ──
      if (
        isWeekend &&
        ["restaurant", "cafe", "shopping", "cinema"].includes(p.category)
      )
        s += 8;

      // ── Closed penalty ──
      const hours = getPlaceHours(p);
      if (hours.isClosedToday) s -= 200;

      // ── Daily variety boost ──
      // Wider range (-20 to +20) with larger modulus (41 values)
      // so patterns don't repeat for weeks
      const ih = p.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const varietyBoost = ((rotationSeed * 23 + ih * 13) % 41) - 20;
      s += varietyBoost;

      return {
        place: p,
        score: s,
        km,
        distStr,
        isClosedToday: hours.isClosedToday,
        hoursText: hours.text,
        range: hours.range,
      };
    })
    .filter((s) => !s.isClosedToday)
    .sort((a, b) => b.score - a.score);

  // Shuffle within score bands so places with similar scores rotate daily
  return shuffleWithinBands(scored, rotationSeed, 15);
}

// ─── Selection ──────────────────────────────────────────

function selectPlaces(
  scored: Scored[],
  rain: boolean,
  temp: number,
  wind: number,
) {
  const used = new Set<string>();
  const usedCategories: PlaceCategory[] = [];
  const highWind = wind >= 10;
  const isCold = temp < 8;

  const hasDiverseAlternative = (
    currentCat: PlaceCategory,
    cats: PlaceCategory[],
    slot: SlotDef,
  ): boolean =>
    scored.some(
      (o) =>
        !used.has(o.place.id) &&
        cats.includes(o.place.category) &&
        o.place.category !== currentCat &&
        isViableForSlot(o.place, slot.start, slot.end, slot.minDuration),
    );

  const pickFor = (
    period: Period,
    cats: PlaceCategory[],
    opts?: { indoor?: boolean; maxKm?: number; count?: number },
  ): Scored[] => {
    const { indoor, maxKm, count = 1 } = opts ?? {};
    const slot = SLOT_DEFS[period];
    const results: Scored[] = [];

    for (const c of scored) {
      if (results.length >= count) break;
      if (used.has(c.place.id)) continue;
      if (!cats.includes(c.place.category)) continue;
      if (indoor !== undefined && c.place.is_indoor !== indoor) continue;
      if (maxKm !== undefined && !c.place.is_on_site && c.km > maxKm) continue;
      if (!isViableForSlot(c.place, slot.start, slot.end, slot.minDuration))
        continue;

      const recentSame = usedCategories
        .slice(-3)
        .filter((cat) => cat === c.place.category).length;
      if (
        recentSame >= 1 &&
        hasDiverseAlternative(c.place.category, cats, slot)
      )
        continue;

      results.push(c);
      used.add(c.place.id);
      usedCategories.push(c.place.category);
    }
    return results;
  };

  const pickAnyFor = (
    period: Period,
    opts?: { exclude?: PlaceCategory[]; maxKm?: number },
  ): Scored | null => {
    const { exclude = [], maxKm } = opts ?? {};
    const slot = SLOT_DEFS[period];

    for (const c of scored) {
      if (used.has(c.place.id)) continue;
      if (exclude.includes(c.place.category)) continue;
      if (maxKm !== undefined && !c.place.is_on_site && c.km > maxKm) continue;
      if (!isViableForSlot(c.place, slot.start, slot.end, slot.minDuration))
        continue;

      used.add(c.place.id);
      usedCategories.push(c.place.category);
      return c;
    }
    return null;
  };

  // ── Morning ──
  const morning: Scored[] = [];
  if (rain || isCold) {
    morning.push(
      ...pickFor("morning", INDOOR_CATS, { indoor: true, maxKm: 20 }),
    );
    if (!morning.length) {
      morning.push(
        ...pickFor(
          "morning",
          ["museum", "cafe", "cinema", "activity", "attraction"],
          { maxKm: 20 },
        ),
      );
    }
  } else if (!rain && temp > 18 && !highWind) {
    morning.push(...pickFor("morning", ["beach", "park"], { maxKm: 15 }));
  } else {
    morning.push(...pickFor("morning", ["park", "attraction"], { maxKm: 20 }));
  }
  morning.push(...pickFor("morning", ["cafe"], { maxKm: 10 }));

  // ── Lunch ──
  const lunch: Scored[] = [];
  lunch.push(...pickFor("lunch", ["restaurant"]));
  if (!lunch.length) lunch.push(...pickFor("lunch", ["cafe"]));

  // ── Afternoon ──
  const afternoon: Scored[] = [];
  if (!rain && temp > 20 && !highWind && !isCold)
    afternoon.push(...pickFor("afternoon", ["beach"], { maxKm: 15 }));

  const aCats: PlaceCategory[] =
    rain || isCold
      ? [
          "bowling",
          "swimming",
          "spa",
          "museum",
          "shopping",
          "cinema",
          "activity",
          "attraction",
        ]
      : [
          "activity",
          "attraction",
          "sports",
          "playground",
          "bowling",
          "swimming",
          "spa",
          "museum",
          "park",
          "shopping",
          "cinema",
          "other",
        ];
  afternoon.push(...pickFor("afternoon", aCats, { count: 2 }));

  if (!afternoon.length) {
    const a = pickAnyFor("afternoon", {
      exclude: ["restaurant", "cafe"],
      maxKm: 30,
    });
    if (a) afternoon.push(a);
  }

  // ── Evening ──
  const evening: Scored[] = [];
  evening.push(...pickFor("evening", ["restaurant"]));
  if (!evening.length) evening.push(...pickFor("evening", ["cafe"]));

  // ── Extras ──
  const extras: Scored[] = [];
  for (let i = 0; i < 3; i++) {
    const e = pickAnyFor("afternoon", { maxKm: 25 });
    if (e) extras.push(e);
  }

  return { morning, lunch, afternoon, evening, extras };
}

// ─── Security ───────────────────────────────────────────

function sanitizeForPrompt(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[`"'{}[\]\\]/g, "")
    .replace(/ignore\s+(all\s+)?(previous\s+)?/gi, "")
    .replace(/system\s*:/gi, "")
    .replace(/\bprompt\b/gi, "")
    .trim()
    .slice(0, 100);
}

// ─── Build prompt ───────────────────────────────────────

const DAILY_VIBES = [
  "adventure-focused — suggest the most exciting and active options",
  "relaxation day — lean towards calm, restorative experiences",
  "foodie journey — emphasize culinary experiences and local flavors",
  "explorer mode — prioritize discovering hidden gems and unique spots",
  "family fun — focus on activities everyone can enjoy together",
  "culture & nature — mix outdoor beauty with local heritage",
  "spontaneous day — keep it casual and go-with-the-flow",
] as const;

function buildPrompt(
  campground: Campground,
  sel: ReturnType<typeof selectPlaces>,
  weather: {
    temp: number;
    isRaining: boolean;
    description?: string;
    windSpeed?: number;
  } | null,
  day: DayContext,
  periodsToGenerate?: Period[],
): string {
  const safeCampName = sanitizeForPrompt(campground.name);
  const vibe = DAILY_VIBES[day.rotationSeed % DAILY_VIBES.length];

  const fmt = (s: Scored) => {
    const safePlaceName = sanitizeForPrompt(s.place.name);
    const p = [
      `"${safePlaceName}"`,
      `cat:${s.place.category}`,
      s.place.is_on_site ? "ON-SITE (walking distance)" : `dist:${s.distStr}`,
    ];
    if (s.place.rating) p.push(`rating:${s.place.rating}`);
    if (s.place.is_indoor) p.push("indoor");
    p.push(formatHoursForPrompt(s.place));
    if (s.place.owner_note) {
      const safeNote = sanitizeForPrompt(s.place.owner_note);
      p.push(`tip:${safeNote}`);
    }
    p.push(`id:${s.place.id}`);
    return p.join(", ");
  };

  const sec: string[] = [];
  const slotLabel = (period: Period) => {
    const s = SLOT_DEFS[period];
    const fH = (n: number) => {
      const h = Math.floor(n);
      const m = Math.round((n - h) * 60);
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };
    return `${fH(s.start)}–${fH(s.end)}`;
  };

  const includePeriod = (p: Period) =>
    !periodsToGenerate || periodsToGenerate.includes(p);

  if (sel.morning.length && includePeriod("morning"))
    sec.push(
      `MORNING (suggest within ${slotLabel("morning")}, must fall inside place hours):\n${sel.morning.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.lunch.length && includePeriod("lunch"))
    sec.push(
      `LUNCH (suggest within ${slotLabel("lunch")}, must fall inside place hours):\n${sel.lunch.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.afternoon.length && includePeriod("afternoon"))
    sec.push(
      `AFTERNOON (suggest within ${slotLabel("afternoon")}, must fall inside place hours):\n${sel.afternoon.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.evening.length && includePeriod("evening"))
    sec.push(
      `EVENING (suggest within ${slotLabel("evening")}, must fall inside place hours):\n${sel.evening.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.extras.length)
    sec.push(
      `EXTRAS (optional, weave in if natural):\n${sel.extras.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );

  const weatherDesc = weather?.description
    ? readableWeather(weather.description)
    : "";
  const windNote =
    weather?.windSpeed && weather.windSpeed >= 8
      ? `, wind ${weather.windSpeed} m/s`
      : "";
  const wd = weather
    ? `${weather.temp}°C, ${weather.isRaining ? "rain" : weatherDesc || "dry"}${windNote}`
    : "Unknown, assume mild.";

  let wh = "";
  if (weather) {
    const { isRaining, temp: t, windSpeed: ws = 0 } = weather;
    if (isRaining && t < 5)
      wh = "Cold rain. Stay indoors — museums, cafes, spas, bowling, cinema.";
    else if (isRaining && t < 10)
      wh = "Cold rain. Cozy indoor activities preferred.";
    else if (isRaining && t > 12)
      wh = "Rain may clear later. Indoor morning, possibly outdoor afternoon.";
    else if (!isRaining && t > 22 && ws < 8)
      wh = "Great outdoor/beach weather.";
    else if (!isRaining && t > 22 && ws >= 8)
      wh = "Warm but windy. Sheltered outdoor spots preferred.";
    else if (!isRaining && t < 0)
      wh =
        "Freezing. Only warm indoor activities. Quick bundled-up walks at most.";
    else if (!isRaining && t < 5)
      wh =
        "Very cold but dry. Mostly indoor activities. A short bundled-up walk or trail is OK.";
    else if (!isRaining && t < 10)
      wh =
        "Cold but dry. Short walks and trails OK with warm clothes, no swimming or long outdoor stays.";
    else if (!isRaining && t >= 10 && t <= 18)
      wh = "Mild weather, good for sightseeing and walks.";
  }

  const season = day.season.charAt(0).toUpperCase() + day.season.slice(1);

  const periodsNote = periodsToGenerate
    ? `\nONLY generate items for these periods: ${periodsToGenerate.join(", ")}. The other periods already have items.`
    : "";

  const coldWarning =
    weather && weather.temp < 8
      ? `\nIMPORTANT: It is cold outside. Strongly prefer indoor activities. Walking trails are OK if you mention dressing warm. Do NOT suggest water sports, swimming outdoors, or beach activities.`
      : "";

  return `Write a day plan for camping guests at "${safeCampName}".

Day: ${day.dayName}${day.isWeekend ? " (weekend)" : ""}
Weather: ${wd}${wh ? `\nForecast hint: ${wh}` : ""}${coldWarning}
Season: ${season}
Today's vibe: ${vibe}
Language: ALL text in English
${periodsNote}

Places (pre-filtered, all open during their slot):
${sec.join("\n\n")}

Return a JSON array. No markdown. No code fences. Just [ ... ].

Each object:
{"time":"HH:MM","period":"morning|lunch|afternoon|evening","emoji":"…","title":"…","description":"…","placeId":"…or omit","tip":"…or omit"}

Rules:
- ${periodsToGenerate ? `Generate items ONLY for: ${periodsToGenerate.join(", ")}.` : "5–7 items from morning to evening."}
- CRITICAL: Each place has opening hours listed (e.g., "open 09:00–17:00"). The "time" you suggest MUST fall within those hours. Never schedule outside.
- Places marked ON-SITE are within the campground — say "right here at camp" or similar, never driving directions.
- ${!periodsToGenerate || periodsToGenerate.includes("evening") ? "End with a varied evening-at-camp item. Pick from: campfire, stargazing, sunset walk, board games, movie night, marshmallows, BBQ, or relaxing. Match to weather and season." : ""}
- "description": 1–2 SHORT sentences. Local friend tone. Be creative and specific — avoid generic phrases.
- CRITICAL: Do NOT mention exact temperature numbers (like "4°C" or "25 degrees") in descriptions or tips. Use descriptive words instead: "chilly", "brisk", "cold", "mild", "warm", "hot", "gorgeous". The exact temperature is already shown in the UI.
- "tip": max 8 words. Distance, rating, hours, or weather note. Omit if nothing useful.
- Do NOT say "recommended" or "promoted". Sound natural.
- ONLY use places listed above. Use exact id values for placeId.
- No duplicate places.
- Match today's vibe: ${vibe}.`;
}

// ─── JSON repair ────────────────────────────────────────

function repairJSON(raw: string): string {
  let s = raw.trim();

  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  const start = s.indexOf("[");
  if (start > 0) s = s.slice(start);
  if (!s.startsWith("[")) s = "[" + s;

  const end = s.lastIndexOf("]");
  if (end > 0) {
    s = s.slice(0, end + 1);
  } else {
    const lb = s.lastIndexOf("}");
    if (lb > 0) s = s.slice(0, lb + 1) + "]";
    else return "[]";
  }

  s = s.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
  s = s.replace(/("(?:[^"\\]|\\.)*")|[\n\r]+/g, (m, q) => (q ? q : " "));

  let inStr = false;
  let lastQ = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== "\\")) {
      inStr = !inStr;
      if (inStr) lastQ = i;
    }
  }
  if (inStr && lastQ >= 0) {
    const before = s.slice(0, lastQ);
    const lo = before.lastIndexOf("}");
    if (lo > 0) s = before.slice(0, lo + 1).replace(/,\s*$/, "") + "]";
    else return "[]";
  }

  return s;
}

function parseItems(raw: string): ItineraryItem[] | null {
  const cleaned = repairJSON(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(
      "[AI Planner] JSON parse failed. First 400:",
      cleaned.slice(0, 400),
    );
    return null;
  }

  let arr: unknown[] | null = null;
  if (Array.isArray(parsed)) arr = parsed;
  else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    for (const k of ["items", "plan", "itinerary", "data"]) {
      if (Array.isArray(obj[k])) {
        arr = obj[k] as unknown[];
        break;
      }
    }
  }
  if (!arr?.length) return null;

  const validP = new Set<Period>(["morning", "lunch", "afternoon", "evening"]);
  const items: ItineraryItem[] = [];

  for (const x of arr) {
    if (typeof x !== "object" || !x) continue;
    const it = x as Record<string, unknown>;
    if (!it.time || !it.period || !it.title || !it.description) continue;
    const period = String(it.period);
    if (!validP.has(period as Period)) continue;

    items.push({
      time: String(it.time),
      period: period as Period,
      emoji: it.emoji ? String(it.emoji) : "📍",
      title: String(it.title),
      description: String(it.description),
      placeId:
        it.placeId && it.placeId !== "null" && it.placeId !== ""
          ? String(it.placeId)
          : undefined,
      tip:
        it.tip && it.tip !== "null" && it.tip !== ""
          ? String(it.tip)
          : undefined,
    });
  }

  return items.length >= 1 ? items : null;
}

// ─── Post-validation ────────────────────────────────────

function postValidatePlan(
  plan: ItineraryItem[],
  placesById: Map<string, CachedPlace>,
): ItineraryItem[] {
  return plan.map((item) => {
    if (!item.placeId) return item;

    const place = placesById.get(item.placeId);
    if (!place) return { ...item, placeId: undefined };

    const hours = getPlaceHours(place);
    if (hours.isClosedToday) return { ...item, placeId: undefined };
    if (!hours.range) return item;

    const timeParts = item.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeParts) return item;

    const suggested = parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;

    if (suggested >= hours.range.open && suggested < hours.range.close - 0.25)
      return item;

    const slot = SLOT_DEFS[item.period];
    const validStart = Math.max(slot.start, hours.range.open);
    const validEnd = Math.min(slot.end, hours.range.close - 0.25);

    if (validStart < validEnd) {
      const h = Math.floor(validStart);
      const m = Math.round((validStart - h) * 60);
      const adjusted = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      return { ...item, time: adjusted };
    }

    return { ...item, placeId: undefined };
  });
}

// ─── Template fallback ──────────────────────────────────

function fallback(
  sel: ReturnType<typeof selectPlaces>,
  weather: { temp: number; isRaining: boolean; windSpeed?: number } | null,
  day: DayContext,
  periodsToGenerate?: Period[],
): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;

  const include = (p: Period) =>
    !periodsToGenerate || periodsToGenerate.includes(p);

  const weatherAdj = rain
    ? "Despite the rain, "
    : temp > 25
      ? "What a gorgeous day — "
      : temp < 5
        ? "It's freezing out! "
        : temp < 10
          ? "Bundle up! "
          : "";

  if (include("morning")) {
    if (sel.morning[0]) {
      const p = sel.morning[0];
      const loc = p.place.is_on_site ? ", right here at camp" : "";
      items.push({
        time: "09:00",
        period: "morning",
        emoji: CATEGORY_EMOJI[p.place.category] ?? "📍",
        title: p.place.name,
        description: `${weatherAdj}Start the day at ${p.place.name}${loc}.`,
        placeId: p.place.id,
        tip: p.place.is_on_site ? "On site" : p.distStr || undefined,
      });
    }
    if (sel.morning[1]) {
      const p = sel.morning[1];
      items.push({
        time: "10:30",
        period: "morning",
        emoji: "☕",
        title: p.place.name,
        description:
          temp < 5
            ? `Warm up with a hot drink at ${p.place.name}.`
            : `Grab a coffee at ${p.place.name}.`,
        placeId: p.place.id,
        tip: p.distStr || undefined,
      });
    }
  }

  if (include("lunch")) {
    if (sel.lunch[0]) {
      const p = sel.lunch[0];
      items.push({
        time: "12:30",
        period: "lunch",
        emoji: "🍽️",
        title: p.place.name,
        description: `Lunch at ${p.place.name}.`,
        placeId: p.place.id,
        tip: p.place.rating
          ? `Rated ${p.place.rating}`
          : p.distStr || undefined,
      });
    } else {
      items.push({
        time: "12:00",
        period: "lunch",
        emoji: "🧺",
        title: "Picnic",
        description:
          rain || temp < 5
            ? "Grab lunch at the camp kitchen — cozy indoor picnic!"
            : "Pack a picnic and find a nice spot!",
      });
    }
  }

  if (include("afternoon")) {
    for (const [i, p] of sel.afternoon.slice(0, 2).entries()) {
      items.push({
        time: i === 0 ? "14:30" : "16:00",
        period: "afternoon",
        emoji: CATEGORY_EMOJI[p.place.category] ?? "📍",
        title: p.place.name,
        description: `Head to ${p.place.name} for the afternoon.`,
        placeId: p.place.id,
        tip: p.distStr || undefined,
      });
    }
  }

  if (include("evening")) {
    if (sel.evening[0]) {
      const p = sel.evening[0];
      items.push({
        time: "18:30",
        period: "evening",
        emoji: "🍷",
        title: p.place.name,
        description: `Dinner at ${p.place.name}.`,
        placeId: p.place.id,
        tip: p.distStr || undefined,
      });
    }

    interface EveningOption {
      emoji: string;
      title: string;
      description: string;
    }
    const opts: EveningOption[] = [];

    if (!rain && temp > 15 && wind < 8) {
      opts.push({
        emoji: "🔥",
        title: "Campfire evening",
        description: "End the day around the campfire.",
      });
      opts.push({
        emoji: "🌅",
        title: "Sunset walk",
        description: "Take a walk and catch the sunset.",
      });
    }
    if (!rain && day.isSummer && wind < 5)
      opts.push({
        emoji: "✨",
        title: "Stargazing",
        description: "Look up — summer nights are magical.",
      });
    if (!rain && wind < 5 && temp > 10)
      opts.push({
        emoji: "🍢",
        title: "Marshmallow roast",
        description: "Grab some marshmallows and enjoy the evening.",
      });
    if (rain || temp < 10) {
      opts.push({
        emoji: "🎲",
        title: "Game night",
        description: "Cozy up with some board games.",
      });
      opts.push({
        emoji: "🎬",
        title: "Movie night",
        description: "Time for a movie — grab the snacks!",
      });
      opts.push({
        emoji: "☕",
        title: "Cozy evening",
        description: "Hot cocoa and relaxation. You've earned it.",
      });
    }
    if (temp < 5) {
      opts.push({
        emoji: "🧣",
        title: "Warm & cozy evening",
        description:
          "Stay warm inside. Hot chocolate, blankets, and good company.",
      });
    }
    if (day.season === "autumn" && !rain && temp >= 8)
      opts.push({
        emoji: "🍂",
        title: "Evening at camp",
        description: "Enjoy the crisp autumn evening. Maybe a warm drink.",
      });
    if (day.season === "winter")
      opts.push({
        emoji: "❄️",
        title: "Winter evening at camp",
        description: "Cozy up inside. Cold outside but charming.",
      });
    if (!opts.length)
      opts.push({
        emoji: "🌙",
        title: "Evening at camp",
        description: "Relax and enjoy the evening.",
      });

    items.push({
      time: "21:00",
      period: "evening",
      ...opts[day.rotationSeed % opts.length],
    });
  }

  return items;
}

// ─── Gemini 2.5 Flash ───────────────────────────────────

async function callGemini(
  prompt: string,
  attempt = 1,
): Promise<ItineraryItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    apiKey;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    });

    if (!res.ok) {
      const status = res.status;
      console.error(`[AI Planner] HTTP ${status}`);
      if (status === 429 && attempt < 3) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((r) => setTimeout(r, delay));
        return callGemini(prompt, attempt + 1);
      }
      if (status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
        return callGemini(prompt, attempt + 1);
      }
      return null;
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      if (data?.candidates?.[0]?.finishReason === "SAFETY")
        console.warn("[AI Planner] Blocked by safety filter");
      return null;
    }

    const items = parseItems(text);
    if (items) {
      console.log(`[AI Planner] OK: ${items.length} items`);
      return items;
    }

    if (attempt < 2) {
      return callGemini(
        prompt +
          "\n\nCRITICAL: Max 15 words per description. Return ONLY a JSON array.",
        attempt + 1,
      );
    }
    return null;
  } catch (err) {
    console.error("[AI Planner]", err);
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return callGemini(prompt, attempt + 1);
    }
    return null;
  }
}

// ─── Translation ────────────────────────────────────────

async function translatePlan(
  plan: ItineraryItem[],
  targetLang: PlanLang,
  placesById: Map<string, CachedPlace>,
): Promise<ItineraryItem[]> {
  if (targetLang === "en") return plan;

  const langNames: Record<PlanLang, string> = {
    sv: "Swedish",
    en: "English",
    de: "German",
    da: "Danish",
    nl: "Dutch",
    no: "Norwegian",
  };

  const toTranslate = plan.map((item, i) => ({
    i,
    title: item.title,
    description: item.description,
    ...(item.tip ? { tip: item.tip } : {}),
  }));

  const prompt = `Translate this JSON array from English to ${langNames[targetLang]}.

Rules:
- Translate ONLY "title", "description", and "tip" fields.
- Keep proper nouns (place names, business names) exactly as-is.
- Short, friendly, casual tone — like a local friend.
- Keep distances, ratings, numbers as-is.
- Return ONLY the translated JSON array. No markdown, no code fences.

${JSON.stringify(toTranslate)}`;

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return plan;

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      apiKey;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    });

    if (!res.ok) return plan;

    const data = (await res.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return plan;

    const cleaned = repairJSON(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return plan;
    }
    if (!Array.isArray(parsed)) return plan;

    const translated = plan.map((item, i) => {
      const tr = (parsed as unknown[])[i] as
        | Record<string, unknown>
        | undefined;
      if (!tr || typeof tr !== "object") return item;

      let translatedTip = item.tip;
      if (item.placeId && item.tip) {
        const place = placesById.get(item.placeId);
        const langKey = targetLang as "en" | "de" | "da";
        const preTr = place?.note_translations?.[langKey];
        if (preTr) translatedTip = preTr;
      }
      if (typeof tr.tip === "string" && tr.tip) translatedTip = tr.tip;

      return {
        ...item,
        title: typeof tr.title === "string" && tr.title ? tr.title : item.title,
        description:
          typeof tr.description === "string" && tr.description
            ? tr.description
            : item.description,
        tip: item.tip ? translatedTip : undefined,
      };
    });

    return translated;
  } catch (err) {
    console.error(`[AI Planner] Translation to ${targetLang} failed:`, err);
    return plan;
  }
}

// ─── Dimming logic (server-side, mirrors client) ────────

function getItemMinutes(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
}

function computeDimmedPeriods(items: ItineraryItem[]): Set<Period> {
  const hour = currentSwedishHour();
  const nowMin = Math.floor(hour * 60);
  const dimmed = new Set<Period>();

  for (let i = 0; i < items.length; i++) {
    const next = items[i + 1];
    const isDimmed = next
      ? nowMin >= getItemMinutes(next.time)
      : nowMin > getItemMinutes(items[i].time) + 90;

    if (isDimmed) {
      dimmed.add(items[i].period);
    }
  }

  return dimmed;
}

function getFuturePeriods(existingPlan: ItineraryItem[]): Period[] {
  const dimmedPeriods = computeDimmedPeriods(existingPlan);
  return PERIOD_ORDER.filter((p) => !dimmedPeriods.has(p));
}

// ─── Base plan generation ───────────────────────────────

async function generateBasePlan(
  campground: Campground,
  weather:
    | {
        temp: number;
        isRaining: boolean;
        description: string;
        icon: string;
        windSpeed: number;
      }
    | null
    | undefined,
  places: CachedPlace[],
  distanceMap: Record<string, string>,
  date: string,
  wb: string,
  baseKey: string,
  periodsToGenerate?: Period[],
): Promise<{
  plan: ItineraryItem[];
  periodWeather: Record<Period, string>;
}> {
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const day = getDayCtx("en", campground.id);

  const scored = scorePlaces(
    places,
    rain,
    temp,
    wind,
    distanceMap,
    day.isWeekend,
    day.rotationSeed,
  );
  const sel = selectPlaces(scored, rain, temp, wind);

  const prompt = buildPrompt(
    campground,
    sel,
    weather
      ? {
          temp,
          isRaining: rain,
          description: weather.description,
          windSpeed: wind,
        }
      : null,
    day,
    periodsToGenerate,
  );
  let plan = await callGemini(prompt);

  if (!plan || plan.length < 1) {
    console.log("[AI Planner] Using template fallback");
    plan = fallback(
      sel,
      weather ? { temp, isRaining: rain, windSpeed: wind } : null,
      day,
      periodsToGenerate,
    );
  }

  const placesById = new Map(places.map((p) => [p.id, p]));

  plan = plan.map((item) => ({
    ...item,
    placeId:
      item.placeId && placesById.has(item.placeId) ? item.placeId : undefined,
  }));

  plan = postValidatePlan(plan, placesById);

  const periodWeather: Record<Period, string> = {
    morning: wb,
    lunch: wb,
    afternoon: wb,
    evening: wb,
  };

  return { plan, periodWeather };
}

// ─── Partial regeneration on weather change ─────────────

async function handleWeatherChange(
  campground: Campground,
  weather: {
    temp: number;
    isRaining: boolean;
    description: string;
    icon: string;
    windSpeed: number;
  },
  places: CachedPlace[],
  distanceMap: Record<string, string>,
  existingEnvelope: CachedPlanEnvelope,
  newWb: string,
): Promise<{
  plan: ItineraryItem[];
  periodWeather: Record<Period, string>;
}> {
  const existingPlan = existingEnvelope.plan;
  const futurePeriods = getFuturePeriods(existingPlan);

  if (futurePeriods.length === 0) {
    return {
      plan: existingPlan,
      periodWeather: existingEnvelope.periodWeather,
    };
  }

  const periodsToRegen = futurePeriods.filter((p) =>
    isWeatherDrastic(existingEnvelope.periodWeather[p], newWb),
  );

  if (periodsToRegen.length === 0) {
    return {
      plan: existingPlan,
      periodWeather: existingEnvelope.periodWeather,
    };
  }

  console.log(
    `[AI Planner] Weather changed: regenerating ${periodsToRegen.join(", ")} for ${campground.name}`,
  );

  const date = todayStr();
  const { plan: newItems, periodWeather: newPw } = await generateBasePlan(
    campground,
    weather,
    places,
    distanceMap,
    date,
    newWb,
    "",
    periodsToRegen,
  );

  const pastItems = existingPlan.filter(
    (item) => !periodsToRegen.includes(item.period),
  );
  const mergedPlan = [...pastItems, ...newItems].sort(
    (a, b) => getItemMinutes(a.time) - getItemMinutes(b.time),
  );

  const mergedPw = { ...existingEnvelope.periodWeather };
  for (const p of periodsToRegen) {
    mergedPw[p] = newPw[p];
  }

  return { plan: mergedPlan, periodWeather: mergedPw };
}

// ─── Find existing plan for date ────────────────────────

async function findExistingPlanForDate(
  campId: string,
  date: string,
): Promise<CachedPlanEnvelope | null> {
  for (const [k, v] of l1) {
    if (k.startsWith(`base|${campId}|${date}|`) && v.dateStr === date) {
      return v;
    }
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plan_cache")
      .select("envelope")
      .eq("campground_id", campId)
      .eq("date_str", date)
      .like("cache_key", `base|${campId}|${date}|%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.envelope) {
      return data.envelope as CachedPlanEnvelope;
    }
  } catch {
    // No existing plan
  }

  return null;
}

// ─── Server action: get plan ────────────────────────────

export async function getAiPlan(
  campground: Campground,
  weather:
    | {
        temp: number;
        isRaining: boolean;
        description: string;
        icon: string;
        windSpeed: number;
      }
    | null
    | undefined,
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

  const baseKey = mkBaseCacheKey(campground.id, date, wb);
  const translatedKey = mkTranslatedCacheKey(campground.id, date, wb, lang);

  // 1. Translated cache
  const cachedTranslated = await cacheGet(translatedKey);
  if (cachedTranslated) return cachedTranslated.plan;

  // 2. Base cache with weather change detection
  let basePlan: ItineraryItem[];
  let periodWeather: Record<Period, string>;
  const cachedBase = await cacheGet(baseKey);

  if (cachedBase) {
    basePlan = cachedBase.plan;
    periodWeather = cachedBase.periodWeather;
  } else {
    const existingEnvelope = await findExistingPlanForDate(campground.id, date);

    if (
      existingEnvelope &&
      weather &&
      isWeatherDrastic(existingEnvelope.weatherKey, wb)
    ) {
      const result = await handleWeatherChange(
        campground,
        weather,
        places,
        dm,
        existingEnvelope,
        wb,
      );
      basePlan = result.plan;
      periodWeather = result.periodWeather;
      await cacheDeleteForWeatherChange(campground.id, date);
    } else {
      const inflight = inflightGenerations.get(baseKey);
      if (inflight) {
        basePlan = await inflight;
        periodWeather = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
      } else {
        const promise = generateBasePlan(
          campground,
          weather,
          places,
          dm,
          date,
          wb,
          baseKey,
        ).then((r) => r.plan);
        inflightGenerations.set(baseKey, promise);
        try {
          basePlan = await promise;
          periodWeather = {
            morning: wb,
            lunch: wb,
            afternoon: wb,
            evening: wb,
          };
        } finally {
          inflightGenerations.delete(baseKey);
        }
      }
    }

    await cacheSet(baseKey, {
      plan: basePlan,
      timestamp: Date.now(),
      dateStr: date,
      weatherKey: wb,
      periodWeather,
    });
    pruneL1();
  }

  // 3. Translate
  const placesById = new Map(places.map((p) => [p.id, p]));
  let translatedPlan: ItineraryItem[];
  const inflightTr = inflightTranslations.get(translatedKey);
  if (inflightTr) {
    translatedPlan = await inflightTr;
  } else {
    const trPromise = translatePlan(basePlan, lang, placesById);
    inflightTranslations.set(translatedKey, trPromise);
    try {
      translatedPlan = await trPromise;
    } finally {
      inflightTranslations.delete(translatedKey);
    }
  }

  // 4. Cache translated
  await cacheSet(translatedKey, {
    plan: translatedPlan,
    timestamp: Date.now(),
    dateStr: date,
    weatherKey: wb,
    periodWeather: periodWeather!,
  });
  pruneL1();

  return translatedPlan;
}

// ─── Warm-up helpers ────────────────────────────────────

const DEFAULT_LANGS: PlanLang[] = ["sv", "en", "de", "da", "nl", "no"];

function getSupportedLangs(campground: Campground): PlanLang[] {
  const dbLangs = (campground.supported_languages ?? []).filter(
    (l): l is PlanLang => DEFAULT_LANGS.includes(l as PlanLang),
  );
  const merged = new Set<PlanLang>([...DEFAULT_LANGS, ...dbLangs]);
  return Array.from(merged);
}

async function warmAllTranslations(
  basePlan: ItineraryItem[],
  campground: Campground,
  places: CachedPlace[],
  date: string,
  wb: string,
  periodWeather: Record<Period, string>,
): Promise<void> {
  const placesById = new Map(places.map((p) => [p.id, p]));
  const langs = getSupportedLangs(campground).filter((l) => l !== "en");

  const results = await Promise.allSettled(
    langs.map(async (lang) => {
      const key = mkTranslatedCacheKey(campground.id, date, wb, lang);

      const existing = await cacheGet(key);
      if (existing) return;

      const inflight = inflightTranslations.get(key);
      if (inflight) {
        await inflight;
        return;
      }

      const promise = translatePlan(basePlan, lang, placesById);
      inflightTranslations.set(key, promise);
      try {
        const translated = await promise;
        await cacheSet(key, {
          plan: translated,
          timestamp: Date.now(),
          dateStr: date,
          weatherKey: wb,
          periodWeather,
        });
        console.log(`[AI Planner] Warmed ${lang} for ${campground.name}`);
      } finally {
        inflightTranslations.delete(key);
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed)
    console.warn(`[AI Planner] ${failed} warm-up translation(s) failed`);
}

// ─── Prefetch (called on every page load) ───────────────

export async function prefetchAiPlan(
  campground: Campground,
  weather:
    | {
        temp: number;
        isRaining: boolean;
        description: string;
        icon: string;
        windSpeed: number;
      }
    | null
    | undefined,
  places: CachedPlace[],
  distanceMap?: Record<string, string>,
): Promise<void> {
  maybeCleanupStaleCache().catch(() => {});

  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const date = todayStr();
  const wb = weatherBucket(rain, temp, wind);
  const dm = distanceMap ?? {};
  const baseKey = mkBaseCacheKey(campground.id, date, wb);

  const cachedBase = await cacheGet(baseKey);
  if (cachedBase) {
    await warmAllTranslations(
      cachedBase.plan,
      campground,
      places,
      date,
      wb,
      cachedBase.periodWeather,
    );
    return;
  }

  const existingEnvelope = await findExistingPlanForDate(campground.id, date);

  const prefetchKey = `${campground.id}|${date}|${wb}`;
  const existing = inflightPrefetches.get(prefetchKey);
  if (existing) {
    await existing;
    return;
  }

  const work = (async () => {
    let basePlan: ItineraryItem[];
    let periodWeather: Record<Period, string>;

    if (
      existingEnvelope &&
      weather &&
      isWeatherDrastic(existingEnvelope.weatherKey, wb)
    ) {
      console.log(
        `[AI Planner] Prefetch: weather changed for ${campground.name}, partial regen`,
      );
      const result = await handleWeatherChange(
        campground,
        weather,
        places,
        dm,
        existingEnvelope,
        wb,
      );
      basePlan = result.plan;
      periodWeather = result.periodWeather;
      await cacheDeleteForWeatherChange(campground.id, date);
    } else {
      const inflightGen = inflightGenerations.get(baseKey);
      if (inflightGen) {
        basePlan = await inflightGen;
        periodWeather = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
      } else {
        const genPromise = generateBasePlan(
          campground,
          weather,
          places,
          dm,
          date,
          wb,
          baseKey,
        ).then((r) => r.plan);
        inflightGenerations.set(baseKey, genPromise);
        try {
          basePlan = await genPromise;
          periodWeather = {
            morning: wb,
            lunch: wb,
            afternoon: wb,
            evening: wb,
          };
        } finally {
          inflightGenerations.delete(baseKey);
        }
      }
    }

    await cacheSet(baseKey, {
      plan: basePlan,
      timestamp: Date.now(),
      dateStr: date,
      weatherKey: wb,
      periodWeather,
    });
    pruneL1();

    await warmAllTranslations(
      basePlan,
      campground,
      places,
      date,
      wb,
      periodWeather,
    );
  })();

  inflightPrefetches.set(prefetchKey, work);
  try {
    await work;
  } finally {
    inflightPrefetches.delete(prefetchKey);
  }
}
