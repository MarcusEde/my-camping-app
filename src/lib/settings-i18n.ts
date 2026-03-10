/**
 * settings-i18n.ts
 * ─────────────────────────────────────────────────────────
 * Shared helper to read translated campground settings fields.
 * Used by PulsTab, InfoTab, and any future component that
 * displays owner-written campground info to guests.
 */

import type { Campground, TranslatableSettingsFields } from "@/types/database";

export type SupportedLang = "sv" | "en" | "de" | "da" | "nl" | "no";
type TranslationLang = "en" | "de" | "da" | "nl" | "no";

/**
 * Returns the translated value of a campground settings field
 * for the given language, falling back to the Swedish original.
 *
 * @example
 * const rules = getSettingsField(campground, "camp_rules", "en");
 * // → English translation, or Swedish original if no translation exists
 */
export function getSettingsField(
  campground: Campground,
  field: TranslatableSettingsFields,
  lang: SupportedLang,
): string | null {
  // Read the Swedish original
  const original = campground[field as keyof Campground] as
    | string
    | null
    | undefined;

  if (!original) return null;
  if (lang === "sv") return original;

  // Try translated version
  const translated =
    campground.settings_translations?.[lang as TranslationLang]?.[field];

  return translated || original;
}
