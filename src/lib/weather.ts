export interface WeatherData {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
}

export async function getCurrentWeather(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLng}/lat/${roundedLat}/data.json`;

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) {
      console.error("SMHI API error:", res.statusText);
      return null;
    }

    const data = await res.json();
    const current = data.timeSeries?.[0];
    if (!current) return null;

    const tempParam = current.parameters.find((p: any) => p.name === "t");
    const symbolParam = current.parameters.find((p: any) => p.name === "Wsymb2");
    if (!tempParam || !symbolParam) return null;

    const temp = tempParam.values[0];
    const symbolCode = symbolParam.values[0];
    const { description, isRaining, emoji } = parseSmhiSymbol(symbolCode);

    return {
      temp: Math.round(temp),
      description,
      isRaining,
      icon: emoji,
    };
  } catch (error) {
    console.error("Failed to fetch SMHI weather:", error);
    return null;
  }
}

// Byt ut parseSmhiSymbol i src/lib/weather.ts till detta:
function parseSmhiSymbol(code: number) {
  let descriptionKey = "cloudy";
  let isRaining = false;
  let emoji = "☁️";

  switch (code) {
    case 1: descriptionKey = "clear"; emoji = "☀️"; break;
    case 2: descriptionKey = "nearly_clear"; emoji = "🌤️"; break;
    case 3: descriptionKey = "half_clear"; emoji = "⛅"; break;
    case 4: descriptionKey = "half_clear"; emoji = "⛅"; break;
    case 5: descriptionKey = "cloudy"; emoji = "🌥️"; break;
    case 6: descriptionKey = "overcast"; emoji = "☁️"; break;
    case 7: descriptionKey = "fog"; emoji = "🌫️"; break;

    case 8: descriptionKey = "light_rain"; emoji = "🌦️"; isRaining = true; break;
    case 9: descriptionKey = "rain"; emoji = "🌧️"; isRaining = true; break;
    case 10: descriptionKey = "heavy_rain"; emoji = "⛈️"; isRaining = true; break;
    case 11: descriptionKey = "thunder"; emoji = "🌩️"; isRaining = true; break;
    case 18: descriptionKey = "light_rain"; emoji = "🌧️"; isRaining = true; break;
    case 19: descriptionKey = "rain"; emoji = "🌧️"; isRaining = true; break;
    case 20: descriptionKey = "heavy_rain"; emoji = "🌧️"; isRaining = true; break;
    case 21: descriptionKey = "thunder"; emoji = "🌩️"; isRaining = true; break;

    case 12: case 13: case 14: descriptionKey = "sleet"; emoji = "🌨️"; isRaining = true; break;
    case 15: case 16: case 17: descriptionKey = "snow"; emoji = "🌨️"; isRaining = true; break;
    case 22: case 23: case 24: descriptionKey = "sleet"; emoji = "🌨️"; isRaining = true; break;
    case 25: case 26: case 27: descriptionKey = "snow"; emoji = "❄️"; isRaining = true; break;
  }

  // Nu returnerar vi 'descriptionKey' istället för svensk text
  return { description: descriptionKey, isRaining, emoji }; 
}