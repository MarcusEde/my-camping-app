'use client';

import React, { useMemo } from 'react';
import type { Campground, CachedPlace, Announcement } from '@/types/database';
import type { Lang, WeatherProp } from '../GuestAppUI';
import {
  Umbrella,
  Sun,
  ExternalLink,
  Phone,
  MapPin,
  Megaphone,
  Compass,
  CalendarHeart,
} from 'lucide-react';
import { getTodaysOpeningHours, getFormattedDistance } from '@/lib/place-utils';

/* ═══════════════════════════════════════════════════════
   Utility
   ═══════════════════════════════════════════════════════ */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  beach: '🏖️', cafe: '☕', restaurant: '🍽️', park: '🌲',
  shopping: '🛒', bowling: '🎳', museum: '🏛️', swimming: '🏊',
  cinema: '🎬', spa: '💆', other: '📍',
};

const t: Record<Lang, {
  notices: string; noNotices: string; noNoticesSub: string;
  adviceSun: string; adviceRain: string; showWay: string;
  callReception: string; callSub: string; findReception: string;
  findSub: string; originalLang: string; closedToday: string;
  rainTip: string; sunTip: string; nearbyPlaces: string;
  happeningNow: string; contact: string;
}> = {
  sv: {
    notices: 'Senaste nytt', noNotices: 'Inga anslag just nu',
    noNoticesSub: 'Njut av lugnet — vi meddelar om något händer!',
    adviceSun: 'Perfekt väder! Besök', adviceRain: 'Mysväder ute? Testa',
    showWay: 'Visa vägen', callReception: 'Ring receptionen',
    callSub: 'Vi hjälper dig gärna', findReception: 'Hitta hit',
    findSub: 'Vägbeskrivning', originalLang: '🇸🇪 Originaltext',
    closedToday: 'Stängt idag', rainTip: '☔ Inomhustips',
    sunTip: '☀️ Dagens tips', nearbyPlaces: 'Upptäck i närheten',
    happeningNow: 'På campingen just nu', contact: 'Behöver du hjälp?',
  },
  en: {
    notices: 'Latest news', noNotices: 'No notices right now',
    noNoticesSub: 'Enjoy the peace — we\'ll let you know if something\'s up!',
    adviceSun: 'Perfect weather! Visit', adviceRain: 'Cozy weather? Try',
    showWay: 'Get directions', callReception: 'Call reception',
    callSub: 'Happy to help', findReception: 'Find us',
    findSub: 'Directions', originalLang: '🇸🇪 Original text',
    closedToday: 'Closed today', rainTip: '☔ Indoor tip',
    sunTip: '☀️ Today\'s tip', nearbyPlaces: 'Discover nearby',
    happeningNow: 'At camp right now', contact: 'Need help?',
  },
  de: {
    notices: 'Neuigkeiten', noNotices: 'Keine Hinweise aktuell',
    noNoticesSub: 'Genießen Sie die Ruhe — wir melden uns!',
    adviceSun: 'Perfektes Wetter! Besuchen Sie', adviceRain: 'Gemütlich draußen? Probieren Sie',
    showWay: 'Route anzeigen', callReception: 'Rezeption anrufen',
    callSub: 'Wir helfen gerne', findReception: 'So finden Sie uns',
    findSub: 'Wegbeschreibung', originalLang: '🇸🇪 Originaltext',
    closedToday: 'Heute geschlossen', rainTip: '☔ Indoor-Tipp',
    sunTip: '☀️ Tipp des Tages', nearbyPlaces: 'Entdecken Sie die Umgebung',
    happeningNow: 'Gerade am Campingplatz', contact: 'Brauchen Sie Hilfe?',
  },
  da: {
    notices: 'Seneste nyt', noNotices: 'Ingen opslag lige nu',
    noNoticesSub: 'Nyd roen — vi giver besked!',
    adviceSun: 'Perfekt vejr! Besøg', adviceRain: 'Hyggevejr? Prøv',
    showWay: 'Find vej', callReception: 'Ring til receptionen',
    callSub: 'Vi hjälper gerne', findReception: 'Find os',
    findSub: 'Vejbeskrivelse', originalLang: '🇸🇪 Originaltekst',
    closedToday: 'Lukket i dag', rainTip: '☔ Indendørs tip',
    sunTip: '☀️ Dagens tip', nearbyPlaces: 'Opdag i nærheden',
    happeningNow: 'På campingpladsen nu', contact: 'Brug for hjælp?',
  },
};

interface Props {
  campground: Campground;
  places: CachedPlace[];
  announcements: Announcement[];
  weather?: WeatherProp | null;
  lang: Lang;
}

export default function PulsTab({ campground, places, announcements, weather, lang }: Props) {
  const l = t[lang];
  const brand = campground.primary_color || '#2A3C34';
  const isSwedish = lang === 'sv';

  const pinnedPlaces = useMemo(() => {
    return places.filter((p) => !p.is_hidden && p.is_pinned).slice(0, 6);
  }, [places]);

  const advisedPlace = useMemo(() => {
    if (weather?.isRaining) {
      return pinnedPlaces.find((p) => p.is_indoor || p.category === 'cafe') || pinnedPlaces[0] || null;
    }
    return pinnedPlaces.find((p) => p.category === 'beach') || pinnedPlaces[0] || null;
  }, [pinnedPlaces, weather]);

  const adviceMapLink = advisedPlace?.latitude && advisedPlace?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${advisedPlace.latitude},${advisedPlace.longitude}`
      : null;

  const liveNotices = useMemo(() => {
    return [...announcements]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
  }, [announcements]);

  const receptionMapLink = `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`;

  return (
    <div className="space-y-10 pb-10">

      {/* ═══════════════════ AI SUGGESTION ═══════════════════ */}
      {advisedPlace && (
        <section className="overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: hexToRgba(brand, 0.1), color: brand }}
              >
                {weather?.isRaining ? <Umbrella size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
              </div>
              <span 
                className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
                style={{ backgroundColor: hexToRgba(brand, 0.08), color: brand }}
              >
                {weather?.isRaining ? l.rainTip : l.sunTip}
              </span>
            </div>
            
            <MetaPill>
              <MapPin size={10} className="text-stone-400" />
              {getFormattedDistance(campground.latitude, campground.longitude, advisedPlace.latitude, advisedPlace.longitude)}
            </MetaPill>
          </div>

          <h2 className="text-[20px] font-black leading-tight tracking-tight text-stone-800">
            {weather?.isRaining ? l.adviceRain : l.adviceSun}{' '}
            <span style={{ color: brand }}>
              {CATEGORY_EMOJI[advisedPlace.category] || '📍'} {advisedPlace.name}
            </span>
          </h2>

          {advisedPlace.owner_note && (
            <div 
              className="mt-5 rounded-[24px] px-5 py-4"
              style={{ backgroundColor: hexToRgba(brand, 0.04) }}
            >
              {!isSwedish && (
                <span className="mb-1 block text-[8px] font-bold uppercase tracking-widest text-stone-400">
                  {l.originalLang}
                </span>
              )}
              <p className="text-[13px] font-medium italic leading-relaxed text-stone-600/90">
                ”{advisedPlace.owner_note}”
              </p>
            </div>
          )}

          {adviceMapLink && (
            <a
              href={adviceMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[13px] font-black text-white transition-all duration-200 active:scale-95"
              style={{ 
                backgroundColor: brand,
                boxShadow: `0 8px 20px ${hexToRgba(brand, 0.25)}` 
              }}
            >
              <ExternalLink size={16} strokeWidth={2.5} />
              {l.showWay}
            </a>
          )}
        </section>
      )}

      {/* ═══════════════════ NEARBY PLACES ═══════════════════ */}
      {pinnedPlaces.length > 0 && (
        <section>
          <SectionHeader icon={<Compass size={14} />} text={l.nearbyPlaces} emoji="🌲" brand={brand} />
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {pinnedPlaces.map((place) => (
              <PlaceChip key={place.id} place={place} campground={campground} brand={brand} />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════ HAPPENING NOW ═══════════════════ */}
      <section>
        {liveNotices.length > 0 ? (
          <>
            <SectionHeader icon={<CalendarHeart size={14} />} text={l.happeningNow} emoji="🏕️" brand={brand} pulse />
            <div className="space-y-4">
              {liveNotices.map((ann) => (
                <NoticeCard key={ann.id} announcement={ann} isSwedish={isSwedish} originalLabel={l.originalLang} />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionHeader icon={<Megaphone size={14} />} text={l.notices} emoji="📋" brand={brand} />
            <EmptyState emoji="⛺" title={l.noNotices} subtitle={l.noNoticesSub} />
          </>
        )}
      </section>

      {/* ═══════════════════ CONTACT ═══════════════════ */}
      <section>
        <SectionHeader icon={<Phone size={14} />} text={l.contact} emoji="🤙" brand={brand} />
        <div className="grid grid-cols-2 gap-4">
          <ContactCard 
            icon={<Phone size={22} strokeWidth={2.5} />} 
            label={l.callReception} 
            subtitle={l.callSub} 
            brand={brand} 
            href={`tel:${(campground as any).phone || ''}`} 
          />
          <ContactCard 
            icon={<MapPin size={22} strokeWidth={2.5} />} 
            label={l.findReception} 
            subtitle={l.findSub} 
            brand={brand} 
            href={receptionMapLink} 
            external 
          />
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════ */

function SectionHeader({ icon, text, emoji, brand, pulse }: { icon: React.ReactNode, text: string, emoji: string, brand: string, pulse?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3 px-1">
      <div 
        className="flex h-7 w-7 items-center justify-center rounded-xl"
        style={{ backgroundColor: hexToRgba(brand, 0.1), color: brand }}
      >
        {icon}
      </div>
      <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-stone-400">
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
        )}
        {text}
      </h3>
      <span className="text-base">{emoji}</span>
    </div>
  );
}

function PlaceChip({ place, campground, brand }: { place: CachedPlace, campground: Campground, brand: string }) {
  const mapLink = place.latitude && place.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
      : '#';
  const hoursData = getTodaysOpeningHours(place.raw_data);

  return (
    <a
      href={mapLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-[160px] shrink-0 flex-col rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-stone-100 transition-all active:scale-95"
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{CATEGORY_EMOJI[place.category] || '📍'}</span>
        {hoursData && (
          <span className={`h-2.5 w-2.5 rounded-full ${hoursData.isOpenNow ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-stone-300'}`} />
        )}
      </div>
      <p className="mt-4 text-[14px] font-black leading-tight tracking-tight text-stone-800 line-clamp-2">
        {place.name}
      </p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {getFormattedDistance(campground.latitude, campground.longitude, place.latitude, place.longitude)}
      </p>
    </a>
  );
}

function NoticeCard({ announcement, isSwedish, originalLabel }: { announcement: Announcement, isSwedish: boolean, originalLabel: string }) {
  const configs: Record<string, { emoji: string; bg: string; color: string }> = {
    event:   { emoji: '🎉', bg: 'rgba(180, 120, 60, 0.08)', color: '#B4783C' },
    warning: { emoji: '⚠️', bg: 'rgba(239, 68, 68, 0.08)', color: '#EF4444' },
    info:    { emoji: '📢', bg: 'rgba(120, 100, 80, 0.06)', color: '#786450' },
  };
  const cfg = configs[announcement.type] || configs.info;

  return (
    <div className="flex items-start gap-4 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: cfg.bg }}>
        <span className="text-2xl">{cfg.emoji}</span>
      </div>
      <div className="flex-1">
        <h4 className="text-[15px] font-black tracking-tight text-stone-800">{announcement.title}</h4>
        <p className="mt-1 text-[13px] font-medium leading-relaxed text-stone-500 line-clamp-3">{announcement.content}</p>
        {!isSwedish && (
          <span className="mt-3 inline-block rounded-full bg-stone-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-stone-400">
            {originalLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function ContactCard({ icon, label, subtitle, brand, href, external }: { icon: React.ReactNode, label: string, subtitle: string, brand: string, href: string, external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex flex-col items-start gap-4 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-stone-100 transition-all active:scale-95"
    >
      <div 
        className="flex h-12 w-12 items-center justify-center rounded-2xl transition-colors"
        style={{ backgroundColor: hexToRgba(brand, 0.1), color: brand }}
      >
        {icon}
      </div>
      <div>
        <span className="block text-[13px] font-black tracking-tight text-stone-800">{label}</span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-stone-400">{subtitle}</span>
      </div>
    </a>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
      {children}
    </span>
  );
}

function EmptyState({ emoji, title, subtitle }: { emoji: string, title: string, subtitle: string }) {
  return (
    <div className="rounded-[32px] bg-white p-10 text-center shadow-sm ring-1 ring-stone-100">
      <span className="mb-4 block text-5xl">{emoji}</span>
      <p className="text-[15px] font-black tracking-tight text-stone-800">{title}</p>
      <p className="mx-auto mt-2 max-w-[200px] text-[12px] font-medium leading-relaxed text-stone-400">{subtitle}</p>
    </div>
  );
}