"use server";

import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { CachedPlace, Campground } from "@/types/database";

// ─── Types ──────────────────────────────────────────────

export type PlanLang = "sv" | "en" | "de" | "da";

export interface ItineraryItem {
  time: string;
  period: "morning" | "lunch" | "afternoon" | "evening";
  emoji: string;
  title: string;
  description: string;
  placeId?: string;
  tip?: string;
}

// ─── Cache ──────────────────────────────────────────────
//
// Two-tier strategy:
//   BASE  plan — always English, keyed by campground+date+weather.
//   TRANSLATED plan — keyed by campground+date+weather+lang.
//
// If a user requests German and the English base already exists,
// we skip generation entirely and only run a cheap translation call.
// This guarantees every language sees the SAME activities and times.

interface CachedPlan {
  plan: ItineraryItem[];
  timestamp: number;
  dateStr: string;
  weatherKey: string;
}

const planCache = new Map<string, CachedPlan>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * In-flight locks prevent duplicate Gemini calls when multiple
 * users hit the same plan or translation simultaneously.
 */
const inflightGenerations = new Map<string, Promise<ItineraryItem[]>>();
const inflightTranslations = new Map<string, Promise<ItineraryItem[]>>();

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function weatherBucket(rain: boolean, temp: number): string {
  return `${rain ? "r" : "d"}_${Math.round(temp / 5) * 5}`;
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

function pruneCache() {
  const today = todayStr();
  const now = Date.now();
  for (const [k, v] of planCache) {
    if (v.dateStr !== today || now - v.timestamp > CACHE_TTL)
      planCache.delete(k);
  }
}

// ─── Helpers ────────────────────────────────────────────

function parseDistKm(dist: string): number | null {
  if (!dist) return null;
  const c = dist.replace(/\s/g, "").toLowerCase();
  if (c.includes("km"))
    return parseFloat(c.replace("km", "").replace(",", ".")) || null;
  if (c.includes("m"))
    return (
      (parseFloat(c.replace("m", "").replace(",", ".")) || 0) / 1000 || null
    );
  return null;
}

// ─── Opening hours parsing ──────────────────────────────

interface TimeRange {
  open: number;
  close: number;
}

function parseTimeRange(text: string): TimeRange | null {
  if (!text) return null;

  if (/24\s*(hours|h|timmar|stunden|timer)/i.test(text))
    return { open: 0, close: 24 };

  if (/closed|stängt|geschlossen|lukket/i.test(text)) return null;

  let m = text.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
  if (m) {
    return {
      open: parseInt(m[1]) + parseInt(m[2]) / 60,
      close: parseInt(m[3]) + parseInt(m[4]) / 60,
    };
  }

  m = text.match(
    /(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)/i,
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
  isOpenNow: boolean;
  text: string | null;
  range: TimeRange | null;
} {
  if (place.custom_hours) {
    const range = parseTimeRange(place.custom_hours);
    const now = new Date().getHours() + new Date().getMinutes() / 60;
    return {
      isOpenNow: range ? now >= range.open && now < range.close : true,
      text: place.custom_hours,
      range,
    };
  }

  const data = getTodaysOpeningHours(place.raw_data);
  const range = data?.text ? parseTimeRange(data.text) : null;
  return {
    isOpenNow: data?.isOpenNow ?? true,
    text: data?.text ?? null,
    range,
  };
}

function isOpenAtHour(place: CachedPlace, hour: number): boolean {
  const h = getPlaceHours(place);

  if (h.range) {
    return hour >= h.range.open && hour < h.range.close;
  }

  if (h.text && /closed|stängt|geschlossen|lukket/i.test(h.text)) {
    return false;
  }

  return true;
}

function formatHoursForPrompt(place: CachedPlace): string {
  const h = getPlaceHours(place);
  if (h.range) {
    const fmtH = (n: number) => {
      const hrs = Math.floor(n);
      const mins = Math.round((n - hrs) * 60);
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };
    return `open ${fmtH(h.range.open)}-${fmtH(h.range.close)}`;
  }
  if (h.text) return h.text;
  return "hours unknown";
}

// ─── Day context ────────────────────────────────────────

function getDayCtx(lang: PlanLang) {
  const now = new Date();
  const dow = now.getDay();
  const month = now.getMonth();
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
  return {
    dayName: names[lang][dow],
    isWeekend: dow === 0 || dow === 6,
    isSummer: month >= 5 && month <= 7,
    month,
    hour: now.getHours(),
  };
}

// ─── Scoring ────────────────────────────────────────────

interface Scored {
  place: CachedPlace;
  score: number;
  km: number;
  distStr: string;
  isOpenNow: boolean;
  hoursText: string | null;
  range: TimeRange | null;
}

function scorePlaces(
  places: CachedPlace[],
  rain: boolean,
  temp: number,
  dm: Record<string, string>,
  isWeekend: boolean,
): Scored[] {
  return places
    .filter((p) => !p.is_hidden)
    .map((p) => {
      let s = 50;
      const distStr = dm[p.id] ?? "";
      const km = p.is_on_site ? 0 : (parseDistKm(distStr) ?? 999);

      if (p.is_on_site) s += 45;
      else if (km < 2) s += 40;
      else if (km < 5) s += 30;
      else if (km < 10) s += 20;
      else if (km < 20) s += 10;
      else if (km > 40) s -= 15;

      if (p.is_pinned) s += 50;

      if (p.rating) {
        if (p.rating >= 4.5) s += 25;
        else if (p.rating >= 4.0) s += 15;
        else if (p.rating >= 3.5) s += 5;
        else if (p.rating < 3.0) s -= 15;
      }

      if (rain) {
        if (p.is_indoor) s += 30;
        if (["beach", "park"].includes(p.category)) s -= 35;
        if (
          ["museum", "shopping", "bowling", "swimming", "spa"].includes(
            p.category,
          )
        )
          s += 15;
      } else {
        if (temp > 22 && p.category === "beach") s += 25;
        else if (temp > 18 && p.category === "beach") s += 10;
        if (temp > 20 && p.category === "park") s += 10;
        if (temp < 10 && !p.is_indoor) s -= 10;
      }

      if (isWeekend && ["restaurant", "cafe", "shopping"].includes(p.category))
        s += 8;

      const hours = getPlaceHours(p);
      if (hours.text && /closed|stängt|geschlossen|lukket/i.test(hours.text))
        s -= 100;
      else if (!hours.isOpenNow) s -= 30;

      const dn = parseInt(todayStr().replace(/-/g, ""), 10);
      const ih = p.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      s += ((dn + ih) % 13) - 6;

      return {
        place: p,
        score: s,
        km,
        distStr: p.is_on_site ? "on site" : distStr,
        isOpenNow: hours.isOpenNow,
        hoursText: hours.text,
        range: hours.range,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Selection (time-slot aware) ────────────────────────

const PERIOD_HOURS = {
  morning: 10,
  lunch: 13,
  afternoon: 15,
  evening: 19,
} as const;

function selectPlaces(scored: Scored[], rain: boolean, temp: number) {
  const used = new Set<string>();

  const pickFor = (
    period: keyof typeof PERIOD_HOURS,
    cats: string[],
    opts?: { indoor?: boolean; maxKm?: number; count?: number },
  ): Scored[] => {
    const { indoor, maxKm, count = 1 } = opts ?? {};
    const targetHour = PERIOD_HOURS[period];
    const results: Scored[] = [];

    for (const c of scored) {
      if (results.length >= count) break;
      if (used.has(c.place.id)) continue;
      if (!cats.includes(c.place.category)) continue;
      if (indoor !== undefined && c.place.is_indoor !== indoor) continue;
      if (maxKm !== undefined && !c.place.is_on_site && c.km > maxKm) continue;
      if (!isOpenAtHour(c.place, targetHour)) continue;

      results.push(c);
      used.add(c.place.id);
    }
    return results;
  };

  const pickAnyFor = (
    period: keyof typeof PERIOD_HOURS,
    opts?: { exclude?: string[]; maxKm?: number },
  ): Scored | null => {
    const { exclude = [], maxKm } = opts ?? {};
    const targetHour = PERIOD_HOURS[period];

    for (const c of scored) {
      if (used.has(c.place.id)) continue;
      if (exclude.includes(c.place.category)) continue;
      if (maxKm !== undefined && !c.place.is_on_site && c.km > maxKm) continue;
      if (!isOpenAtHour(c.place, targetHour)) continue;
      used.add(c.place.id);
      return c;
    }
    return null;
  };

  const morning: Scored[] = [];
  if (!rain && temp > 18)
    morning.push(...pickFor("morning", ["beach", "park"], { maxKm: 15 }));
  else if (rain)
    morning.push(
      ...pickFor(
        "morning",
        ["museum", "shopping", "bowling", "swimming", "spa"],
        { indoor: true },
      ),
    );
  else morning.push(...pickFor("morning", ["park"], { maxKm: 20 }));
  morning.push(...pickFor("morning", ["cafe"], { maxKm: 10 }));

  const lunch: Scored[] = [];
  lunch.push(...pickFor("lunch", ["restaurant"]));
  if (!lunch.length) lunch.push(...pickFor("lunch", ["cafe"]));

  const afternoon: Scored[] = [];
  if (!rain && temp > 20)
    afternoon.push(...pickFor("afternoon", ["beach"], { maxKm: 15 }));
  const aCats = rain
    ? ["bowling", "swimming", "spa", "museum", "shopping"]
    : ["other", "bowling", "swimming", "spa", "museum", "park", "shopping"];
  afternoon.push(...pickFor("afternoon", aCats, { count: 2 }));
  if (!afternoon.length) {
    const a = pickAnyFor("afternoon", {
      exclude: ["restaurant", "cafe"],
      maxKm: 30,
    });
    if (a) afternoon.push(a);
  }

  const evening: Scored[] = [];
  evening.push(...pickFor("evening", ["restaurant"]));
  if (!evening.length) evening.push(...pickFor("evening", ["cafe"]));

  const extras: Scored[] = [];
  for (let i = 0; i < 3; i++) {
    const e = pickAnyFor("afternoon", { maxKm: 25 });
    if (e) extras.push(e);
  }

  return { morning, lunch, afternoon, evening, extras };
}

// ─── Security Helper ────────────────────────────────────

function sanitizeForPrompt(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[`"'{}[\\]]/g, "").trim();
}

// ─── Build prompt (always English) ──────────────────────
//
// The base plan is always generated in English so that every
// language sees the SAME activities and times. Translation
// into the user's language is a separate step.

function buildPrompt(
  campground: Campground,
  sel: ReturnType<typeof selectPlaces>,
  weather: { temp: number; isRaining: boolean; description?: string } | null,
  day: ReturnType<typeof getDayCtx>,
): string {
  const safeCampName = sanitizeForPrompt(campground.name);

  const fmt = (s: Scored) => {
    const safePlaceName = sanitizeForPrompt(s.place.name);
    const p = [
      `"${safePlaceName}"`,
      `cat:${s.place.category}`,
      s.place.is_on_site
        ? "ON-SITE (walking distance)"
        : `dist:${s.distStr || s.km.toFixed(1) + "km"}`,
    ];
    if (s.place.rating) p.push(`rating:${s.place.rating}`);
    if (s.place.is_indoor) p.push("indoor");
    p.push(formatHoursForPrompt(s.place));
    if (s.place.owner_note) {
      const safeNote = sanitizeForPrompt(s.place.owner_note).slice(0, 60);
      p.push(`tip:"${safeNote}"`);
    }
    p.push(`id:${s.place.id}`);
    return p.join(", ");
  };

  const sec: string[] = [];
  if (sel.morning.length)
    sec.push(
      `MORNING (suggest 09:00-11:00):\n${sel.morning.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.lunch.length)
    sec.push(
      `LUNCH (suggest 11:30-14:00):\n${sel.lunch.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.afternoon.length)
    sec.push(
      `AFTERNOON (suggest 14:00-17:30):\n${sel.afternoon.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.evening.length)
    sec.push(
      `EVENING (suggest 18:00-20:30):\n${sel.evening.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );
  if (sel.extras.length)
    sec.push(
      `EXTRAS (optional, weave in if natural):\n${sel.extras.map((p) => `- ${fmt(p)}`).join("\n")}`,
    );

  const wd = weather
    ? `${weather.temp}°C, ${weather.isRaining ? "rain" : "dry/clear"}${weather.description ? `, ${weather.description}` : ""}`
    : "Unknown, assume mild.";

  let wh = "";
  if (weather) {
    if (weather.isRaining && weather.temp > 12)
      wh = "Rain may clear later. Indoor morning, possibly outdoor afternoon.";
    else if (!weather.isRaining && weather.temp > 22)
      wh = "Great outdoor/beach weather.";
    else if (!weather.isRaining && weather.temp < 10)
      wh = "Cold but dry. Walks ok, no swimming.";
    else if (weather.isRaining && weather.temp < 10)
      wh = "Cold rain. Cozy indoor activities.";
  }

  const season = day.isSummer
    ? "Summer"
    : day.month >= 2 && day.month <= 4
      ? "Spring"
      : day.month >= 8 && day.month <= 10
        ? "Autumn"
        : "Winter";

  return `Write a day plan for camping guests at "${safeCampName}".

Day: ${day.dayName}${day.isWeekend ? " (weekend)" : ""}
Weather now: ${wd}${wh ? `\nForecast: ${wh}` : ""}
Season: ${season}
Language: ALL text in English

Places (pre-filtered to places open during their time slot):
${sec.join("\n")}

Return a JSON array. No markdown. No code fences. Just [ ... ].

Each object:
{"time":"HH:MM","period":"morning|lunch|afternoon|evening","emoji":"…","title":"…","description":"…","placeId":"…or omit","tip":"…or omit"}

Rules:
- 5-7 items from morning to evening.
- CRITICAL: Each place has opening hours listed. The suggested time MUST fall within the place's opening hours. Never suggest a place at a time it's closed.
- Places marked ON-SITE are within the campground — mention "right here at camp" or similar, never give driving directions.
- End with a varied evening-at-camp item (NOT always campfire — pick from: campfire, stargazing, sunset walk, board games, movie night, marshmallows, or just relaxing. Match to weather and season).
- description: 1-2 SHORT sentences. Local friend tone. Mention weather naturally.
- tip: max 8 words. Distance, rating, hours, or weather note. Can be null.
- Do NOT say "recommended" or "promoted".
- ONLY use places listed above.
- Use exact id values for placeId.
- Predict weather: if rainy morning, suggest it might clear for outdoor afternoon.`;
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

  const validP = new Set(["morning", "lunch", "afternoon", "evening"]);
  const items: ItineraryItem[] = [];

  for (const x of arr) {
    if (typeof x !== "object" || !x) continue;
    const it = x as Record<string, unknown>;
    if (!it.time || !it.period || !it.title || !it.description) continue;
    const period = String(it.period);
    if (!validP.has(period)) continue;

    items.push({
      time: String(it.time),
      period: period as ItineraryItem["period"],
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

// ─── Template fallback (always English) ─────────────────
//
// When Gemini fails, we build a plan from templates.
// Always in English — translatePlan() handles localization.

function fallback(
  sel: ReturnType<typeof selectPlaces>,
  weather: { temp: number; isRaining: boolean } | null,
  day: ReturnType<typeof getDayCtx>,
): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  const t = {
    morning: "Start the day at",
    cafe: "Coffee at",
    lunch: "Lunch at",
    picnicT: "Picnic",
    picnic: "Pack a picnic and find a spot!",
    afternoon: "Afternoon trip to",
    dinner: "Dinner at",
    eveningT: "Evening at camp",
    eveningD: "Enjoy the evening — take a stroll, play games, or just relax.",
  };

  const em = (cat: string) =>
    ({
      beach: "🏖️",
      park: "🌲",
      museum: "🏛️",
      cafe: "☕",
      restaurant: "🍽️",
      shopping: "🛍️",
      bowling: "🎳",
      swimming: "🏊",
      spa: "🧖",
      other: "🎯",
    })[cat] ?? "📍";

  if (sel.morning[0]) {
    const p = sel.morning[0];
    items.push({
      time: "09:00",
      period: "morning",
      emoji: em(p.place.category),
      title: p.place.name,
      description: `${t.morning} ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  }
  if (sel.morning[1]) {
    const p = sel.morning[1];
    items.push({
      time: "10:30",
      period: "morning",
      emoji: "☕",
      title: p.place.name,
      description: `${t.cafe} ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  }

  if (sel.lunch[0]) {
    const p = sel.lunch[0];
    items.push({
      time: "12:30",
      period: "lunch",
      emoji: "🍽️",
      title: p.place.name,
      description: `${t.lunch} ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  } else {
    items.push({
      time: "12:00",
      period: "lunch",
      emoji: "🧺",
      title: t.picnicT,
      description: t.picnic,
    });
  }

  for (const [i, p] of sel.afternoon.slice(0, 2).entries()) {
    items.push({
      time: i === 0 ? "14:30" : "16:00",
      period: "afternoon",
      emoji: em(p.place.category),
      title: p.place.name,
      description: `${t.afternoon} ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  }

  if (sel.evening[0]) {
    const p = sel.evening[0];
    items.push({
      time: "18:30",
      period: "evening",
      emoji: "🍷",
      title: p.place.name,
      description: `${t.dinner} ${p.place.name}.`,
      placeId: p.place.id,
      tip: p.distStr || undefined,
    });
  }

  const rain = weather?.isRaining ?? false;
  const emojis = rain
    ? ["🎲", "🃏", "📖"]
    : day.isSummer
      ? ["🌅", "✨", "🔥"]
      : ["🔥", "🎲", "☕"];
  const dh = parseInt(todayStr().replace(/-/g, ""), 10);
  items.push({
    time: "21:00",
    period: "evening",
    emoji: emojis[dh % emojis.length],
    title: t.eveningT,
    description: t.eveningD,
  });

  return items;
}

// ─── Gemini 2.5 Flash ───────────────────────────────────

async function callGemini(
  prompt: string,
  attempt = 1,
): Promise<ItineraryItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
      console.error(`[AI Planner] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const items = parseItems(text);
    if (items) {
      console.log(`[AI Planner] OK: ${items.length} items`);
      return items;
    }

    if (attempt < 2) {
      console.warn("[AI Planner] Retry with shorter prompt");
      return callGemini(
        prompt +
          "\n\nCRITICAL: Max 15 words per description. Return ONLY a JSON array.",
        attempt + 1,
      );
    }
    return null;
  } catch (err) {
    console.error("[AI Planner]", err);
    if (attempt < 2) return callGemini(prompt, attempt + 1);
    return null;
  }
}

// ─── Translation ────────────────────────────────────────
//
// Takes a completed English plan and translates ONLY the text
// fields (title, description, tip) into the target language.
// Structure, times, placeIds, emojis — all stay identical.
//
// On any failure, returns the English plan as-is (better than
// showing nothing).

async function translatePlan(
  plan: ItineraryItem[],
  targetLang: PlanLang,
): Promise<ItineraryItem[]> {
  // English is the base language — no translation needed
  if (targetLang === "en") return plan;

  const langNames: Record<PlanLang, string> = {
    sv: "Swedish",
    en: "English",
    de: "German",
    da: "Danish",
  };

  // Build a minimal payload with only translatable fields
  const toTranslate = plan.map((item, i) => ({
    i,
    title: item.title,
    description: item.description,
    ...(item.tip ? { tip: item.tip } : {}),
  }));

  const prompt = `Translate the following JSON array from English to ${langNames[targetLang]}.

Rules:
- Translate ONLY the "title", "description", and "tip" fields.
- Keep proper nouns (place names, business names, campground names) exactly as-is — do NOT translate them.
- Keep the same tone: short, friendly, casual — like a local friend giving advice.
- Distances like "3.5 km" stay as-is. Adapt decimal separators if needed (e.g. "3,5 km" in ${langNames[targetLang]}).
- Return ONLY the translated JSON array. No markdown, no code fences.

${JSON.stringify(toTranslate)}`;

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[AI Planner] No API key for translation, returning English");
    return plan;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for consistent translations
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

    if (!res.ok) {
      console.error(
        `[AI Planner] Translation HTTP ${res.status}, returning English`,
      );
      return plan;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[AI Planner] Empty translation response, returning English");
      return plan;
    }

    const cleaned = repairJSON(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[AI Planner] Translation JSON parse failed");
      return plan;
    }

    if (!Array.isArray(parsed) || parsed.length !== plan.length) {
      console.warn(
        `[AI Planner] Translation array length mismatch: got ${Array.isArray(parsed) ? parsed.length : "non-array"}, expected ${plan.length}`,
      );
      return plan;
    }

    // Merge translations back, preserving all structural fields
    const translated = plan.map((item, i) => {
      const tr = parsed[i] as Record<string, unknown> | null;
      if (!tr || typeof tr !== "object") return item;

      return {
        ...item,
        title:
          typeof tr.title === "string" && tr.title ? tr.title : item.title,
        description:
          typeof tr.description === "string" && tr.description
            ? tr.description
            : item.description,
        // Only translate tip if the original had one
        tip: item.tip
          ? typeof tr.tip === "string" && tr.tip
            ? tr.tip
            : item.tip
          : undefined,
      };
    });

    console.log(
      `[AI Planner] Translated to ${targetLang}: ${translated.length} items`,
    );
    return translated;
  } catch (err) {
    console.error(
      `[AI Planner] Translation to ${targetLang} failed:`,
      err,
    );
    return plan;
  }
}

// ─── Base plan generation (always English) ──────────────

async function generateBasePlan(
  campground: Campground,
  weather:
    | { temp: number; isRaining: boolean; description: string; icon: string }
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

  // Always use English for the base plan
  const day = getDayCtx("en");

  const scored = scorePlaces(places, rain, temp, distanceMap, day.isWeekend);
  const sel = selectPlaces(scored, rain, temp);

  const prompt = buildPrompt(
    campground,
    sel,
    weather
      ? { temp, isRaining: rain, description: weather.description }
      : null,
    day,
  );
  let plan = await callGemini(prompt);

  if (!plan || plan.length < 3) {
    console.log("[AI Planner] Using template fallback");
    plan = fallback(sel, weather ? { temp, isRaining: rain } : null, day);
  }

  // Validate placeIds
  const ids = new Set(places.map((p) => p.id));
  plan = plan.map((item) => ({
    ...item,
    placeId: item.placeId && ids.has(item.placeId) ? item.placeId : undefined,
  }));

  // Cache the base plan
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
//
// Flow:
//   1. Check translated cache → return if hit
//   2. Get base plan (from cache or generate in English)
//   3. Translate base plan to target language
//   4. Cache translated result → return

export async function getAiPlan(
  campground: Campground,
  weather:
    | { temp: number; isRaining: boolean; description: string; icon: string }
    | null
    | undefined,
  places: CachedPlace[],
  lang: "sv" | "en" | "de" | "da",
  _currentTimeStr?: string,
  distanceMap?: Record<string, string>,
): Promise<ItineraryItem[]> {
  const rain = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const date = todayStr();
  const wb = weatherBucket(rain, temp);
  const dm = distanceMap ?? {};

  const baseKey = mkBaseCacheKey(campground.id, date, wb);
  const translatedKey = mkTranslatedCacheKey(campground.id, date, wb, lang);

  // ── 1. Check translated cache ─────────────────────────
  const cachedTranslated = planCache.get(translatedKey);
  if (
    cachedTranslated &&
    cachedTranslated.dateStr === date &&
    Date.now() - cachedTranslated.timestamp < CACHE_TTL
  ) {
    return cachedTranslated.plan;
  }

  // ── 2. Get or generate the base (English) plan ────────
  let basePlan: ItineraryItem[];

  const cachedBase = planCache.get(baseKey);
  if (
    cachedBase &&
    cachedBase.dateStr === date &&
    Date.now() - cachedBase.timestamp < CACHE_TTL
  ) {
    basePlan = cachedBase.plan;
  } else {
    // Check if another request is already generating this base plan
    const inflight = inflightGenerations.get(baseKey);
    if (inflight) {
      console.log(`[AI Planner] Waiting for in-flight generation: ${baseKey}`);
      basePlan = await inflight;
    } else {
      // Generate with lock
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

  // ── 3. Translate to target language ───────────────────
  //
  // For English, translatePlan() returns immediately (no API call).
  // For other languages, it calls Gemini with a focused translation
  // prompt — much cheaper and faster than full generation.

  let translatedPlan: ItineraryItem[];

  const inflightTr = inflightTranslations.get(translatedKey);
  if (inflightTr) {
    console.log(
      `[AI Planner] Waiting for in-flight translation: ${translatedKey}`,
    );
    translatedPlan = await inflightTr;
  } else {
    const trPromise = translatePlan(basePlan, lang);
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