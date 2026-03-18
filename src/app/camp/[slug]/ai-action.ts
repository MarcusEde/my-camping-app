// src/app/camp/[slug]/ai-action.ts
"use server";

import { getTodaysOpeningHours } from "@/lib/place-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CachedPlace, Campground, PlaceCategory } from "@/types/database";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type PlanLang = "sv" | "en" | "de" | "da" | "nl" | "no";
type Period = "morning" | "lunch" | "afternoon" | "evening";
type SlotPurpose = "meal" | "activity" | "fika";

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
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message: string };
}

interface PlanSlot {
  id: string;
  period: Period;
  purpose: SlotPurpose;
  defaultTime: string;
  preferCats: readonly PlaceCategory[];
}

// ═══════════════════════════════════════════════════════════════════════
// CACHE VERSION — Bump to invalidate ALL cached plans
// ═══════════════════════════════════════════════════════════════════════
const CACHE_VERSION = 12;

// ═══════════════════════════════════════════════════════════════════════
// SWEDISH WEATHER CLASSIFIERS
// ═══════════════════════════════════════════════════════════════════════

type RainIntensity = "none" | "drizzle" | "moderate" | "heavy";
type WindLevel = "calm" | "breezy" | "windy" | "veryWindy";

interface WeatherInput {
  temp: number;
  isRaining: boolean;
  description: string;
  icon: string;
  windSpeed: number;
}

function classifyRain(weather: WeatherInput | null): RainIntensity {
  if (!weather || !weather.isRaining) return "none";
  const desc = (weather.description || "").toLowerCase();
  if (
    desc.includes("heavy") || desc.includes("thunder") ||
    desc.includes("storm") || desc.includes("skyfall") || desc.includes("åska")
  ) return "heavy";
  if (
    desc.includes("light") || desc.includes("drizzle") ||
    desc.includes("duggregn") || desc.includes("lätt")
  ) return "drizzle";
  return "moderate";
}

function classifyWind(speed: number): WindLevel {
  if (speed < 5) return "calm";
  if (speed < 8) return "breezy";
  if (speed < 12) return "windy";
  return "veryWindy";
}

function feelsLike(temp: number, wind: number): number {
  if (temp > 25 || wind < 3) return temp;
  return Math.round(temp - (wind * 0.7 * (25 - temp)) / 25);
}

function isSwedishBeachWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain !== "none") return false;
  const fl = feelsLike(temp, wind);
  if (wind >= 10) return fl >= 22;
  if (wind >= 7) return fl >= 20;
  return fl >= 17;
}

function isTrailWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  if (wind >= 12) return false;
  return temp >= 3;
}

function isWaterActivityWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain !== "none") return false;
  if (wind >= 8) return false;
  return temp >= 15;
}

function isCampfireWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  if (wind >= 12) return false;
  if (rain === "drizzle" && temp >= 10) return true;
  if (temp < 3 && wind >= 8) return false;
  return true;
}

function isBBQWeather(wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  return wind < 12;
}

interface WeatherCtx {
  temp: number;
  fl: number;
  rain: RainIntensity;
  wind: number;
  windL: WindLevel;
  season: string;
  isSummer: boolean;
  sunsetHour: number;
  beachOk: boolean;
  trailOk: boolean;
  waterOk: boolean;
  fireOk: boolean;
  bbqOk: boolean;
}

function buildWeatherCtx(
  weather: { temp: number; isRaining: boolean; windSpeed?: number; description?: string } | null,
  day: DayContext,
): WeatherCtx {
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const rain = weather
    ? classifyRain({ temp, isRaining: weather.isRaining, description: weather.description ?? "", icon: "", windSpeed: wind })
    : "none" as RainIntensity;
  const fl = feelsLike(temp, wind);
  return {
    temp, fl, rain, wind, windL: classifyWind(wind),
    season: day.season, isSummer: day.isSummer, sunsetHour: day.sunsetHour,
    beachOk: isSwedishBeachWeather(temp, wind, rain),
    trailOk: isTrailWeather(temp, wind, rain),
    waterOk: isWaterActivityWeather(temp, wind, rain),
    fireOk: isCampfireWeather(temp, wind, rain),
    bbqOk: isBBQWeather(wind, rain),
  };
}

function tempMood(fl: number): string {
  if (fl >= 25) return "gorgeous and warm";
  if (fl >= 20) return "perfect summer weather";
  if (fl >= 15) return "pleasant";
  if (fl >= 10) return "fresh";
  if (fl >= 5) return "chilly";
  if (fl >= 0) return "cold";
  return "freezing";
}

// ═══════════════════════════════════════════════════════════════════════
// TIMEZONE HELPERS
// ═══════════════════════════════════════════════════════════════════════

const TIMEZONE = "Europe/Stockholm";

function nowInSweden(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
}

function todayStr(): string {
  const sv = nowInSweden();
  return `${sv.getFullYear()}-${String(sv.getMonth() + 1).padStart(2, "0")}-${String(sv.getDate()).padStart(2, "0")}`;
}

function currentSwedishHour(): number {
  const sv = nowInSweden();
  return sv.getHours() + sv.getMinutes() / 60;
}

function estimateSunsetHour(): number {
  const month = nowInSweden().getMonth();
  if (month === 5) return 22.0;
  if (month === 6) return 21.8;
  if (month === 7) return 21.0;
  if (month === 4) return 21.0;
  if (month === 8) return 19.5;
  if (month === 3) return 19.5;
  if (month === 9) return 18.0;
  if (month === 2) return 18.0;
  return 16.5;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const PERIOD_ORDER: Period[] = ["morning", "lunch", "afternoon", "evening"];

const SLOT_DEFS: Record<Period, { start: number; end: number }> = {
  morning:   { start: 8,    end: 11.5 },
  lunch:     { start: 11.5, end: 14   },
  afternoon: { start: 13.5, end: 17.5 },
  evening:   { start: 17.5, end: 22   },
};

const FOOD_CATS: ReadonlySet<PlaceCategory> = new Set(["restaurant", "cafe"]);

const PLAN_SLOTS: PlanSlot[] = [
  { id: "morning",        period: "morning",   purpose: "activity", defaultTime: "09:30", preferCats: ["cafe", "park", "beach", "playground"] },
  { id: "lunch",          period: "lunch",     purpose: "meal",     defaultTime: "12:00", preferCats: ["restaurant", "cafe"] },
  { id: "afternoon-main", period: "afternoon", purpose: "activity", defaultTime: "14:00", preferCats: ["museum", "attraction", "activity", "beach", "park", "swimming", "bowling", "cinema", "spa", "sports", "other"] },
  { id: "afternoon-fika", period: "afternoon", purpose: "fika",     defaultTime: "15:30", preferCats: ["shopping", "cafe", "park", "playground", "other", "attraction"] },
  { id: "dinner",         period: "evening",   purpose: "meal",     defaultTime: "18:30", preferCats: ["restaurant", "cafe"] },
];

const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  beach: "🏖️", park: "🌲", museum: "🏛️", cafe: "☕", restaurant: "🍽️",
  shopping: "🛍️", bowling: "🎳", swimming: "🏊", spa: "🧖", cinema: "🎬",
  activity: "🎯", playground: "🛝", sports: "🏸", attraction: "🎡", other: "⭐",
};

const INDOOR_CATS: PlaceCategory[] = ["museum", "shopping", "bowling", "swimming", "spa", "cinema"];
const EXPOSED_CATS: PlaceCategory[] = ["beach", "playground", "sports", "park"];

const WATER_RE = /\b(sup|kayak|kano|canoe|paddle|surf|sail|segel|bad|swim|dykning|dive|snork|jet.?ski|wakeboard|windsurf|kite|vattenski|båt|boat|fishing|fiske)\b/i;
const TRAIL_RE = /\b(promenad|kustpromenad|vandringsled|trail|walk|stig|naturled|strandpromenad|hiking|rundslinga|loop|spång|boardwalk|led\b)/i;
const SHELTERED_RE = /\b(skyddad|vindskydd|skog|forest|trädgård|garden|innergård|courtyard|centrum|town|stad|hamn|harbour)\b/i;
const MINIGOLF_RE = /\b(minigolf|bangolf|äventyrsgolf|adventure\s*golf|putt|mini\s*golf)\b/i;

const NON_TOURIST_RE = /\b(djuraffär|djurbutik|zoo\s*butik|zoo\s*handl|husdjur|pet\s*shop|pet\s*supply|pet\s*store|zoofamiljen|animail|veterinär|vet\s*clinic|djurklinik|djursjukhus|bilverkstad|auto\s*repair|bil\s*service|däck\s*service|tandläkare|dentist|tandvård|frisör|hair\s*salon|salong|begravning|funeral|advokatbyrå|law\s*firm|juridik|redovisning|redovisningsbyrå|accounting|bank\s*kontor|försäkring|insurance|mäklare|fastighetsmäkl|real\s*estate|revisions\s*byrå|städfirma|cleaning|åkeri|transport\s*firm|el\s*firma|elektriker|plumber|rörmokare|snickare|carpenter|målare\s*firma|painter|begagnat|skrot|junkyard|hundtrim|grooming|hundpensionat|kennel|katthem)\b/i;
const BORING_SHOP_RE = /\b(elgiganten|media\s*markt|biltema|jula|byggmax|bauhaus|rusta|dollarstore|teknikmagasinet|kjell\s*&?\s*company|stadium|intersport|XXL|granit|lager\s*157|kappahl|lindex|h\s*&\s*m|åhléns|class\s*ohlson|clas\s*ohlson)\b/i;

const DAILY_VIBES = [
  "adventure-focused — exciting, physical, memorable",
  "relaxation day — slow pace, nature, restoration",
  "foodie journey — local flavours, markets, cooking",
  "explorer mode — off-the-beaten-path, hidden gems",
  "family fun — playful, inclusive, all-ages",
  "culture & nature — heritage, history, landscapes",
  "spontaneous day — casual surprises, zero stress",
] as const;

const WEATHER_DESC: Record<string, string> = {
  clear: "clear skies", nearly_clear: "nearly clear",
  half_clear: "partly cloudy", partly_cloudy: "partly cloudy",
  cloudy: "cloudy", overcast: "overcast", fog: "foggy",
  light_rain: "light rain", rain: "rain", heavy_rain: "heavy rain",
  thunderstorm: "thunderstorm", light_snow: "light snow",
  snow: "snow", heavy_snow: "heavy snow",
};

// ═══════════════════════════════════════════════════════════════════════
// CACHE LAYER
// ═══════════════════════════════════════════════════════════════════════

const l1 = new Map<string, CachedPlanEnvelope>();
const inflightGenerations = new Map<string, Promise<ItineraryItem[]>>();
const inflightTranslations = new Map<string, Promise<ItineraryItem[]>>();
const inflightPrefetches = new Map<string, Promise<void>>();
let lastCleanupDate = "";

function mkBaseKey(campId: string, date: string, wb: string): string {
  return `v${CACHE_VERSION}|base|${campId}|${date}|${wb}`;
}
function mkTrKey(campId: string, date: string, wb: string, lang: PlanLang): string {
  return `v${CACHE_VERSION}|tr|${campId}|${date}|${wb}|${lang}`;
}
function extractCampId(key: string): string {
  const p = key.split("|");
  return p[0].startsWith("v") ? (p[2] ?? "unknown") : (p[1] ?? "unknown");
}

async function cacheGet(key: string): Promise<CachedPlanEnvelope | null> {
  const date = todayStr();
  const mem = l1.get(key);
  if (mem?.dateStr === date) return mem;
  try {
    const sb = createAdminClient(); // <-- Bypasses RLS
    const { data } = await sb.from("plan_cache").select("envelope").eq("cache_key", key).single();
    if (data?.envelope) {
      const env = data.envelope as CachedPlanEnvelope;
      if (env.dateStr === date) { l1.set(key, env); return env; }
    }
  } catch { /* miss */ }
  return null;
}

async function cacheSet(key: string, env: CachedPlanEnvelope): Promise<void> {
  l1.set(key, env);
  try {
    const sb = createAdminClient(); // <-- Bypasses RLS
    await sb.from("plan_cache").upsert({
      cache_key: key,
      campground_id: extractCampId(key),
      envelope: env as unknown as Record<string, unknown>,
      date_str: env.dateStr,
      updated_at: new Date().toISOString(),
    }, { onConflict: "cache_key" });
  } catch (e) { console.warn("[Planner] Cache write error:", e); }
}

async function cachePurge(campId: string, date: string): Promise<void> {
  for (const [k, v] of l1) {
    if (k.includes(campId) && v.dateStr === date) l1.delete(k);
  }
  try {
    const sb = createAdminClient(); // <-- Bypasses RLS
    await sb.from("plan_cache").delete().eq("campground_id", campId).eq("date_str", date);
  } catch { /* best effort */ }
}

function pruneL1() {
  if (l1.size < 80) return;
  const today = todayStr();
  for (const [k, v] of l1) { if (v.dateStr !== today) l1.delete(k); }
}

async function cleanupOldCache(): Promise<void> {
  const today = todayStr();
  if (lastCleanupDate === today) return;
  lastCleanupDate = today;
  try {
    const sb = createAdminClient(); // <-- Bypasses RLS
    await sb.from("plan_cache").delete().neq("date_str", today);
  } catch { lastCleanupDate = ""; }
}

// ═══════════════════════════════════════════════════════════════════════
// WEATHER BUCKET
// ═══════════════════════════════════════════════════════════════════════

function weatherBucket(rain: boolean, temp: number, wind: number): string {
  const ri = rain ? (wind > 8 || temp < 10 ? "H" : wind > 5 ? "M" : "L") : "d";
  const fl = feelsLike(temp, wind);
  return `${ri}_${Math.round(fl / 4) * 4}_${wind >= 10 ? "W" : wind >= 6 ? "b" : "c"}`;
}

function isWeatherDrastic(a: string, b: string): boolean {
  if (a === b) return false;
  const parse = (w: string) => {
    const [r, t, v] = w.split("_");
    return { rain: r !== "d", heavyRain: r === "H", temp: parseInt(t), windy: v === "W" };
  };
  const o = parse(a), n = parse(b);
  if (o.rain !== n.rain) return true;
  if (o.heavyRain !== n.heavyRain) return true;
  if (o.windy !== n.windy) return true;
  return Math.abs(o.temp - n.temp) >= 8;
}

// ═══════════════════════════════════════════════════════════════════════
// DAY CONTEXT
// ═══════════════════════════════════════════════════════════════════════

interface DayContext {
  dayName: string;
  isWeekend: boolean;
  isSummer: boolean;
  season: "spring" | "summer" | "autumn" | "winter";
  seed: number;
  sunsetHour: number;
  isMidsommarWeek: boolean;
}

function getDayCtx(lang: PlanLang, campId?: string): DayContext {
  const sv = nowInSweden();
  const dow = sv.getDay();
  const month = sv.getMonth();
  const dayOfMonth = sv.getDate();

  const dayNames: Record<PlanLang, string[]> = {
    sv: ["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"],
    en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    de: ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
    da: ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],
    nl: ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"],
    no: ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],
  };

  const season: DayContext["season"] =
    month >= 5 && month <= 7 ? "summer" :
    month >= 2 && month <= 4 ? "spring" :
    month >= 8 && month <= 10 ? "autumn" : "winter";

  const dateNum = parseInt(todayStr().replace(/-/g, ""), 10);
  const campHash = (campId ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    dayName: dayNames[lang][dow],
    isWeekend: dow === 0 || dow === 6,
    isSummer: season === "summer",
    season,
    seed: (dateNum + campHash) % 31,
    sunsetHour: estimateSunsetHour(),
    isMidsommarWeek: month === 5 && dayOfMonth >= 18 && dayOfMonth <= 26,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// DISTANCE HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getKm(place: CachedPlace, dm: Record<string, string>): number {
  if (place.is_on_site) return 0;
  if (place.road_distance_km != null) return place.road_distance_km;
  const s = dm[place.id];
  if (!s) return 999;
  const c = s.replace(/\s/g, "").toLowerCase();
  if (c.includes("km")) return parseFloat(c.replace("km", "").replace(",", ".")) || 999;
  if (c.includes("m")) {
    const m = parseFloat(c.replace("m", "").replace(",", "."));
    return m ? m / 1000 : 999;
  }
  return 999;
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function getDistStr(place: CachedPlace, dm: Record<string, string>): string {
  if (place.is_on_site) return "on site";
  const km = getKm(place, dm);
  if (km < 999) return fmtKm(km);
  const raw = dm[place.id];
  if (raw?.trim()) return raw.trim();
  return "";
}

// ═══════════════════════════════════════════════════════════════════════
// OPENING HOURS
// ═══════════════════════════════════════════════════════════════════════

interface TimeRange { open: number; close: number; }

function parseRange(text: string): TimeRange | null {
  if (!text) return null;
  if (/24\s*(hours|h|timmar)|dygnet\s*runt|døgnåbent/i.test(text)) return { open: 0, close: 24 };
  if (/closed|stängt|geschlossen|lukket/i.test(text)) return null;

  let m = text.match(/(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  if (m) return { open: +m[1] + +m[2] / 60, close: +m[3] + +m[4] / 60 };

  m = text.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (m) {
    const to24 = (h: number, ap: string) => {
      const pm = ap.toUpperCase() === "PM";
      return h === 12 ? (pm ? 12 : 0) : pm ? h + 12 : h;
    };
    return { open: to24(+m[1], m[3]) + (+m[2] || 0) / 60, close: to24(+m[4], m[6]) + (+m[5] || 0) / 60 };
  }
  return null;
}

function getHours(place: CachedPlace): { closed: boolean; text: string | null; range: TimeRange | null } {
  if (place.custom_hours) {
    const closed = /closed|stängt|geschlossen|lukket/i.test(place.custom_hours);
    return { closed, text: place.custom_hours, range: closed ? null : parseRange(place.custom_hours) };
  }
  const data = getTodaysOpeningHours(place.raw_data);
  if (!data) return { closed: false, text: null, range: null };
  const closed = /stängt|closed/i.test(data.text);
  return { closed, text: data.text, range: closed ? null : parseRange(data.text) };
}

function isOpenDuring(place: CachedPlace, period: Period): boolean {
  const h = getHours(place);
  if (h.closed) return false;
  if (!h.range) return true;
  const slot = SLOT_DEFS[period];
  return (Math.min(slot.end, h.range.close) - Math.max(slot.start, h.range.open)) * 60 >= 30;
}

function fmtHours(place: CachedPlace): string {
  const h = getHours(place);
  if (h.closed) return "CLOSED TODAY";
  if (h.range) {
    const f = (n: number) => `${Math.floor(n).toString().padStart(2, "0")}:${Math.round((n % 1) * 60).toString().padStart(2, "0")}`;
    return `open ${f(h.range.open)}–${f(h.range.close)}`;
  }
  return h.text || "hours unknown";
}

// ═══════════════════════════════════════════════════════════════════════
// TOURIST FILTER
// ═══════════════════════════════════════════════════════════════════════

function isTouristWorthy(place: CachedPlace): boolean {
  if (place.is_pinned || place.owner_note) return true;
  const name = place.name.toLowerCase();
  if (NON_TOURIST_RE.test(name)) return false;
  if (BORING_SHOP_RE.test(name) && place.category === "shopping") return false;
  if (/\bzoo\b/i.test(name) && place.category === "shopping" && !/(djurpark|zoo\s*logisk|animal\s*park)/i.test(name)) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════

interface ScoredPlace {
  place: CachedPlace;
  baseScore: number;
  weatherScore: number;
  km: number;
  distStr: string;
}

function computeBaseScore(place: CachedPlace, dm: Record<string, string>): { score: number; km: number; distStr: string } {
  let s = 0;
  const km = getKm(place, dm);
  const distStr = getDistStr(place, dm);

  if (place.is_on_site) s += 35;
  else if (km < 2) s += 30;
  else if (km < 5) s += 22;
  else if (km < 10) s += 15;
  else if (km < 20) s += 8;
  else if (km > 40) s -= 20;

  if (place.is_pinned) s += 35;
  if (place.rating) {
    if (place.rating >= 4.5) s += 30;
    else if (place.rating >= 4.0) s += 20;
    else if (place.rating >= 3.5) s += 10;
    else if (place.rating < 3.0) s -= 15;
  }
  if (place.owner_note) s += 8;

  return { score: s, km, distStr };
}

function computeWeatherScore(place: CachedPlace, weather: WeatherInput | null): number {
  if (!weather) return 0;
  const { temp, windSpeed: wind } = weather;
  const rainI = classifyRain(weather);
  const fl = feelsLike(temp, wind);
  const indoor = place.is_indoor || INDOOR_CATS.includes(place.category);
  const exposed = EXPOSED_CATS.includes(place.category);
  const name = place.name.toLowerCase();
  const isWater = WATER_RE.test(name);
  const isTrail = TRAIL_RE.test(name);
  const isSheltered = SHELTERED_RE.test(name);

  let s = 0;

  // Rain
  if (rainI === "heavy") { s += indoor ? 35 : -35; if (exposed) s -= 25; if (isWater) s -= 40; if (isTrail) s -= 25; }
  else if (rainI === "moderate") { s += indoor ? 25 : -15; if (exposed) s -= 15; if (isWater) s -= 25; if (isTrail && temp >= 10) s -= 5; else if (isTrail) s -= 15; }
  else if (rainI === "drizzle") { s += indoor ? 10 : -5; if (isTrail && temp >= 8) s += 15; if (isWater) s -= 15; if (place.category === "beach") s -= 10; if (isSheltered && !indoor) s += 5; }

  // Temperature
  if (fl >= 23) {
    if (isSwedishBeachWeather(temp, wind, rainI)) { if (place.category === "beach") s += 40; if (isWater) s += 30; if (place.category === "swimming") s += 25; }
    if (["park", "playground"].includes(place.category)) s += 15;
    if (indoor && rainI === "none") s -= 10;
  } else if (fl >= 18) {
    if (isSwedishBeachWeather(temp, wind, rainI)) { if (place.category === "beach") s += 30; if (isWater) s += 20; }
    if (isTrail && rainI !== "heavy") s += 15;
    if (["park", "playground", "sports"].includes(place.category) && rainI === "none") s += 12;
    if (place.category === "swimming") s += 15;
  } else if (fl >= 13) {
    if (isTrail && isTrailWeather(temp, wind, rainI)) s += 18;
    if (["park", "museum", "attraction"].includes(place.category)) s += 8;
    if (isWater) s -= 10; if (indoor) s += 5;
  } else if (fl >= 8) {
    s += indoor ? 15 : -8;
    if (isTrail && rainI !== "heavy" && wind < 10) s += 8;
    if (exposed && !isTrail) s -= 12; if (isWater) s -= 25;
    if (place.category === "cafe") s += 10;
  } else {
    s += indoor ? 25 : -20; if (exposed) s -= 20; if (isWater) s -= 40;
    if (place.category === "spa") s += 15; if (place.category === "cafe") s += 12;
  }

  // Wind
  const windL = classifyWind(wind);
  if (windL === "veryWindy") { if (place.category === "beach") s -= 30; if (isWater) s -= 35; if (exposed && !isSheltered) s -= 20; if (indoor) s += 10; }
  else if (windL === "windy") { if (place.category === "beach") s -= 15; if (isWater) s -= 25; if (exposed && !isSheltered) s -= 10; if (indoor) s += 5; }
  else if (windL === "breezy") { if (place.category === "beach" && fl < 20) s -= 5; }

  return s;
}

function slotFitScore(cat: PlaceCategory, slot: PlanSlot): number {
  if (slot.purpose === "meal") { return cat === "restaurant" ? 50 : cat === "cafe" ? 35 : -200; }
  if (slot.purpose === "fika") {
    if (cat === "cafe") return 35; if (cat === "park") return 20; if (cat === "shopping") return 15;
    if (cat === "playground") return 10; if (cat === "restaurant") return -30; return 5;
  }
  if (slot.period === "morning") {
    const b: Partial<Record<PlaceCategory, number>> = { cafe: 30, park: 25, beach: 20, playground: 15, attraction: 15, museum: 10, activity: 10, restaurant: -40, cinema: -40, bowling: -30 };
    return b[cat] ?? 0;
  }
  if (slot.period === "afternoon") {
    const b: Partial<Record<PlaceCategory, number>> = { activity: 30, attraction: 30, museum: 25, swimming: 25, beach: 25, bowling: 20, cinema: 20, spa: 20, sports: 20, park: 15, restaurant: -30 };
    return b[cat] ?? 0;
  }
  return 0;
}

function varietyJitter(placeId: string, seed: number): number {
  const hash = placeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 23 + hash * 13) % 21) - 10;
}

function scorePlaces(places: CachedPlace[], weather: WeatherInput | null, dm: Record<string, string>): ScoredPlace[] {
  return places
    .filter(p => !p.is_hidden && isTouristWorthy(p))
    .map(p => {
      if (getHours(p).closed) return null;
      const { score: base, km, distStr } = computeBaseScore(p, dm);
      return { place: p, baseScore: base, weatherScore: computeWeatherScore(p, weather), km, distStr } as ScoredPlace;
    })
    .filter((s): s is ScoredPlace => s !== null);
}

// ═══════════════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════════════

interface Selection {
  morning: ScoredPlace[];
  lunch: ScoredPlace[];
  afternoon: ScoredPlace[];
  evening: ScoredPlace[];
  extras: ScoredPlace[];
}

function selectForPlan(scored: ScoredPlace[], seed: number): Selection {
  const used = new Set<string>();
  const usedCats = new Set<PlaceCategory>();
  const result: Selection = { morning: [], lunch: [], afternoon: [], evening: [], extras: [] };

  for (const slot of PLAN_SLOTS) {
    let cands = scored.filter(s => !used.has(s.place.id) && isOpenDuring(s.place, slot.period));
    if (slot.purpose === "meal") cands = cands.filter(s => FOOD_CATS.has(s.place.category));
    else { const nr = cands.filter(s => s.place.category !== "restaurant"); if (nr.length) cands = nr; }

    const ranked = cands
      .map(s => {
        let total = s.baseScore + s.weatherScore + slotFitScore(s.place.category, slot);
        if (usedCats.has(s.place.category)) total -= 20;
        if ((slot.preferCats as readonly PlaceCategory[]).includes(s.place.category)) total += 15;
        total += varietyJitter(s.place.id, seed);
        return { ...s, total };
      })
      .sort((a, b) => b.total - a.total);

    if (ranked.length > 0 && ranked[0].total > -50) {
      const pick = ranked[0];
      result[slot.period].push(pick);
      used.add(pick.place.id);
      usedCats.add(pick.place.category);
    }
  }

  scored.filter(s => !used.has(s.place.id) && s.place.category !== "restaurant")
    .sort((a, b) => b.baseScore + b.weatherScore - (a.baseScore + a.weatherScore))
    .slice(0, 3)
    .forEach(s => { result.extras.push(s); used.add(s.place.id); });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// PROMPT
// ═══════════════════════════════════════════════════════════════════════

function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[`"'{}[\]\\]/g, "").replace(/ignore\s+(all\s+)?(previous\s+)?/gi, "").replace(/system\s*:/gi, "").trim().slice(0, 100);
}

function buildWeatherBrief(weather: WeatherInput | null, day: DayContext): string {
  if (!weather) return "unknown — assume pleasant";
  const fl = feelsLike(weather.temp, weather.windSpeed);
  const rainI = classifyRain(weather);
  const windL = classifyWind(weather.windSpeed);
  const parts: string[] = [];
  if (fl >= 25) parts.push(`${weather.temp}°C — warm for Sweden`);
  else if (fl >= 20) parts.push(`${weather.temp}°C — classic summer`);
  else if (fl >= 15) parts.push(`${weather.temp}°C — pleasant with a layer`);
  else if (fl >= 10) parts.push(`${weather.temp}°C — jacket weather`);
  else if (fl >= 5) parts.push(`${weather.temp}°C — chilly`);
  else parts.push(`${weather.temp}°C — cold`);
  if (windL === "veryWindy") parts.push(`strong wind ${weather.windSpeed} m/s`);
  else if (windL === "windy") parts.push(`windy ${weather.windSpeed} m/s`);
  if (rainI === "heavy") parts.push("heavy rain");
  else if (rainI === "moderate") parts.push("rain");
  else if (rainI === "drizzle") parts.push("light drizzle");
  else { const d = WEATHER_DESC[weather.description]; if (d && d !== "dry") parts.push(d); }
  if (Math.abs(fl - weather.temp) >= 3) parts.push(`feels like ${fl}°C`);
  return parts.join(", ");
}

function buildPrompt(
  campground: Campground, sel: Selection, weather: WeatherInput | null,
  day: DayContext, periodsToGenerate?: Period[],
): string {
  const name = sanitize(campground.name);
  const vibe = DAILY_VIBES[day.seed % DAILY_VIBES.length];
  const rainI = classifyRain(weather);
  const fl = weather ? feelsLike(weather.temp, weather.windSpeed) : 18;

  const fmt = (s: ScoredPlace, hint: string) => {
    const parts = [
      `"${sanitize(s.place.name)}"`,
      `cat:${s.place.category}`,
      `slot:${hint}`,
      s.place.is_on_site ? "ON-SITE" : s.distStr ? `${s.distStr} away` : "nearby",
    ];
    if (s.place.rating) parts.push(`★${s.place.rating}`);
    if (s.place.is_indoor) parts.push("indoor");
    if (MINIGOLF_RE.test(s.place.name)) parts.push("minigolf");
    parts.push(fmtHours(s.place));
    if (s.place.owner_note) parts.push(`note:"${sanitize(s.place.owner_note)}"`);
    parts.push(`id:${s.place.id}`);
    return parts.join(", ");
  };

  const inc = (p: Period) => !periodsToGenerate || periodsToGenerate.includes(p);
  const sections: string[] = [];
  if (inc("morning") && sel.morning.length)
    sections.push(`MORNING (08:30–11:00):\n${sel.morning.map(p => `  • ${fmt(p, "morning-activity")}`).join("\n")}`);
  if (inc("lunch") && sel.lunch.length)
    sections.push(`LUNCH (11:30–13:30):\n${sel.lunch.map(p => `  • ${fmt(p, "meal")}`).join("\n")}`);
  if (inc("afternoon") && sel.afternoon.length) {
    const lines = sel.afternoon.map((p, i) => `  • ${fmt(p, i === 0 ? "main-activity" : "fika")}`).join("\n");
    sections.push(`AFTERNOON (14:00–17:30):\n${lines}`);
  }
  if (inc("evening") && sel.evening.length)
    sections.push(`DINNER (18:00–20:00):\n${sel.evening.map(p => `  • ${fmt(p, "meal")}`).join("\n")}`);
  if (sel.extras.length)
    sections.push(`ALTERNATIVES:\n${sel.extras.map(p => `  • ${fmt(p, "flex")}`).join("\n")}`);

  const hasPlaces = sections.length > 0;

  let weatherStrategy: string;
  if (rainI === "heavy") weatherStrategy = "Full indoor day. Museums, bowling, cinema, camp kitchen.";
  else if (rainI === "moderate") weatherStrategy = "Rain — mix indoor activities with short outdoor moments.";
  else if (rainI === "drizzle") weatherStrategy = "Light drizzle — trails in rain are magical. Skip beach/water, everything else works.";
  else if (fl >= 23) weatherStrategy = "Rare warm day! Beach, swimming, outdoor everything.";
  else if (fl >= 18) weatherStrategy = "Classic Swedish summer. Balance outdoor and rest.";
  else if (fl >= 13) weatherStrategy = "Comfortable with a layer. Great for hiking, exploring.";
  else if (fl >= 8) weatherStrategy = "Chilly. Layer up, lean toward active outdoor or indoor.";
  else weatherStrategy = "Cold day. Indoor focus: museums, bowling, cinema, spa.";

  return `You are a Swedish camping travel planner. Plan a great day for guests at "${name}".

TODAY: ${day.dayName}${day.isWeekend ? " (weekend)" : ""}, ${day.season}
WEATHER: ${buildWeatherBrief(weather, day)}
STRATEGY: ${weatherStrategy}
VIBE: ${vibe}

${hasPlaces ? `PLACES:\n${sections.join("\n\n")}` : "No places — suggest camp activities (walks, cooking, campfire, exploring)."}

Return a JSON array. Each object:
{"time":"HH:MM","period":"morning|lunch|afternoon|evening","emoji":"…","title":"…","description":"…","placeId":"<exact id or omit>","tip":"…or omit entirely"}

CRITICAL RULES:
1. MEALS = FOOD ONLY. Lunch/dinner slots use restaurant/cafe places. No activities as meals. No place = cook at camp
2. NEVER invent facts about places. Do NOT describe what a place serves, sells, or looks like unless the owner-note says so. Just say "Start the day at [name]" or "Lunch at [name]"
3. title = the place name (verbatim) or a short activity name for camp items
4. description: 1-2 SHORT sentences. Friendly. NEVER mention exact temperatures. Use mood words (chilly, gorgeous, etc)
5. tip: EITHER a distance ("3.2 km") OR a short note ("★4.5" or "On site") — max 5 words. If nothing useful, OMIT the tip field entirely. Never combine multiple things in a tip
6. ON-SITE = "right at camp". NEVER say "just away" or leave distance empty
7. Time must be within place opening hours
8. ${periodsToGenerate ? `ONLY generate: ${periodsToGenerate.join(", ")}` : "5-7 items covering ALL four periods. End with a camp evening activity (campfire, games, stargazing)"}
9. Use EXACT placeId values. No duplicates. No invented places
10. Minigolf = fun family activity, NOT "the adventure of a lifetime"
11. MOST IMPORTANT: If no suitable place exists in the provided list for a given time slot, DO NOT invent, generate, or suggest a place name that is not in the provided list. Instead, suggest a generic camp activity (walk, campfire, relaxation) with NO placeId. It is always better to suggest a camp activity than to guess at a place name.`;
}

// ═══════════════════════════════════════════════════════════════════════
// JSON REPAIR + PARSING
// ═══════════════════════════════════════════════════════════════════════

function repairJSONArray(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();
  const start = s.indexOf("[");
  if (start > 0) s = s.slice(start);
  if (!s.startsWith("[")) s = "[" + s;
  const end = s.lastIndexOf("]");
  if (end > 0) s = s.slice(0, end + 1);
  else { const lb = s.lastIndexOf("}"); if (lb > 0) s = s.slice(0, lb + 1) + "]"; else return "[]"; }
  s = s.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
  s = s.replace(/("(?:[^"\\]|\\.)*")|[\n\r]+/g, (m, q) => q ?? " ");
  let inStr = false, lastQ = -1;
  for (let i = 0; i < s.length; i++) { if (s[i] === '"' && (i === 0 || s[i - 1] !== "\\")) { inStr = !inStr; if (inStr) lastQ = i; } }
  if (inStr && lastQ >= 0) { const before = s.slice(0, lastQ); const lo = before.lastIndexOf("}"); if (lo > 0) s = before.slice(0, lo + 1).replace(/,\s*$/, "") + "]"; else return "[]"; }
  return s;
}

function parseItems(raw: string): ItineraryItem[] | null {
  const cleaned = repairJSONArray(raw);
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return null; }
  let arr: unknown[] | null = null;
  if (Array.isArray(parsed)) arr = parsed;
  else if (typeof parsed === "object" && parsed !== null) {
    for (const k of ["items", "plan", "itinerary", "data"]) { if (Array.isArray((parsed as any)[k])) { arr = (parsed as any)[k]; break; } }
  }
  if (!arr?.length) return null;

  const valid = new Set<Period>(PERIOD_ORDER);
  const items: ItineraryItem[] = [];
  for (const x of arr) {
    if (typeof x !== "object" || !x) continue;
    const it = x as Record<string, unknown>;
    if (!it.time || !it.period || !it.title || !it.description) continue;
    const period = String(it.period);
    if (!valid.has(period as Period)) continue;
    let tip: string | undefined;
    if (it.tip && typeof it.tip === "string") { const t = it.tip.trim(); if (t && t !== "null" && t !== "undefined" && t !== "") tip = t; }
    items.push({
      time: String(it.time), period: period as Period,
      emoji: it.emoji ? String(it.emoji) : "📍",
      title: String(it.title), description: String(it.description),
      placeId: it.placeId && it.placeId !== "null" && it.placeId !== "" ? String(it.placeId) : undefined,
      tip,
    });
  }
  return items.length ? items : null;
}

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
    // Drop the item entirely if the claimed placeId is not in our known place map.
    // Keeping it would render a hallucinated title.
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
// FALLBACK PLAN
// ═══════════════════════════════════════════════════════════════════════

interface FallbackOption { emoji: string; title: string; desc: string; when?: (ctx: WeatherCtx) => boolean; }

function pickOption(options: FallbackOption[], ctx: WeatherCtx, slotSeed: number, daySeed: number): FallbackOption {
  const viable = options.filter(o => !o.when || o.when(ctx));
  if (!viable.length) return options[options.length - 1];
  return viable[(daySeed + slotSeed) % viable.length];
}

function buildPlaceDesc(s: ScoredPlace, ctx: WeatherCtx, slot: string): string {
  const name = s.place.name;
  const isMinigolf = MINIGOLF_RE.test(name);
  const onSite = s.place.is_on_site;
  const distPhrase = onSite ? "right at camp" : s.distStr ? `${s.distStr} away` : "nearby";

  if (isMinigolf) {
    if (ctx.fl < 8) return `Minigolf at ${name}! ${onSite ? "Right at camp — " : ""}Bundle up and bring your competitive spirit.`;
    if (ctx.rain === "drizzle") return `Minigolf at ${name} in the drizzle? Why not! ${onSite ? "It's right here. " : ""}A little rain makes it interesting.`;
    if (ctx.rain !== "none") return `If the rain clears, ${name} is ${distPhrase}. Worth keeping in mind.`;
    return `A round of minigolf at ${name}! ${onSite ? "Right at camp. " : ""}Fun for everyone.`;
  }

  // Don't invent descriptions for places we know nothing about
  // Just state the name and location
  const cat = s.place.category;
  if (cat === "restaurant" || cat === "cafe") {
    if (slot.includes("meal") || slot === "dinner") {
      return `${slot === "dinner" ? "Dinner" : "Lunch"} at ${name}. ${onSite ? "Right at camp." : distPhrase ? `It's ${distPhrase}.` : ""}`;
    }
    if (ctx.fl < 8) return `Warm up at ${name} with something hot.${onSite ? " Right at camp." : ""}`;
    return `Start the day with fika at ${name}.${onSite ? " Right at camp." : ""}`;
  }
  if (cat === "beach") {
    if (ctx.beachOk && ctx.fl >= 20) return `Beach time at ${name}! ${onSite ? "Right at camp." : `It's ${distPhrase}.`}`;
    if (ctx.beachOk) return `Head to ${name} for a swim. ${ctx.fl >= 18 ? "Classic Swedish beach weather." : "The brave ones jump in."}`;
    return `Walk along ${name}. The coastline is worth it in any weather.`;
  }
  if (cat === "museum") {
    return `${ctx.rain !== "none" ? "Perfect weather for" : "Check out"} ${name}.${onSite ? " Right at camp." : ""}`;
  }
  if (cat === "park") {
    if (ctx.rain === "drizzle") return `Explore ${name} in the light rain. The forest smells incredible.`;
    return `Explore ${name}.${onSite ? " Right at camp." : ""}`;
  }

  // Generic safe description — no invented facts
  return `Head to ${name}.${onSite ? " Right at camp." : distPhrase ? ` It's ${distPhrase}.` : ""}`;
}

function buildFallback(
  sel: Selection,
  weather: { temp: number; isRaining: boolean; windSpeed?: number; description?: string } | null,
  day: DayContext,
  periodsOnly?: Period[],
): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  const ctx = buildWeatherCtx(weather, day);
  const inc = (p: Period) => !periodsOnly || periodsOnly.includes(p);

  if (inc("morning")) {
    if (sel.morning[0]) {
      const s = sel.morning[0];
      items.push({
        time: "09:30", period: "morning", emoji: CATEGORY_EMOJI[s.place.category] ?? "📍",
        title: s.place.name, description: buildPlaceDesc(s, ctx, "morning"),
        placeId: s.place.id, tip: s.place.is_on_site ? "On site" : s.distStr || undefined,
      });
    } else {
      const opts: FallbackOption[] = [
        { emoji: "☀️", title: "Slow camp morning", desc: "No alarm. Coffee, breakfast outside, watch the world wake up.", when: c => c.rain === "none" && c.fl > 12 },
        { emoji: "🌅", title: "Morning walk", desc: "Explore the surroundings. Morning light makes everything magical.", when: c => c.trailOk && c.fl > 5 },
        { emoji: "☕", title: "Cozy camp kitchen", desc: "Rain on the roof, coffee in hand. Make a proper breakfast. No hurry.", when: c => c.rain === "moderate" || c.rain === "heavy" },
        { emoji: "🧣", title: "Brisk morning", desc: `It's ${tempMood(ctx.fl)} out. Hot coffee, warm layers, short walk.`, when: c => c.fl < 8 && c.rain === "none" },
        { emoji: "☕", title: "Lazy camp morning", desc: "Some mornings are for staying put. Coffee, reading, chatting with neighbours." },
      ];
      const pick = pickOption(opts, ctx, 0, day.seed);
      items.push({ time: "09:00", period: "morning", emoji: pick.emoji, title: pick.title, description: pick.desc });
    }
  }

  if (inc("lunch")) {
    if (sel.lunch[0]) {
      const s = sel.lunch[0];
      items.push({
        time: "12:00", period: "lunch", emoji: "🍽️",
        title: s.place.name, description: buildPlaceDesc(s, ctx, "meal"),
        placeId: s.place.id,
        tip: s.place.rating && s.place.rating >= 4.5 ? "Highly rated!" : s.place.rating && s.place.rating >= 4.0 ? `★${s.place.rating}` : (s.distStr || undefined),
      });
    } else {
      const opts: FallbackOption[] = [
        { emoji: "🧺", title: "Picnic lunch", desc: "Sandwiches, fruit, a scenic spot. Simple and perfect.", when: c => c.rain === "none" && c.fl > 14 },
        { emoji: "🍖", title: "Camp BBQ", desc: "Fire up the grill! Sausages, halloumi, corn.", when: c => c.bbqOk && c.fl > 12 && c.rain === "none" },
        { emoji: "🍲", title: "Camp kitchen lunch", desc: "Something tasty from the camp kitchen. Always better on holiday.", when: c => c.rain !== "none" || c.fl < 12 },
        { emoji: "🍲", title: "Warm camp lunch", desc: `Something warm today. The kitchen is your friend when it's ${tempMood(ctx.fl)}.` },
      ];
      const pick = pickOption(opts, ctx, 1, day.seed);
      items.push({ time: "12:00", period: "lunch", emoji: pick.emoji, title: pick.title, description: pick.desc });
    }
  }

  if (inc("afternoon")) {
    if (sel.afternoon.length > 0) {
      const s = sel.afternoon[0];
      items.push({
        time: "14:00", period: "afternoon", emoji: CATEGORY_EMOJI[s.place.category] ?? "📍",
        title: s.place.name, description: buildPlaceDesc(s, ctx, "afternoon-main"),
        placeId: s.place.id, tip: s.place.is_on_site ? "On site" : s.distStr || undefined,
      });
      if (sel.afternoon[1]) {
        const s2 = sel.afternoon[1];
        items.push({
          time: "16:00", period: "afternoon", emoji: CATEGORY_EMOJI[s2.place.category] ?? "☕",
          title: s2.place.name, description: buildPlaceDesc(s2, ctx, "afternoon-fika"),
          placeId: s2.place.id, tip: s2.place.is_on_site ? "On site" : s2.distStr || undefined,
        });
      }
    } else {
      const opts: FallbackOption[] = [
        { emoji: "🏖️", title: "Beach afternoon", desc: "Find water, plant yourself. Swim, sunbathe, read, repeat.", when: c => c.beachOk && c.fl >= 18 },
        { emoji: "🌲", title: "Forest trail", desc: "Head into the forest. Swedish trails always have a surprise. Bring fika.", when: c => c.trailOk && c.fl >= 8 },
        { emoji: "🎲", title: "Indoor afternoon", desc: "Board games, cards, a tournament. Rainy afternoons have their own magic.", when: c => c.rain === "moderate" || c.rain === "heavy" },
        { emoji: "🧣", title: "Bundled-up exploring", desc: `Layer up, thermos in hand, discover what's around camp.`, when: c => c.fl < 8 && c.rain === "none" },
        { emoji: "🚶", title: "Explore the area", desc: "Head out on foot. The best discoveries are unplanned." },
      ];
      const pick = pickOption(opts, ctx, 2, day.seed);
      items.push({ time: "14:30", period: "afternoon", emoji: pick.emoji, title: pick.title, description: pick.desc });
    }
  }

  if (inc("evening")) {
    if (sel.evening[0]) {
      const s = sel.evening[0];
      items.push({
        time: "18:30", period: "evening", emoji: "🍷",
        title: s.place.name, description: buildPlaceDesc(s, ctx, "dinner"),
        placeId: s.place.id, tip: s.distStr || undefined,
      });
    } else {
      const opts: FallbackOption[] = [
        { emoji: "🍖", title: "BBQ dinner", desc: "Grill as the sun gets lower. Pure holiday vibes.", when: c => c.bbqOk && c.fl > 12 && c.rain === "none" },
        { emoji: "🍲", title: "Camp kitchen feast", desc: `Cook something special. ${ctx.fl < 10 ? "The warm kitchen is the place to be." : "Eat at the picnic table."}`, when: c => c.rain !== "none" || c.fl < 10 },
        { emoji: "🥘", title: "One-pot dinner", desc: "Stew or chili on the camp stove. Easy, delicious.", },
      ];
      const pick = pickOption(opts, ctx, 3, day.seed);
      items.push({ time: "18:30", period: "evening", emoji: pick.emoji, title: pick.title, description: pick.desc });
    }

    const wdOpts: FallbackOption[] = [
      { emoji: "🔥", title: "Campfire evening", desc: "Gather around the fire. The soul of camping.", when: c => c.fireOk && c.rain === "none" && c.fl > 10 },
      { emoji: "🔥", title: "Campfire in the drizzle", desc: "Light rain, warm fire. Rain keeps mosquitoes away. Peak Sweden.", when: c => c.fireOk && c.rain === "drizzle" && c.fl >= 10 },
      { emoji: "🔥", title: "Campfire in the cold", desc: `Huddle close, warm your hands. Hot chocolate mandatory.`, when: c => c.fireOk && c.fl < 8 && c.fl >= 0 && c.rain === "none" },
      { emoji: "🎲", title: "Game night", desc: "Uno, Yatzy, or whatever's in the drawer. Competitive and loud.", when: c => c.rain === "moderate" || c.rain === "heavy" || c.fl < 5 },
      { emoji: "🎬", title: "Movie night", desc: "Laptop, snacks, blankets. Settle in.", when: c => c.rain === "heavy" || (c.rain === "moderate" && c.fl < 12) },
      { emoji: "🧣", title: "Cozy evening in", desc: `Hot chocolate, blankets, ${ctx.rain !== "none" ? "rain on the roof" : "cold air outside"}.`, when: c => c.fl < 8 || c.rain !== "none" },
      { emoji: "🌅", title: "Sunset walk", desc: "The light is incredible. Take a short walk.", when: c => c.rain === "none" && c.fl > 12 && c.isSummer },
      { emoji: "🌙", title: "Quiet evening at camp", desc: "Wind down. Chat with neighbours, plan tomorrow lazily." },
    ];
    const pick = pickOption(wdOpts, ctx, 4, day.seed);
    items.push({ time: "21:00", period: "evening", emoji: pick.emoji, title: pick.title, description: pick.desc });
  }

  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// GEMINI API
// ═══════════════════════════════════════════════════════════════════════

async function callGemini(prompt: string, attempt = 1): Promise<ItineraryItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 4096, responseMimeType: "application/json" },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429 && attempt < 3) { await delay(1000 * 2 ** attempt); return callGemini(prompt, attempt + 1); }
      if (res.status >= 500 && attempt < 2) { await delay(500); return callGemini(prompt, attempt + 1); }
      return null;
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const items = parseItems(text);
    if (items && items.length >= 3) return items;
    if (attempt < 2) return callGemini(prompt + "\n\nReturn 5-7 items covering ALL four periods.", attempt + 1);
    return items;
  } catch (err) {
    console.error("[Planner] API error:", err);
    if (attempt < 2) { await delay(500); return callGemini(prompt, attempt + 1); }
    return null;
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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
): ItineraryItem[] {
  const covered = new Set(plan.map(i => i.period));
  const missing = PERIOD_ORDER.filter(p => !covered.has(p));
  if (!missing.length) return plan;
  const filler = buildFallback(sel, weather, day, missing);
  return [...plan, ...filler].sort((a, b) => getItemMin(a.time) - getItemMin(b.time));
}

// ═══════════════════════════════════════════════════════════════════════
// BASE GENERATION
// ═══════════════════════════════════════════════════════════════════════

async function generateBase(
  campground: Campground, weather: WeatherInput | null | undefined,
  places: CachedPlace[], dm: Record<string, string>,
  date: string, wb: string, periodsToGenerate?: Period[],
): Promise<{ plan: ItineraryItem[]; periodWeather: Record<Period, string> }> {
  const day = getDayCtx("en", campground.id);
  const scored = scorePlaces(places, weather ?? null, dm);
  const sel = selectForPlan(scored, day.seed);
  const prompt = buildPrompt(campground, sel, weather ?? null, day, periodsToGenerate);
  let plan = await callGemini(prompt);

  const ws = weather ? { temp: weather.temp, isRaining: weather.isRaining, windSpeed: weather.windSpeed, description: weather.description } : null;
  if (!plan || plan.length < 3) plan = buildFallback(sel, ws, day, periodsToGenerate);

  const byId = new Map(places.map(p => [p.id, p]));
  plan = plan.map(item => ({ ...item, placeId: item.placeId && byId.has(item.placeId) ? item.placeId : undefined }));
  plan = postValidate(plan, byId, dm);
  if (!periodsToGenerate) plan = fillGaps(plan, sel, ws, day);

  const pw: Record<Period, string> = { morning: wb, lunch: wb, afternoon: wb, evening: wb };
  return { plan, periodWeather: pw };
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSLATION
// ═══════════════════════════════════════════════════════════════════════

async function translatePlan(
  plan: ItineraryItem[], lang: PlanLang, placesById: Map<string, CachedPlace>,
): Promise<ItineraryItem[]> {
  if (lang === "en") return plan;

  const langName: Record<PlanLang, string> = {
    sv: "Swedish", en: "English", de: "German", da: "Danish", nl: "Dutch", no: "Norwegian",
  };

  const batch = plan.map((item, i) => ({
    i, title: item.title, description: item.description,
    ...(item.tip ? { tip: item.tip } : {}),
  }));

  const prompt = `Translate to ${langName[lang]}. Keep place names exactly as-is. Short friendly tone. Return JSON array only.\n\n${JSON.stringify(batch)}`;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) throw new Error("Missing API Key for translation");

  // Bumped to gemini-2.5-flash for maximum reliability
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Translation API failed with status: ${res.status}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Translation returned empty text");

  let parsed: unknown;
  try {
    parsed = JSON.parse(repairJSONArray(text));
  } catch {
    throw new Error("Translation returned invalid JSON");
  }

  if (!Array.isArray(parsed)) throw new Error("Translation did not return an array");

  return plan.map((item, i) => {
    const tr = (parsed as any[])[i];
    if (!tr || typeof tr !== "object") return item;
    let tip = item.tip;
    if (item.placeId && item.tip) {
      const place = placesById.get(item.placeId);
      const preTr = place?.note_translations?.[lang as keyof typeof place.note_translations];
      if (preTr) tip = preTr;
    }
    if (typeof tr.tip === "string" && tr.tip.trim()) tip = tr.tip;
    return {
      ...item,
      title: typeof tr.title === "string" && tr.title ? tr.title : item.title,
      description: typeof tr.description === "string" && tr.description ? tr.description : item.description,
      tip: item.tip ? tip : undefined,
    };
  });
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

  const { plan: newItems, periodWeather: newPw } = await generateBase(campground, weather, places, dm, todayStr(), newWb, toRegen);
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
  for (const [k, v] of l1) { if (k.includes(campId) && k.includes(date) && v.dateStr === date) return v; }
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

  // 1. Check translated cache
  const cachedTr = await cacheGet(trKey);
  if (cachedTr) return cachedTr.plan;

  // 2. Get or generate base plan
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
        const promise = generateBase(campground, weather, places, dm, date, wb).then(r => r.plan);
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

  // 3. Translate safely
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

    // 4. ONLY cache translated result if no errors were thrown
    await cacheSet(trKey, { plan: translated, timestamp: Date.now(), dateStr: date, weatherKey: wb, periodWeather: pw });
    pruneL1();
    return translated;

  } catch (err) {
    console.error(`[Planner] Translation to ${lang} failed, serving base plan temporarily:`, err);
    inflightTranslations.delete(trKey);

    // Serve English base plan for this request, but DO NOT save it to the database
    return basePlan;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PREFETCH
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_LANGS: PlanLang[] = ["sv", "en", "de", "da", "nl", "no"];

async function warmTranslations(
  basePlan: ItineraryItem[], campground: Campground, places: CachedPlace[],
  date: string, wb: string, pw: Record<Period, string>,
): Promise<void> {
  const byId = new Map(places.map(p => [p.id, p]));

  // FIX: Force warm all 6 core languages, not just what's in campground settings
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
        const gen = generateBase(campground, weather, places, dm, date, wb).then(r => r.plan);
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
