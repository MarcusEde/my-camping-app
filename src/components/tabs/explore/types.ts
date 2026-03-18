// components/tabs/explore/types.ts

import type { RoadDistanceMap } from "@/lib/routing";
import type { UtforskaLabels } from "@/lib/translations";
import type { Announcement, CachedPlace, Campground, PromotedPartner } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";

/* ── Category config ────────────────────────────────────────────────── */
export interface CatCfg {
  emoji: string;
  gradient: string;
  ctaGradient: string;
  bodyTint: string;
}

export const CAT: Record<string, CatCfg> = {
  beach: { emoji: "🏖️", gradient: "from-sky-200 via-cyan-100 to-teal-100", ctaGradient: "from-sky-400 to-teal-400", bodyTint: "bg-sky-50/60" },
  swimming: { emoji: "🏊", gradient: "from-blue-200 via-sky-100 to-cyan-100", ctaGradient: "from-blue-400 to-cyan-400", bodyTint: "bg-blue-50/60" },
  park: { emoji: "🌲", gradient: "from-emerald-200 via-green-100 to-teal-100", ctaGradient: "from-emerald-500 to-teal-400", bodyTint: "bg-emerald-50/60" },
  restaurant: { emoji: "🍽️", gradient: "from-rose-200 via-pink-100 to-orange-100", ctaGradient: "from-rose-400 to-orange-400", bodyTint: "bg-rose-50/50" },
  cafe: { emoji: "☕", gradient: "from-amber-200 via-yellow-100 to-orange-100", ctaGradient: "from-amber-500 to-yellow-400", bodyTint: "bg-amber-50/50" },
  bowling: { emoji: "🎳", gradient: "from-violet-200 via-purple-100 to-indigo-100", ctaGradient: "from-violet-500 to-indigo-500", bodyTint: "bg-violet-50/50" },
  cinema: { emoji: "🎬", gradient: "from-red-200 via-rose-100 to-pink-100", ctaGradient: "from-red-500 to-rose-400", bodyTint: "bg-red-50/50" },
  spa: { emoji: "🧖", gradient: "from-teal-200 via-cyan-100 to-sky-100", ctaGradient: "from-teal-400 to-sky-400", bodyTint: "bg-teal-50/50" },
  playground: { emoji: "🛝", gradient: "from-yellow-200 via-amber-100 to-orange-100", ctaGradient: "from-yellow-400 to-orange-400", bodyTint: "bg-yellow-50/50" },
  sports: { emoji: "⚽", gradient: "from-green-200 via-lime-100 to-emerald-100", ctaGradient: "from-green-500 to-emerald-400", bodyTint: "bg-green-50/50" },
  museum: { emoji: "🏛️", gradient: "from-purple-200 via-violet-100 to-indigo-100", ctaGradient: "from-purple-500 to-indigo-400", bodyTint: "bg-purple-50/50" },
  attraction: { emoji: "🎡", gradient: "from-fuchsia-200 via-pink-100 to-rose-100", ctaGradient: "from-fuchsia-400 to-pink-400", bodyTint: "bg-fuchsia-50/50" },
  shopping: { emoji: "🛍️", gradient: "from-pink-200 via-fuchsia-100 to-purple-100", ctaGradient: "from-pink-400 to-purple-400", bodyTint: "bg-pink-50/50" },
  activity: { emoji: "🎯", gradient: "from-orange-200 via-amber-100 to-yellow-100", ctaGradient: "from-orange-400 to-amber-400", bodyTint: "bg-orange-50/50" },
  other: { emoji: "📍", gradient: "from-stone-200 via-slate-100 to-gray-100", ctaGradient: "from-stone-500 to-slate-400", bodyTint: "bg-stone-50/50" },
};

export function getCat(cat: string): CatCfg {
  return CAT[cat] ?? CAT.other;
}

/* ── Labels ─────────────────────────────────────────────────────────── */
export const STAFF_PICK: Record<Lang, string> = {
  sv: "Rekommenderas",
  en: "Recommended",
  de: "Empfohlen",
  da: "Anbefalet",
  nl: "Aanbevolen",
  no: "Anbefalt"
};

export const EVENT_LABELS: Record<Lang, string> = {
  sv: "Evenemang",
  en: "Events",
  de: "Veranstaltungen",
  da: "Arrangementer",
  nl: "Evenementen",
  no: "Arrangementer",
};

export const PLAN_LABELS: Record<Lang, string> = {
  sv: "Planera dagen ✦",
  en: "Plan my day ✦",
  de: "Tag planen ✦",
  da: "Planlæg dagen ✦",
  nl: "Plan mijn dag ✦",
  no: "Planlegg dagen ✦",
};

export const CLOSE_LABELS: Record<Lang, string> = {
  sv: "Stäng",
  en: "Close",
  de: "Schließen",
  da: "Luk",
  nl: "Sluiten",
  no: "Lukk",
};

export const MORNING_LABELS: Record<Lang, string> = {
  sv: "Morgon",
  en: "Morning",
  de: "Morgen",
  da: "Morgen",
  nl: "Ochtend",
  no: "Morgen"
};

export const LUNCH_LABELS: Record<Lang, string> = {
  sv: "Lunch",
  en: "Lunch",
  de: "Mittag",
  da: "Frokost",
  nl: "Lunch",
  no: "Lunsj"
};

export const AFTERNOON_LABELS: Record<Lang, string> = {
  sv: "Eftermiddag",
  en: "Afternoon",
  de: "Nachmittag",
  da: "Eftermiddag",
  nl: "Middag",
  no: "Ettermiddag"
};

export const EVENING_LABELS: Record<Lang, string> = {
  sv: "Kväll",
  en: "Evening",
  de: "Abend",
  da: "Aften",
  nl: "Avond",
  no: "Kveld"
};

/* ── Component Props ────────────────────────────────────────────────── */
export interface CardProps {
  place: CachedPlace;
  emoji: string;
  lang: Lang;
  labels: UtforskaLabels;
  isSwedish: boolean;
  distance: string;
  onDirectionsClick?: (id: string) => void;
  saved: boolean;
  onToggleSave: () => void;
  activePartner?: PromotedPartner | null;
  weatherBadge?: string | null;
}

export interface ExploreTabProps {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[];
  weather?: WeatherProp | null;
  lang: Lang;
  distanceMap: RoadDistanceMap;
  onDirectionsClick?: (placeId: string) => void;
  isSaved?: (id: string) => boolean;
  toggleSaved?: (id: string) => void;
}
