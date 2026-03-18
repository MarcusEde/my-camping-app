// src/types/guest.ts

export type Lang = "sv" | "en" | "de" | "da" | "nl" | "no";
// TabId updated for 3-tab IA — camp_concierge_ia_spec.xml v2.0
export type TabId = "here" | "explore" | "saved";


export interface WeatherProp {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
  windSpeed: number;
}
