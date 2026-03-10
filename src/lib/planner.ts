// src/lib/ai-itinerary.ts
import { getTodaysOpeningHours } from "@/lib/place-utils";
import { CachedPlace, Campground, PlaceCategory } from "@/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { unstable_cache } from "next/cache";
import { WeatherData } from "./weather";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Period = "morning" | "lunch" | "afternoon" | "evening";

export interface ItineraryItem {
  time: string;
  period: Period;
  emoji: string;
  title: string;
  description: string;
  place_name: string | null;
  tip: string | null;
}

export interface ItineraryResult {
  items: ItineraryItem[];
  generatedAt: string;
}

/* ═══════════════════════════════════════════════════════
   Category metadata
   ═══════════════════════════════════════════════════════ */

const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  beach: "🏖️",
  park: "🌲",
  museum: "🏛️",
  bowling: "🎳",
  swimming: "🏊",
  shopping: "🛍️",
  cinema: "🎬",
  spa: "🧖",
  activity: "🎯",
  playground: "🛝",
  sports: "🏸",
  attraction: "🎡",
  other: "📍",
};

const INDOOR_CATEGORIES: PlaceCategory[] = [
  "museum",
  "shopping",
  "bowling",
  "swimming",
  "spa",
  "cinema",
];

/* ═══════════════════════════════════════════════════════
   Opening hours helpers
   ═══════════════════════════════════════════════════════ */

function getOpeningHoursText(place: CachedPlace): string {
  if (place.custom_hours) {
    if (/closed|stängt|geschlossen|lukket/i.test(place.custom_hours)) {
      return "CLOSED TODAY";
    }
    return place.custom_hours;
  }

  const data = getTodaysOpeningHours(place.raw_data);
  if (!data?.text) return "";

  if (/closed|stängt|geschlossen|lukket/i.test(data.text)) {
    return "CLOSED TODAY";
  }
  return data.text;
}

function isClosedToday(place: CachedPlace): boolean {
  return getOpeningHoursText(place) === "CLOSED TODAY";
}

/* ═══════════════════════════════════════════════════════
   Place preparation for prompt
   ═══════════════════════════════════════════════════════ */

interface PreparedPlace {
  name: string;
  category: PlaceCategory;
  is_indoor: boolean;
  is_on_site: boolean;
  rating: number | null;
  is_pinned: boolean;
  owner_note: string | null;
  hours: string;
  distance: string;
}

function preparePlaces(
  places: CachedPlace[],
  weather: WeatherData | null,
): PreparedPlace[] {
  const isRaining = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;

  return (
    places
      .filter((p) => !p.is_hidden && !isClosedToday(p))
      // Basic relevance sort before sending to AI
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Pinned places first
        if (a.is_pinned) scoreA += 100;
        if (b.is_pinned) scoreB += 100;

        // On-site places preferred
        if (a.is_on_site) scoreA += 30;
        if (b.is_on_site) scoreB += 30;

        // Weather-appropriate
        if (isRaining) {
          if (a.is_indoor) scoreA += 40;
          if (b.is_indoor) scoreB += 40;
          if (a.category === "beach") scoreA -= 30;
          if (b.category === "beach") scoreB -= 30;
        } else if (temp > 22) {
          if (a.category === "beach") scoreA += 25;
          if (b.category === "beach") scoreB += 25;
        }

        // Rating
        if (a.rating && a.rating >= 4.0) scoreA += 15;
        if (b.rating && b.rating >= 4.0) scoreB += 15;

        // Distance preference (closer is better)
        if (a.road_distance_km != null && a.road_distance_km < 10) scoreA += 10;
        if (b.road_distance_km != null && b.road_distance_km < 10) scoreB += 10;

        return scoreB - scoreA;
      })
      // Limit to top 20 to keep prompt size reasonable
      .slice(0, 20)
      .map((p) => {
        const hours = getOpeningHoursText(p);
        let distance = "";
        if (p.is_on_site) {
          distance = "on site (walking distance)";
        } else if (p.road_distance_km != null) {
          distance =
            p.road_distance_km < 1
              ? `${Math.round(p.road_distance_km * 1000)} m`
              : `${p.road_distance_km.toFixed(1)} km`;
        }

        return {
          name: p.name,
          category: p.category,
          is_indoor: p.is_indoor ?? false,
          is_on_site: p.is_on_site ?? false,
          rating: p.rating,
          is_pinned: p.is_pinned ?? false,
          owner_note: p.owner_note,
          hours: hours || "hours unknown",
          distance,
        };
      })
  );
}

/* ═══════════════════════════════════════════════════════
   Weather description
   ═══════════════════════════════════════════════════════ */

function buildWeatherContext(weather: WeatherData | null): string {
  if (!weather) return "Unknown weather — assume mild and dry.";

  const parts: string[] = [];
  parts.push(`${weather.temp}°C`);
  parts.push(weather.description || (weather.isRaining ? "rain" : "dry"));

  if (weather.isRaining) {
    parts.push("(raining)");
  }
  if (weather.windSpeed != null && weather.windSpeed >= 8) {
    parts.push(`wind ${weather.windSpeed} m/s`);
  }

  // Weather hint for the AI
  let hint = "";
  if (weather.isRaining && weather.temp > 12) {
    hint = "Prioritize indoor activities, especially in the morning.";
  } else if (weather.isRaining && weather.temp <= 12) {
    hint = "Cold and rainy — cozy indoor activities strongly preferred.";
  } else if (!weather.isRaining && weather.temp > 24) {
    hint = "Hot summer day — great for beach and outdoor activities!";
  } else if (!weather.isRaining && weather.temp < 8) {
    hint = "Cold but dry — outdoor walks OK, but no swimming.";
  } else if (!weather.isRaining && weather.temp >= 15 && weather.temp <= 24) {
    hint = "Pleasant weather — mix of outdoor and indoor works well.";
  }

  return `${parts.join(", ")}. ${hint}`.trim();
}

/* ═══════════════════════════════════════════════════════
   Language helpers
   ═══════════════════════════════════════════════════════ */

const LANG_NAMES: Record<string, string> = {
  sv: "Swedish",
  en: "English",
  de: "German",
  da: "Danish",
  nl: "Dutch",
  no: "Norwegian",
};

function getLangName(lang: string): string {
  return LANG_NAMES[lang] ?? "English";
}

/* ═══════════════════════════════════════════════════════
   Day context
   ═══════════════════════════════════════════════════════ */

function getDayContext(): {
  dayName: string;
  isWeekend: boolean;
  season: string;
} {
  const now = new Date();
  const dow = now.getDay();
  const month = now.getMonth();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const season =
    month >= 5 && month <= 7
      ? "Summer"
      : month >= 2 && month <= 4
        ? "Spring"
        : month >= 8 && month <= 10
          ? "Autumn"
          : "Winter";

  return {
    dayName: days[dow],
    isWeekend: dow === 0 || dow === 6,
    season,
  };
}

/* ═══════════════════════════════════════════════════════
   Prompt builder
   ═══════════════════════════════════════════════════════ */

function buildPrompt(
  campground: Campground,
  preparedPlaces: PreparedPlace[],
  weather: WeatherData | null,
  lang: string,
): string {
  const weatherContext = buildWeatherContext(weather);
  const day = getDayContext();
  const langName = getLangName(lang);

  return `You are a friendly local concierge at "${campground.name}" campground.
Create a fun 1-day itinerary for camping guests.

Day: ${day.dayName}${day.isWeekend ? " (weekend)" : ""}
Season: ${day.season}
Weather: ${weatherContext}
Language: Respond entirely in ${langName}.

Available places (pre-filtered, all open today):
${JSON.stringify(preparedPlaces, null, 1)}

Return a JSON array with 5–7 activity items covering the full day.
No markdown, no code fences. Just [ ... ].

Each object must have:
{
  "time": "HH:MM",
  "period": "morning" | "lunch" | "afternoon" | "evening",
  "emoji": "relevant emoji",
  "title": "short activity title",
  "description": "1-2 sentences, friendly local tone, mention weather naturally",
  "place_name": "exact place name from list above, or null for camp activities",
  "tip": "max 8 words: distance, rating, hours hint, or null"
}

Rules:
1. Include 5–7 items spanning morning → evening.
2. MUST include a lunch slot (period: "lunch", around 11:30–13:30).
3. MUST end with a cozy evening-at-camp item (no place_name). Pick from: campfire, stargazing, sunset walk, board games, movie night, marshmallow roast, BBQ, or relaxing. Match to weather and season.
4. If raining, prioritize indoor places.
5. Prioritize "pinned" places — they are owner recommendations.
6. Each place has "hours" listed. The time you suggest MUST fall within those hours.
7. Places marked "on site" are within the campground — mention "right here at camp" or similar.
8. If a place has an "owner_note", weave that tip naturally into the description.
9. Use ONLY places from the list above. Use exact name values.
10. No duplicate places.
11. Do NOT say "recommended" or "promoted". Sound like a helpful friend.
12. Keep descriptions short and warm — like a text from a local friend.`;
}

/* ═══════════════════════════════════════════════════════
   Response parsing & validation
   ═══════════════════════════════════════════════════════ */

const VALID_PERIODS = new Set<Period>([
  "morning",
  "lunch",
  "afternoon",
  "evening",
]);

function parseResponse(jsonText: string): ItineraryItem[] | null {
  // Clean up common AI response artifacts
  let cleaned = jsonText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find the array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  cleaned = cleaned.slice(start, end + 1);

  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("❌ AI response JSON parse failed");
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const items: ItineraryItem[] = [];

  for (const raw of parsed) {
    if (typeof raw !== "object" || !raw) continue;
    const item = raw as Record<string, unknown>;

    if (!item.time || !item.period || !item.title || !item.description)
      continue;

    const period = String(item.period);
    if (!VALID_PERIODS.has(period as Period)) continue;

    items.push({
      time: String(item.time),
      period: period as Period,
      emoji: item.emoji ? String(item.emoji) : CATEGORY_EMOJI.other,
      title: String(item.title),
      description: String(item.description),
      place_name:
        item.place_name && item.place_name !== "null"
          ? String(item.place_name)
          : null,
      tip:
        item.tip && item.tip !== "null" && item.tip !== ""
          ? String(item.tip)
          : null,
    });
  }

  return items.length >= 3 ? items : null;
}

/**
 * Validate that suggested places actually exist in our list
 * and remove references to places we don't recognize.
 */
function validatePlaceReferences(
  items: ItineraryItem[],
  places: CachedPlace[],
): ItineraryItem[] {
  const placeNames = new Set(
    places.filter((p) => !p.is_hidden).map((p) => p.name.toLowerCase()),
  );

  return items.map((item) => {
    if (!item.place_name) return item;

    // Check if the place exists (case-insensitive)
    if (placeNames.has(item.place_name.toLowerCase())) {
      return item;
    }

    // Try partial match (AI sometimes abbreviates)
    const match = places.find(
      (p) =>
        !p.is_hidden &&
        (p.name.toLowerCase().includes(item.place_name!.toLowerCase()) ||
          item.place_name!.toLowerCase().includes(p.name.toLowerCase())),
    );

    if (match) {
      return { ...item, place_name: match.name };
    }

    // No match — remove the reference
    console.warn(
      `[AI Itinerary] Unknown place "${item.place_name}" — removing reference`,
    );
    return { ...item, place_name: null };
  });
}

/* ═══════════════════════════════════════════════════════
   Fallback plan (when AI fails)
   ═══════════════════════════════════════════════════════ */

function buildFallback(
  places: CachedPlace[],
  weather: WeatherData | null,
  lang: string,
): ItineraryItem[] {
  const isRaining = weather?.isRaining ?? false;
  const temp = weather?.temp ?? 18;
  const isSv = lang === "sv";

  const visible = places.filter((p) => !p.is_hidden && !isClosedToday(p));

  // Find places by preference
  const findPlace = (
    preferred: PlaceCategory[],
    opts?: { indoor?: boolean },
  ): CachedPlace | undefined => {
    // Pinned first
    const pinned = visible.find(
      (p) =>
        p.is_pinned &&
        preferred.includes(p.category) &&
        (opts?.indoor === undefined || p.is_indoor === opts.indoor),
    );
    if (pinned) return pinned;

    return visible.find(
      (p) =>
        preferred.includes(p.category) &&
        (opts?.indoor === undefined || p.is_indoor === opts.indoor),
    );
  };

  const items: ItineraryItem[] = [];
  const used = new Set<string>();

  // Morning
  const morningPlace =
    isRaining || temp < 10
      ? (findPlace(INDOOR_CATEGORIES, { indoor: true }) ?? findPlace(["cafe"]))
      : (findPlace(["park", "beach"]) ?? findPlace(["cafe"]));

  if (morningPlace && !used.has(morningPlace.name)) {
    used.add(morningPlace.name);
    items.push({
      time: "09:30",
      period: "morning",
      emoji: CATEGORY_EMOJI[morningPlace.category] ?? "📍",
      title: morningPlace.name,
      description: isSv
        ? `Börja dagen på ${morningPlace.name}${morningPlace.is_on_site ? ", precis här på campingen" : ""}.`
        : `Start the day at ${morningPlace.name}${morningPlace.is_on_site ? ", right here at camp" : ""}.`,
      place_name: morningPlace.name,
      tip: morningPlace.is_on_site ? (isSv ? "På området" : "On site") : null,
    });
  }

  // Late morning / fika
  const cafePlace = findPlace(["cafe"]);
  if (cafePlace && !used.has(cafePlace.name)) {
    used.add(cafePlace.name);
    items.push({
      time: "10:45",
      period: "morning",
      emoji: "☕",
      title: cafePlace.name,
      description: isSv
        ? `Dags för en fika på ${cafePlace.name}.`
        : `Time for a coffee at ${cafePlace.name}.`,
      place_name: cafePlace.name,
      tip:
        cafePlace.rating && cafePlace.rating >= 4.0
          ? `★ ${cafePlace.rating}`
          : null,
    });
  }

  // Lunch
  const lunchPlace = findPlace(["restaurant"]) ?? findPlace(["cafe"]);
  if (lunchPlace && !used.has(lunchPlace.name)) {
    used.add(lunchPlace.name);
    items.push({
      time: "12:30",
      period: "lunch",
      emoji: "🍽️",
      title: lunchPlace.name,
      description: isSv
        ? `Lunch på ${lunchPlace.name}.`
        : `Lunch at ${lunchPlace.name}.`,
      place_name: lunchPlace.name,
      tip:
        lunchPlace.rating && lunchPlace.rating >= 4.0
          ? `★ ${lunchPlace.rating}`
          : null,
    });
  } else {
    items.push({
      time: "12:00",
      period: "lunch",
      emoji: "🧺",
      title: isSv ? "Picknick" : "Picnic",
      description: isRaining
        ? isSv
          ? "Gör en mysig lunch i campingköket!"
          : "Cozy lunch in the camp kitchen!"
        : isSv
          ? "Packa en picknick och hitta en fin plats!"
          : "Pack a picnic and find a nice spot!",
      place_name: null,
      tip: null,
    });
  }

  // Afternoon
  const afternoonCats: PlaceCategory[] = isRaining
    ? ["bowling", "swimming", "spa", "museum", "shopping", "cinema", "activity"]
    : [
        "activity",
        "attraction",
        "sports",
        "playground",
        "swimming",
        "park",
        "beach",
        "bowling",
        "museum",
      ];
  const afternoonPlace = visible.find(
    (p) => afternoonCats.includes(p.category) && !used.has(p.name),
  );
  if (afternoonPlace) {
    used.add(afternoonPlace.name);
    items.push({
      time: "14:30",
      period: "afternoon",
      emoji: CATEGORY_EMOJI[afternoonPlace.category] ?? "📍",
      title: afternoonPlace.name,
      description: isSv
        ? `Eftermiddag på ${afternoonPlace.name}.`
        : `Afternoon at ${afternoonPlace.name}.`,
      place_name: afternoonPlace.name,
      tip: afternoonPlace.is_on_site ? (isSv ? "På området" : "On site") : null,
    });
  }

  // Evening dinner
  const dinnerPlace = visible.find(
    (p) => ["restaurant", "cafe"].includes(p.category) && !used.has(p.name),
  );
  if (dinnerPlace) {
    used.add(dinnerPlace.name);
    items.push({
      time: "18:30",
      period: "evening",
      emoji: "🍷",
      title: dinnerPlace.name,
      description: isSv
        ? `Middag på ${dinnerPlace.name}.`
        : `Dinner at ${dinnerPlace.name}.`,
      place_name: dinnerPlace.name,
      tip: null,
    });
  }

  // Evening at camp — always included
  const eveningOptions = getEveningOptions(isRaining, temp, lang);
  const dayHash = parseInt(
    new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    10,
  );
  const pick = eveningOptions[dayHash % eveningOptions.length];
  items.push({
    time: "21:00",
    period: "evening",
    ...pick,
    place_name: null,
    tip: null,
  });

  return items;
}

function getEveningOptions(
  isRaining: boolean,
  temp: number,
  lang: string,
): { emoji: string; title: string; description: string }[] {
  const isSv = lang === "sv";
  const opts: { emoji: string; title: string; description: string }[] = [];

  if (!isRaining && temp > 14) {
    opts.push({
      emoji: "🔥",
      title: isSv ? "Lägereld" : "Campfire evening",
      description: isSv
        ? "Avsluta dagen runt lägerelden."
        : "End the day around the campfire.",
    });
    opts.push({
      emoji: "🌅",
      title: isSv ? "Kvällspromenad" : "Sunset walk",
      description: isSv
        ? "Ta en promenad och njut av solnedgången."
        : "Take a walk and catch the sunset.",
    });
  }

  if (!isRaining && temp > 18) {
    opts.push({
      emoji: "🍢",
      title: isSv ? "Grilla marshmallows" : "Marshmallow roast",
      description: isSv
        ? "Perfekt kväll för marshmallows vid elden."
        : "Perfect evening for marshmallows by the fire.",
    });
    opts.push({
      emoji: "🥩",
      title: isSv ? "BBQ-kväll" : "BBQ evening",
      description: isSv
        ? "Dags att grilla! Njut av en härlig kväll."
        : "Fire up the grill and enjoy the evening!",
    });
  }

  if (isRaining || temp < 12) {
    opts.push({
      emoji: "🎲",
      title: isSv ? "Spelkväll" : "Game night",
      description: isSv
        ? "Kryp ihop med lite sällskapsspel."
        : "Cozy up with some board games.",
    });
    opts.push({
      emoji: "🎬",
      title: isSv ? "Filmkväll" : "Movie night",
      description: isSv
        ? "Dags för film — ta fram snacksen!"
        : "Movie time — grab the snacks!",
    });
    opts.push({
      emoji: "☕",
      title: isSv ? "Mysig kväll" : "Cozy evening",
      description: isSv
        ? "Varm choklad och avkoppling. Ni har förtjänat det."
        : "Hot cocoa and relaxation. You've earned it.",
    });
  }

  if (!opts.length) {
    opts.push({
      emoji: "🌙",
      title: isSv ? "Kväll på campingen" : "Evening at camp",
      description: isSv
        ? "Slappna av och njut av kvällen."
        : "Relax and enjoy the evening.",
    });
  }

  return opts;
}

/* ═══════════════════════════════════════════════════════
   Main generation function
   ═══════════════════════════════════════════════════════ */

async function generateItinerary(
  campground: Campground,
  places: CachedPlace[],
  weather: WeatherData | null,
  lang: string = "sv",
): Promise<ItineraryResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY missing — using fallback");
    return {
      items: buildFallback(places, weather, lang),
      generatedAt: new Date().toISOString(),
    };
  }

  const preparedPlaces = preparePlaces(places, weather);

  // If no places available at all, return a minimal fallback
  if (preparedPlaces.length === 0) {
    console.warn("[AI Itinerary] No places available");
    return {
      items: buildFallback(places, weather, lang),
      generatedAt: new Date().toISOString(),
    };
  }

  const prompt = buildPrompt(campground, preparedPlaces, weather, lang);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let items = parseResponse(text);

    if (!items || items.length < 3) {
      console.warn("[AI Itinerary] AI returned too few items — using fallback");
      items = buildFallback(places, weather, lang);
    } else {
      // Validate place references against our actual data
      items = validatePlaceReferences(items, places);
    }

    console.log(`[AI Itinerary] Generated ${items.length} items for ${lang}`);

    return {
      items,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Gemini AI Error:", error);

    // Always return something — never leave the user with nothing
    return {
      items: buildFallback(places, weather, lang),
      generatedAt: new Date().toISOString(),
    };
  }
}

/* ═══════════════════════════════════════════════════════
   Cached export
   ═══════════════════════════════════════════════════════ */

/**
 * Cache busts when:
 * - Day changes
 * - Weather flips (rain vs clear)
 * - Temperature changes significantly (5°C buckets)
 * - Language changes
 *
 * Does NOT bust when editing notes or place details.
 */
export async function getCachedItinerary(
  campground: Campground,
  places: CachedPlace[],
  weather: WeatherData | null,
  lang: string = "sv",
): Promise<ItineraryResult | null> {
  const dateKey = new Date().toISOString().split("T")[0];

  // Finer weather key: rain/clear + 5°C temperature bucket
  const tempBucket =
    weather?.temp != null ? Math.round(weather.temp / 5) * 5 : 0;
  const weatherKey = `${weather?.isRaining ? "rain" : "clear"}_${tempBucket}`;

  return unstable_cache(
    () => generateItinerary(campground, places, weather, lang),
    [`itinerary-v2-${campground.id}-${dateKey}-${weatherKey}-${lang}`],
    { revalidate: 86400 }, // 4 hours instead of 24
  )();
}
