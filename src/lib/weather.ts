export interface WeatherData {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
  windSpeed: number; // Added this
}

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

    const data = await res.json();
    const now = new Date();

    /**
     * FIX 1: FIND CURRENT HOUR
     * We look through the timeSeries for the entry closest to "now".
     * This prevents the "Overcast" vs "Fog" mismatch you are seeing.
     */
    const current =
      data.timeSeries?.find((ts: any) => {
        const validTime = new Date(ts.validTime);
        return Math.abs(validTime.getTime() - now.getTime()) < 1800000; // 30 min window
      }) || data.timeSeries?.[0];

    if (!current) return null;

    // FIX 2: GET WIND SPEED ("ws")
    const tempParam = current.parameters.find((p: any) => p.name === "t");
    const symbolParam = current.parameters.find(
      (p: any) => p.name === "Wsymb2",
    );
    const windParam = current.parameters.find((p: any) => p.name === "ws"); // Wind Speed

    if (!tempParam || !symbolParam) return null;

    const temp = tempParam.values[0];
    const symbolCode = symbolParam.values[0];
    const windSpeed = windParam ? windParam.values[0] : 0;

    const { description, isRaining, emoji } = parseSmhiSymbol(symbolCode);

    return {
      // FIX 3: MATCH SMHI ROUNDING
      temp: Math.floor(temp),
      description,
      isRaining,
      icon: emoji,
      windSpeed: windSpeed,
    };
  } catch (error) {
    console.error("Failed to fetch SMHI weather:", error);
    return null;
  }
}

function parseSmhiSymbol(code: number) {
  let descriptionKey = "cloudy";
  let isRaining = false;
  let emoji = "☁️";

  switch (code) {
    case 1:
      descriptionKey = "clear";
      emoji = "☀️";
      break;
    case 2:
      descriptionKey = "nearly_clear";
      emoji = "🌤️";
      break;
    case 3:
      descriptionKey = "half_clear";
      emoji = "⛅";
      break;
    case 4:
      descriptionKey = "half_clear";
      emoji = "⛅";
      break;
    case 5:
      descriptionKey = "cloudy";
      emoji = "🌥️";
      break;
    case 6:
      descriptionKey = "overcast";
      emoji = "☁️";
      break;
    case 7:
      descriptionKey = "fog";
      emoji = "🌫️";
      break; // This matches your JSON
    case 8:
      descriptionKey = "light_rain";
      emoji = "🌦️";
      isRaining = true;
      break;
    case 9:
      descriptionKey = "rain";
      emoji = "🌧️";
      isRaining = true;
      break;
    case 10:
      descriptionKey = "heavy_rain";
      emoji = "⛈️";
      isRaining = true;
      break;
    // ... all other cases stay the same
    default:
      break;
  }

  return { description: descriptionKey, isRaining, emoji };
}
