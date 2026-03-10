import type {
  AnnouncementTranslations,
  NoteTranslations,
  PartnerTranslations,
  SettingsTranslations,
} from "@/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Shared model instance ───────────────────────────────

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// ─── translateAnnouncement ───────────────────────────────

export async function translateAnnouncement(
  title: string,
  content: string,
): Promise<AnnouncementTranslations> {
  try {
    const model = getModel();

    const prompt = `
You are a professional translator for a Scandinavian camping app.
Translate the following Swedish announcement into English (en), German (de), Danish (da), Dutch (nl) and Norwegian Bokmål (no).
Keep the tone friendly and concise — these are short notices shown to camping guests.

Swedish title: "${title}"
Swedish content: "${content}"

Return ONLY valid JSON matching this exact shape (no markdown, no wrapping):
{
  "en": { "title": "…", "content": "…" },
  "de": { "title": "…", "content": "…" },
  "da": { "title": "…", "content": "…" },
  "nl": { "title": "…", "content": "…" },
  "no": { "title": "…", "content": "…" }
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    return JSON.parse(result.response.text()) as AnnouncementTranslations;
  } catch (err) {
    console.error("[translateAnnouncement] failed:", err);
    return {};
  }
}

// ─── translateNote ───────────────────────────────────────

export async function translateNote(note: string): Promise<NoteTranslations> {
  try {
    const model = getModel();

    const prompt = `
You are a professional translator for a Scandinavian camping app.
Translate the following short Swedish note into English (en), German (de), Danish (da), Dutch (nl) and Norwegian Bokmål (no).
This is a very brief "staff pick" label (a few words), so keep translations equally short.

Swedish note: "${note}"

Return ONLY valid JSON matching this exact shape (no markdown, no wrapping):
{
  "en": "…",
  "de": "…",
  "da": "…",
  "nl": "…",
  "no": "…"
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    return JSON.parse(result.response.text()) as NoteTranslations;
  } catch (err) {
    console.error("[translateNote] failed:", err);
    return {};
  }
}

// ─── translatePartner ───────────────────────────────────

export async function translatePartner(
  name: string,
  description: string,
): Promise<PartnerTranslations> {
  try {
    const model = getModel();

    const prompt = `
You are a professional translator for a Scandinavian camping app.
Translate the following Swedish business/partner info into English (en), German (de), Danish (da), Dutch (nl) and Norwegian Bokmål (no).
Keep the tone professional and inviting.

Business Name: "${name}"
Description: "${description}"

Return ONLY valid JSON matching this exact shape (no markdown, no wrapping):
{
  "en": { "business_name": "…", "description": "…" },
  "de": { "business_name": "…", "description": "…" },
  "da": { "business_name": "…", "description": "…" },
  "nl": { "business_name": "…", "description": "…" },
  "no": { "business_name": "…", "description": "…" }
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    return JSON.parse(result.response.text()) as PartnerTranslations;
  } catch (err) {
    console.error("[translatePartner] failed:", err);
    return {};
  }
}

// ─── translateSettings ───────────────────────────────────
/**
 * Translates campground info fields (check-out, trash, emergency,
 * camp rules, reception hours) from Swedish → en, de, da.
 * Only non-empty fields are included in the prompt / result.
 */
export async function translateSettings(fields: {
  check_out_info?: string | null;
  trash_rules?: string | null;
  emergency_info?: string | null;
  camp_rules?: string | null;
  reception_hours?: string | null;
}): Promise<SettingsTranslations> {
  // Collect only non-empty fields
  const entries = Object.entries(fields).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  ) as [string, string][];

  if (entries.length === 0) return {};

  try {
    const model = getModel();

    const fieldList = entries
      .map(
        ([key, val]) =>
          `"${key}": "${val.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`,
      )
      .join(",\n  ");

    const fieldKeys = entries.map(([key]) => `"${key}": "…"`).join(", ");

    const prompt = `
You are a professional translator for a Scandinavian camping app.
Translate the following Swedish campground information fields into English (en), German (de), Danish (da), Dutch (nl) and Norwegian Bokmål (no).
These are practical guest-facing notices (check-out times, trash rules, emergency info, camp rules, reception hours).
Keep the same tone: clear, friendly, and concise. Preserve any line breaks (use \\n in the JSON strings).

Swedish fields:
{
  ${fieldList}
}

Return ONLY valid JSON matching this exact shape (no markdown, no wrapping).
Only include the field keys that were provided above:
{
  "en": { ${fieldKeys} },
  "de": { ${fieldKeys} },
  "da": { ${fieldKeys} },
  "nl": { ${fieldKeys} },
  "no": { ${fieldKeys} }
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    return JSON.parse(result.response.text()) as SettingsTranslations;
  } catch (err) {
    console.error("[translateSettings] failed:", err);
    return {};
  }
}

// ─── generateItinerary ───────────────────────────────────

export async function generateItinerary(
  campgroundName: string,
  weatherState: string,
  placesJson: any[],
  lang: string,
) {
  const model = getModel();

  const prompt = `
    You are a friendly, expert local concierge for a camping site named "${campgroundName}".

    CURRENT STATUS (Day, Date, Weather): ${weatherState}

    Create a FULL DAY itinerary (morning, lunch, afternoon, evening) for a family staying at the campground.

    CRITICAL RULES:
    1. OPENING HOURS ARE STRICT: Look closely at the "openingHours" string for each place. If the place is closed on the current day, or closed at the specific "time" you are suggesting, YOU MUST NOT use it.
    2. TIME LOGIC: If a place is open "10:00 - 18:00", do not schedule a visit at 19:00. Use 24-hour format for the "time" field (e.g., "13:00").
    3. WEATHER LOGIC: If it's raining or cold, heavily prioritize places where "isIndoor" is true, or categories like 'museum', 'shopping', 'cafe', 'cinema'.
    4. NO OPEN PLACES?: If no suitable places are open (e.g., late evening), schedule a cozy activity at the campground itself (e.g., "Grill marshmallows", "Play board games") and omit the "placeId" or set it to null.
    5. LANGUAGE: Write the "title" and "description" natively and fluently in the language code: ${lang.toUpperCase()}. Make it sound warm and welcoming.

    Available local places to pick from:
    ${JSON.stringify(placesJson)}

    IMPORTANT: Return ONLY a valid JSON array matching this exact format:
    [
      {
        "time": "09:00",
        "period": "morning",
        "emoji": "☕",
        "title": "Translated title here...",
        "description": "Translated short description here...",
        "placeId": "uuid-from-places-json-here"
      }
    ]
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
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
