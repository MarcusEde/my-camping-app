'use client';

import React, { useState } from 'react';
import type { Campground, CachedPlace, Announcement, PromotedPartner } from '@/types/database';
import {
  Compass,
  Sparkles,
  Home,
  CalendarHeart,
  Info,
  Wind,
  Droplets,
} from 'lucide-react';

import PulsTab from './tabs/PulsTab';
import UtforskaTab from './tabs/UtforskaTab';
import PlanerarenTab from './tabs/PlanerarenTab';
import AktiviteterTab from './tabs/AktiviteterTab';
import InfoTab from './tabs/InfoTab';

export type Lang = 'sv' | 'en' | 'de' | 'da';
export type TabId = 'utforska' | 'planerare' | 'puls' | 'aktiviteter' | 'info';

export interface WeatherProp {
  temp: number;
  description: string;
  isRaining: boolean;
  icon: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const navLabels: Record<Lang, Record<TabId, string>> = {
  sv: { utforska: 'Utforska', planerare: 'Planerare', puls: 'Hem', aktiviteter: 'Aktiviteter', info: 'Info' },
  en: { utforska: 'Explore', planerare: 'Planner', puls: 'Home', aktiviteter: 'Activities', info: 'Info' },
  de: { utforska: 'Entdecken', planerare: 'Planer', puls: 'Start', aktiviteter: 'Aktivitäten', info: 'Info' },
  da: { utforska: 'Udforsk', planerare: 'Planlægger', puls: 'Hjem', aktiviteter: 'Aktiviteter', info: 'Info' },
};

const weatherLabels: Record<string, Record<Lang, string>> = {
  clear: { sv: 'Klart', en: 'Clear', de: 'Klar', da: 'Klart' },
  overcast: { sv: 'Mulet', en: 'Overcast', de: 'Bedeckt', da: 'Overskyet' },
  rain: { sv: 'Regn', en: 'Rain', de: 'Regen', da: 'Regn' },
  light_rain: { sv: 'Lätt regn', en: 'Light rain', de: 'Leichter Regen', da: 'Let regn' },
};

const feelLabels: Record<Lang, { warm: string; nice: string; cool: string }> = {
  sv: { warm: 'Varmt', nice: 'Skönt', cool: 'Svalt' },
  en: { warm: 'Warm', nice: 'Pleasant', cool: 'Cool' },
  de: { warm: 'Warm', nice: 'Angenehm', cool: 'Kühl' },
  da: { warm: 'Varmt', nice: 'Behageligt', cool: 'Køligt' },
};

export default function GuestAppUI({
  campground,
  places,
  announcements = [],
  partners = [],
  weather = null,
}: {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[];
  weather?: WeatherProp | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('puls');
  const [lang, setLang] = useState<Lang>('sv');
  const brand = campground.primary_color || '#2A3C34';

  const heroImage =
    (campground as any).hero_image ||
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80';
  const visiblePlaces = places.filter((p) => !p.is_hidden);

  const feel = weather
    ? weather.temp > 25
      ? feelLabels[lang].warm
      : weather.temp > 15
        ? feelLabels[lang].nice
        : feelLabels[lang].cool
    : '';
  const windText = weather ? (weather.isRaining ? 'Regn' : 'Lugnt') : '';

  // Time-of-day greeting
  const hour = new Date().getHours();
  const welcomeLabel: Record<Lang, string> = {
    sv: hour < 10 ? 'God morgon på' : hour < 17 ? 'Välkommen till' : 'God kväll på',
    en: hour < 10 ? 'Good morning at' : hour < 17 ? 'Welcome to' : 'Good evening at',
    de: hour < 10 ? 'Guten Morgen auf' : hour < 17 ? 'Willkommen auf' : 'Guten Abend auf',
    da: hour < 10 ? 'God morgen på' : hour < 17 ? 'Velkommen til' : 'God aften på',
  };

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans antialiased text-stone-900 shadow-2xl ring-1 ring-black/[0.04]">

      {/* ───────────── HERO ───────────── */}
      <header className="relative shrink-0">
        {/* Background image layer */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />

        {/* Brand tint — warm mix-blend for nature feel */}
        <div
          className="absolute inset-0 mix-blend-multiply opacity-30"
          style={{ backgroundColor: brand }}
        />

        {/* Warm cinematic gradient — amber undertone */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-amber-900/5 to-black/25" />

        {/* Content */}
        <div className="relative z-10 px-5 pb-5 pt-[max(env(safe-area-inset-top,12px),12px)]">

          {/* Top bar: language + logo */}
          <div className="flex items-center justify-between">
            <LangSwitcher lang={lang} setLang={setLang} />
            {campground.logo_url && (
              <img
                src={campground.logo_url}
                alt="Logo"
                className="max-h-7 max-w-[90px] object-contain brightness-0 invert drop-shadow-lg"
              />
            )}
          </div>

          {/* Welcome text — time-aware */}
          <div className="mt-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50">
              {welcomeLabel[lang]}
            </p>
            <h1 className="mt-0.5 truncate text-[22px] font-black leading-tight tracking-tight text-white drop-shadow-lg">
              {campground.name}
            </h1>
          </div>

          {/* Weather strip — glassmorphism with warm tint */}
          {weather && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-white/[0.1] bg-white/[0.07] px-3.5 py-2.5 backdrop-blur-xl">
              {/* Main weather icon */}
              <span className="shrink-0 text-xl leading-none drop-shadow-sm">
                {weather.icon}
              </span>

              {/* Temp + feel */}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black leading-none text-white">
                  {weather.temp}°
                  <span className="ml-0.5 text-[10px] font-semibold text-white/50">C</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  <span className="text-[12px] font-bold text-white/80">{feel}</span>
                </p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-white/35">
                  {weatherLabels[weather.description]?.[lang] || weather.description}
                </p>
              </div>

              {/* Wind / rain badge */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.1] px-2.5 py-1.5">
                {weather.isRaining ? (
                  <Droplets size={12} className="text-white/60" />
                ) : (
                  <Wind size={12} className="text-white/60" />
                )}
                <span className="text-[9px] font-bold text-white/70">{windText}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ───────────── CONTENT ───────────── */}
      <main className="flex-1 overflow-y-auto overscroll-contain bg-[#FDFCFB] px-4 pb-24 pt-5">
        {activeTab === 'puls' && (
          <PulsTab
            campground={campground}
            places={visiblePlaces}
            announcements={announcements}
            weather={weather}
            lang={lang}
          />
        )}
        {activeTab === 'utforska' && (
          <UtforskaTab campground={campground} places={visiblePlaces} lang={lang} />
        )}
        {activeTab === 'planerare' && (
          <PlanerarenTab
            campground={campground}
            places={visiblePlaces}
            weather={weather}
            lang={lang}
          />
        )}
        {activeTab === 'aktiviteter' && (
          <AktiviteterTab
            campground={campground}
            announcements={announcements}
            partners={partners}
            lang={lang}
          />
        )}
        {activeTab === 'info' && <InfoTab campground={campground} lang={lang} />}
      </main>

      {/* ───────────── BOTTOM NAV ───────────── */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2">
        {/* Warm gradient fade */}
        <div className="pointer-events-none h-6 bg-gradient-to-t from-[#FDFCFB] to-transparent" />

        <div className="border-t border-stone-200/50 bg-white/90 px-4 pb-[max(env(safe-area-inset-bottom,6px),6px)] pt-1 backdrop-blur-2xl">
          <div className="flex items-end justify-around">
            <NavBtn
              id="utforska"
              active={activeTab === 'utforska'}
              label={navLabels[lang].utforska}
              icon={<Compass size={20} />}
              brand={brand}
              onClick={setActiveTab}
            />
            <NavBtn
              id="planerare"
              active={activeTab === 'planerare'}
              label={navLabels[lang].planerare}
              icon={<Sparkles size={20} />}
              brand={brand}
              onClick={setActiveTab}
            />

            {/* Floating Home — campfire glow */}
            <div className="relative -top-3 flex flex-col items-center">
              <button
                onClick={() => setActiveTab('puls')}
                className="flex h-[48px] w-[48px] items-center justify-center rounded-full border-[3px] border-[#FDFCFB] text-white transition-transform duration-150 active:scale-90"
                style={{
                  background: `linear-gradient(145deg, ${brand}, ${hexToRgba(brand, 0.75)})`,
                  boxShadow: `0 4px 20px ${hexToRgba(brand, 0.35)}, 0 1px 4px rgba(0,0,0,0.1)`,
                }}
              >
                <Home size={21} strokeWidth={2.5} />
              </button>
              <span
                className="mt-0.5 text-[9px] font-bold transition-colors duration-200"
                style={{ color: activeTab === 'puls' ? brand : '#a8a29e' }}
              >
                {navLabels[lang].puls}
              </span>
            </div>

            <NavBtn
              id="aktiviteter"
              active={activeTab === 'aktiviteter'}
              label={navLabels[lang].aktiviteter}
              icon={<CalendarHeart size={20} />}
              brand={brand}
              onClick={setActiveTab}
            />
            <NavBtn
              id="info"
              active={activeTab === 'info'}
              label={navLabels[lang].info}
              icon={<Info size={20} />}
              brand={brand}
              onClick={setActiveTab}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex rounded-xl bg-black/20 p-0.5 backdrop-blur-xl">
      {(['sv', 'en', 'de', 'da'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-all active:scale-95 ${
            lang === l
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-white/40'
          }`}
        >
          {l}
        </button>
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
    <button
      onClick={() => onClick(id)}
      className="flex flex-col items-center gap-0.5 py-1 transition-all duration-150 active:scale-90"
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200"
        style={
          active
            ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
            : { color: '#a8a29e' }
        }
      >
        {icon}
      </div>
      <span
        className="text-[9px] font-bold transition-colors duration-200"
        style={{ color: active ? brand : '#a8a29e' }}
      >
        {label}
      </span>
    </button>
  );
}