// src/components/tabs/UtforskaTab.tsx
"use client";

import { ROW_DEFS } from "@/lib/explore-config";
import {
  calculateRelevanceScore,
  getFormattedDistance,
  getMapLink,
  getOpeningHoursDisplay,
} from "@/lib/place-utils";
import { type RoadDistanceMap } from "@/lib/routing";
import { utforskaLabels, type UtforskaLabels } from "@/lib/translations";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang } from "@/types/guest";
import { motion } from "framer-motion";
import {
  Compass,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Star,
} from "lucide-react";

interface Props {
  campground: Campground;
  places: CachedPlace[];
  lang: Lang;
  distanceMap: RoadDistanceMap;
  onDirectionsClick?: (placeId: string) => void;
  isSaved?: (id: string) => boolean;
  toggleSaved?: (id: string) => void;
}

interface CardProps {
  place: CachedPlace;
  emoji: string;
  lang: Lang;
  labels: UtforskaLabels;
  isSwedish: boolean;
  distance: string;
  onDirectionsClick?: (id: string) => void;
  saved: boolean;
  onToggleSave: () => void;
}

/** 3-tier distance fallback: OSRM → road_distance_km → haversine */
function resolveDistance(
  place: CachedPlace,
  distanceMap: RoadDistanceMap,
  campLat: number,
  campLon: number,
): string {
  const osrm = distanceMap[place.id];
  if (osrm) return osrm;
  if (place.road_distance_km != null) {
    const km = place.road_distance_km;
    return km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km % 1 === 0 ? km : km.toFixed(1)} km`;
  }
  return (
    getFormattedDistance(campLat, campLon, place.latitude, place.longitude) ??
    ""
  );
}

export default function UtforskaTab({
  campground,
  places,
  lang,
  distanceMap,
  onDirectionsClick,
  isSaved,
  toggleSaved,
}: Props) {
  const l = utforskaLabels[lang];
  const isSwedish = lang === "sv";
  const campLat = campground.latitude ?? 0;
  const campLon = campground.longitude ?? 0;

  const renderedRows = ROW_DEFS.map((row) => {
    const filtered = places
      .filter(row.filter)
      .sort(
        (a, b) =>
          calculateRelevanceScore(b, distanceMap, campLat, campLon) -
          calculateRelevanceScore(a, distanceMap, campLat, campLon),
      );
    if (filtered.length === 0) return null;

    return (
      <motion.section
        key={row.id}
        variants={{
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
        }}
      >
        <RowHeader
          emoji={row.emoji}
          title={row.title[lang]}
          subtitle={row.subtitle[lang]}
          count={filtered.length}
        />
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {filtered.map((place) => (
            <PlaceCardRouter
              key={place.id}
              place={place}
              emoji={row.emoji}
              lang={lang}
              labels={l}
              isSwedish={isSwedish}
              distance={resolveDistance(place, distanceMap, campLat, campLon)}
              onDirectionsClick={onDirectionsClick}
              saved={isSaved?.(place.id) ?? false}
              onToggleSave={() => toggleSaved?.(place.id)}
            />
          ))}
          <div className="w-2 shrink-0" />
        </div>
      </motion.section>
    );
  }).filter(Boolean);

  return (
    <motion.div
      className="space-y-5 pb-10"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      initial="initial"
      animate="animate"
    >
      {renderedRows.length > 0 ? (
        renderedRows
      ) : (
        <motion.div
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
          }}
        >
          <EmptyState title={l.noPlaces} subtitle={l.noPlacesSub} />
        </motion.div>
      )}
    </motion.div>
  );
}

function RowHeader({
  emoji,
  title,
  subtitle,
  count,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-3 px-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">
          {subtitle}
        </p>
        <h3 className="text-sm font-bold tracking-tight text-stone-900 leading-tight">
          {title}
        </h3>
      </div>
      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-500">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-12 text-center border border-stone-200/75 shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
        <Compass size={22} className="text-stone-400" />
      </div>
      <p className="text-base font-bold text-stone-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[220px] text-sm text-stone-500 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function PlaceCardRouter(props: CardProps) {
  const { place } = props;
  if (["beach", "park", "swimming"].includes(place.category))
    return <NatureCard {...props} />;
  if (["restaurant", "cafe"].includes(place.category))
    return <FoodCard {...props} />;
  return <ActivityCard {...props} />;
}

/* ══════════════════════════════════════════════════════════
   HOURS BLOCK — live Stockholm-tz calculation
   ══════════════════════════════════════════════════════════ */
function HoursBlock({
  place,
  labels,
}: {
  place: CachedPlace;
  labels: UtforskaLabels;
}) {
  if (place.custom_hours) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
        <span className="text-[12px] font-semibold text-stone-600">
          Info{" "}
          <span className="font-normal text-stone-400">
            {place.custom_hours}
          </span>
        </span>
      </div>
    );
  }
  const hours = getOpeningHoursDisplay(place.raw_data, labels);
  if (!hours) return null;

  const isOpen = hours.dotColor === "bg-emerald-500";
  const isClosedToday = hours.dotColor === "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${hours.dotColor}`} />
      <span
        className={`text-[12px] font-bold ${isOpen ? "text-emerald-700" : isClosedToday ? "text-red-500" : "text-stone-500"}`}
      >
        {hours.statusText}
      </span>
      {hours.text !== hours.statusText && (
        <span className="text-[11px] text-stone-400">{hours.text}</span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SAVE BUTTON
   ══════════════════════════════════════════════════════════ */
function SaveButton({
  saved,
  onToggleSave,
  light = false,
}: {
  saved: boolean;
  onToggleSave: () => void;
  light?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggleSave();
      }}
      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
        light
          ? "bg-black/25 backdrop-blur-sm hover:bg-black/40 border border-white/20"
          : "border border-stone-200 bg-white/90 hover:bg-white shadow-sm"
      }`}
    >
      <Heart
        size={14}
        fill={saved ? "#ef4444" : "none"}
        className={
          saved ? "text-red-500" : light ? "text-white" : "text-stone-400"
        }
      />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   CATEGORY CONFIG — each category gets a vivid, specific identity
   ══════════════════════════════════════════════════════════ */
interface CatCfg {
  emoji: string;
  // Rich gradient that evokes the actual experience
  gradient: string;
  // CTA button gradient
  ctaGradient: string;
  // Subtle body tint
  bodyTint: string;
}

const CAT: Record<string, CatCfg> = {
  // Nature — soft sky/teal washes
  beach: {
    emoji: "🏖️",
    gradient: "from-sky-200 via-cyan-100 to-teal-100",
    ctaGradient: "from-sky-400 to-teal-400",
    bodyTint: "bg-sky-50/60",
  },
  swimming: {
    emoji: "🏊",
    gradient: "from-blue-200 via-sky-100 to-cyan-100",
    ctaGradient: "from-blue-400 to-cyan-400",
    bodyTint: "bg-blue-50/60",
  },
  park: {
    emoji: "🌲",
    gradient: "from-emerald-200 via-green-100 to-teal-100",
    ctaGradient: "from-emerald-500 to-teal-400",
    bodyTint: "bg-emerald-50/60",
  },
  // Food — soft warm pastels
  restaurant: {
    emoji: "🍽️",
    gradient: "from-rose-200 via-pink-100 to-orange-100",
    ctaGradient: "from-rose-400 to-orange-400",
    bodyTint: "bg-rose-50/50",
  },
  cafe: {
    emoji: "☕",
    gradient: "from-amber-200 via-yellow-100 to-orange-100",
    ctaGradient: "from-amber-500 to-yellow-400",
    bodyTint: "bg-amber-50/50",
  },
  // Activities — soft pastel per type, still distinct
  bowling: {
    emoji: "🎳",
    gradient: "from-violet-200 via-purple-100 to-indigo-100",
    ctaGradient: "from-violet-500 to-indigo-500",
    bodyTint: "bg-violet-50/50",
  },
  cinema: {
    emoji: "🎬",
    gradient: "from-red-200 via-rose-100 to-pink-100",
    ctaGradient: "from-red-500 to-rose-400",
    bodyTint: "bg-red-50/50",
  },
  spa: {
    emoji: "🧖",
    gradient: "from-teal-200 via-cyan-100 to-sky-100",
    ctaGradient: "from-teal-400 to-sky-400",
    bodyTint: "bg-teal-50/50",
  },
  playground: {
    emoji: "🛝",
    gradient: "from-yellow-200 via-amber-100 to-orange-100",
    ctaGradient: "from-yellow-400 to-orange-400",
    bodyTint: "bg-yellow-50/50",
  },
  sports: {
    emoji: "⚽",
    gradient: "from-green-200 via-lime-100 to-emerald-100",
    ctaGradient: "from-green-500 to-emerald-400",
    bodyTint: "bg-green-50/50",
  },
  museum: {
    emoji: "🏛️",
    gradient: "from-purple-200 via-violet-100 to-indigo-100",
    ctaGradient: "from-purple-500 to-indigo-400",
    bodyTint: "bg-purple-50/50",
  },
  attraction: {
    emoji: "🎡",
    gradient: "from-fuchsia-200 via-pink-100 to-rose-100",
    ctaGradient: "from-fuchsia-400 to-pink-400",
    bodyTint: "bg-fuchsia-50/50",
  },
  shopping: {
    emoji: "🛍️",
    gradient: "from-pink-200 via-fuchsia-100 to-purple-100",
    ctaGradient: "from-pink-400 to-purple-400",
    bodyTint: "bg-pink-50/50",
  },
  activity: {
    emoji: "🎯",
    gradient: "from-orange-200 via-amber-100 to-yellow-100",
    ctaGradient: "from-orange-400 to-amber-400",
    bodyTint: "bg-orange-50/50",
  },
  other: {
    emoji: "📍",
    gradient: "from-stone-200 via-slate-100 to-gray-100",
    ctaGradient: "from-stone-500 to-slate-400",
    bodyTint: "bg-stone-50/50",
  },
};

function getCat(category: string): CatCfg {
  return CAT[category] ?? CAT.other;
}

/* ══════════════════════════════════════════════════════════
   SHARED CARD HEADER — vivid gradient + emoji texture + badges
   ══════════════════════════════════════════════════════════ */
function CardHeader({
  place,
  cfg,
  saved,
  onToggleSave,
  labels: l,
  showName = false,
}: {
  place: CachedPlace;
  cfg: CatCfg;
  saved: boolean;
  onToggleSave: () => void;
  labels: UtforskaLabels;
  showName?: boolean;
}) {
  return (
    <div
      className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden`}
      style={{ minHeight: showName ? 100 : 86 }}
    >
      {/* Large ghost emoji — creates texture & context */}
      <span className="absolute -right-3 -bottom-5 text-[90px] opacity-[0.15] select-none pointer-events-none leading-none rotate-6">
        {cfg.emoji}
      </span>
      {/* Second smaller echo for depth */}
      <span className="absolute left-2 top-1 text-[32px] opacity-[0.10] select-none pointer-events-none">
        {cfg.emoji}
      </span>

      {/* Top bar: badges + save */}
      <div className="relative flex items-start justify-between gap-2 px-4 pt-3.5">
        <div className="flex flex-col gap-1.5">
          {place.is_pinned && (
            <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80">
              <Star size={8} fill="currentColor" /> {l.staffPick}
            </span>
          )}
          {!place.is_on_site && (
            <span className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80">
              <Navigation size={9} className="opacity-80" />
              {/* distance is passed via the card — rendered in nature/activity headers */}
            </span>
          )}
        </div>
        <SaveButton saved={saved} onToggleSave={onToggleSave} />
      </div>

      {showName && (
        <div className="relative px-4 pb-4 pt-1">
          <h4 className="text-[15px] font-bold leading-snug text-stone-900">
            {place.name}
          </h4>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   VARIANT 1 — NATURE CARD
   Postcard: full vivid gradient header, distance on image,
   name below, hours, then CTA
   ══════════════════════════════════════════════════════════ */
function NatureCard({
  place,
  labels: l,
  distance,
  onDirectionsClick,
  saved,
  onToggleSave,
}: CardProps) {
  const { canNavigate, mapLink } = getMapLink(
    place.latitude,
    place.longitude,
    place.address,
  );
  const cfg = getCat(place.category);

  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      {/* Rich gradient header */}
      <div
        className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[96px]`}
      >
        <span className="absolute -right-2 -bottom-4 text-[90px] opacity-[0.15] select-none pointer-events-none leading-none rotate-6">
          {cfg.emoji}
        </span>
        <span className="absolute left-3 top-2 text-[28px] opacity-[0.12] select-none pointer-events-none">
          {cfg.emoji}
        </span>

        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            {place.is_pinned && (
              <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80">
                <Star size={8} fill="currentColor" /> {l.staffPick}
              </span>
            )}
            {/* Distance badge on the image */}
            {!place.is_on_site && distance && (
              <span className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80">
                <Navigation size={9} />
                {distance}
              </span>
            )}
            {place.is_on_site && (
              <span className="inline-flex items-center gap-1 bg-emerald-100/90 backdrop-blur-sm text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                📍 På området
              </span>
            )}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>

      {/* Body */}
      <div
        className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}
      >
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">
          {place.name}
        </h4>

        <HoursBlock place={place} labels={l} />

        {place.owner_note && (
          <p className="text-[12px] text-stone-500 italic leading-relaxed border-l-2 border-white pl-2.5">
            "{place.owner_note}"
          </p>
        )}

        {canNavigate && !place.is_on_site && (
          <div className="mt-auto pt-1">
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onDirectionsClick?.(place.id);
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}
            >
              <Navigation size={13} /> {l.hitaHit}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   VARIANT 2 — FOOD & DRINK CARD
   Each restaurant/cafe gets its OWN vivid gradient (rose for
   restaurants, amber for cafes). Rating is prominent. Warm body.
   ══════════════════════════════════════════════════════════ */
function FoodCard({
  place,
  labels: l,
  distance,
  onDirectionsClick,
  saved,
  onToggleSave,
}: CardProps) {
  const { canNavigate, mapLink } = getMapLink(
    place.latitude,
    place.longitude,
    place.address,
  );
  const cfg = getCat(place.category);

  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      {/* Vivid gradient header */}
      <div
        className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[80px]`}
      >
        <span className="absolute -right-2 -bottom-4 text-[80px] opacity-[0.15] select-none pointer-events-none leading-none">
          {cfg.emoji}
        </span>

        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            {/* Rating on the gradient */}
            {place.rating != null && (
              <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80">
                <Star size={9} fill="currentColor" /> {place.rating.toFixed(1)}
              </span>
            )}
            {place.is_pinned && (
              <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/80">
                <Star size={7} fill="currentColor" /> {l.staffPick}
              </span>
            )}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>

      {/* Body */}
      <div
        className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}
      >
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">
          {place.name}
        </h4>

        {/* Distance row — always shown for non-on-site */}
        {place.is_on_site ? (
          <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            📍 På området
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
            <Navigation size={9} className="text-stone-400" />
            {distance || "–"}
          </span>
        )}

        <HoursBlock place={place} labels={l} />

        {place.owner_note && (
          <p className="text-[12px] text-stone-500 italic leading-relaxed border-l-2 border-stone-200 pl-2.5">
            {place.owner_note}
          </p>
        )}

        {canNavigate && !place.is_on_site && (
          <div className="mt-auto pt-1">
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onDirectionsClick?.(place.id);
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}
            >
              <ExternalLink size={13} /> {l.hitaHit}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   VARIANT 3 — ACTIVITY CARD
   Each activity type gets its own vivid color — cinema = deep red,
   bowling = indigo, minigolf/sports = lime green, etc.
   Name lives on the gradient. Ticket-stub bottom edge.
   ══════════════════════════════════════════════════════════ */
function ActivityCard({
  place,
  labels: l,
  distance,
  onDirectionsClick,
  saved,
  onToggleSave,
}: CardProps) {
  const { canNavigate, mapLink } = getMapLink(
    place.latitude,
    place.longitude,
    place.address,
  );
  const cfg = getCat(place.category);

  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      {/* Vivid gradient header with name on it */}
      <div
        className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden px-4 pt-3.5 pb-8`}
      >
        <span className="absolute -right-2 top-0 text-[72px] opacity-[0.15] select-none pointer-events-none leading-none">
          {cfg.emoji}
        </span>

        <div className="relative flex items-start justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-600 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20">
            {cfg.emoji} Aktivitet
          </span>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>

        <h4 className="relative text-[15px] font-bold leading-snug text-stone-900 max-w-[200px]">
          {place.name}
        </h4>

        {/* Scalloped bottom — ticket stub effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 bg-white"
          style={{ borderRadius: "55% 55% 0 0 / 100% 100% 0 0" }}
        />
        <div className="absolute bottom-[-9px] left-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
        <div className="absolute bottom-[-9px] right-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
      </div>

      {/* Body */}
      <div
        className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}
      >
        {/* Distance row — always shown for non-on-site */}
        {place.is_on_site ? (
          <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            📍 På området
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
            <Navigation size={9} className="text-stone-400" />
            {distance || "–"}
          </span>
        )}

        <HoursBlock place={place} labels={l} />

        {place.owner_note && (
          <div className="rounded-xl bg-white/70 border border-white px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[12px] text-stone-600 leading-relaxed">
              <span className="font-bold text-stone-800">Tips: </span>
              {place.owner_note}
            </p>
          </div>
        )}

        {canNavigate && !place.is_on_site && (
          <div className="mt-auto pt-1">
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onDirectionsClick?.(place.id);
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}
            >
              <MapPin size={13} /> {l.hitaHit}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
