// src/lib/planner/types.ts

import type { CachedPlace, PlaceCategory } from "@/types/database";

export const CACHE_VERSION = 12;

export type PlanLang = "sv" | "en" | "de" | "da" | "nl" | "no";

export type Period = "morning" | "lunch" | "afternoon" | "evening";

type SlotPurpose = "meal" | "activity" | "fika";

export interface ItineraryItem {
  time: string;
  period: Period;
  emoji: string;
  title: string;
  description: string;
  placeId?: string;
  tip?: string;
}

export interface CachedPlanEnvelope {
  plan: ItineraryItem[];
  weatherKey: string;
  dateStr: string;
  timestamp: number;
  periodWeather: Record<Period, string>;
}

export interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message: string };
}

export interface PlanSlot {
  id: string;
  period: Period;
  purpose: SlotPurpose;
  defaultTime: string;
  preferCats: readonly PlaceCategory[];
}

type RainIntensity = "none" | "drizzle" | "moderate" | "heavy";

type WindLevel = "calm" | "breezy" | "windy" | "veryWindy";

export interface WeatherInput {
  temp: number;
  isRaining: boolean;
  description: string;
  icon: string;
  windSpeed: number;
}

export interface WeatherCtx {
  temp: number;
  fl: number;
  rain: RainIntensity;
  wind: number;
  windL: WindLevel;
  season: string;
  isSummer: boolean;
  sunsetHour: number;
  beachOk: boolean;
  trailOk: boolean;
  waterOk: boolean;
  fireOk: boolean;
  bbqOk: boolean;
}

export interface DayContext {
  dayName: string;
  isWeekend: boolean;
  isSummer: boolean;
  season: "spring" | "summer" | "autumn" | "winter";
  seed: number;
  sunsetHour: number;
  isMidsommarWeek: boolean;
}

export interface TimeRange {
  open: number;
  close: number;
}

export interface ScoredPlace {
  place: CachedPlace;
  baseScore: number;
  weatherScore: number;
  km: number;
  distStr: string;
}

export interface Selection {
  morning: ScoredPlace[];
  lunch: ScoredPlace[];
  afternoon: ScoredPlace[];
  evening: ScoredPlace[];
  extras: ScoredPlace[];
}

interface FallbackOption {
  emoji: string;
  title: string;
  desc: string;
  when?: (ctx: WeatherCtx) => boolean;
}
