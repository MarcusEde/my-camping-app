// src/components/tabs/UtforskaTab.tsx
"use client";

import {
  buildGradientCSS,
  getCategoryStyle,
  gradientAngle,
} from "@/lib/category-styles";
import { SPRING_TAP, STAGGER_CONTAINER, STAGGER_ITEM } from "@/lib/constants";
import { ROW_DEFS } from "@/lib/explore-config";
import { getMapLink, getOpeningHoursDisplay } from "@/lib/place-utils";
import { parseFormattedDistanceKm, type RoadDistanceMap } from "@/lib/routing";
import { utforskaLabels, type UtforskaLabels } from "@/lib/translations";
import { hexToRgba } from "@/lib/utils";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang } from "@/types/guest";
import { motion } from "framer-motion";
import {
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  MessageCircle,
  Star,
} from "lucide-react";
import React from "react";

interface Props {
  campground: Campground;
  places: CachedPlace[];
  lang: Lang;
  distanceMap: RoadDistanceMap;
  onDirectionsClick?: (placeId: string) => void;
}

export default function UtforskaTab({
  campground,
  places,
  lang,
  distanceMap,
  onDirectionsClick,
}: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const l = utforskaLabels[lang];
  const isSwedish = lang === "sv";

  const renderedRows = ROW_DEFS.map((row) => {
    const filtered = places.filter(row.filter).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const kmA = parseFormattedDistanceKm(distanceMap[a.id] ?? "") ?? 999;
      const kmB = parseFormattedDistanceKm(distanceMap[b.id] ?? "") ?? 999;
      return kmA - kmB;
    });

    if (filtered.length === 0) return null;

    return (
      <motion.section key={row.id} variants={STAGGER_ITEM}>
        <RowHeader
          emoji={row.emoji}
          title={row.title[lang]}
          subtitle={row.subtitle[lang]}
          count={filtered.length}
        />
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              brand={brand}
              lang={lang}
              labels={l}
              isSwedish={isSwedish}
              distance={distanceMap[place.id] ?? ""}
              onDirectionsClick={onDirectionsClick}
            />
          ))}
        </div>
      </motion.section>
    );
  }).filter(Boolean);

  return (
    <motion.div
      className="space-y-8 pb-10"
      variants={STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
    >
      {renderedRows.length > 0 ? (
        renderedRows
      ) : (
        <motion.div variants={STAGGER_ITEM}>
          <EmptyState title={l.noPlaces} subtitle={l.noPlacesSub} />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Row Header ──────────────────────────────────────── */

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
    <div className="mb-3 flex items-center gap-2.5 px-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-base ring-1 ring-stone-200/60">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-black leading-none tracking-tight text-stone-800">
          {title}
        </h3>
        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
          {subtitle}
        </p>
      </div>
      <span className="rounded-full bg-stone-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
        {count}
      </span>
    </div>
  );
}

/* ── Place Card ──────────────────────────────────────── */

function PlaceCard({
  place,
  brand,
  lang,
  labels: l,
  isSwedish,
  distance,
  onDirectionsClick,
}: {
  place: CachedPlace;
  brand: string;
  lang: Lang;
  labels: UtforskaLabels;
  isSwedish: boolean;
  distance: string;
  onDirectionsClick?: (placeId: string) => void;
}) {
  const catStyle = getCategoryStyle(place.category);
  const angle = gradientAngle(place.id);
  const hoursDisplay = getOpeningHoursDisplay(place.raw_data, l);
  const { canNavigate, mapLink } = getMapLink(
    place.latitude,
    place.longitude,
    place.address,
  );

  return (
    <motion.div
      className="flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] bg-white"
      style={{
        boxShadow: place.is_pinned
          ? `0 0 0 2px ${hexToRgba("#f59e0b", 0.4)}, 0 4px 16px ${hexToRgba("#f59e0b", 0.12)}`
          : undefined,
        border: place.is_pinned ? "none" : "1px solid rgba(214,211,209,0.6)",
      }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_TAP}
    >
      {/* ── Gradient header ─────────────────────── */}
      <CardGradientHeader
        catStyle={catStyle}
        angle={angle}
        isPinned={place.is_pinned}
        rating={place.rating}
        staffPickLabel={l.staffPick}
      />

      {/* ── Card body ───────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        <h4 className="line-clamp-1 text-[14px] font-black leading-tight tracking-tight text-stone-800">
          {place.name}
        </h4>

        <MetaPills
          isOnSite={place.is_on_site}
          distance={distance}
          hoursDisplay={hoursDisplay}
          labels={l}
        />

        {place.owner_note && (
          <OwnerNote
            note={place.owner_note}
            brand={brand}
            isSwedish={isSwedish}
            originalLangLabel={l.originalLang}
          />
        )}

        <CardAction
          canNavigate={canNavigate}
          mapLink={mapLink}
          isOnSite={place.is_on_site}
          brand={brand}
          placeId={place.id}
          labels={l}
          onDirectionsClick={onDirectionsClick}
        />
      </div>
    </motion.div>
  );
}

/* ── Card Gradient Header ────────────────────────────── */

function CardGradientHeader({
  catStyle,
  angle,
  isPinned,
  rating,
  staffPickLabel,
}: {
  catStyle: ReturnType<typeof getCategoryStyle>;
  angle: number;
  isPinned: boolean;
  rating: number | null;
  staffPickLabel: string;
}) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        height: "112px",
        background: buildGradientCSS(catStyle.colors, angle),
      }}
    >
      <span
        className="absolute select-none leading-none"
        style={{
          fontSize: "72px",
          right: "-12px",
          top: "-12px",
          opacity: 0.06,
          transform: "rotate(15deg)",
          pointerEvents: "none",
        }}
      >
        {catStyle.emoji}
      </span>
      <span
        className="absolute select-none leading-none"
        style={{
          fontSize: "48px",
          left: "-12px",
          bottom: "-8px",
          opacity: 0.05,
          transform: "rotate(-12deg)",
          pointerEvents: "none",
        }}
      >
        {catStyle.emoji}
      </span>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "24px",
          background:
            "linear-gradient(to top, rgba(255,255,255,0.3), transparent)",
          pointerEvents: "none",
        }}
      />
      <span className="relative" style={{ fontSize: "36px", zIndex: 1 }}>
        {catStyle.emoji}
      </span>

      {isPinned && (
        <div
          className="absolute inset-x-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))",
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
          }}
        >
          <Star size={10} fill="white" className="text-white" />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "white",
            }}
          >
            {staffPickLabel}
          </span>
        </div>
      )}

      {rating != null && (
        <span
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full ring-1 ring-stone-200/60"
          style={{
            fontSize: "10px",
            fontWeight: 900,
            color: "#292524",
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "2px 8px",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 2,
          }}
        >
          <Star size={9} fill="#F59E0B" className="text-amber-500" />
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* ── Meta Pills ──────────────────────────────────────── */

function MetaPills({
  isOnSite,
  distance,
  hoursDisplay,
  labels: l,
}: {
  isOnSite: boolean;
  distance: string;
  hoursDisplay: ReturnType<typeof getOpeningHoursDisplay>;
  labels: UtforskaLabels;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {isOnSite ? (
        <MetaPill>
          <MapPin size={9} className="text-emerald-500" />
          {l.onSite}
        </MetaPill>
      ) : distance ? (
        <MetaPill>
          <MapPin size={9} className="text-stone-400" />
          {distance}
        </MetaPill>
      ) : null}

      {hoursDisplay && (
        <>
          <MetaPill>
            <span
              className={`shrink-0 rounded-full ${hoursDisplay.dotColor}`}
              style={{ width: "6px", height: "6px" }}
            />
            {hoursDisplay.statusText}
          </MetaPill>
          {hoursDisplay.statusText !== l.closedToday &&
            hoursDisplay.statusText !== l.open24 && (
              <MetaPill>
                <Clock size={9} className="text-stone-400" />
                {hoursDisplay.text}
              </MetaPill>
            )}
        </>
      )}
    </div>
  );
}

/* ── Meta Pill ───────────────────────────────────────── */

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 ring-1 ring-stone-200/60">
      {children}
    </span>
  );
}

/* ── Owner Note ──────────────────────────────────────── */

function OwnerNote({
  note,
  brand,
  isSwedish,
  originalLangLabel,
}: {
  note: string;
  brand: string;
  isSwedish: boolean;
  originalLangLabel: string;
}) {
  return (
    <div
      className="mt-3 rounded-[14px] px-3 py-2.5"
      style={{ backgroundColor: hexToRgba(brand, 0.03) }}
    >
      <div className="flex items-start gap-2">
        <MessageCircle
          size={12}
          strokeWidth={2}
          className="mt-0.5 shrink-0"
          style={{ color: hexToRgba(brand, 0.25) }}
        />
        <div className="min-w-0">
          {!isSwedish && (
            <span className="mb-0.5 block text-[8px] font-black uppercase tracking-[0.2em] text-stone-300">
              {originalLangLabel}
            </span>
          )}
          <p className="line-clamp-2 text-[11px] font-medium italic leading-relaxed text-stone-500">
            &ldquo;{note}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Card Action ─────────────────────────────────────── */

function CardAction({
  canNavigate,
  mapLink,
  isOnSite,
  brand,
  placeId,
  labels: l,
  onDirectionsClick,
}: {
  canNavigate: boolean;
  mapLink: string;
  isOnSite: boolean;
  brand: string;
  placeId: string;
  labels: UtforskaLabels;
  onDirectionsClick?: (placeId: string) => void;
}) {
  return (
    <div className="mt-auto pt-4">
      {canNavigate ? (
        <motion.a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white"
          style={{
            backgroundColor: brand,
            boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
          }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING_TAP}
          onClick={(e) => {
            e.stopPropagation();
            onDirectionsClick?.(placeId);
          }}
        >
          <ExternalLink size={13} strokeWidth={2.5} />
          {l.hitaHit}
        </motion.a>
      ) : isOnSite ? (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.1em]"
          style={{
            backgroundColor: hexToRgba(brand, 0.08),
            color: brand,
          }}
        >
          <MapPin size={13} strokeWidth={2.5} />
          {l.onSite}
        </div>
      ) : null}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────── */

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[32px] bg-white px-6 py-10 text-center ring-1 ring-stone-200/60">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
        <Compass size={22} strokeWidth={1.5} className="text-stone-300" />
      </div>
      <p className="text-[14px] font-black tracking-tight text-stone-700">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-stone-400">
        {subtitle}
      </p>
    </div>
  );
}
