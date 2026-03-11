// src/lib/hooks/useGuestApp.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prefetchAiPlan } from "@/app/camp/[slug]/ai-action";
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

  // Prefetch AI plan
  useEffect(() => {
    if (!visiblePlaces.length || !weather) return;
    const key = `${campground.id}-${weather.temp}-${weather.isRaining}-${weather.windSpeed}`;
    if (prefetchedKey.current === key) return;
    prefetchedKey.current = key;
    prefetchAiPlan(campground, weather, visiblePlaces, distanceMap).catch(
      () => {},
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
  };
}
