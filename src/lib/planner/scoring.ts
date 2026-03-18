// src/lib/planner/scoring.ts

import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { CachedPlace, PlaceCategory } from "@/types/database";
import type { Period, PlanSlot, ScoredPlace, Selection, TimeRange, WeatherInput } from "./types";
import { classifyRain, classifyWind, feelsLike, isSwedishBeachWeather, isTrailWeather } from "./weather-scoring";

export const PERIOD_ORDER: Period[] = ["morning", "lunch", "afternoon", "evening"];

export const SLOT_DEFS: Record<Period, { start: number; end: number }> = {
  morning:   { start: 8,    end: 11.5 },
  lunch:     { start: 11.5, end: 14   },
  afternoon: { start: 13.5, end: 17.5 },
  evening:   { start: 17.5, end: 22   },
};

export const FOOD_CATS: ReadonlySet<PlaceCategory> = new Set(["restaurant", "cafe"]);

export const PLAN_SLOTS: PlanSlot[] = [
  { id: "morning",        period: "morning",   purpose: "activity", defaultTime: "09:30", preferCats: ["cafe", "park", "beach", "playground"] },
  { id: "lunch",          period: "lunch",     purpose: "meal",     defaultTime: "12:00", preferCats: ["restaurant", "cafe"] },
  { id: "afternoon-main", period: "afternoon", purpose: "activity", defaultTime: "14:00", preferCats: ["museum", "attraction", "activity", "beach", "park", "swimming", "bowling", "cinema", "spa", "sports", "other"] },
  { id: "afternoon-fika", period: "afternoon", purpose: "fika",     defaultTime: "15:30", preferCats: ["shopping", "cafe", "park", "playground", "other", "attraction"] },
  { id: "dinner",         period: "evening",   purpose: "meal",     defaultTime: "18:30", preferCats: ["restaurant", "cafe"] },
];

export const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  beach: "🏖️", park: "🌲", museum: "🏛️", cafe: "☕", restaurant: "🍽️",
  shopping: "🛍️", bowling: "🎳", swimming: "🏊", spa: "🧖", cinema: "🎬",
  activity: "🎯", playground: "🛝", sports: "🏸", attraction: "🎡", other: "⭐",
};

export const INDOOR_CATS: PlaceCategory[] = ["museum", "shopping", "bowling", "swimming", "spa", "cinema"];
export const EXPOSED_CATS: PlaceCategory[] = ["beach", "playground", "sports", "park"];

export const WATER_RE = /\b(sup|kayak|kano|canoe|paddle|surf|sail|segel|bad|swim|dykning|dive|snork|jet.?ski|wakeboard|windsurf|kite|vattenski|båt|boat|fishing|fiske)\b/i;
export const TRAIL_RE = /\b(promenad|kustpromenad|vandringsled|trail|walk|stig|naturled|strandpromenad|hiking|rundslinga|loop|spång|boardwalk|led\b)/i;
const SHELTERED_RE = /\b(skyddad|vindskydd|skog|forest|trädgård|garden|innergård|courtyard|centrum|town|stad|hamn|harbour)\b/i;
export const MINIGOLF_RE = /\b(minigolf|bangolf|äventyrsgolf|adventure\s*golf|putt|mini\s*golf)\b/i;

const NON_TOURIST_RE = /\b(djuraffär|djurbutik|zoo\s*butik|zoo\s*handl|husdjur|pet\s*shop|pet\s*supply|pet\s*store|zoofamiljen|animail|veterinär|vet\s*clinic|djurklinik|djursjukhus|bilverkstad|auto\s*repair|bil\s*service|däck\s*service|tandläkare|dentist|tandvård|frisör|hair\s*salon|salong|begravning|funeral|advokatbyrå|law\s*firm|juridik|redovisning|redovisningsbyrå|accounting|bank\s*kontor|försäkring|insurance|mäklare|fastighetsmäkl|real\s*estate|revisions\s*byrå|städfirma|cleaning|åkeri|transport\s*firm|el\s*firma|elektriker|plumber|rörmokare|snickare|carpenter|målare\s*firma|painter|begagnat|skrot|junkyard|hundtrim|grooming|hundpensionat|kennel|katthem)\b/i;
const BORING_SHOP_RE = /\b(elgiganten|media\s*markt|biltema|jula|byggmax|bauhaus|rusta|dollarstore|teknikmagasinet|kjell\s*&?\s*company|stadium|intersport|XXL|granit|lager\s*157|kappahl|lindex|h\s*&\s*m|åhléns|class\s*ohlson|clas\s*ohlson)\b/i;

export function getKm(place: CachedPlace, dm: Record<string, string>): number {
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

export function getDistStr(place: CachedPlace, dm: Record<string, string>): string {
  if (place.is_on_site) return "on site";
  const km = getKm(place, dm);
  if (km < 999) return fmtKm(km);
  const raw = dm[place.id];
  if (raw?.trim()) return raw.trim();
  return "";
}

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

export function getHours(place: CachedPlace): { closed: boolean; text: string | null; range: TimeRange | null } {
  if (place.custom_hours) {
    const closed = /closed|stängt|geschlossen|lukket/i.test(place.custom_hours);
    return { closed, text: place.custom_hours, range: closed ? null : parseRange(place.custom_hours) };
  }
  const data = getTodaysOpeningHours(place.raw_data);
  if (!data) return { closed: false, text: null, range: null };
  const closed = /stängt|closed/i.test(data.text);
  return { closed, text: data.text, range: closed ? null : parseRange(data.text) };
}

export function isOpenDuring(place: CachedPlace, period: Period): boolean {
  const h = getHours(place);
  if (h.closed) return false;
  if (!h.range) return true;
  const slot = SLOT_DEFS[period];
  return (Math.min(slot.end, h.range.close) - Math.max(slot.start, h.range.open)) * 60 >= 30;
}

export function fmtHours(place: CachedPlace): string {
  const h = getHours(place);
  if (h.closed) return "CLOSED TODAY";
  if (h.range) {
    const f = (n: number) => `${Math.floor(n).toString().padStart(2, "0")}:${Math.round((n % 1) * 60).toString().padStart(2, "0")}`;
    return `open ${f(h.range.open)}–${f(h.range.close)}`;
  }
  return h.text || "hours unknown";
}

export function isTouristWorthy(place: CachedPlace): boolean {
  if (place.is_pinned || place.owner_note) return true;
  const name = place.name.toLowerCase();
  if (NON_TOURIST_RE.test(name)) return false;
  if (BORING_SHOP_RE.test(name) && place.category === "shopping") return false;
  if (/\bzoo\b/i.test(name) && place.category === "shopping" && !/(djurpark|zoo\s*logisk|animal\s*park)/i.test(name)) return false;
  return true;
}

export function computeBaseScore(place: CachedPlace, dm: Record<string, string>): { score: number; km: number; distStr: string } {
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

export function computeWeatherScore(place: CachedPlace, weather: WeatherInput | null): number {
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
  return ((seed * 23 + hash * 13) % 71) - 35;
}

export function scorePlaces(places: CachedPlace[], weather: WeatherInput | null, dm: Record<string, string>): ScoredPlace[] {
  return places
    .filter(p => !p.is_hidden && isTouristWorthy(p))
    .map(p => {
      if (getHours(p).closed) return null;
      const { score: base, km, distStr } = computeBaseScore(p, dm);
      return { place: p, baseScore: base, weatherScore: computeWeatherScore(p, weather), km, distStr } as ScoredPlace;
    })
    .filter((s): s is ScoredPlace => s !== null);
}

export function selectForPlan(scored: ScoredPlace[], seed: number): Selection {
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
        if (usedCats.has(s.place.category)) total -= 40;
        if ((slot.preferCats as readonly PlaceCategory[]).includes(s.place.category)) total += 15;
        total += varietyJitter(s.place.id, seed);
        return { ...s, total };
      })
      .sort((a, b) => b.total - a.total);

    if (ranked.length > 0 && ranked[0].total > -50) {
      const pick = ranked[0];
      (result[slot.period] as ScoredPlace[]).push(pick);
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
