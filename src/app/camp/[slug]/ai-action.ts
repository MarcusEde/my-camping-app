"use server";

import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { CachedPlace, Campground, PlaceCategory } from "@/types/database";

// ─── Types ──────────────────────────────────────────────

export type PlanLang = "sv" | "en" | "de" | "da";
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

// ─── Timezone helpers ───────────────────────────────────
//
// All campgrounds use SMHI (Swedish weather) → all are in Sweden.
// On Cloudflare Workers, `Date` uses UTC. Every time calculation
// must go through these helpers to avoid off-by-one-hour / wrong-
// day bugs that silently corrupt plans.

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

// ─── Cache ──────────────────────────────────────────────
//
// ⚠️  CLOUDFLARE: In-memory Maps do NOT survive across
// Worker invocations. For production, swap the backing store
// to Cloudflare KV, D1, or a Supabase cache table.
// The pattern (base + translated, in-flight dedup) stays the same.

interface CachedPlan {
  plan: ItineraryItem[];
  timestamp: number;
  dateStr: string;
  weatherKey: string;
}

const planCache = new Map<string, CachedPlan>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 4 h — plans go stale faster than 24 h

const inflightGenerations = new Map<string, Promise<ItineraryItem[]>>();
const inflightTranslations = new Map<string, Promise<ItineraryItem[]>>();

/** 3 °C temperature buckets + wind threshold → finer weather key. */
function weatherBucket(rain: boolean, temp: number, wind: number): string {
  const tBucket = Math.round(temp / 3) * 3;
  const wBucket = wind >= 10 ? "W" : "w";
  return `${rain ? "r" : "d"}_${tBucket}_${wBucket}`;
}

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

let lastPruneTime = 0;

function pruneCache() {
  const now = Date.now();
  if (now - lastPruneTime < 60_000 && planCache.size < 200) return;
  lastPruneTime = now;
  const today = todayStr();
  for (const [k, v] of planCache) {
    if (v.dateStr !== today || now - v.timestamp > CACHE_TTL)
      planCache.delete(k);
  }
}

// ─── Distance helpers ───────────────────────────────────
//
// Prefer the pre-computed `road_distance_km` column (OSRM)
// that already lives on CachedPlace.  Fall back to the
// distanceMap string (formatted like "3.5 km" / "350 m"),
// then to 999 km (= "unknown, treat as far").

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
  open: number; // decimal hours, 9.5 = 09:30
  close: number;
}

function parseTimeRange(text: string): TimeRange | null {
  if (!text) return null;

  if (/24\s*(hours|h|timmar|stunden|timer)|dygnet\s*runt|døgnåbent/i.test(text))
    return { open: 0, close: 24 };

  if (/closed|stängt|geschlossen|lukket/i.test(text)) return null;

  // 24 h format: "09:00 – 17:30"
  let m = text.match(/(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  if (m) {
    return {
      open: parseInt(m[1]) + parseInt(m[2]) / 60,
      close: parseInt(m[3]) + parseInt(m[4]) / 60,
    };
  }

  // 12 h format: "9:00 AM – 5:00 PM"
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

/**
 * Can the guest arrive during [slotStart, slotEnd) and spend at
 * least `minMinutes` inside the place before it closes?
 */
function isViableForSlot(
  place: CachedPlace,
  slotStart: number,
  slotEnd: number,
  minMinutes = 45,
): boolean {
  const h = getPlaceHours(place);
  if (h.isClosedToday) return false;
  if (!h.range) return true; // unknown hours → benefit of the doubt

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
  start: number; // earliest suggested arrival
  end: number; // latest suggested arrival
  minDuration: number; // minimum useful minutes at venue
}

const SLOT_DEFS: Record<Period, SlotDef> = {
  morning: { period: "morning", start: 9, end: 11.5, minDuration: 45 },
  lunch: { period: "lunch", start: 11.5, end: 14, minDuration: 45 },
  afternoon: { period: "afternoon", start: 14, end: 17.5, minDuration: 45 },
  evening: { period: "evening", start: 18, end: 20.5, minDuration: 60 },
};

// ─── Day context ────────────────────────────────────────

interface DayContext {
  dayName: string;
  isWeekend: boolean;
  isSummer: boolean;
  month: number;
  hour: number;
  season: "spring" | "summer" | "autumn" | "winter";
}

function getDayCtx(lang: PlanLang): DayContext {
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
  };

  const season: DayContext["season"] =
    month >= 5 && month <= 7
      ? "summer"
      : month >= 2 && month <= 4
        ? "spring"
        : month >= 8 && month <= 10
          ? "autumn"
          : "winter";

  return {
    dayName: names[lang][dow],
    isWeekend: dow === 0 || dow === 6,
    isSummer: season === "summer",
    month,
    hour,
    season,
  };
}

// ─── Weather description mapping ────────────────────────
//
// SMHI returns description *keys* ("clear", "rain", …),
// not human-readable text.

const WEATHER_LABELS: Record<string, string> = {
  clear: "clear skies",
  nearly_clear: "nearly clear",
  half_clear: "partly cloudy",
  cloudy: "cloudy",
  overcast: "overcast",
  fog: "foggy",
  light_rain: "light rain showers",
  rain: "rain",
  heavy_rain: "heavy rain",
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
  other: "🎯",
};

/** Indoor-friendly categories for rainy / cold weather. */
const INDOOR_CATS: PlaceCategory[] = [
  "museum",
  "shopping",
  "bowling",
  "swimming",
  "spa",
  "cinema",
];

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
): Scored[] {
  const highWind = wind >= 10;

  return places
    .filter((p) => !p.is_hidden)
    .map((p): Scored => {
      let s = 50;
      const km = getPlaceDistanceKm(p, dm);
      const distStr = p.is_on_site
        ? "on site"
        : km < 999
          ? formatDistanceForDisplay(km)
          : (dm[p.id] ?? "");

      // ── Distance ──
      if (p.is_on_site) s += 45;
      else if (km < 2) s += 40;
      else if (km < 5) s += 30;
      else if (km < 10) s += 20;
      else if (km < 20) s += 10;
      else if (km > 40) s -= 15;

      if (p.is_pinned) s += 50;

      // ── Rating ──
      if (p.rating) {
        if (p.rating >= 4.5) s += 25;
        else if (p.rating >= 4.0) s += 15;
        else if (p.rating >= 3.5) s += 5;
        else if (p.rating < 3.0) s -= 15;
      }

      // ── Weather ──
      if (rain) {
        if (p.is_indoor) s += 30;
        if (["beach", "park"].includes(p.category)) s -= 35;
        if (INDOOR_CATS.includes(p.category)) s += 15;
      } else {
        if (temp > 22 && p.category === "beach" && !highWind) s += 25;
        else if (temp > 18 && p.category === "beach") s += 10;
        if (temp > 20 && p.category === "park") s += 10;
        if (temp < 10 && !p.is_indoor) s -= 10;
      }

      // ── Wind ──
      if (highWind && !p.is_indoor) {
        s -= 15;
        if (p.category === "beach") s -= 10;
      }

      // ── Weekend leisure bonus ──
      if (
        isWeekend &&
        ["restaurant", "cafe", "shopping", "cinema"].includes(p.category)
      )
        s += 8;

      // ── Opening hours ──
      const hours = getPlaceHours(p);
      if (hours.isClosedToday) s -= 200;

      // ── Daily-variety seed ──
      const dn = parseInt(todayStr().replace(/-/g, ""), 10);
      const ih = p.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      s += ((dn + ih) % 13) - 6;

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
    .filter((s) => !s.isClosedToday) // hard-remove closed places
    .sort((a, b) => b.score - a.score);
}

// ─── Selection (time-slot & diversity aware) ────────────

function selectPlaces(
  scored: Scored[],
  rain: boolean,
  temp: number,
  wind: number,
) {
  const used = new Set<string>();
  const usedCategories: PlaceCategory[] = [];
  const highWind = wind >= 10;

  /**
   * Returns `true` when a viable alternative with a different
   * category exists among the remaining candidates for `period`.
   */
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

      // Diversity: skip if the same category was used in the last 3 picks
      // AND a viable alternative category exists.
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
  if (!rain && temp > 18 && !highWind)
    morning.push(...pickFor("morning", ["beach", "park"], { maxKm: 15 }));
  else if (rain)
    morning.push(...pickFor("morning", INDOOR_CATS, { indoor: true }));
  else if (temp < 10)
    morning.push(
      ...pickFor("morning", ["museum", "cafe", "cinema"], { maxKm: 20 }),
    );
  else morning.push(...pickFor("morning", ["park"], { maxKm: 20 }));

  morning.push(...pickFor("morning", ["cafe"], { maxKm: 10 }));

  // ── Lunch ──
  const lunch: Scored[] = [];
  lunch.push(...pickFor("lunch", ["restaurant"]));
  if (!lunch.length) lunch.push(...pickFor("lunch", ["cafe"]));

  // ── Afternoon ──
  const afternoon: Scored[] = [];
  if (!rain && temp > 20 && !highWind)
    afternoon.push(...pickFor("afternoon", ["beach"], { maxKm: 15 }));

  const aCats: PlaceCategory[] = rain
    ? ["bowling", "swimming", "spa", "museum", "shopping", "cinema"]
    : [
        "other",
        "bowling",
        "swimming",
        "spa",
        "museum",
        "park",
        "shopping",
        "cinema",
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

// ─── Build prompt (always English) ──────────────────────

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
): string {
  const safeCampName = sanitizeForPrompt(campground.name);

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

  if (sel.morning.length)
    sec.push(
      `MORNING (suggest within ${slotLabel("morning")}, must fall inside place hours):\n${sel.morning.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.lunch.length)
    sec.push(
      `LUNCH (suggest within ${slotLabel("lunch")}, must fall inside place hours):\n${sel.lunch.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.afternoon.length)
    sec.push(
      `AFTERNOON (suggest within ${slotLabel("afternoon")}, must fall inside place hours):\n${sel.afternoon.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.evening.length)
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
    if (isRaining && t > 12)
      wh = "Rain may clear later. Indoor morning, possibly outdoor afternoon.";
    else if (!isRaining && t > 22 && ws < 8)
      wh = "Great outdoor/beach weather.";
    else if (!isRaining && t > 22 && ws >= 8)
      wh = "Warm but windy. Sheltered outdoor spots preferred.";
    else if (!isRaining && t < 10) wh = "Cold but dry. Walks ok, no swimming.";
    else if (isRaining && t < 10) wh = "Cold rain. Cozy indoor activities.";
    else if (!isRaining && t >= 10 && t <= 18)
      wh = "Mild weather, good for sightseeing.";
  }

  const season = day.season.charAt(0).toUpperCase() + day.season.slice(1);

  return `Write a day plan for camping guests at "${safeCampName}".

Day: ${day.dayName}${day.isWeekend ? " (weekend)" : ""}
Weather: ${wd}${wh ? `\nForecast hint: ${wh}` : ""}
Season: ${season}
Language: ALL text in English

Places (pre-filtered, all open during their slot):
${sec.join("\n\n")}

Return a JSON array. No markdown. No code fences. Just [ ... ].

Each object:
{"time":"HH:MM","period":"morning|lunch|afternoon|evening","emoji":"…","title":"…","description":"…","placeId":"…or omit","tip":"…or omit"}

Rules:
- 5–7 items from morning to evening.
- CRITICAL: Each place has opening hours listed (e.g., "open 09:00–17:00"). The "time" you suggest MUST fall within those hours. Never schedule outside.
- Places marked ON-SITE are within the campground — say "right here at camp" or similar, never driving directions.
- End with a varied evening-at-camp item. Pick from: campfire, stargazing, sunset walk, board games, movie night, marshmallows, BBQ, or relaxing. Match to weather and season.
- "description": 1–2 SHORT sentences. Local friend tone. Mention weather naturally.
- "tip": max 8 words. Distance, rating, hours, or weather note. Omit if nothing useful.
- Do NOT say "recommended" or "promoted". Sound natural.
- ONLY use places listed above. Use exact id values for placeId.
- No duplicate places.`;
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

  return items.length >= 3 ? items : null;
}

// ─── Post-validation ────────────────────────────────────
//
// After Gemini returns a plan, verify every suggested time
// actually falls within the place's opening hours.  If not,
// shift the time to the nearest valid window or drop the
// placeId so the item stays but loses its link.

function postValidatePlan(
  plan: ItineraryItem[],
  placesById: Map<string, CachedPlace>,
): ItineraryItem[] {
  return plan.map((item) => {
    if (!item.placeId) return item;

    const place = placesById.get(item.placeId);
    if (!place) return { ...item, placeId: undefined };

    const hours = getPlaceHours(place);
    if (hours.isClosedToday) return { ...item, placeId: undefined }; // shouldn't happen but guard
    if (!hours.range) return item; // unknown → trust generation

    const timeParts = item.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeParts) return item;

    const suggested = parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;

    // 15 min buffer before closing so the visit is meaningful
    if (suggested >= hours.range.open && suggested < hours.range.close - 0.25)
      return item; // fine

    // Try to adjust within the same period slot
    const slot = SLOT_DEFS[item.period];
    const validStart = Math.max(slot.start, hours.range.open);
    const validEnd = Math.min(slot.end, hours.range.close - 0.25);

    if (validStart < validEnd) {
      const h = Math.floor(validStart);
      const m = Math.round((validStart - h) * 60);
      const adjusted = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
      console.log(
        `[AI Planner] Adjusted time for "${place.name}": ${item.time} → ${adjusted}`,
      );
      return { ...item, time: adjusted };
    }

    console.warn(
      `[AI Planner] Removed placeId for "${place.name}" — no valid time in ${item.period}`,
    );
    return { ...item, placeId: undefined };
  });
}

// ─── Template fallback (always English) ─────────────────

function fallback(
  sel: ReturnType<typeof selectPlaces>,
  weather: {
    temp: number;
    isRaining: boolean;
    windSpeed?: number;
  } | null,
  day: DayContext,
): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;

  const weatherAdj = rain
    ? "Despite the rain, "
    : temp > 25
      ? "It's a gorgeous warm day — "
      : temp < 10
        ? "Bundle up! "
        : "";

  // ── Morning ──
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
      description: `Grab a coffee at ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  }

  // ── Lunch ──
  if (sel.lunch[0]) {
    const p = sel.lunch[0];
    items.push({
      time: "12:30",
      period: "lunch",
      emoji: "🍽️",
      title: p.place.name,
      description: `Lunch at ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.place.rating ? `Rated ${p.place.rating}` : p.distStr || undefined,
    });
  } else {
    items.push({
      time: "12:00",
      period: "lunch",
      emoji: "🧺",
      title: "Picnic",
      description: rain
        ? "Grab lunch at the camp kitchen — cozy indoor picnic!"
        : "Pack a picnic and find a nice spot!",
    });
  }

  // ── Afternoon ──
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

  // ── Dinner ──
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

  // ── Evening at camp — varied by weather + season + day ──
  interface EveningOption {
    emoji: string;
    title: string;
    description: string;
  }

  const opts: EveningOption[] = [];
  if (!rain && temp > 15) {
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
  if (!rain && day.isSummer)
    opts.push({
      emoji: "✨",
      title: "Stargazing",
      description: "Look up — summer nights are magical.",
    });
  if (!rain && wind < 5)
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
  if (day.season === "autumn")
    opts.push({
      emoji: "🍂",
      title: "Evening at camp",
      description: "Enjoy the crisp autumn evening. Maybe a warm drink.",
    });
  if (!opts.length)
    opts.push({
      emoji: "🌙",
      title: "Evening at camp",
      description: "Relax and enjoy the evening.",
    });

  const dh = parseInt(todayStr().replace(/-/g, ""), 10);
  items.push({ time: "21:00", period: "evening", ...opts[dh % opts.length] });

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
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
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

      // Rate-limited → exponential back-off (up to 3 tries)
      if (status === 429 && attempt < 3) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        console.warn(`[AI Planner] Rate limited, retry in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        return callGemini(prompt, attempt + 1);
      }

      // Server error → one quick retry
      if (status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
        return callGemini(prompt, attempt + 1);
      }

      return null;
    }

    const data = await res.json();
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
      console.warn("[AI Planner] Parse failed, retrying with stricter tail");
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
  if (!apiKey) {
    console.warn("[AI Planner] No API key for translation, returning English");
    return plan;
  }

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
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
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
      console.error(`[AI Planner] Translation HTTP ${res.status}`);
      return plan;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return plan;

    const cleaned = repairJSON(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[AI Planner] Translation JSON parse failed");
      return plan;
    }

    if (!Array.isArray(parsed)) return plan;

    // Merge — handles partial translations gracefully
    const translated = plan.map((item, i) => {
      const tr = (parsed as unknown[])[i] as
        | Record<string, unknown>
        | undefined;
      if (!tr || typeof tr !== "object") return item;

      // Try pre-translated owner note for tips
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

    console.log(
      `[AI Planner] Translated to ${targetLang}: ${translated.length} items`,
    );
    return translated;
  } catch (err) {
    console.error(`[AI Planner] Translation to ${targetLang} failed:`, err);
    return plan;
  }
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
): Promise<ItineraryItem[]> {
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const day = getDayCtx("en");

  const scored = scorePlaces(
    places,
    rain,
    temp,
    wind,
    distanceMap,
    day.isWeekend,
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
  );
  let plan = await callGemini(prompt);

  if (!plan || plan.length < 3) {
    console.log("[AI Planner] Using template fallback");
    plan = fallback(
      sel,
      weather ? { temp, isRaining: rain, windSpeed: wind } : null,
      day,
    );
  }

  const placesById = new Map(places.map((p) => [p.id, p]));

  // Validate place IDs
  plan = plan.map((item) => ({
    ...item,
    placeId:
      item.placeId && placesById.has(item.placeId) ? item.placeId : undefined,
  }));

  // Post-validate suggested times against real opening hours
  plan = postValidatePlan(plan, placesById);

  planCache.set(baseKey, {
    plan,
    timestamp: Date.now(),
    dateStr: date,
    weatherKey: wb,
  });
  pruneCache();

  return plan;
}

// ─── Server action ──────────────────────────────────────

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
  _currentTimeStr?: string, // reserved for future timezone override / testing
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

  // ── 1. Translated cache ───────────────────────────────
  const cachedTranslated = planCache.get(translatedKey);
  if (
    cachedTranslated &&
    cachedTranslated.dateStr === date &&
    Date.now() - cachedTranslated.timestamp < CACHE_TTL
  ) {
    return cachedTranslated.plan;
  }

  // ── 2. Base (English) plan — cache or generate ────────
  let basePlan: ItineraryItem[];
  const cachedBase = planCache.get(baseKey);

  if (
    cachedBase &&
    cachedBase.dateStr === date &&
    Date.now() - cachedBase.timestamp < CACHE_TTL
  ) {
    basePlan = cachedBase.plan;
  } else {
    const inflight = inflightGenerations.get(baseKey);
    if (inflight) {
      console.log(`[AI Planner] Waiting for in-flight generation: ${baseKey}`);
      basePlan = await inflight;
    } else {
      const promise = generateBasePlan(
        campground,
        weather,
        places,
        dm,
        date,
        wb,
        baseKey,
      );
      inflightGenerations.set(baseKey, promise);
      try {
        basePlan = await promise;
      } finally {
        inflightGenerations.delete(baseKey);
      }
    }
  }

  // ── 3. Translate ──────────────────────────────────────
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

  // ── 4. Cache translated result ────────────────────────
  planCache.set(translatedKey, {
    plan: translatedPlan,
    timestamp: Date.now(),
    dateStr: date,
    weatherKey: wb,
  });
  pruneCache();

  return translatedPlan;
}
const DEFAULT_LANGS: PlanLang[] = ["sv", "en", "de", "da"];

function getSupportedLangs(campground: Campground): PlanLang[] {
  if (campground.supported_languages?.length) {
    return campground.supported_languages.filter((l): l is PlanLang =>
      DEFAULT_LANGS.includes(l as PlanLang),
    );
  }
  return DEFAULT_LANGS;
}
async function warmAllTranslations(
  basePlan: ItineraryItem[],
  campground: Campground,
  places: CachedPlace[],
  date: string,
  wb: string,
): Promise<void> {
  const placesById = new Map(places.map((p) => [p.id, p]));
  const langs = getSupportedLangs(campground).filter((l) => l !== "en");

  const results = await Promise.allSettled(
    langs.map(async (lang) => {
      const key = mkTranslatedCacheKey(campground.id, date, wb, lang);

      // Already cached?
      const existing = planCache.get(key);
      if (
        existing &&
        existing.dateStr === date &&
        Date.now() - existing.timestamp < CACHE_TTL
      ) {
        return;
      }

      // Another call already translating this language?
      const inflight = inflightTranslations.get(key);
      if (inflight) {
        await inflight;
        return;
      }

      // Translate with lock
      const promise = translatePlan(basePlan, lang, placesById);
      inflightTranslations.set(key, promise);
      try {
        const translated = await promise;
        planCache.set(key, {
          plan: translated,
          timestamp: Date.now(),
          dateStr: date,
          weatherKey: wb,
        });
        console.log(`[AI Planner] Warmed ${lang}`);
      } finally {
        inflightTranslations.delete(key);
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed)
    console.warn(`[AI Planner] ${failed} warm-up translation(s) failed`);
}
const inflightPrefetches = new Map<string, Promise<void>>();

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
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const date = todayStr();
  const wb = weatherBucket(rain, temp, wind);
  const dm = distanceMap ?? {};
  const baseKey = mkBaseCacheKey(campground.id, date, wb);
  const langs = getSupportedLangs(campground);
  const allCached = langs.every((lang) => {
    const key =
      lang === "en"
        ? baseKey
        : mkTranslatedCacheKey(campground.id, date, wb, lang);
    const cached = planCache.get(key);
    return (
      cached &&
      cached.dateStr === date &&
      Date.now() - cached.timestamp < CACHE_TTL
    );
  });
  if (allCached) return;
  const existing = inflightPrefetches.get(baseKey);
  if (existing) {
    await existing;
    return;
  }
  const work = (async () => {
    // 1. Base plan
    let basePlan: ItineraryItem[];
    const cachedBase = planCache.get(baseKey);

    if (
      cachedBase &&
      cachedBase.dateStr === date &&
      Date.now() - cachedBase.timestamp < CACHE_TTL
    ) {
      basePlan = cachedBase.plan;
    } else {
      // Respect the generation lock (getAiPlan might be generating)
      const inflightGen = inflightGenerations.get(baseKey);
      if (inflightGen) {
        basePlan = await inflightGen;
      } else {
        const genPromise = generateBasePlan(
          campground,
          weather,
          places,
          dm,
          date,
          wb,
          baseKey,
        );
        inflightGenerations.set(baseKey, genPromise);
        try {
          basePlan = await genPromise;
        } finally {
          inflightGenerations.delete(baseKey);
        }
      }
    }

    // 2. All translations (parallel)
    await warmAllTranslations(basePlan, campground, places, date, wb);
  })();

  inflightPrefetches.set(baseKey, work);
  try {
    await work;
  } finally {
    inflightPrefetches.delete(baseKey);
  }
}
