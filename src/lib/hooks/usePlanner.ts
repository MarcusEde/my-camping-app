// src/lib/hooks/usePlanner.ts
"use client";

import { useEffect, useRef, useState } from "react";

import { getAiPlan, type ItineraryItem } from "@/app/camp/[slug]/ai-action";
import { buildSearchMapLink } from "@/lib/place-utils";
import {
  browserNowMinutes,
  computeDimming,
  todayKey,
} from "@/lib/planner-utils";
import type { RoadDistanceMap } from "@/lib/routing";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";

export interface EnrichedItem extends ItineraryItem {
  dimmed: boolean;
}

interface UsePlannerParams {
  campground: Campground;
  places: CachedPlace[];
  weather: WeatherProp | null | undefined;
  lang: Lang;
  distanceMap: RoadDistanceMap;
}

/**
 * Simple weather bucket for cache-key purposes (matches server logic).
 * 5°C temp buckets, binary rain, binary wind.
 */
function clientWeatherKey(weather: WeatherProp | null | undefined): string {
  if (!weather) return "unknown";
  const tBucket = Math.round(weather.temp / 5) * 5;
  const rain = weather.isRaining ? "r" : "d";
  const wind = weather.windSpeed >= 10 ? "W" : "w";
  return `${rain}_${tBucket}_${wind}`;
}

export function usePlanner({
  campground,
  places,
  weather,
  lang,
  distanceMap,
}: UsePlannerParams) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [nowMin, setNowMin] = useState(browserNowMinutes);

  const dateKey = todayKey();
  const wKey = clientWeatherKey(weather);

  // Include weather key in fetch key so we re-fetch when weather bucket changes
  const fetchKey = `${campground.id}-${lang}-${dateKey}-${wKey}`;
  const lastFetchKey = useRef<string | null>(null);
  const argsRef = useRef({ campground, weather, places, distanceMap });
  argsRef.current = { campground, weather, places, distanceMap };

  // Fetch AI plan
  useEffect(() => {
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    setLoading(true);
    const {
      campground: cg,
      weather: w,
      places: p,
      distanceMap: dm,
    } = argsRef.current;

    getAiPlan(cg, w ?? undefined, p, lang, dateKey, dm)
      .then((plan) => setItems(plan))
      .catch((err) => {
        console.error("[Planner]", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [fetchKey, lang, dateKey]);

  // Tick every minute for dimming
  useEffect(() => {
    const id = setInterval(() => setNowMin(browserNowMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Build map URL for a place
  const getMapUrl = (placeId?: string): string | null => {
    if (!placeId) return null;
    const p = places.find((x) => x.id === placeId);
    if (!p || p.is_on_site) return null;
    return buildSearchMapLink(p.latitude, p.longitude, p.name);
  };

  // Dimming
  const dimFlags = computeDimming(items, nowMin);
  const enriched: EnrichedItem[] = items.map((item, i) => ({
    ...item,
    dimmed: dimFlags[i],
  }));
  const hasPast = enriched.some((i) => i.dimmed);
  const nowIdx = enriched.findIndex((i) => !i.dimmed);

  return {
    loading,
    items,
    enriched,
    hasPast,
    nowIdx,
    getMapUrl,
  };
}
