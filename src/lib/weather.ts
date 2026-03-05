export interface WeatherData {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string; // We will use an emoji instead of an image URL for SMHI!
}

/**
 * Fetches weather from SMHI (Swedish Meteorological and Hydrological Institute)
 * 100% Free. No API Key required!
 */
export async function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  // SMHI requires max 6 decimal places, so we round them
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);

  const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLng}/lat/${roundedLat}/data.json`;

  try {
    // Cache for 15 minutes to avoid spamming SMHI
    const res = await fetch(url, { next: { revalidate: 900 } });

    if (!res.ok) {
      console.error("❌ SMHI API error:", res.statusText);
      return null;
    }

    const data = await res.json();

    // SMHI returns a 'timeSeries' array. The first item is the current hour.
    const currentForecast = data.timeSeries[0];

    // SMHI stores parameters in an array. We need to find:
    // 't' = Temperature
    // 'Wsymb2' = Weather Symbol (1-27)
    const tempParam = currentForecast.parameters.find(
      (p: any) => p.name === "t",
    );
    const symbolParam = currentForecast.parameters.find(
      (p: any) => p.name === "Wsymb2",
    );

    if (!tempParam || !symbolParam) return null;

    const temp = tempParam.values[0];
    const symbolCode = symbolParam.values[0];

    // Parse SMHI's official Wsymb2 codes
    const { description, isRaining, emoji } = parseSmhiSymbol(symbolCode);

    return {
      temp: Math.round(temp),
      description: description,
      isRaining: isRaining,
      icon: emoji,
    };
  } catch (error) {
    console.error("❌ Failed to fetch SMHI weather:", error);
    return null;
  }
}

/**
 * Maps SMHI's Wsymb2 codes to human-readable text and emojis.
 * Codes 8 through 27 indicate precipitation (Rain, Snow, Sleet).
 */
function parseSmhiSymbol(code: number) {
  let description = "Unknown";
  let isRaining = false;
  let emoji = "☁️";

  switch (code) {
    case 1:
      description = "Clear sky";
      emoji = "☀️";
      break;
    case 2:
      description = "Nearly clear";
      emoji = "🌤️";
      break;
    case 3:
      description = "Variable cloudiness";
      emoji = "⛅";
      break;
    case 4:
      description = "Halfclear";
      emoji = "⛅";
      break;
    case 5:
      description = "Cloudy sky";
      emoji = "🌥️";
      break;
    case 6:
      description = "Overcast";
      emoji = "☁️";
      break;
    case 7:
      description = "Fog";
      emoji = "🌫️";
      break;

    // RAIN & SHOWERS
    case 8:
      description = "Light rain showers";
      emoji = "🌦️";
      isRaining = true;
      break;
    case 9:
      description = "Moderate rain showers";
      emoji = "🌧️";
      isRaining = true;
      break;
    case 10:
      description = "Heavy rain showers";
      emoji = "⛈️";
      isRaining = true;
      break;
    case 11:
      description = "Thunderstorm";
      emoji = "🌩️";
      isRaining = true;
      break;
    case 18:
      description = "Light rain";
      emoji = "🌧️";
      isRaining = true;
      break;
    case 19:
      description = "Moderate rain";
      emoji = "🌧️";
      isRaining = true;
      break;
    case 20:
      description = "Heavy rain";
      emoji = "🌧️";
      isRaining = true;
      break;
    case 21:
      description = "Thunder";
      emoji = "🌩️";
      isRaining = true;
      break;

    // SNOW & SLEET (Also bad weather = Indoor day!)
    case 12:
    case 13:
    case 14:
      description = "Sleet showers";
      emoji = "🌨️";
      isRaining = true;
      break;
    case 15:
    case 16:
    case 17:
      description = "Snow showers";
      emoji = "🌨️";
      isRaining = true;
      break;
    case 22:
    case 23:
    case 24:
      description = "Sleet";
      emoji = "🌨️";
      isRaining = true;
      break;
    case 25:
    case 26:
    case 27:
      description = "Snowfall";
      emoji = "❄️";
      isRaining = true;
      break;

    default:
      description = "Cloudy";
      emoji = "☁️";
      break;
  }

  return { description, isRaining, emoji };
}
