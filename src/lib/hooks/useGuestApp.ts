// src/lib/hooks/useGuestApp.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prefetchAiPlan } from "@/app/camp/[slug]/ai-action";
import { useSavedItems } from "@/lib/hooks/useSavedItems";
import type { RoadDistanceMap } from "@/lib/routing";
import { getOrCreateSessionId } from "@/lib/session";
import { trackDirectionsClick, trackPageView } from "@/lib/tracking";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang, TabId, WeatherProp } from "@/types/guest";

interface UseGuestAppParams {
  campground: Campground;
  places: CachedPlace[];
  weather: WeatherProp | null;
  distanceMap: RoadDistanceMap;
}

/**
 * Weather bucket matching server logic.
 * When this changes, we need to re-prefetch.
 */
function weatherBucket(weather: WeatherProp | null): string {
  if (!weather) return "none";
  const tBucket = Math.round(weather.temp / 5) * 5;
  const rain = weather.isRaining ? "r" : "d";
  const wind = weather.windSpeed >= 10 ? "W" : "w";
  return `${rain}_${tBucket}_${wind}`;
}

export function useGuestApp({
  campground,
  places,
  weather,
  distanceMap,
}: UseGuestAppParams) {
  const [activeTab, setActiveTab] = useState<TabId>("puls");
  const [lang, setLang] = useState<Lang>("sv");
  const [currentHour, setCurrentHour] = useState(12);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(getOrCreateSessionId());
  const prefetchedKey = useRef("");

  const visiblePlaces = places.filter((p) => !p.is_hidden);

  // Saved items (My Stay) state
  const { savedIds, toggleSaved, isSaved, removeSaved, clearAll } =
    useSavedItems();

  // Set current hour on mount
  useEffect(() => {
    setCurrentHour(new Date().getHours());
  }, []);

  // Track page views
  useEffect(() => {
    if (!campground.id || !sessionIdRef.current) return;
    trackPageView(campground.id, sessionIdRef.current, activeTab);
  }, [activeTab, campground.id]);

  // Intersection observer for sticky header
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Prefetch AI plan — runs on mount AND when weather bucket changes
  useEffect(() => {
    if (!visiblePlaces.length) return;

    const wb = weatherBucket(weather);
    const key = `${campground.id}-${wb}`;

    if (prefetchedKey.current === key) return;
    prefetchedKey.current = key;

    console.log(`[GuestApp] Prefetching AI plan (weather: ${wb})`);
    prefetchAiPlan(campground, weather, visiblePlaces, distanceMap).catch(
      (err) => console.warn("[GuestApp] Prefetch failed:", err),
    );
  }, [campground, weather, visiblePlaces, distanceMap]);

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDirectionsClick = useCallback(
    (placeId: string) => {
      if (!campground.id || !sessionIdRef.current) return;
      trackDirectionsClick(campground.id, placeId, sessionIdRef.current);
    },
    [campground.id],
  );

  return {
    activeTab,
    lang,
    setLang,
    currentHour,
    headerCollapsed,
    visiblePlaces,
    sessionId: sessionIdRef.current,
    sentinelRef,
    scrollRef,
    switchTab,
    handleDirectionsClick,
    // Saved items (My Stay)
    savedIds,
    toggleSaved,
    isSaved,
    removeSaved,
    clearAllSaved: clearAll,
  };
}
