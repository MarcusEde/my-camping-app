// src/components/GuestAppUI.tsx
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

import { SPRING_LAYOUT, SPRING_SNAP } from "@/lib/constants";
import { useGuestApp } from "@/lib/hooks/useGuestApp";
import { applyPWAMeta } from "@/lib/pwa";
import type { RoadDistanceMap } from "@/lib/routing";
import {
  getFeelLabel,
  getWelcomeLabel,
  navLabels,
  weatherConditions,
  weatherLabels
} from "@/lib/translations";
import { hexToRgba } from "@/lib/utils";

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
  } = useGuestApp({
    campground,
    places,
    weather: weather ?? null,
    distanceMap,
  });

  const brand = campground.primary_color || "#2A3C34";
  const heroImage =
    campground.hero_image_url ||
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80";

  const feel = weather ? getFeelLabel(lang, weather.temp) : "";
  const welcomeText = getWelcomeLabel(lang, currentHour);

  return (
    <>
      <PWAMeta brand={brand} />
      <div
        className="flex h-[100dvh] w-full flex-col bg-[#FDFCFB] font-sans antialiased text-stone-900"
        style={{ overflow: "hidden" }}
      >
        {/* Sticky Header */}
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
            brand={brand}
            heroImage={heroImage}
            campground={campground}
            weather={weather ?? null}
            lang={lang}
            setLang={setLang}
            welcomeText={welcomeText}
            feel={feel}
          />

          <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

          <main className="min-h-[80dvh] bg-[#FDFCFB] px-4 pb-28 pt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
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
                  />
                )}
                {activeTab === "utforska" && (
                  <UtforskaTab
                    campground={campground}
                    places={visiblePlaces}
                    lang={lang}
                    distanceMap={distanceMap}
                    onDirectionsClick={handleDirectionsClick}
                  />
                )}
                {activeTab === "planerare" && (
                  <PlanerarenTab
                    campground={campground}
                    places={visiblePlaces}
                    weather={weather}
                    lang={lang}
                    distanceMap={distanceMap}
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
                  <InfoTab campground={campground} lang={lang} />
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

        <BottomNav
          activeTab={activeTab}
          lang={lang}
          brand={brand}
          switchTab={switchTab}
        />
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
  brand,
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
      className="absolute inset-x-0 top-0 z-30 transition-transform duration-300 ease-out"
      style={{
        transform: headerCollapsed ? "translateY(0)" : "translateY(-100%)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 backdrop-blur-2xl"
        style={{
          backgroundColor: `${brand}ee`,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {campground.logo_url && (
            <img
              src={campground.logo_url}
              alt=""
              className="h-5 w-5 shrink-0 object-contain brightness-0 invert opacity-60"
            />
          )}
          <h2 className="truncate text-[13px] font-black tracking-tight text-white">
            {campground.name}
          </h2>
        </div>
        {weather && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.12] px-2.5 py-1 ring-1 ring-white/[0.08]">
            <span className="text-xs leading-none">{weather.icon}</span>
            <span className="text-[11px] font-black text-white">
              {weather.temp}°
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroHeader({
  brand,
  heroImage,
  campground,
  weather,
  lang,
  setLang,
  welcomeText,
  feel,
}: {
  brand: string;
  heroImage: string;
  campground: Campground;
  weather: WeatherProp | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  welcomeText: string;
  feel: string;
}) {
  return (
    <header className="relative overflow-hidden" style={{ minHeight: "240px" }}>
      <div className="absolute inset-0" style={{ backgroundColor: brand }} />
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: (campground as any).hero_image_position || "center",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply opacity-35"
        style={{ backgroundColor: brand }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
      <div
        className="relative z-10 flex h-full min-h-[240px] flex-col justify-between px-5 pb-5"
        style={{ paddingTop: "max(env(safe-area-inset-top, 14px), 14px)" }}
      >
        <div className="flex items-center justify-between">
          <LangSwitcher lang={lang} setLang={setLang} />
          {campground.logo_url && (
            <img
              src={campground.logo_url}
              alt=""
              className="max-h-7 max-w-[80px] object-contain brightness-0 invert opacity-55"
            />
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            {welcomeText}
          </p>
          <h1 className="mt-1 truncate text-[clamp(20px,6vw,26px)] font-black leading-[1.06] tracking-tight text-white">
            {campground.name}
          </h1>
          {weather && (
            <WeatherBadge weather={weather} lang={lang} feel={feel} />
          )}
        </div>
      </div>
    </header>
  );
}

function WeatherBadge({
  weather,
  lang,
  feel,
}: {
  weather: WeatherProp;
  lang: Lang;
  feel: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-full bg-white/[0.08] px-3.5 py-2 ring-1 ring-white/[0.07] backdrop-blur-xl">
      <span className="shrink-0 text-lg leading-none">{weather.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black leading-none text-white">
          {weather.temp}°
          <span className="ml-0.5 text-[10px] font-semibold text-white/40">
            C
          </span>
          <span className="mx-1.5 text-white/15">·</span>
          <span className="text-[11px] font-bold text-white/65">{feel}</span>
        </p>
        <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/30">
          {weatherLabels[weather.description]?.[lang] ?? weather.description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-1 ring-1 ring-white/[0.06]">
        {weather.isRaining ? (
          <Droplets size={10} className="text-white/50" />
        ) : (
          <Wind size={10} className="text-white/50" />
        )}
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/55">
          {weather.isRaining
            ? weatherConditions[lang].rain
            : weather.windSpeed && weather.windSpeed > 0.5
              ? `${weather.windSpeed.toFixed(1)} m/s`
              : weatherConditions[lang].calm}
        </span>
      </div>
    </div>
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
    <div className="flex w-fit rounded-full bg-black/16 p-[3px] backdrop-blur-xl ring-1 ring-white/[0.06]">
      {(["sv", "en", "de", "da", "nl", "no"] as Lang[]).map((l) => (
        <motion.button
          key={l}
          onClick={() => setLang(l)}
          className={`relative rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${
            lang === l ? "text-stone-900" : "text-white/35 hover:text-white/55"
          }`}
          whileTap={{ scale: 0.88 }}
          transition={SPRING_SNAP}
        >
          {lang === l && (
            <motion.div
              className="absolute inset-0 rounded-full bg-white"
              layoutId="lang-pill"
              transition={SPRING_LAYOUT}
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.03)",
              }}
            />
          )}
          <span className="relative z-10">{l}</span>
        </motion.button>
      ))}
    </div>
  );
}

function BottomNav({
  activeTab,
  lang,
  brand,
  switchTab,
}: {
  activeTab: TabId;
  lang: Lang;
  brand: string;
  switchTab: (id: TabId) => void;
}) {
  return (
    <nav
      className="relative z-30 shrink-0 border-t border-stone-200/40 bg-white/95 backdrop-blur-2xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.025), 0 -6px 20px rgba(0,0,0,0.04)",
      }}
    >
      <div className="px-3 pb-1.5 pt-1.5">
        <div className="grid grid-cols-5 items-end">
          <NavBtn
            id="utforska"
            active={activeTab === "utforska"}
            label={navLabels[lang].utforska}
            icon={<Compass size={19} strokeWidth={1.8} />}
            brand={brand}
            onClick={switchTab}
          />
          <NavBtn
            id="planerare"
            active={activeTab === "planerare"}
            label={navLabels[lang].planerare}
            icon={<Sparkles size={19} strokeWidth={1.8} />}
            brand={brand}
            onClick={switchTab}
          />
          <div className="relative -top-3 flex flex-col items-center">
            <motion.button
              onClick={() => switchTab("puls")}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-[#FDFCFB] text-white"
              style={{
                background: `linear-gradient(148deg, ${brand}, ${hexToRgba(brand, 0.7)})`,
                boxShadow: `0 4px 20px ${hexToRgba(brand, 0.28)}, 0 1px 4px rgba(0,0,0,0.08)`,
              }}
              whileTap={{ scale: 0.87 }}
              transition={SPRING_SNAP}
            >
              <Home size={20} strokeWidth={2.4} />
            </motion.button>
            <span
              className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-150"
              style={{ color: activeTab === "puls" ? brand : "#a8a29e" }}
            >
              {navLabels[lang].puls}
            </span>
            {activeTab === "puls" && (
              <motion.div
                className="absolute -bottom-1 h-[3px] w-[3px] rounded-full"
                style={{ backgroundColor: brand }}
                layoutId="nav-dot"
                transition={SPRING_LAYOUT}
              />
            )}
          </div>
          <NavBtn
            id="aktiviteter"
            active={activeTab === "aktiviteter"}
            label={navLabels[lang].aktiviteter}
            icon={<CalendarHeart size={19} strokeWidth={1.8} />}
            brand={brand}
            onClick={switchTab}
          />
          <NavBtn
            id="info"
            active={activeTab === "info"}
            label={navLabels[lang].info}
            icon={<Info size={19} strokeWidth={1.8} />}
            brand={brand}
            onClick={switchTab}
          />
        </div>
      </div>
    </nav>
  );
}

function NavBtn({
  id,
  active,
  label,
  icon,
  brand,
  onClick,
}: {
  id: TabId;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  brand: string;
  onClick: (id: TabId) => void;
}) {
  return (
    <motion.button
      onClick={() => onClick(id)}
      className="relative flex w-full flex-col items-center gap-0.5 py-1.5"
      whileTap={{ scale: 0.85 }}
      transition={SPRING_SNAP}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[12px] transition-all duration-200"
        style={
          active
            ? { backgroundColor: hexToRgba(brand, 0.09), color: brand }
            : { color: "#a8a29e" }
        }
      >
        {icon}
      </div>
      <span
        className="text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-150"
        style={{ color: active ? brand : "#a8a29e" }}
      >
        {label}
      </span>
      {active && (
        <motion.div
          className="absolute -bottom-0.5 h-[3px] w-[3px] rounded-full"
          style={{ backgroundColor: brand }}
          layoutId="nav-dot"
          transition={SPRING_LAYOUT}
        />
      )}
    </motion.button>
  );
}
