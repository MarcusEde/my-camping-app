import { repairJSON } from "@/lib/utils";
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

    const text = result.response.text();
    const cleaned = repairJSON(text);
    return JSON.parse(cleaned) as AnnouncementTranslations;
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

    const text = result.response.text();
    const cleaned = repairJSON(text);
    return JSON.parse(cleaned) as NoteTranslations;
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

    const text = result.response.text();
    const cleaned = repairJSON(text);
    return JSON.parse(cleaned) as PartnerTranslations;
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

    const text = result.response.text();
    const cleaned = repairJSON(text);
    return JSON.parse(cleaned) as SettingsTranslations;
  } catch (err) {
    console.error("[translateSettings] failed:", err);
    return {};
  }
}

// ─── generateItinerary ───────────────────────────────────
