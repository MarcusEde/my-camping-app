// src/lib/constants.ts

import type { PlaceCategory } from "@/types/database";

// ── Animation Springs ─────────────────────────────────────
export const SPRING_SNAP = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
} as const;

export const SPRING_LAYOUT = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
} as const;

export const SPRING_TAP = {
  type: "spring" as const,
  stiffness: 440,
  damping: 24,
} as const;
// ── Category Icons ────────────────────────────────────────
export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  museum: "🏛️",
  park: "🌲",
  beach: "🏖️",
  bowling: "🎳",
  swimming: "🏊",
  shopping: "🛍️",
  cinema: "🎬",
  spa: "🧖",
  activity: "🎯",
  playground: "🛝",
  sports: "🏸",
  attraction: "🎡",
  other: "⭐",
};

// ── Feedback ──────────────────────────────────────────────
export const FEEDBACK_RATINGS = [
  { emoji: "😞", value: 1 },
  { emoji: "😐", value: 2 },
  { emoji: "🙂", value: 3 },
  { emoji: "😊", value: 4 },
  { emoji: "🤩", value: 5 },
] as const;

export const FEEDBACK_DELAY_MS = 60_000;
export const FEEDBACK_THANKS_DURATION_MS = 3_000;
// src/lib/constants.ts

// ── Stagger Animations ────────────────────────────────────
export const STAGGER_CONTAINER = {
  animate: { transition: { staggerChildren: 0.05 } },
} as const;

export const STAGGER_ITEM = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_TAP },
} as const;
// src/lib/constants.ts — append at bottom

// ── Planner Period Styles ─────────────────────────────────
export interface PeriodStyle {
  dot: string;
  bg: string;
  text: string;
  grad: string;
}

export const PERIOD_STYLES: Record<string, PeriodStyle> = {
  morning: {
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
    grad: "from-amber-50 to-orange-50/40",
  },
  lunch: {
    dot: "bg-orange-400",
    bg: "bg-orange-50",
    text: "text-orange-700",
    grad: "from-orange-50 to-red-50/30",
  },
  afternoon: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    grad: "from-emerald-50 to-teal-50/30",
  },
  evening: {
    dot: "bg-indigo-400",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    grad: "from-indigo-50 to-purple-50/30",
  },
};
export const SPRING_SOFT = {
  type: "spring" as const,
  stiffness: 280,
  damping: 26,
} as const;
// src/lib/constants.ts — append at bottom

// ── Camp page ─────────────────────────────────────────────
export const MAX_PLACE_DISTANCE_KM = 50;
// src/lib/constants.ts — append at bottom

// ── Dashboard Settings ────────────────────────────────────

export const ANNOUNCEMENT_TYPES = [
  { value: "info" as const, label: "Information", emoji: "📢" },
  { value: "event" as const, label: "Evenemang", emoji: "🎉" },
  { value: "warning" as const, label: "Varning", emoji: "⚠️" },
] as const;

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]["value"];

export const COLOR_PRESETS = [
  { color: "#2A3C34", label: "Skog" },
  { color: "#1B4D3E", label: "Gran" },
  { color: "#2563EB", label: "Sjö" },
  { color: "#7C3AED", label: "Lavendel" },
  { color: "#DC2626", label: "Stuga" },
  { color: "#D97706", label: "Sand" },
  { color: "#059669", label: "Äng" },
  { color: "#334155", label: "Granit" },
] as const;

export const HERO_POSITIONS = [
  "top left",
  "top",
  "top right",
  "left",
  "center",
  "right",
  "bottom left",
  "bottom",
  "bottom right",
] as const;

export type SettingsSection =
  | "branding"
  | "contact"
  | "guest"
  | "announcements";
