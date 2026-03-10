"use client";

import type {
  Announcement,
  CachedPlace,
  Campground,
  PromotedPartner,
} from "@/types/database";
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
import React, { useCallback, useEffect, useRef, useState } from "react";

import type { RoadDistanceMap } from "@/lib/routing";
import AktiviteterTab from "./tabs/AktiviteterTab";
import InfoTab from "./tabs/InfoTab";
import PlanerarenTab from "./tabs/PlanerarenTab";
import PulsTab from "./tabs/PulsTab";
import UtforskaTab from "./tabs/UtforskaTab";

export type Lang = "sv" | "en" | "de" | "da";
export type TabId = "utforska" | "planerare" | "puls" | "aktiviteter" | "info";

export interface WeatherProp {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
  windSpeed: number;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const SPRING_SNAP = { type: "spring" as const, stiffness: 500, damping: 30 };
const SPRING_LAYOUT = { type: "spring" as const, stiffness: 380, damping: 28 };

const navLabels: Record<Lang, Record<TabId, string>> = {
  sv: {
    utforska: "Utforska",
    planerare: "Planerare",
    puls: "Hem",
    aktiviteter: "Aktiviteter",
    info: "Info",
  },
  en: {
    utforska: "Explore",
    planerare: "Planner",
    puls: "Home",
    aktiviteter: "Activities",
    info: "Info",
  },
  de: {
    utforska: "Entdecken",
    planerare: "Planer",
    puls: "Start",
    aktiviteter: "Aktivitäten",
    info: "Info",
  },
  da: {
    utforska: "Udforsk",
    planerare: "Planlægger",
    puls: "Hjem",
    aktiviteter: "Aktiviteter",
    info: "Info",
  },
};

const weatherLabels: Record<string, Record<Lang, string>> = {
  clear: { sv: "Klart", en: "Clear", de: "Klar", da: "Klart" },
  nearly_clear: {
    sv: "Mestadels klart",
    en: "Nearly clear",
    de: "Fast klar",
    da: "Mest klart",
  },
  partly_cloudy: {
    sv: "Halvklart",
    en: "Partly cloudy",
    de: "Teilweise bewölkt",
    da: "Delvis skyet",
  },
  cloudy: { sv: "Molnigt", en: "Cloudy", de: "Bewölkt", da: "Skyet" },
  overcast: { sv: "Mulet", en: "Overcast", de: "Bedeckt", da: "Overskyet" },
  fog: { sv: "Dimma", en: "Fog", de: "Nebel", da: "Tåge" },
  rain: { sv: "Regn", en: "Rain", de: "Regen", da: "Regn" },
  light_rain: {
    sv: "Lätt regn",
    en: "Light rain",
    de: "Leichter Regen",
    da: "Let regn",
  },
  snow: { sv: "Snö", en: "Snow", de: "Schnee", da: "Sne" },
  sleet: { sv: "Slask", en: "Sleet", de: "Schneeregen", da: "Slud" },
};

const weatherConditions: Record<Lang, { rain: string; calm: string }> = {
  sv: { rain: "Regn", calm: "Lugnt" },
  en: { rain: "Rain", calm: "Calm" },
  de: { rain: "Regen", calm: "Ruhig" },
  da: { rain: "Regn", calm: "Roligt" },
};

const feelLabels: Record<Lang, { warm: string; nice: string; cool: string }> = {
  sv: { warm: "Varmt", nice: "Skönt", cool: "Svalt" },
  en: { warm: "Warm", nice: "Pleasant", cool: "Cool" },
  de: { warm: "Warm", nice: "Angenehm", cool: "Kühl" },
  da: { warm: "Varmt", nice: "Behageligt", cool: "Køligt" },
};

export default function GuestAppUI({
  campground,
  places,
  announcements = [],
  partners = [],
  weather = null,
  distanceMap = {},
}: {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[];
  weather?: WeatherProp | null;
  distanceMap?: RoadDistanceMap;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("puls");
  const [lang, setLang] = useState<Lang>("sv");
  const [currentHour, setCurrentHour] = useState(12);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const brand = campground.primary_color || "#2A3C34";
  const heroImage =
    campground.hero_image_url ||
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80";

  const visiblePlaces = places.filter((p) => !p.is_hidden);
  const feel = weather
    ? weather.temp > 25
      ? feelLabels[lang].warm
      : weather.temp > 15
        ? feelLabels[lang].nice
        : feelLabels[lang].cool
    : "";

  useEffect(() => {
    setCurrentHour(new Date().getHours());
  }, []);

  const welcomeLabel: Record<Lang, string> = {
    sv:
      currentHour < 10
        ? "God morgon på"
        : currentHour < 17
          ? "Välkommen till"
          : "God kväll på",
    en:
      currentHour < 10
        ? "Good morning at"
        : currentHour < 17
          ? "Welcome to"
          : "Good evening at",
    de:
      currentHour < 10
        ? "Guten Morgen auf"
        : currentHour < 17
          ? "Willkommen auf"
          : "Guten Abend auf",
    da:
      currentHour < 10
        ? "God morgen på"
        : currentHour < 17
          ? "Velkommen till"
          : "God aften på",
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <PWAMeta brand={brand} />
      <div
        className="flex h-[100dvh] w-full flex-col bg-[#FDFCFB] font-sans antialiased text-stone-900"
        style={{ overflow: "hidden" }}
      >
        {/* Sticky Header */}
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

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-y-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <header
            className="relative overflow-hidden"
            style={{ minHeight: "240px" }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: brand }}
            />
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
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
              style={{
                paddingTop: "max(env(safe-area-inset-top, 14px), 14px)",
              }}
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
                  {welcomeLabel[lang]}
                </p>
                <h1 className="mt-1 truncate text-[clamp(20px,6vw,26px)] font-black leading-[1.06] tracking-tight text-white">
                  {campground.name}
                </h1>
                {weather && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-full bg-white/[0.08] px-3.5 py-2 ring-1 ring-white/[0.07] backdrop-blur-xl">
                    <span className="shrink-0 text-lg leading-none">
                      {weather.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black leading-none text-white">
                        {weather.temp}°
                        <span className="ml-0.5 text-[10px] font-semibold text-white/40">
                          C
                        </span>
                        <span className="mx-1.5 text-white/15">·</span>
                        <span className="text-[11px] font-bold text-white/65">
                          {feel}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/30">
                        {weatherLabels[weather.description]?.[lang] ??
                          weather.description}
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
                )}
              </div>
            </div>
          </header>

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
                  />
                )}
                {activeTab === "utforska" && (
                  <UtforskaTab
                    campground={campground}
                    places={visiblePlaces}
                    lang={lang}
                    distanceMap={distanceMap}
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
          </main>
        </div>

        <nav
          className="relative z-30 shrink-0 border-t border-stone-200/40 bg-white/95 backdrop-blur-2xl"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            boxShadow:
              "0 -1px 0 rgba(0,0,0,0.025), 0 -6px 20px rgba(0,0,0,0.04)",
          }}
        >
          <div className="px-3 pb-1.5 pt-1.5">
            <div className="flex items-end justify-around">
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
      </div>
    </>
  );
}

function PWAMeta({ brand }: { brand: string }) {
  useEffect(() => {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.setAttribute("name", "theme-color");
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute("content", brand);
    let metaCapable = document.querySelector(
      'meta[name="apple-mobile-web-app-capable"]',
    );
    if (!metaCapable) {
      metaCapable = document.createElement("meta");
      metaCapable.setAttribute("name", "apple-mobile-web-app-capable");
      metaCapable.setAttribute("content", "yes");
      document.head.appendChild(metaCapable);
    }
    let metaStatus = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (!metaStatus) {
      metaStatus = document.createElement("meta");
      metaStatus.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      metaStatus.setAttribute("content", "black-translucent");
      document.head.appendChild(metaStatus);
    }
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [brand]);
  return null;
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
      {(["sv", "en", "de", "da"] as Lang[]).map((l) => (
        <motion.button
          key={l}
          onClick={() => setLang(l)}
          className={`relative rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${lang === l ? "text-stone-900" : "text-white/35 hover:text-white/55"}`}
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
      className="relative flex flex-col items-center gap-0.5 py-1.5"
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
