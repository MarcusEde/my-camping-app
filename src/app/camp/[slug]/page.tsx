import type { WeatherProp } from "@/components/GuestAppUI";
import GuestAppUI from "@/components/GuestAppUI";
import { formatDistance } from "@/lib/distance";
import { type RoadDistanceMap } from "@/lib/routing";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    windspeed_10m: number;
    weathercode: number;
  };
}
const MAX_PLACE_DISTANCE_KM = 50;

async function fetchWeatherFromSMHI(
  lat: number,
  lon: number,
): Promise<WeatherProp | null> {
  try {
    // FORCE DOT DECIMALS: SMHI 404s if there's a comma or weird precision
    const sLat = lat.toFixed(4);
    const sLon = lon.toFixed(4);
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${sLon}/lat/${sLat}/data.json`;

    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      console.log(`[Weather] SMHI Failed with Status: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as SMHIResponse;
    const timeSeries = data?.timeSeries;
    if (!timeSeries || timeSeries.length === 0) return null;

    const now = Date.now();
    const closest =
      timeSeries.find((ts: SMHITimeSeries) => {
        const forecastTime = new Date(ts.validTime).getTime();
        return Math.abs(forecastTime - now) < 1800000;
      }) || timeSeries[0];

    const getParam = (name: string) =>
      closest.parameters.find((p: SMHIParameter) => p.name === name)
        ?.values?.[0] ?? null;

    const wsymb2 = getParam("Wsymb2") ?? 1;
    const windSpeed = getParam("ws") ?? 0;
    const temp = getParam("t") ?? 0;

    let description: string;
    let isRaining = false;
    let icon: string;

    if (wsymb2 === 1) {
      description = "clear";
      icon = "☀️";
    } else if (wsymb2 === 2) {
      description = "nearly_clear";
      icon = "🌤️";
    } else if (wsymb2 <= 5) {
      description = "partly_cloudy";
      icon = "⛅";
    } else if (wsymb2 === 6) {
      description = "overcast";
      icon = "☁️";
    } else if (wsymb2 === 7) {
      description = "fog";
      icon = "🌫️";
    } else {
      isRaining = true;
      const lightCodes = [8, 12, 15, 18, 22, 25];
      description = lightCodes.includes(wsymb2) ? "light_rain" : "rain";
      const snowCodes = [15, 16, 17, 25, 26, 27];
      icon = snowCodes.includes(wsymb2) ? "🌨️" : "🌧️";
    }

    return { temp: Math.floor(temp), description, isRaining, icon, windSpeed };
  } catch (err) {
    console.error("[Weather] SMHI Exception:", err);
    return null;
  }
}

async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherProp | null> {
  const smhi = await fetchWeatherFromSMHI(lat, lon);
  if (smhi) return smhi;

  console.log(`[Weather] Falling back to Open-Meteo for ${lat}, ${lon}`);
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,windspeed_10m,weathercode&timezone=auto`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as OpenMeteoResponse;
  const code = data.current.weathercode;

  // Improved Open-Meteo logic (45/48 = Fog)
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
}

// ... rest of the CampPage component stays the same
export default async function CampPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch Campground
  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!campground) notFound();

  // 🚫 BLOCK GUESTS IF INACTIVE ELLER CANCELLED
  if (
    campground.subscription_status === "inactive" ||
    campground.subscription_status === "cancelled"
  ) {
    const isCancelled = campground.subscription_status === "cancelled";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFCFB] p-6 text-center">
        <div className="w-full max-w-sm space-y-4 rounded-[24px] bg-white p-8 ring-1 ring-stone-200/60 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] bg-stone-50 text-3xl ring-1 ring-stone-200/60">
            {isCancelled ? "🚫" : "⛺"}
          </div>
          <div>
            <h1 className="text-[18px] font-black tracking-tight text-stone-900">
              {campground.name}
            </h1>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-stone-500">
              {isCancelled
                ? "Den här gästportalen är ej längre tillgänglig. Vänligen kontakta receptionen för mer information."
                : "Gästportalen är tillfälligt otillgänglig. Vänligen kontakta receptionen för mer information under din vistelse."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch all related data ONLY if active/trial
  const [placesRes, announcementsRes, partnersRes, facilitiesRes, weather] =
    await Promise.all([
      supabase
        .from("cached_places")
        .select("*")
        .eq("campground_id", campground.id)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false }),
      supabase
        .from("announcements")
        .select("*")
        .eq("campground_id", campground.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("promoted_partners")
        .select("*")
        .eq("campground_id", campground.id)
        .eq("is_active", true)
        .order("priority_rank", { ascending: false }),
      supabase // ← ADD
        .from("internal_locations") // ← ADD
        .select("*") // ← ADD
        .eq("campground_id", campground.id) // ← ADD
        .eq("is_active", true) // ← ADD
        .order("walking_minutes", { ascending: true }), // ← ADD
      fetchWeather(campground.latitude, campground.longitude),
    ]);

  const rawPlaces = placesRes.data ?? [];
  const distanceMap: RoadDistanceMap = {};
  for (const place of rawPlaces) {
    if (place.road_distance_km != null)
      distanceMap[place.id] = formatDistance(place.road_distance_km);
  }

  return (
    <GuestAppUI
      campground={campground}
      places={rawPlaces}
      announcements={announcementsRes.data ?? []}
      partners={partnersRes.data ?? []}
      weather={weather}
      distanceMap={distanceMap}
      internalLocations={facilitiesRes.data ?? []} // ← ADD
    />
  );
}

export const dynamic = "force-dynamic";
