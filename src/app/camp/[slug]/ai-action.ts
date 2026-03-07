'use server';

import { generateItinerary } from "@/lib/gemini";
import { Campground, CachedPlace } from "@/types/database";
import { unstable_cache } from "next/cache";

const getDailyItinerary = unstable_cache(
  async (
    campName: string, 
    weatherState: string, 
    placesPayload: any[], 
    lang: string,
    // Vi lägger in hela cache-nyckeln (Datum + Väder) så funktionen ser den
    cacheFingerprint: string 
  ) => {
    console.log(`\n🤖 [GEMINI API] 💰 CACHE MISS! Skapar nytt schema för: ${campName} (${lang})`);
    console.log(`📡 Anledning/Fingeravtryck: ${cacheFingerprint}`);
    console.time("Gemini Response Time");
    
    const result = await generateItinerary(campName, weatherState, placesPayload, lang);
    
    console.timeEnd("Gemini Response Time");
    console.log(`🤖 [GEMINI API] ✅ Svar sparat i Next.js Cache!\n`);
    
    return result;
  },
  ['gemini-itinerary'], // Generell namnrymd för cachen
  { 
    revalidate: 86400, 
    tags: ['itinerary-cache'] 
  }
);

export async function getAiPlan(
  campground: Campground, 
  weather: any, 
  places: CachedPlace[], 
  lang: "sv" | "en" | "de"
) {
  console.log(`📱 [GÄSTVY] Gäst öppnade AI-planeraren. Begär schema för: ${lang}`);

  const topPlaces = places
    .filter(p => !p.is_hidden)
    .sort((a, b) => (a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1))
    .slice(0, 15)
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      isIndoor: p.is_indoor,
      ownerNote: p.owner_note
    }));

  // Vi gör en förenklad bedömning av vädret.
  // Vi bryr oss inte om det är 22° eller 24°, men vi bryr oss om det är "regn" vs "sol" vs "kallt"
  let weatherCondition = "cloudy";
  if (weather?.isRaining) {
    weatherCondition = "rainy";
  } else if (weather?.temp >= 20) {
    weatherCondition = "warm_sunny";
  } else if (weather?.temp < 15) {
    weatherCondition = "cold";
  }

  const weatherDesc = weather 
    ? `${weather.temp}°C, ${weather.description}` 
    : "Väder okänt";

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

  // NYCKELN TILL MAGIN!
  // Om Datum ELLER Vädertyp ändras, skapas en helt ny unik sträng.
  // Det betyder att Next.js missar cachen, och ber Gemini om ett nytt schema för det nya vädret!
  const cacheFingerprint = `${today}_${weatherCondition}`;

  return await getDailyItinerary(
    campground.name, 
    weatherDesc, 
    topPlaces, 
    lang,
    cacheFingerprint 
  );
}