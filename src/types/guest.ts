// src/types/guest.ts

export type Lang = "sv" | "en" | "de" | "da" | "nl" | "no";
export type TabId = "utforska" | "planerare" | "puls" | "aktiviteter" | "info";

export interface WeatherProp {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
  windSpeed: number;
}
