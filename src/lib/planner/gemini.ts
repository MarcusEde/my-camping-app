// src/lib/planner/gemini.ts

import type { CachedPlace } from "@/types/database";
import { PERIOD_ORDER } from "./scoring";
import type { GeminiResponse, ItineraryItem, Period, PlanLang } from "./types";

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

export function parseItems(raw: string): ItineraryItem[] | null {
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

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function callGemini(prompt: string, attempt = 1): Promise<ItineraryItem[] | null> {
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

export async function translatePlan(
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
    const nearbyWord: Partial<Record<PlanLang, string>> = {
      sv: "i närheten", de: "in der Nähe", da: "i nærheden", nl: "dichtbij", no: "i nærheten",
    };
    if (tip && tip.toLowerCase() === "nearby" && nearbyWord[lang]) {
      tip = nearbyWord[lang];
    }
    return {
      ...item,
      title: typeof tr.title === "string" && tr.title ? tr.title : item.title,
      description: typeof tr.description === "string" && tr.description ? tr.description : item.description,
      tip: item.tip ? tip : undefined,
    };
  });
}

export { repairJSONArray };

