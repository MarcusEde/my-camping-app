'use client';

import React from 'react';
import type { Campground, CachedPlace } from '@/types/database';
import type { Lang } from '../GuestAppUI';
import { MapPin, Star, ExternalLink, MessageCircle, Compass } from 'lucide-react';
import { getTodaysOpeningHours, getFormattedDistance } from '@/lib/place-utils';
import { calculateDistanceKm } from '@/lib/distance';

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

const CATEGORY_IMAGES: Record<string, string> = {
  beach:      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
  cafe:       'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80',
  swimming:   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=500&q=80',
  park:       'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&q=80',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80',
  shopping:   'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&q=80',
  bowling:    'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=500&q=80',
  museum:     'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=500&q=80',
  cinema:     'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
  spa:        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&q=80',
  other:      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&q=80',
};

const CATEGORY_EMOJI: Record<string, string> = {
  beach: '🏖️', cafe: '☕', restaurant: '🍽️', park: '🌲',
  shopping: '🛒', bowling: '🎳', museum: '🏛️', swimming: '🏊',
  cinema: '🎬', spa: '💆', other: '📍',
};

const ROW_DEFS = [
  {
    id: 'bad-fika',
    emoji: '🍦',
    trailEmoji: '🌊',
    title: { sv: 'Bad & Fika', en: 'Swim & Cafe', de: 'Baden & Café', da: 'Bad & Café' },
    subtitle: { sv: 'Stränder, glass & caféer', en: 'Beaches, ice cream & cafes', de: 'Strände, Eis & Cafés', da: 'Strande, is & caféer' },
    filter: (p: CachedPlace) => ['beach', 'cafe', 'swimming', 'spa'].includes(p.category),
  },
  {
    id: 'mat',
    emoji: '🍽️',
    trailEmoji: '🌿',
    title: { sv: 'Mat & Dryck', en: 'Food & Drink', de: 'Essen & Trinken', da: 'Mad & Drikke' },
    subtitle: { sv: 'Restauranger i närområdet', en: 'Nearby restaurants', de: 'Restaurants in der Nähe', da: 'Restauranter i nærheden' },
    filter: (p: CachedPlace) => p.category === 'restaurant',
  },
  {
    id: 'upplevelser',
    emoji: '🧭',
    trailEmoji: '🌲',
    title: { sv: 'Se & Göra', en: 'See & Do', de: 'Sehen & Erleben', da: 'Se & Gøre' },
    subtitle: { sv: 'Utflykter, natur & nöje', en: 'Excursions, nature & fun', de: 'Ausflüge, Natur & Spaß', da: 'Udflugter, natur & sjov' },
    filter: (p: CachedPlace) => ['park', 'museum', 'bowling', 'cinema', 'other'].includes(p.category),
  },
  {
    id: 'vardagsbehov',
    emoji: '🛒',
    trailEmoji: '🏡',
    title: { sv: 'Vardagsbehov', en: 'Essentials', de: 'Bedarf', da: 'Hverdagsbehov' },
    subtitle: { sv: 'Mataffärer & service', en: 'Groceries & services', de: 'Lebensmittel & Service', da: 'Supermarkeder & service' },
    filter: (p: CachedPlace) => p.category === 'shopping',
  },
];

const labels: Record<Lang, {
  hitaHit: string; originalLang: string; staffPick: string;
  closedToday: string; noPlaces: string; noPlacesSub: string;
}> = {
  sv: {
    hitaHit: 'Visa vägen', originalLang: '🇸🇪 Originaltext', staffPick: 'Rekommenderas',
    closedToday: 'Stängt idag', noPlaces: 'Inga platser ännu',
    noPlacesSub: 'Vi jobbar på att lägga till platser i närheten!',
  },
  en: {
    hitaHit: 'Get directions', originalLang: '🇸🇪 Original text', staffPick: "Staff pick",
    closedToday: 'Closed today', noPlaces: 'No places yet',
    noPlacesSub: 'We\'re working on adding nearby spots!',
  },
  de: {
    hitaHit: 'Route anzeigen', originalLang: '🇸🇪 Originaltext', staffPick: 'Empfehlung',
    closedToday: 'Heute geschlossen', noPlaces: 'Noch keine Orte',
    noPlacesSub: 'Wir arbeiten daran, Orte hinzuzufügen!',
  },
  da: {
    hitaHit: 'Find vej', originalLang: '🇸🇪 Originaltekst', staffPick: 'Anbefaling',
    closedToday: 'Lukket i dag', noPlaces: 'Ingen steder endnu',
    noPlacesSub: 'Vi arbejder på at tilføje steder!',
  },
};

interface Props {
  campground: Campground;
  places: CachedPlace[];
  lang: Lang;
}

export default function UtforskaTab({ campground, places, lang }: Props) {
  const brand = campground.primary_color || '#2A3C34';
  const l = labels[lang];
  const isSwedish = lang === 'sv';

  const renderedRows = ROW_DEFS.map((row) => {
    const filtered = places
      .filter(row.filter)
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const distA = (a.latitude && a.longitude)
          ? calculateDistanceKm(campground.latitude, campground.longitude, a.latitude, a.longitude)
          : 999;
        const distB = (b.latitude && b.longitude)
          ? calculateDistanceKm(campground.latitude, campground.longitude, b.latitude, b.longitude)
          : 999;
        return distA - distB;
      });

    if (filtered.length === 0) return null;

    return (
      <section key={row.id}>
        <div className="mb-4 flex items-center gap-3 px-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl shadow-sm"
            style={{ backgroundColor: 'white' }}
          >
            {row.emoji}
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-black tracking-tight text-stone-800 leading-none">
              {row.title[lang]}
            </h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              {row.subtitle[lang]}
            </p>
          </div>
          <span className="text-xl opacity-20">{row.trailEmoji}</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              campground={campground}
              brand={brand}
              lang={lang}
              labels={l}
              isSwedish={isSwedish}
            />
          ))}
        </div>
      </section>
    );
  }).filter(Boolean);

  return (
    <div className="space-y-12 pb-10">
      {renderedRows.length > 0 ? (
        renderedRows
      ) : (
        <div className="rounded-[32px] bg-white p-12 text-center shadow-sm ring-1 ring-stone-100">
          <span className="mb-4 block text-5xl">🌲</span>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-300">
            <Compass size={32} strokeWidth={1.5} />
          </div>
          <p className="text-[16px] font-black tracking-tight text-stone-800">{l.noPlaces}</p>
          <p className="mx-auto mt-2 max-w-[200px] text-[12px] font-medium leading-relaxed text-stone-400">
            {l.noPlacesSub}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════ */

function PlaceCard({
  place,
  campground,
  brand,
  labels: l,
  isSwedish,
}: {
  place: CachedPlace;
  campground: Campground;
  brand: string;
  lang: Lang;
  labels: typeof labels['sv'];
  isSwedish: boolean;
}) {
  const imgUrl = CATEGORY_IMAGES[place.category] || CATEGORY_IMAGES.other;
  const distanceStr = getFormattedDistance(
    campground.latitude, campground.longitude,
    place.latitude, place.longitude
  );
  const hoursData = getTodaysOpeningHours(place.raw_data);
  const isClosed = hoursData ? !hoursData.isOpenNow : false;

  const mapLink = place.latitude && place.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`;

  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-stone-100">

      {/* ── Image Section ── */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={imgUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 active:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Staff pick badge */}
        {place.is_pinned && (
          <span
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg"
            style={{ backgroundColor: hexToRgba(brand, 0.8) }}
          >
            <Star size={10} fill="currentColor" /> {l.staffPick}
          </span>
        )}

        {/* Rating badge */}
        {place.rating && (
          <span className="absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-stone-800 backdrop-blur-md shadow-sm">
            <Star size={10} fill="#F59E0B" className="text-amber-500" />
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* ── Content Section ── */}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="text-[16px] font-black leading-tight tracking-tight text-stone-800 line-clamp-1">
          {place.name}
        </h4>

        {/* Metadata Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {distanceStr && (
            <MetaPill>
              <MapPin size={10} className="text-stone-400" />
              {distanceStr}
            </MetaPill>
          )}
          {hoursData && (
            <MetaPill>
              <span className={`h-2 w-2 rounded-full ${isClosed ? 'bg-red-400' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`} />
              {hoursData.text === 'Stängt' ? l.closedToday : hoursData.text}
            </MetaPill>
          )}
        </div>

        {/* Owner note in a soft tinted box */}
        {place.owner_note && (
          <div
            className="mt-4 rounded-[20px] px-4 py-3"
            style={{ backgroundColor: hexToRgba(brand, 0.04) }}
          >
            <div className="flex items-start gap-2">
              <MessageCircle
                size={14}
                className="mt-0.5 shrink-0"
                strokeWidth={2.5}
                style={{ color: hexToRgba(brand, 0.3) }}
              />
              <div className="min-w-0">
                {!isSwedish && (
                  <span
                    className="mb-1 block text-[8px] font-bold uppercase tracking-widest"
                    style={{ color: hexToRgba(brand, 0.3) }}
                  >
                    {l.originalLang}
                  </span>
                )}
                <p
                  className="text-[11px] font-medium leading-relaxed italic text-stone-600 line-clamp-2"
                >
                  ”{place.owner_note}”
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-5">
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[12px] font-black text-white transition-all active:scale-95"
            style={{
              backgroundColor: brand,
              boxShadow: `0 8px 16px ${hexToRgba(brand, 0.2)}`,
            }}
          >
            <ExternalLink size={14} strokeWidth={2.5} />
            {l.hitaHit}
          </a>
        </div>
      </div>
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
      {children}
    </span>
  );
}