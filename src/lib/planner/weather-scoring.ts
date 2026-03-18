// src/lib/planner/weather-scoring.ts

export type RainIntensity = "none" | "drizzle" | "moderate" | "heavy";
export type WindLevel = "calm" | "breezy" | "windy" | "veryWindy";

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

interface DayContext {
  dayName: string;
  isWeekend: boolean;
  isSummer: boolean;
  season: "spring" | "summer" | "autumn" | "winter";
  seed: number;
  sunsetHour: number;
  isMidsommarWeek: boolean;
}

export function classifyRain(weather: WeatherInput | null): RainIntensity {
  if (!weather || !weather.isRaining) return "none";
  const desc = (weather.description || "").toLowerCase();
  if (
    desc.includes("heavy") || desc.includes("thunder") ||
    desc.includes("storm") || desc.includes("skyfall") || desc.includes("åska")
  ) return "heavy";
  if (
    desc.includes("light") || desc.includes("drizzle") ||
    desc.includes("duggregn") || desc.includes("lätt")
  ) return "drizzle";
  return "moderate";
}

export function classifyWind(speed: number): WindLevel {
  if (speed < 5) return "calm";
  if (speed < 8) return "breezy";
  if (speed < 12) return "windy";
  return "veryWindy";
}

export function feelsLike(temp: number, wind: number): number {
  if (temp > 25 || wind < 3) return temp;
  return Math.round(temp - (wind * 0.7 * (25 - temp)) / 25);
}

export function isSwedishBeachWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain !== "none") return false;
  const fl = feelsLike(temp, wind);
  if (wind >= 10) return fl >= 22;
  if (wind >= 7) return fl >= 20;
  return fl >= 17;
}

export function isTrailWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  if (wind >= 12) return false;
  return temp >= 3;
}

export function isWaterActivityWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain !== "none") return false;
  if (wind >= 8) return false;
  return temp >= 15;
}

export function isCampfireWeather(temp: number, wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  if (wind >= 12) return false;
  if (rain === "drizzle" && temp >= 10) return true;
  if (temp < 3 && wind >= 8) return false;
  return true;
}

export function isBBQWeather(wind: number, rain: RainIntensity): boolean {
  if (rain === "heavy") return false;
  return wind < 12;
}

export function buildWeatherCtx(
  weather: { temp: number; isRaining: boolean; windSpeed?: number; description?: string } | null,
  day: DayContext,
): WeatherCtx {
  const temp = weather?.temp ?? 18;
  const wind = weather?.windSpeed ?? 0;
  const rain = weather
    ? classifyRain({ temp, isRaining: weather.isRaining, description: weather.description ?? "", icon: "", windSpeed: wind })
    : "none" as RainIntensity;
  const fl = feelsLike(temp, wind);
  return {
    temp, fl, rain, wind, windL: classifyWind(wind),
    season: day.season, isSummer: day.isSummer, sunsetHour: day.sunsetHour,
    beachOk: isSwedishBeachWeather(temp, wind, rain),
    trailOk: isTrailWeather(temp, wind, rain),
    waterOk: isWaterActivityWeather(temp, wind, rain),
    fireOk: isCampfireWeather(temp, wind, rain),
    bbqOk: isBBQWeather(wind, rain),
  };
}

export function tempMood(fl: number): string {
  if (fl >= 25) return "gorgeous and warm";
  if (fl >= 20) return "perfect summer weather";
  if (fl >= 15) return "pleasant";
  if (fl >= 10) return "fresh";
  if (fl >= 5) return "chilly";
  if (fl >= 0) return "cold";
  return "freezing";
}

export function weatherBucket(rain: boolean, temp: number, wind: number): string {
  const ri = rain ? (wind > 8 || temp < 10 ? "H" : wind > 5 ? "M" : "L") : "d";
  const fl = feelsLike(temp, wind);
  return `${ri}_${Math.round(fl / 4) * 4}_${wind >= 10 ? "W" : wind >= 6 ? "b" : "c"}`;
}

export function isWeatherDrastic(a: string, b: string): boolean {
  if (a === b) return false;
  const parse = (w: string) => {
    const [r, t, v] = w.split("_");
    return { rain: r !== "d", heavyRain: r === "H", temp: parseInt(t), windy: v === "W" };
  };
  const o = parse(a), n = parse(b);
  if (o.rain !== n.rain) return true;
  if (o.heavyRain !== n.heavyRain) return true;
  if (o.windy !== n.windy) return true;
  return Math.abs(o.temp - n.temp) >= 8;
}
