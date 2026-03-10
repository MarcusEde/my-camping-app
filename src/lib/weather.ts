// src/lib/weather.ts

export interface WeatherData {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
  windSpeed: number;
}

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
// ─────────────────────────────────────────────────────────

export async function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLng}/lat/${roundedLat}/data.json`;

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;

    const data = (await res.json()) as SMHIResponse; // ← cast here
    const now = new Date();

    const current =
      data.timeSeries?.find((ts) => {
        const validTime = new Date(ts.validTime);
        return Math.abs(validTime.getTime() - now.getTime()) < 1800000;
      }) || data.timeSeries?.[0];

    if (!current) return null;

    const tempParam = current.parameters.find((p) => p.name === "t");
    const symbolParam = current.parameters.find((p) => p.name === "Wsymb2");
    const windParam = current.parameters.find((p) => p.name === "ws");

    if (!tempParam || !symbolParam) return null;

    const temp = tempParam.values[0];
    const symbolCode = symbolParam.values[0];
    const windSpeed = windParam ? windParam.values[0] : 0;

    const { description, isRaining, emoji } = parseSmhiSymbol(symbolCode);

    return {
      temp: Math.floor(temp),
      description,
      isRaining,
      icon: emoji,
      windSpeed,
    };
  } catch (error) {
    console.error("Failed to fetch SMHI weather:", error);
    return null;
  }
}

function parseSmhiSymbol(code: number) {
  const map: Record<
    number,
    { description: string; isRaining: boolean; emoji: string }
  > = {
    1: { description: "clear", isRaining: false, emoji: "☀️" },
    2: { description: "nearly_clear", isRaining: false, emoji: "🌤️" },
    3: { description: "half_clear", isRaining: false, emoji: "⛅" },
    4: { description: "half_clear", isRaining: false, emoji: "⛅" },
    5: { description: "cloudy", isRaining: false, emoji: "🌥️" },
    6: { description: "overcast", isRaining: false, emoji: "☁️" },
    7: { description: "fog", isRaining: false, emoji: "🌫️" },
    8: { description: "light_rain", isRaining: true, emoji: "🌦️" },
    9: { description: "rain", isRaining: true, emoji: "🌧️" },
    10: { description: "heavy_rain", isRaining: true, emoji: "⛈️" },
    11: { description: "thunderstorm", isRaining: true, emoji: "⛈️" },
    12: { description: "light_sleet", isRaining: true, emoji: "🌨️" },
    13: { description: "sleet", isRaining: true, emoji: "🌨️" },
    14: { description: "heavy_sleet", isRaining: true, emoji: "🌨️" },
    15: { description: "light_snow", isRaining: false, emoji: "🌨️" },
    16: { description: "snow", isRaining: false, emoji: "❄️" },
    17: { description: "heavy_snow", isRaining: false, emoji: "❄️" },
    18: { description: "light_rain", isRaining: true, emoji: "⛈️" },
    19: { description: "rain", isRaining: true, emoji: "⛈️" },
    20: { description: "heavy_rain", isRaining: true, emoji: "⛈️" },
    21: { description: "light_sleet", isRaining: true, emoji: "⛈️" },
    22: { description: "sleet", isRaining: true, emoji: "⛈️" },
    23: { description: "heavy_sleet", isRaining: true, emoji: "⛈️" },
    24: { description: "light_snow", isRaining: false, emoji: "⛈️" },
    25: { description: "snow", isRaining: false, emoji: "⛈️" },
    26: { description: "heavy_snow", isRaining: false, emoji: "⛈️" },
    27: { description: "thunderstorm", isRaining: true, emoji: "⛈️" },
  };

  return map[code] ?? { description: "cloudy", isRaining: false, emoji: "☁️" };
}
