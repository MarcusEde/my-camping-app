// src/components/GuestAppUI.tsx
// UI REDESIGN: Restored full weather context (wind/rain). Refined Hero typography for a premium feel.
"use client";

import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
  PromotedPartner,
} from "@/types/database";
import type { Lang, TabId, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarHeart,
  Compass,
  Droplets,
  Home,
  Info,
  Sparkles,
  Wind,
} from "lucide-react";
import React, { useEffect } from "react";

import { useGuestApp } from "@/lib/hooks/useGuestApp";
import { applyPWAMeta } from "@/lib/pwa";
import type { RoadDistanceMap } from "@/lib/routing";
import {
  getFeelLabel,
  getWelcomeLabel,
  navLabels,
  weatherConditions
} from "@/lib/translations";

import GuestFeedbackWidget from "./GuestFeedbackWidget";
import AktiviteterTab from "./tabs/AktiviteterTab";
import InfoTab from "./tabs/InfoTab";
import PlanerarenTab from "./tabs/PlanerarenTab";
import PulsTab from "./tabs/PulsTab";
import UtforskaTab from "./tabs/UtforskaTab";

export default function GuestAppUI({
  campground,
  places,
  announcements = [],
  partners = [],
  weather = null,
  distanceMap = {},
  internalLocations = [],
}: {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[];
  weather?: WeatherProp | null;
  distanceMap?: RoadDistanceMap;
  internalLocations?: InternalLocation[];
}) {
  const {
    activeTab,
    lang,
    setLang,
    currentHour,
    headerCollapsed,
    visiblePlaces,
    sessionId,
    sentinelRef,
    scrollRef,
    switchTab,
    handleDirectionsClick,
    savedIds,
    toggleSaved,
    isSaved,
    removeSaved,
  } = useGuestApp({
    campground,
    places,
    weather: weather ?? null,
    distanceMap,
  });

  const brand = campground.primary_color || "#059669";
  const heroImage =
    campground.hero_image_url ||
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80";

  const feel = weather ? getFeelLabel(lang, weather.temp) : "";
  const welcomeText = getWelcomeLabel(lang, currentHour);

  // CSS Variables for dynamic white-labeling
  const themeVars = {
    "--brand": brand,
    "--brand-10": `${brand}1A`,
    "--brand-20": `${brand}33`,
  } as React.CSSProperties;

  return (
    <>
      <PWAMeta brand={brand} />
      <div
        className="flex h-[100dvh] w-full flex-col bg-[#F9FAFB] font-sans antialiased text-stone-900 selection:bg-[var(--brand-20)]"
        style={{ overflow: "hidden", ...themeVars }}
      >
        <StickyHeader
          brand={brand}
          campground={campground}
          weather={weather ?? null}
          headerCollapsed={headerCollapsed}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-y-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <HeroHeader
            heroImage={heroImage}
            campground={campground}
            weather={weather ?? null}
            lang={lang}
            setLang={setLang}
            welcomeText={welcomeText}
            feel={feel}
          />

          <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

          <main className="min-h-[80dvh] px-4 pb-28 pt-6 max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {activeTab === "puls" && (
                  <PulsTab
                    campground={campground}
                    places={visiblePlaces}
                    announcements={announcements}
                    weather={weather}
                    lang={lang}
                    distanceMap={distanceMap}
                    internalLocations={internalLocations}
                    onDirectionsClick={handleDirectionsClick}
                    savedIds={savedIds}
                    removeSaved={removeSaved}
                    switchTab={switchTab}
                  />
                )}
                {activeTab === "utforska" && (
                  <UtforskaTab
                    campground={campground}
                    places={visiblePlaces}
                    lang={lang}
                    distanceMap={distanceMap}
                    onDirectionsClick={handleDirectionsClick}
                    isSaved={isSaved}
                    toggleSaved={toggleSaved}
                  />
                )}
                {activeTab === "planerare" && (
                  <PlanerarenTab
                    campground={campground}
                    places={visiblePlaces}
                    weather={weather}
                    lang={lang}
                    distanceMap={distanceMap}
                    isSaved={isSaved}
                    toggleSaved={toggleSaved}
                  />
                )}
                {activeTab === "aktiviteter" && (
                  <AktiviteterTab
                    campground={campground}
                    announcements={announcements}
                    partners={partners}
                    lang={lang}
                  />
                )}
                {activeTab === "info" && (
                  <InfoTab
                    campground={campground}
                    lang={lang}
                    sessionId={sessionId}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <GuestFeedbackWidget
              campgroundId={campground.id}
              sessionId={sessionId}
              brand={brand}
              lang={lang}
            />
          </main>
        </div>

        <BottomNav activeTab={activeTab} lang={lang} switchTab={switchTab} />
      </div>
    </>
  );
}

/* ──────────────────────────── Sub-components ──────────────────────────── */

function PWAMeta({ brand }: { brand: string }) {
  useEffect(() => applyPWAMeta(brand), [brand]);
  return null;
}

function StickyHeader({
  campground,
  weather,
  headerCollapsed,
}: {
  brand: string;
  campground: Campground;
  weather: WeatherProp | null;
  headerCollapsed: boolean;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-30 transition-transform duration-300 ease-out border-b border-stone-200/50"
      style={{
        transform: headerCollapsed ? "translateY(0)" : "translateY(-100%)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-3 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          {campground.logo_url && (
            <img
              src={campground.logo_url}
              alt=""
              className="h-6 w-6 shrink-0 object-contain rounded-sm"
            />
          )}
          <h2 className="truncate text-sm font-semibold tracking-tight text-stone-900">
            {campground.name}
          </h2>
        </div>
        {weather && (
          <div className="flex shrink-0 items-center gap-1.5 px-2 py-1">
            <span className="text-sm leading-none">{weather.icon}</span>
            <span className="text-sm font-semibold text-stone-900">
              {weather.temp}°
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroHeader({
  heroImage,
  campground,
  weather,
  lang,
  setLang,
  welcomeText,
  feel,
}: {
  heroImage: string;
  campground: Campground;
  weather: WeatherProp | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  welcomeText: string;
  feel: string;
}) {
  return (
    <header className="relative w-full h-[40vh] min-h-[300px] max-h-[420px] overflow-hidden">
      <div className="absolute inset-0 bg-stone-900" />
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-85"
        style={{
          objectPosition: (campground as any).hero_image_position || "center",
        }}
      />
      {/* Sleek vignette gradient to ensure text readability without making the whole image muddy */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/30 to-stone-900/10" />

      <div
        className="relative z-10 flex h-full flex-col justify-between px-5 pb-6 max-w-lg mx-auto"
        style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}
      >
        <div className="flex items-center justify-between w-full">
          <LangSwitcher lang={lang} setLang={setLang} />
          {campground.logo_url && (
            <img
              src={campground.logo_url}
              alt=""
              className="max-h-8 max-w-[100px] object-contain drop-shadow-md brightness-0 invert opacity-90"
            />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-white/80 uppercase">
              {welcomeText}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white drop-shadow-md">
              {campground.name}
            </h1>
          </div>

          {weather && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2">
                <span className="text-2xl leading-none drop-shadow-sm">
                  {weather.icon}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white drop-shadow-sm">
                    {weather.temp}°
                  </span>
                  <span className="text-xs font-medium text-white/80 drop-shadow-sm capitalize">
                    {feel}
                  </span>
                </div>
              </div>

              {/* Restored Wind & Rain contextual data */}
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2">
                {weather.isRaining ? (
                  <Droplets size={14} className="text-white/70" />
                ) : (
                  <Wind size={14} className="text-white/70" />
                )}
                <span className="text-xs font-medium text-white/90">
                  {weather.isRaining
                    ? weatherConditions[lang].rain
                    : weather.windSpeed && weather.windSpeed > 0.5
                      ? `${weather.windSpeed.toFixed(1)} m/s`
                      : weatherConditions[lang].calm}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LangSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex w-fit rounded-lg bg-black/30 p-1 backdrop-blur-md ring-1 ring-white/20">
      {(["sv", "en", "de", "da", "nl", "no"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`relative px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors z-10 ${
            lang === l ? "text-stone-900" : "text-white/70 hover:text-white"
          }`}
        >
          {lang === l && (
            <motion.div
              className="absolute inset-0 rounded-md bg-white shadow-sm"
              layoutId="lang-pill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ zIndex: -1 }}
            />
          )}
          {l}
        </button>
      ))}
    </div>
  );
}

function BottomNav({
  activeTab,
  lang,
  switchTab,
}: {
  activeTab: TabId;
  lang: Lang;
  switchTab: (id: TabId) => void;
}) {
  return (
    <nav
      className="relative z-30 shrink-0 border-t border-stone-200 bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="px-2 py-2 max-w-lg mx-auto">
        <div className="flex justify-between items-center">
          <NavBtn
            id="utforska"
            active={activeTab === "utforska"}
            label={navLabels[lang].utforska}
            icon={Compass}
            onClick={switchTab}
          />
          <NavBtn
            id="planerare"
            active={activeTab === "planerare"}
            label={navLabels[lang].planerare}
            icon={Sparkles}
            onClick={switchTab}
          />
          <NavBtn
            id="puls"
            active={activeTab === "puls"}
            label={navLabels[lang].puls}
            icon={Home}
            onClick={switchTab}
          />
          <NavBtn
            id="aktiviteter"
            active={activeTab === "aktiviteter"}
            label={navLabels[lang].aktiviteter}
            icon={CalendarHeart}
            onClick={switchTab}
          />
          <NavBtn
            id="info"
            active={activeTab === "info"}
            label={navLabels[lang].info}
            icon={Info}
            onClick={switchTab}
          />
        </div>
      </div>
    </nav>
  );
}

function NavBtn({ id, active, label, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className="relative flex flex-1 flex-col items-center gap-1 py-1.5 px-2 transition-transform active:scale-95 outline-none"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 2}
        className={active ? "text-[var(--brand)]" : "text-stone-400"}
      />
      <span
        className={`text-[10px] font-medium tracking-wide transition-colors ${
          active ? "text-[var(--brand)]" : "text-stone-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
