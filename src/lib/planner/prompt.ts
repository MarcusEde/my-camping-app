// src/lib/planner/prompt.ts

import type { Campground } from "@/types/database";
import { CATEGORY_EMOJI, MINIGOLF_RE, fmtHours } from "./scoring";
import type {
  DayContext,
  ItineraryItem,
  Period,
  PlanLang,
  ScoredPlace,
  Selection,
  WeatherCtx,
  WeatherInput,
} from "./types";
import { buildWeatherCtx, classifyRain, classifyWind, feelsLike, tempMood } from "./weather-scoring";

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

export function buildPrompt(
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

export function buildFallback(
  sel: Selection,
  weather: { temp: number; isRaining: boolean; windSpeed?: number; description?: string } | null,
  day: DayContext,
  lang: PlanLang,
  periodsOnly?: Period[],
): ItineraryItem[] {
  const FB_SV: Record<string, { title: string; desc: string }> = {
    "Slow camp morning": { title: "Lugn morgon på campingen", desc: "Ingen väckarklocka. Kaffe, frukost ute, se världen vakna." },
    "Morning walk": { title: "Morgonpromenad", desc: "Utforska omgivningarna. Morgonljuset gör allt magiskt." },
    "Cozy camp kitchen": { title: "Mysigt i campingköket", desc: "Regn på taket, kaffe i handen. Laga en ordentlig frukost. Ingen stress." },
    "Brisk morning": { title: "Frisk morgon", desc: "Lite kyligt ute. Varm kaffe, varma lager, kort promenad." },
    "Lazy camp morning": { title: "Lat morgon på campingen", desc: "Vissa morgnar är till för att stanna. Kaffe, läsning, prata med grannarna." },
    "Picnic lunch": { title: "Picknicklunch", desc: "Mackor, frukt, en fin plats. Enkelt och perfekt." },
    "Camp BBQ": { title: "Grillunch", desc: "Elda upp grillen! Korv, halloumi, majs." },
    "Camp kitchen lunch": { title: "Lunch i campingköket", desc: "Något gott från campingköket. Alltid bättre på semester." },
    "Warm camp lunch": { title: "Varm camplunch", desc: "Något varmt idag. Köket är din bästa vän." },
    "Beach afternoon": { title: "Strandeftermiddag", desc: "Hitta vatten, slå dig ner. Bada, sola, läs, repetera." },
    "Forest trail": { title: "Skogspromenad", desc: "Ge dig ut i skogen. Svenska stigar har alltid en överraskning. Ta med fika." },
    "Indoor afternoon": { title: "Inomhuseftermiddag", desc: "Brädspel, kort, turnering. Regniga eftermiddagar har sin egen magi." },
    "Bundled-up exploring": { title: "Utforska i varma kläder", desc: "Klä på dig, termos i handen, upptäck vad som finns runt campingen." },
    "Explore the area": { title: "Utforska området", desc: "Ge dig ut till fots. De bästa upptäckterna är oplanerade." },
    "BBQ dinner": { title: "Grillmiddag", desc: "Grilla medan solen sjunker. Ren semesterkänsla." },
    "Camp kitchen feast": { title: "Fest i campingköket", desc: "Laga något speciellt. Ät vid picknickbordet." },
    "One-pot dinner": { title: "Engrytamiddag", desc: "Gryta eller chili på campingköket. Enkelt, gott." },
    "Campfire evening": { title: "Lägereldskväll", desc: "Samlas runt elden. Campingens själ." },
    "Campfire in the drizzle": { title: "Lägereld i duggregnet", desc: "Lätt regn, varm eld. Regnet håller myggorna borta. Typiskt Sverige." },
    "Campfire in the cold": { title: "Lägereld i kylan", desc: "Kryp ihop, värm händerna. Varm choklad är obligatoriskt." },
    "Game night": { title: "Spelkväll", desc: "Uno, Yatzy, eller vad som finns. Tävlingsinriktat och högljutt." },
    "Movie night": { title: "Filmkväll", desc: "Laptop, snacks, filtar. Gör det mysigt." },
    "Cozy evening in": { title: "Mysig kväll inne", desc: "Varm choklad, filtar, lugn och ro." },
    "Sunset walk": { title: "Solnedgångspromenad", desc: "Ljuset är otroligt. Ta en kort promenad." },
    "Quiet evening at camp": { title: "Lugn kväll på campingen", desc: "Varva ner. Prata med grannarna, planera morgondagen." },
  };

  const fb = (enTitle: string, enDesc: string): { title: string; desc: string } => {
    if (lang === "sv" && FB_SV[enTitle]) return FB_SV[enTitle];
    return { title: enTitle, desc: enDesc };
  };
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
        { emoji: "☀️", ...fb("Slow camp morning", "No alarm. Coffee, breakfast outside, watch the world wake up."), when: c => c.rain === "none" && c.fl > 12 },
        { emoji: "🌅", ...fb("Morning walk", "Explore the surroundings. Morning light makes everything magical."), when: c => c.trailOk && c.fl > 5 },
        { emoji: "☕", ...fb("Cozy camp kitchen", "Rain on the roof, coffee in hand. Make a proper breakfast. No hurry."), when: c => c.rain === "moderate" || c.rain === "heavy" },
        { emoji: "🧣", ...fb("Brisk morning", `It's ${tempMood(ctx.fl)} out. Hot coffee, warm layers, short walk.`), when: c => c.fl < 8 && c.rain === "none" },
        { emoji: "☕", ...fb("Lazy camp morning", "Some mornings are for staying put. Coffee, reading, chatting with neighbours.") },
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
        { emoji: "🧺", ...fb("Picnic lunch", "Sandwiches, fruit, a scenic spot. Simple and perfect."), when: c => c.rain === "none" && c.fl > 14 },
        { emoji: "🍖", ...fb("Camp BBQ", "Fire up the grill! Sausages, halloumi, corn."), when: c => c.bbqOk && c.fl > 12 && c.rain === "none" },
        { emoji: "🍲", ...fb("Camp kitchen lunch", "Something tasty from the camp kitchen. Always better on holiday."), when: c => c.rain !== "none" || c.fl < 12 },
        { emoji: "🍲", ...fb("Warm camp lunch", `Something warm today. The kitchen is your friend when it's ${tempMood(ctx.fl)}.`) },
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
        { emoji: "🏖️", ...fb("Beach afternoon", "Find water, plant yourself. Swim, sunbathe, read, repeat."), when: c => c.beachOk && c.fl >= 18 },
        { emoji: "🌲", ...fb("Forest trail", "Head into the forest. Swedish trails always have a surprise. Bring fika."), when: c => c.trailOk && c.fl >= 8 },
        { emoji: "🎲", ...fb("Indoor afternoon", "Board games, cards, a tournament. Rainy afternoons have their own magic."), when: c => c.rain === "moderate" || c.rain === "heavy" },
        { emoji: "🧣", ...fb("Bundled-up exploring", `Layer up, thermos in hand, discover what's around camp.`), when: c => c.fl < 8 && c.rain === "none" },
        { emoji: "🚶", ...fb("Explore the area", "Head out on foot. The best discoveries are unplanned.") },
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
        { emoji: "🍖", ...fb("BBQ dinner", "Grill as the sun gets lower. Pure holiday vibes."), when: c => c.bbqOk && c.fl > 12 && c.rain === "none" },
        { emoji: "🍲", ...fb("Camp kitchen feast", `Cook something special. ${ctx.fl < 10 ? "The warm kitchen is the place to be." : "Eat at the picnic table."}`), when: c => c.rain !== "none" || c.fl < 10 },
        { emoji: "🥘", ...fb("One-pot dinner", "Stew or chili on the camp stove. Easy, delicious.") },
      ];
      const pick = pickOption(opts, ctx, 3, day.seed);
      items.push({ time: "18:30", period: "evening", emoji: pick.emoji, title: pick.title, description: pick.desc });
    }

    const wdOpts: FallbackOption[] = [
      { emoji: "🔥", ...fb("Campfire evening", "Gather around the fire. The soul of camping."), when: c => c.fireOk && c.rain === "none" && c.fl > 10 },
      { emoji: "🔥", ...fb("Campfire in the drizzle", "Light rain, warm fire. Rain keeps mosquitoes away. Peak Sweden."), when: c => c.fireOk && c.rain === "drizzle" && c.fl >= 10 },
      { emoji: "🔥", ...fb("Campfire in the cold", "Huddle close, warm your hands. Hot chocolate mandatory."), when: c => c.fireOk && c.fl < 8 && c.fl >= 0 && c.rain === "none" },
      { emoji: "🎲", ...fb("Game night", "Uno, Yatzy, or whatever's in the drawer. Competitive and loud."), when: c => c.rain === "moderate" || c.rain === "heavy" || c.fl < 5 },
      { emoji: "🎬", ...fb("Movie night", "Laptop, snacks, filtar. Gör det mysigt."), when: c => c.rain === "heavy" || (c.rain === "moderate" && c.fl < 12) },
      { emoji: "🧣", ...fb("Cozy evening in", `Hot chocolate, blankets, ${ctx.rain !== "none" ? "rain on the roof" : "cold air outside"}.`), when: c => c.fl < 8 || c.rain !== "none" },
      { emoji: "🌅", ...fb("Sunset walk", "The light is incredible. Take a short walk."), when: c => c.rain === "none" && c.fl > 12 && c.isSummer },
      { emoji: "🌙", ...fb("Quiet evening at camp", "Wind down. Chat with neighbours, plan tomorrow lazily.") },
    ];
    const pick = pickOption(wdOpts, ctx, 4, day.seed);
    items.push({ time: "21:00", period: "evening", emoji: pick.emoji, title: pick.title, description: pick.desc });
  }

  return items;
}
