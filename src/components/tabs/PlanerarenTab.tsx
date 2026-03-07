'use client';

import React, { useState, useEffect } from 'react';
import type { Campground, CachedPlace } from '@/types/database';
import type { Lang, WeatherProp } from '../GuestAppUI';
import { MapPin, ExternalLink, CloudRain, Clock, Sparkles } from 'lucide-react';
import { getAiPlan } from '@/app/camp/[slug]/ai-action';
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

const t: Record<Lang, {
  subtitle: string; morning: string; lunch: string; afternoon: string;
  evening: string; rainNote: string; directions: string;
  originalLang: string; closedToday: string; dayOver: string;
  dayOverSub: string; restOfDay: string;
}> = {
  sv: {
    subtitle: 'Din personliga dagsplan — baserad på väder & plats',
    morning: 'Förmiddag', lunch: 'Lunch', afternoon: 'Eftermiddag', evening: 'Kväll',
    rainNote: 'Mysväder ute! Tipsen är anpassade för en skön dag inomhus.',
    directions: 'Visa vägen', originalLang: '🇸🇪 Originaltext', closedToday: 'Stängt idag',
    dayOver: 'Dags att ladda om!', dayOverSub: 'Tänd en brasa, njut av kvällen. Morgondagen har nya äventyr.',
    restOfDay: 'Resten av din dag',
  },
  en: {
    subtitle: 'Your personal day plan — based on weather & location',
    morning: 'Morning', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'Evening',
    rainNote: 'Cozy weather outside! Tips adapted for a great indoor day.',
    directions: 'Directions', originalLang: '🇸🇪 Original text', closedToday: 'Closed today',
    dayOver: 'Time to recharge!', dayOverSub: 'Light a fire, enjoy the evening. Tomorrow awaits.',
    restOfDay: 'Rest of your day',
  },
  de: {
    subtitle: 'Ihr persönlicher Tagesplan — basierend auf Wetter & Standort',
    morning: 'Vormittag', lunch: 'Mittagessen', afternoon: 'Nachmittag', evening: 'Abend',
    rainNote: 'Gemütliches Wetter! Tipps für einen tollen Tag drinnen.',
    directions: 'Route', originalLang: '🇸🇪 Originaltext', closedToday: 'Heute geschlossen',
    dayOver: 'Zeit zum Aufladen!', dayOverSub: 'Feuer anzünden, Abend genießen. Morgen wartet Neues.',
    restOfDay: 'Rest des Tages',
  },
  da: {
    subtitle: 'Din personlige dagsplan — baseret på vejr & placering',
    morning: 'Morgen', lunch: 'Frokost', afternoon: 'Eftermiddag', evening: 'Aften',
    rainNote: 'Hyggevejr! Tips tilpasset til en god dag indendørs.',
    directions: 'Vej', originalLang: '🇸🇪 Original tekst', closedToday: 'Lukket i dag',
    dayOver: 'Tid til at lade op!', dayOverSub: 'Tænd et bål, nyd aftenen. I morgen venter nyt.',
    restOfDay: 'Resten af din dag',
  },
};

const PERIOD_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  morning:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  lunch:     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  afternoon: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  evening:   { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-400' },
};

function isPastPeriod(period: string, currentHour: number) {
  if (period === 'morning' && currentHour >= 12) return true;
  if (period === 'lunch' && currentHour >= 15) return true;
  if (period === 'afternoon' && currentHour >= 18) return true;
  if (period === 'evening' && currentHour >= 23) return true;
  return false;
}

interface Props {
  campground: Campground;
  places: CachedPlace[];
  weather?: WeatherProp | null;
  lang: Lang;
}

export default function PlanerarenTab({ campground, places, weather, lang }: Props) {
  const brand = campground.primary_color || '#2A3C34';
  const l = t[lang];
  const isRaining = weather?.isRaining ?? false;
  const isSwedish = lang === 'sv';

  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [currentHour, setCurrentHour] = useState(0);

  useEffect(() => {
    setCurrentHour(new Date().getHours());
    const fetchPlan = async () => {
      setLoading(true);
      try {
        const supportedLangs = ['sv', 'en', 'de'] as const;
        const planLang = supportedLangs.includes(lang as any) ? (lang as 'sv' | 'en' | 'de') : 'en';
        const data = await getAiPlan(campground, weather, places, planLang);
        setItinerary(data || []);
      } catch (error) {
        setItinerary([
          { time: '09:00', period: 'morning', emoji: '☕', title: 'Frukost & Planering', description: 'Börja dagen med en kaffe och kika på Utforska-fliken!' },
          { time: '13:00', period: 'lunch', emoji: '🍽️', title: 'Lunchdags', description: 'Hitta en trevlig restaurang i närheten.' },
          { time: '18:00', period: 'evening', emoji: '🔥', title: 'Kvällsmys', description: 'Dags att varva ner vid campingen.' },
        ]);
      }
      setLoading(false);
    };
    fetchPlan();
  }, [campground, weather, places, lang]);

  const getMapLink = (placeId?: string) => {
    if (!placeId) return null;
    const p = places.find((x) => x.id === placeId);
    return (p?.latitude && p?.longitude) ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}` : null;
  };

  const futureItinerary = itinerary.filter((item) => !isPastPeriod(item.period, currentHour));
  const hiddenCount = itinerary.length - futureItinerary.length;

  return (
    <div className="space-y-8 pb-10">
      {/* ═══ Header ═══ */}
      <div className="px-1 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
          {l.subtitle}
        </p>
        {!loading && <Sparkles size={14} className="text-amber-400 animate-pulse" />}
      </div>

      {/* ═══ Rain banner ═══ */}
      {isRaining && (
        <div className="flex items-center gap-4 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-stone-100 border-l-4 border-sky-400">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
            <CloudRain size={24} strokeWidth={2.5} className="text-sky-400" />
          </div>
          <p className="text-[13px] font-bold leading-relaxed text-stone-600">
            {l.rainNote}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-100">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-stone-100" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 rounded-full bg-stone-100" />
                  <div className="h-4 w-full rounded-full bg-stone-50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {hiddenCount > 0 && futureItinerary.length > 0 && (
            <div className="flex justify-center">
              <span className="rounded-full bg-stone-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400">
                🌤️ {l.restOfDay}
              </span>
            </div>
          )}

          {futureItinerary.length === 0 && itinerary.length > 0 ? (
            <div className="rounded-[32px] bg-white p-12 text-center shadow-sm ring-1 ring-stone-100">
              <span className="mb-4 block text-6xl">🔥</span>
              <h3 className="text-[18px] font-black tracking-tight text-stone-800">{l.dayOver}</h3>
              <p className="mx-auto mt-2 max-w-[220px] text-[13px] font-medium leading-relaxed text-stone-400">
                {l.dayOverSub}
              </p>
            </div>
          ) : (
            <div className="relative pl-2">
              {/* Vertical Path Line */}
              <div 
                className="absolute left-[27px] top-6 bottom-6 w-[2px] opacity-20" 
                style={{ 
                  backgroundImage: `linear-gradient(to bottom, ${brand} 50%, transparent 50%)`,
                  backgroundSize: '2px 8px' 
                }} 
              />

              <div className="space-y-8">
                {futureItinerary.map((item, idx) => {
                  const mapLink = getMapLink(item.placeId);
                  const style = PERIOD_STYLE[item.period] || PERIOD_STYLE.morning;
                  const matchedPlace = item.placeId ? places.find((x) => x.id === item.placeId) : null;

                  return (
                    <div key={idx} className="relative flex gap-5">
                      {/* Trail Node Emoji Badge */}
                      <div 
                        className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white shadow-md ring-1 ring-stone-100 text-2xl"
                      >
                        {item.emoji}
                        <div className={`absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white ${style.dot}`} />
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-100 transition-all active:scale-[0.98]">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-stone-800">
                              <Clock size={12} strokeWidth={3} />
                              <span className="text-[14px] font-black tabular-nums tracking-tight">
                                {item.time}
                              </span>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.bg} ${style.text}`}>
                              {l[item.period as keyof typeof l] || item.period}
                            </span>
                          </div>

                          {matchedPlace && (
                            <PlaceMeta place={matchedPlace} campground={campground} closedLabel={l.closedToday} />
                          )}
                        </div>

                        <h4 className="text-[16px] font-black leading-tight tracking-tight text-stone-800">
                          {item.title}
                        </h4>

                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-stone-500/90">
                          {item.description}
                        </p>

                        {matchedPlace?.owner_note && !isSwedish && (
                          <div 
                            className="mt-4 rounded-[20px] px-4 py-3"
                            style={{ backgroundColor: hexToRgba(brand, 0.04) }}
                          >
                            <span className="mb-1 block text-[8px] font-bold uppercase tracking-widest text-stone-400">
                              {l.originalLang}
                            </span>
                            <p className="text-[11px] font-medium italic leading-relaxed text-stone-600/80">
                              ”{matchedPlace.owner_note}”
                            </p>
                          </div>
                        )}

                        {mapLink && (
                          <a
                            href={mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black transition-all active:scale-95"
                            style={{ 
                              backgroundColor: hexToRgba(brand, 0.08), 
                              color: brand 
                            }}
                          >
                            <MapPin size={14} strokeWidth={2.5} />
                            {l.directions}
                            <ExternalLink size={10} className="opacity-40" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlaceMeta({ place, campground, closedLabel }: { place: CachedPlace; campground: Campground; closedLabel: string }) {
  const dist = getFormattedDistance(campground.latitude, campground.longitude, place.latitude, place.longitude);
  const hoursData = getTodaysOpeningHours(place.raw_data);
  const isClosed = hoursData ? !hoursData.isOpenNow : false;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {dist && (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
          {dist}
        </span>
      )}
      {hoursData && (
        <div className={`h-2 w-2 rounded-full ${isClosed ? 'bg-red-400' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]'}`} />
      )}
    </div>
  );
}