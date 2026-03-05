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
): Promise<Itinerary | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY missing");
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const weatherStr = weather
    ? `${weather.temp}°C and ${weather.description}. Is raining: ${weather.isRaining}`
    : "Unknown weather.";

  const availablePlaces = places.map((p) => ({
    name: p.name,
    category: p.category,
    is_indoor: p.is_indoor,
    rating: p.rating,
    is_pinned_by_owner: p.is_pinned,
    owner_note: p.owner_note,
  }));

  const prompt = `
    You are an expert, friendly local concierge at ${campground.name}.
    Your job is to create a perfect 1-day itinerary for a tourist.

    CURRENT WEATHER: ${weatherStr}
    AVAILABLE PLACES TO RECOMMEND: ${JSON.stringify(availablePlaces)}

    RULES:
    1. If it is raining, you MUST heavily prioritize indoor activities.
    2. Try to include places that the owner has "pinned" (is_pinned_by_owner: true).
    3. The schedule must make geographic and logical sense (e.g. Coffee in morning, Dinner in evening).
    4. Provide a friendly "tip_of_the_day" based on the weather.

    Return EXACTLY this JSON structure. DO NOT wrap it in markdown blockticks.
    {
      "tip_of_the_day": "A friendly 1-sentence tip.",
      "morning": { "time": "09:00", "title": "Catchy Title", "description": "Why go here...", "place_name": "Exact Name of Place from list" },
      "afternoon": { "time": "13:00", "title": "Catchy Title", "description": "Why go here...", "place_name": "Exact Name of Place from list" },
      "evening": { "time": "18:30", "title": "Catchy Title", "description": "Why go here...", "place_name": "Exact Name of Place from list" }
    }
  `;

  try {
    console.log("🧠 Calling Gemini AI (2.5 Flash)...");
    const result = await model.generateContent(prompt);
    let jsonText = result.response.text();

    // Safety net for markdown formatting
    jsonText = jsonText
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
 * 🧊 THE MONEY SAVER: Cached Version
 * Next.js unstable_cache wraps our function so it only runs ONCE per hour.
 */
// AT THE BOTTOM OF src/lib/planner.ts
export const getCachedItinerary = unstable_cache(
  async (
    campground: Campground,
    places: CachedPlace[],
    weather: WeatherData | null,
  ) => {
    return generateItinerary(campground, places, weather);
  },
  ["daily-ai-itinerary-v2"], // 👈 CHANGED THIS TO BUST THE CACHE!
  { revalidate: 3600 },
);
