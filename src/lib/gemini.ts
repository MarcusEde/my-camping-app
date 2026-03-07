import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateItinerary(
  campgroundName: string,
  weatherState: string,
  placesJson: any[],
  lang: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are a friendly local concierge for a camping site named "${campgroundName}".
    The forecasted weather for today is: ${weatherState}.
    Today's weekday is: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}.
    
    Create a FULL DAY itinerary (Morning, Lunch, Afternoon, Evening) for a family.
    
    CRITICAL RULES:
    1. Look at the "openingHours" provided for each place. DO NOT schedule an activity at a place if it is closed at that time on this weekday!
    2. Make sure the activities logically flow through the day.
    3. If it's raining, heavily prioritize indoor activities.
    4. Write the response in the language code: ${lang.toUpperCase()}.

    Available places to pick from:
    ${JSON.stringify(placesJson)}

    IMPORTANT: Return ONLY a valid JSON array matching this exact format:
    [
      {
        "time": "09:00",
        "period": "morning",
        "emoji": "☕",
        "title": "Breakfast at...",
        "description": "Short description.",
        "placeId": "the-uuid-of-the-place" 
      }
    ]
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const responseText = result.response.text();
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Gemini didn't return valid JSON:", responseText);
    return [];
  }
}