// src/components/GuestAppUI.tsx
// IA redesign v2.0 — ia-spec visual overhaul
"use client";

import { useGuestApp } from "@/lib/hooks/useGuestApp";
import { applyPWAMeta } from "@/lib/pwa";
import type { RoadDistanceMap } from "@/lib/routing";
import { getSettingsField } from "@/lib/settings-i18n";
import { navLabels } from "@/lib/translations";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
  PromotedPartner,
} from "@/types/database";
import type { Lang, TabId, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, Heart, Home } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import GuestFeedbackWidget from "./GuestFeedbackWidget";
import ExploreTab from "./tabs/ExploreTab";
import HereTab from "./tabs/HereTab";
import SavedTab from "./tabs/SavedTab";
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
    visiblePlaces,
    sessionId,
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

  const themeVars = {
    "--brand": brand,
    "--brand-10": `${brand}1A`,
    "--brand-20": `${brand}33`,
  } as React.CSSProperties;

  return (
    <>
      <PWAMeta brand={brand} />
      <div
        className="flex h-[100dvh] w-full flex-col bg-[var(--surface)] font-sans antialiased text-stone-900 selection:bg-[var(--brand-20)]"
        style={{ overflow: "hidden", ...themeVars }}
      >
        {/* Always-visible compact header — 44px, complements the hero */}
        <StickyHeader
          brand={brand}
          campground={campground}
          weather={weather ?? null}
          lang={lang}
          setLang={setLang}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-y-none"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {/* Simplified hero — brand identity only (160-200px) */}
          <HeroSection heroImage={heroImage} campground={campground} />

          <main className="min-h-[80dvh] px-4 pb-28 pt-6 max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {activeTab === "here" && (
                  <HereTab
                    campground={campground}
                    places={visiblePlaces}
                    announcements={announcements}
                    weather={weather}
                    lang={lang}
                    distanceMap={distanceMap}
                    internalLocations={internalLocations}
                    onDirectionsClick={handleDirectionsClick}
                    checkoutText={getSettingsField(campground, "check_out_info", lang) || ""}
                    trashText={getSettingsField(campground, "trash_rules", lang) || ""}
                    campRulesText={getSettingsField(campground, "camp_rules", lang) || ""}
                    emergencyInfo={getSettingsField(campground, "emergency_info", lang) || ""}
                    receptionHours={getSettingsField(campground, "reception_hours", lang) || ""}
                  />
                )}
                {activeTab === "explore" && (
                  <ExploreTab
                    campground={campground}
                    places={visiblePlaces}
                    announcements={announcements}
                    partners={partners}
                    weather={weather}
                    lang={lang}
                    distanceMap={distanceMap}
                    onDirectionsClick={handleDirectionsClick}
                    isSaved={isSaved}
                    toggleSaved={toggleSaved}
                  />
                )}
                {activeTab === "saved" && (
                  <SavedTab
                    savedIds={savedIds}
                    places={visiblePlaces}
                    distanceMap={distanceMap}
                    removeSaved={removeSaved}
                    onDirectionsClick={handleDirectionsClick}
                    lang={lang}
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

/* ── PWA meta ────────────────────────────────────────────────────────── */
function PWAMeta({ brand }: { brand: string }) {
  useEffect(() => applyPWAMeta(brand), [brand]);
  return null;
}

/* ── Always-visible sticky header with temp chip + gear → lang picker ── */
function StickyHeader({
  brand: _brand,
  campground,
  weather,
  lang,
  setLang,
}: {
  brand: string;
  campground: Campground;
  weather: WeatherProp | null;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const supportedLangs = (campground.supported_languages?.length ?? 0) > 0
    ? (campground.supported_languages as Lang[])
    : (["sv", "en", "de", "da", "nl", "no"] as Lang[]);

  const flags: Record<Lang, string> = {
    sv: "🇸🇪",
    en: "🇬🇧",
    de: "🇩🇪",
    da: "🇩🇰",
    nl: "🇳🇱",
    no: "🇳🇴",
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="relative z-30 shrink-0 border-b border-stone-200/50"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur-xl shadow-sm h-11">
        {/* Left: logo + camp name */}
        <div className="flex min-w-0 items-center gap-2.5">
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

        {/* Right: Lang Picker + Weather */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Explicit language indicator pill */}
          {supportedLangs.length > 1 && (
            <div ref={menuRef} className="relative mt-0.5">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1.5 hover:bg-stone-200 transition-colors"
                aria-label="Change Language"
              >
                <span className="text-[13px] leading-none">{flags[lang]}</span>
                <span className="text-[11px] font-bold text-stone-600 leading-none">{lang.toUpperCase()}</span>
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-50 flex flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200/60 py-1 min-w-[80px]"
                  >
                    {supportedLangs.map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangOpen(false); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${lang === l
                          ? "bg-[var(--brand-10)] text-[var(--brand)]"
                          : "text-stone-600 hover:bg-stone-50"
                          }`}
                      >
                        <span className="text-[14px] leading-none">{flags[l]}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{l}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Weather Chip */}
          {weather && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-100 mt-0.5">
              <span className="text-sm leading-none">{weather.icon}</span>
              <span className="text-[11px] font-bold text-stone-700 leading-none">{weather.temp}°</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Simplified hero — brand identity only (160–200 px, spec C1) ──────── */
function HeroSection({
  heroImage,
  campground,
}: {
  heroImage: string;
  campground: Campground;
}) {
  return (
    <header
      className="relative w-full overflow-hidden"
      style={{ minHeight: "160px", maxHeight: "200px", height: "22vw" }}
    >
      <div className="absolute inset-0 bg-stone-900" />
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-85"
        style={{ objectPosition: campground.hero_image_position || "center" }}
      />
      {/* Subtle bottom vignette for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/20 to-transparent" />

      {/* Camp name — brand identity anchor */}
      <div className="relative z-10 flex items-end h-full px-5 pb-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {campground.logo_url && (
            <img
              src={campground.logo_url}
              alt=""
              className="h-8 max-w-[80px] object-contain drop-shadow-md brightness-0 invert opacity-90"
            />
          )}
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
            {campground.name}
          </h1>
        </div>
      </div>
    </header>
  );
}

/* ── 3-tab bottom nav — here / explore / saved ───────────────────────── */
function BottomNav({
  activeTab,
  lang,
  switchTab,
}: {
  activeTab: TabId;
  lang: Lang;
  switchTab: (id: TabId) => void;
}) {
  const tabs: { id: TabId; icon: React.ElementType; label: string }[] = [
    { id: "here", icon: Home, label: navLabels[lang].here },
    { id: "explore", icon: Compass, label: navLabels[lang].explore },
    { id: "saved", icon: Heart, label: navLabels[lang].saved },
  ];

  return (
    <nav
      className="relative z-30 shrink-0 border-t border-stone-200 bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="px-2 py-2 max-w-lg mx-auto">
        <div className="flex justify-around items-center">
          {tabs.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className="relative flex flex-1 flex-col items-center gap-1 py-1.5 px-2 transition-transform active:scale-95 outline-none"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-[var(--brand)]" : "text-stone-400"}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors ${active ? "text-[var(--brand)]" : "text-stone-500"
                    }`}
                >
                  {label}
                </span>
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--brand)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
