// src/lib/planner/time.ts

import type { DayContext, PlanLang } from "./types";

export const TIMEZONE = "Europe/Stockholm";

export function nowInSweden(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
}

export function todayStr(): string {
  const sv = nowInSweden();
  return `${sv.getFullYear()}-${String(sv.getMonth() + 1).padStart(2, "0")}-${String(sv.getDate()).padStart(2, "0")}`;
}

export function currentSwedishHour(): number {
  const sv = nowInSweden();
  return sv.getHours() + sv.getMinutes() / 60;
}

export function estimateSunsetHour(): number {
  const month = nowInSweden().getMonth();
  if (month === 5) return 22.0;
  if (month === 6) return 21.8;
  if (month === 7) return 21.0;
  if (month === 4) return 21.0;
  if (month === 8) return 19.5;
  if (month === 3) return 19.5;
  if (month === 9) return 18.0;
  if (month === 2) return 18.0;
  return 16.5;
}

export function getDayCtx(lang: PlanLang, campId?: string): DayContext {
  const sv = nowInSweden();
  const dow = sv.getDay();
  const month = sv.getMonth();
  const dayOfMonth = sv.getDate();

  const dayNames: Record<PlanLang, string[]> = {
    sv: ["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"],
    en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    de: ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
    da: ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],
    nl: ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"],
    no: ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],
  };

  const season: DayContext["season"] =
    month >= 5 && month <= 7 ? "summer" :
    month >= 2 && month <= 4 ? "spring" :
    month >= 8 && month <= 10 ? "autumn" : "winter";

  const dateNum = parseInt(todayStr().replace(/-/g, ""), 10);
  const campHash = (campId ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    dayName: dayNames[lang][dow],
    isWeekend: dow === 0 || dow === 6,
    isSummer: season === "summer",
    season,
    seed: (dateNum + campHash) % 31,
    sunsetHour: estimateSunsetHour(),
    isMidsommarWeek: month === 5 && dayOfMonth >= 18 && dayOfMonth <= 26,
  };
}
