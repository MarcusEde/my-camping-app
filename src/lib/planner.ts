import { CachedPlace, Campground } from "@/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { unstable_cache } from "next/cache";
import { WeatherData } from "./weather";

export interface Itinerary {
  tip_of_the_day: string;
  morning: {
    time: string;
    title: string;
    description: string;
    place_name: string | null;
  };
  afternoon: {
    time: string;
    title: string;
    description: string;
    place_name: string | null;
  };
  evening: {
    time: string;
    title: string;
    description: string;
    place_name: string | null;
  };
}

async function generateItinerary(
  campground: Campground,
  places: CachedPlace[],
  weather: WeatherData | null,
  lang: string = "sv",
): Promise<Itinerary | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY missing");
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Using stable flash model
    generationConfig: { responseMimeType: "application/json" },
  });

  const weatherStr = weather
    ? `${weather.temp}°C and ${weather.description}. Is raining: ${weather.isRaining}`
    : "Unknown weather.";

  // Filter out hidden places so AI doesn't recommend them
  const availablePlaces = places
    .filter((p) => !p.is_hidden)
    .map((p) => ({
      name: p.name,
      category: p.category,
      is_indoor: p.is_indoor,
      rating: p.rating,
      is_pinned: p.is_pinned,
      owner_note: p.owner_note,
    }));

  const prompt = `
    You are a friendly local concierge at ${campground.name}.
    Create a 1-day itinerary for a guest.

    LANGUAGE: Respond entirely in ${lang === "sv" ? "Swedish" : "English"}.
    WEATHER: ${weatherStr}
    PLACES: ${JSON.stringify(availablePlaces)}

    RULES:
    1. If raining, prioritize indoor activities.
    2. Prioritize "pinned" places.
    3. If a place has an "owner_note", include that tip in the description but TRANSLATE it to ${lang}.
    4. Return ONLY JSON.

    Structure:
    {
      "tip_of_the_day": "...",
      "morning": { "time": "09:00", "title": "...", "description": "...", "place_name": "..." },
      "afternoon": { "time": "13:00", "title": "...", "description": "...", "place_name": "..." },
      "evening": { "time": "18:30", "title": "...", "description": "...", "place_name": "..." }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const jsonText = result.response
      .text()
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonText) as Itinerary;
  } catch (error) {
    console.error("❌ Gemini AI Error:", error);
    return null;
  }
}

/**
 * FIXED CACHE: This now only busts if the day changes or the weather flips (Rain vs Clear).
 * Editing a note will NOT bust this cache anymore.
 */
export async function getCachedItinerary(
  campground: Campground,
  places: CachedPlace[],
  weather: WeatherData | null,
  lang: string = "sv",
) {
  const dateKey = new Date().toISOString().split("T")[0];
  const weatherKey = weather?.isRaining ? "rain" : "clear";

  return unstable_cache(
    () => generateItinerary(campground, places, weather, lang),
    [`itinerary-${campground.id}-${dateKey}-${weatherKey}-${lang}`],
    { revalidate: 86400 },
  )();
}
