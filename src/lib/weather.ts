// src/lib/weather.ts

import type { WeatherProp } from "@/types/guest";

// Re-export for any code that imported WeatherData
export type { WeatherProp as WeatherData } from "@/types/guest";

// ── SMHI response shape ──────────────────────────────────

interface SMHIParameter {
  name: string;
  values: number[];
}

interface SMHITimeSeries {
  validTime: string;
  parameters: SMHIParameter[];
}

interface SMHIResponse {
  timeSeries?: SMHITimeSeries[];
}

// ── Open-Meteo response shape ─────────────────────────────

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    windspeed_10m: number;
    weathercode: number;
  };
}

// ── SMHI (primary) ────────────────────────────────────────

async function fetchWeatherFromSMHI(
  lat: number,
  lng: number,
): Promise<WeatherProp | null> {
  try {
    const roundedLat = lat.toFixed(4);
    const roundedLng = lng.toFixed(4);
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLng}/lat/${roundedLat}/data.json`;

    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) {
      console.log(`[Weather] SMHI failed with status: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as SMHIResponse;
    const now = Date.now();

    const current =
      data.timeSeries?.find((ts) => {
        const validTime = new Date(ts.validTime).getTime();
        return Math.abs(validTime - now) < 1800000;
      }) || data.timeSeries?.[0];

    if (!current) return null;

    const tempParam = current.parameters.find((p) => p.name === "t");
    const symbolParam = current.parameters.find((p) => p.name === "Wsymb2");
    const windParam = current.parameters.find((p) => p.name === "ws");

    if (!tempParam || !symbolParam) return null;

    const temp = tempParam.values[0];
    const symbolCode = symbolParam.values[0];
    const windSpeed = windParam?.values[0] ?? 0;

    const { description, isRaining, emoji } = parseSmhiSymbol(symbolCode);

    return {
      temp: Math.floor(temp),
      description,
      isRaining,
      icon: emoji,
      windSpeed,
    };
  } catch (err) {
    console.error("[Weather] SMHI exception:", err);
    return null;
  }
}

// ── Open-Meteo (fallback) ─────────────────────────────────

async function fetchWeatherFromOpenMeteo(
  lat: number,
  lng: number,
): Promise<WeatherProp | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,windspeed_10m,weathercode&timezone=auto`,
      { next: { revalidate: 900 } },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;
    const code = data.current.weathercode;

    let description = "overcast";
    let icon = "☁️";
    if (code <= 1) {
      description = "clear";
      icon = "☀️";
    } else if (code === 2) {
      description = "partly_cloudy";
      icon = "⛅";
    } else if (code === 45 || code === 48) {
      description = "fog";
      icon = "🌫️";
    }

    const wind = data.current.windspeed_10m / 3.6;

    return {
      temp: Math.floor(data.current.temperature_2m),
      description,
      isRaining: code > 3 && code < 45,
      icon,
      windSpeed: wind,
    };
  } catch (err) {
    console.error("[Weather] Open-Meteo exception:", err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Fetch current weather. Tries SMHI first (Swedish data),
 * falls back to Open-Meteo if SMHI fails.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherProp | null> {
  const smhi = await fetchWeatherFromSMHI(lat, lng);
  if (smhi) return smhi;

  console.log(`[Weather] Falling back to Open-Meteo for ${lat}, ${lng}`);
  return fetchWeatherFromOpenMeteo(lat, lng);
}

// ── SMHI symbol parser ────────────────────────────────────

function parseSmhiSymbol(code: number): {
  description: string;
  isRaining: boolean;
  emoji: string;
} {
  const map: Record<
    number,
    { description: string; isRaining: boolean; emoji: string }
  > = {
    // ── Clear / Clouds ──
    1: { description: "clear", isRaining: false, emoji: "☀️" },
    2: { description: "nearly_clear", isRaining: false, emoji: "🌤️" },
    3: { description: "half_clear", isRaining: false, emoji: "⛅" },
    4: { description: "half_clear", isRaining: false, emoji: "⛅" },
    5: { description: "cloudy", isRaining: false, emoji: "🌥️" },
    6: { description: "overcast", isRaining: false, emoji: "☁️" },
    7: { description: "fog", isRaining: false, emoji: "🌫️" },

    // ── Rain showers ──
    8: { description: "light_rain", isRaining: true, emoji: "🌦️" },
    9: { description: "rain", isRaining: true, emoji: "🌧️" },
    10: { description: "heavy_rain", isRaining: true, emoji: "🌧️" }, // was ⛈️

    // ── Thunder (showers) ──
    11: { description: "thunderstorm", isRaining: true, emoji: "⛈️" },

    // ── Sleet showers ──
    12: { description: "light_sleet", isRaining: true, emoji: "🌨️" },
    13: { description: "sleet", isRaining: true, emoji: "🌨️" },
    14: { description: "heavy_sleet", isRaining: true, emoji: "🌨️" },

    // ── Snow showers ──
    15: { description: "light_snow", isRaining: false, emoji: "🌨️" },
    16: { description: "snow", isRaining: false, emoji: "❄️" },
    17: { description: "heavy_snow", isRaining: false, emoji: "❄️" },

    // ── Steady rain (NOT thunder) ──
    18: { description: "light_rain", isRaining: true, emoji: "🌦️" }, // was ⛈️
    19: { description: "rain", isRaining: true, emoji: "🌧️" }, // was ⛈️
    20: { description: "heavy_rain", isRaining: true, emoji: "🌧️" }, // was ⛈️

    // ── Steady sleet (NOT thunder) ──
    21: { description: "light_sleet", isRaining: true, emoji: "🌨️" }, // was ⛈️
    22: { description: "sleet", isRaining: true, emoji: "🌨️" }, // was ⛈️
    23: { description: "heavy_sleet", isRaining: true, emoji: "🌨️" }, // was ⛈️

    // ── Steady snow (NOT thunder) ──
    24: { description: "light_snow", isRaining: false, emoji: "🌨️" }, // was ⛈️
    25: { description: "snow", isRaining: false, emoji: "❄️" }, // was ⛈️
    26: { description: "heavy_snow", isRaining: false, emoji: "❄️" }, // was ⛈️

    // ── Thunder (steady) ──
    27: { description: "thunderstorm", isRaining: true, emoji: "⛈️" },
  };

  return map[code] ?? { description: "cloudy", isRaining: false, emoji: "☁️" };
}
