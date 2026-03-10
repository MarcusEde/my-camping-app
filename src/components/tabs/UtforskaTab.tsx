// src/components/tabs/UtforskaTab.tsx
"use client";

import { getTodaysOpeningHours } from "@/lib/place-utils";
import { parseFormattedDistanceKm, type RoadDistanceMap } from "@/lib/routing";
import type { CachedPlace, Campground } from "@/types/database";
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
import type { Lang } from "../GuestAppUI";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_TAP },
};

// ─── Category visuals ───────────────────────────────────
//
// Uses raw hex colors in inline styles — no dynamic Tailwind
// class composition, so gradients render on every browser
// including Safari and iOS WebKit.

interface CategoryStyle {
  colors: [string, string, string]; // start, mid, end
  emoji: string;
  dotColor: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  beach: {
    colors: ["#bae6fd", "#a5f3fc", "#eff6ff"],
    emoji: "🏖️",
    dotColor: "#7dd3fc",
  },
  cafe: {
    colors: ["#fde68a", "#fed7aa", "#fefce8"],
    emoji: "☕",
    dotColor: "#fcd34d",
  },
  swimming: {
    colors: ["#bfdbfe", "#e0f2fe", "#ecfeff"],
    emoji: "🏊",
    dotColor: "#93c5fd",
  },
  spa: {
    colors: ["#ddd6fe", "#e9d5ff", "#fdf4ff"],
    emoji: "🧖",
    dotColor: "#c4b5fd",
  },
  restaurant: {
    colors: ["#fecdd3", "#fee2e2", "#fff7ed"],
    emoji: "🍽️",
    dotColor: "#fda4af",
  },
  park: {
    colors: ["#a7f3d0", "#bbf7d0", "#f7fee7"],
    emoji: "🌲",
    dotColor: "#6ee7b7",
  },
  museum: {
    colors: ["#cbd5e1", "#dbeafe", "#eef2ff"],
    emoji: "🏛️",
    dotColor: "#94a3b8",
  },
  bowling: {
    colors: ["#d8b4fe", "#ddd6fe", "#fdf4ff"],
    emoji: "🎳",
    dotColor: "#c084fc",
  },
  cinema: {
    colors: ["#a5b4fc", "#ddd6fe", "#faf5ff"],
    emoji: "🎬",
    dotColor: "#818cf8",
  },
  shopping: {
    colors: ["#99f6e4", "#a7f3d0", "#f0fdf4"],
    emoji: "🛍️",
    dotColor: "#5eead4",
  },
  other: {
    colors: ["#d6d3d1", "#e7e5e4", "#fafaf9"],
    emoji: "📍",
    dotColor: "#a8a29e",
  },
};

function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
}

/**
 * Gradient angle varies per card based on the place ID hash.
 * Prevents adjacent cards from looking identical.
 */
const GRADIENT_ANGLES = [135, 90, 45, 180];

function gradientAngle(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENT_ANGLES[hash % GRADIENT_ANGLES.length];
}

function buildGradientCSS(
  colors: [string, string, string],
  angle: number,
): string {
  return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
}

// ─── Row definitions ────────────────────────────────────

const ROW_DEFS = [
  {
    id: "bad-fika",
    emoji: "🍦",
    title: {
      sv: "Bad & Fika",
      en: "Swim & Cafe",
      de: "Baden & Café",
      da: "Bad & Café",
    },
    subtitle: {
      sv: "Stränder, glass & caféer",
      en: "Beaches, ice cream & cafes",
      de: "Strände, Eis & Cafés",
      da: "Strande, is & caféer",
    },
    filter: (p: CachedPlace) =>
      ["beach", "cafe", "swimming", "spa"].includes(p.category),
  },
  {
    id: "mat",
    emoji: "🍽️",
    title: {
      sv: "Mat & Dryck",
      en: "Food & Drink",
      de: "Essen & Trinken",
      da: "Mad & Drikke",
    },
    subtitle: {
      sv: "Restauranger i närområdet",
      en: "Nearby restaurants",
      de: "Restaurants in der Nähe",
      da: "Restauranter i nærheden",
    },
    filter: (p: CachedPlace) => p.category === "restaurant",
  },
  {
    id: "upplevelser",
    emoji: "🧭",
    title: {
      sv: "Se & Göra",
      en: "See & Do",
      de: "Sehen & Erleben",
      da: "Se & Gøre",
    },
    subtitle: {
      sv: "Utflykter, natur & nöje",
      en: "Excursions, nature & fun",
      de: "Ausflüge, Natur & Spaß",
      da: "Udflugter, natur & sjov",
    },
    filter: (p: CachedPlace) =>
      ["park", "museum", "bowling", "cinema", "other"].includes(p.category),
  },
  {
    id: "vardagsbehov",
    emoji: "🛒",
    title: {
      sv: "Vardagsbehov",
      en: "Essentials",
      de: "Bedarf",
      da: "Hverdagsbehov",
    },
    subtitle: {
      sv: "Mataffärer & service",
      en: "Groceries & services",
      de: "Lebensmittel & Service",
      da: "Supermarkeder & service",
    },
    filter: (p: CachedPlace) => p.category === "shopping",
  },
] as const;

/* ── Labels ──────────────────────────────────────────── */

interface Labels {
  hitaHit: string;
  originalLang: string;
  staffPick: string;
  closedToday: string;
  openNow: string;
  closedNow: string;
  open24: string;
  noPlaces: string;
  noPlacesSub: string;
  onSite: string;
}

const labels: Record<Lang, Labels> = {
  sv: {
    hitaHit: "Visa vägen",
    originalLang: "🇸🇪 Originaltext",
    staffPick: "Rekommenderas",
    closedToday: "Stängt idag",
    openNow: "Öppet nu",
    closedNow: "Stängt nu",
    open24: "Dygnet runt",
    noPlaces: "Inga platser ännu",
    noPlacesSub: "Vi jobbar på att lägga till platser i närheten!",
    onSite: "På området",
  },
  en: {
    hitaHit: "Get directions",
    originalLang: "🇸🇪 Original text",
    staffPick: "Staff pick",
    closedToday: "Closed today",
    openNow: "Open now",
    closedNow: "Closed now",
    open24: "Open 24/7",
    noPlaces: "No places yet",
    noPlacesSub: "We're working on adding nearby spots!",
    onSite: "On site",
  },
  de: {
    hitaHit: "Route anzeigen",
    originalLang: "🇸🇪 Originaltext",
    staffPick: "Empfehlung",
    closedToday: "Heute geschlossen",
    openNow: "Jetzt geöffnet",
    closedNow: "Jetzt geschlossen",
    open24: "24/7 geöffnet",
    noPlaces: "Noch keine Orte",
    noPlacesSub: "Wir arbeiten daran, Orte hinzuzufügen!",
    onSite: "Auf dem Platz",
  },
  da: {
    hitaHit: "Find vej",
    originalLang: "🇸🇪 Originaltekst",
    staffPick: "Anbefaling",
    closedToday: "Lukket i dag",
    openNow: "Åben nu",
    closedNow: "Lukket nu",
    open24: "Døgnåbent",
    noPlaces: "Ingen steder endnu",
    noPlacesSub: "Vi arbejder på at tilføje steder!",
    onSite: "På pladsen",
  },
};

/* ── Component ───────────────────────────────────────── */

interface Props {
  campground: Campground;
  places: CachedPlace[];
  lang: Lang;
  distanceMap: RoadDistanceMap;
}

export default function UtforskaTab({
  campground,
  places,
  lang,
  distanceMap,
}: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const l = labels[lang];
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
      <motion.section key={row.id} variants={staggerItem}>
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-base ring-1 ring-stone-200/60">
            {row.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-black leading-none tracking-tight text-stone-800">
              {row.title[lang]}
            </h3>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
              {row.subtitle[lang]}
            </p>
          </div>
          <span className="rounded-full bg-stone-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
            {filtered.length}
          </span>
        </div>

        <div
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"
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
              campground={campground}
              brand={brand}
              lang={lang}
              labels={l}
              isSwedish={isSwedish}
              distance={distanceMap[place.id] ?? ""}
            />
          ))}
        </div>
      </motion.section>
    );
  }).filter(Boolean);

  return (
    <motion.div
      className="space-y-8 pb-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {renderedRows.length > 0 ? (
        renderedRows
      ) : (
        <motion.div variants={staggerItem}>
          <EmptyState title={l.noPlaces} subtitle={l.noPlacesSub} />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Place Card ──────────────────────────────────────── */

function PlaceCard({
  place,
  campground,
  brand,
  lang,
  labels: l,
  isSwedish,
  distance,
}: {
  place: CachedPlace;
  campground: Campground;
  brand: string;
  lang: Lang;
  labels: Labels;
  isSwedish: boolean;
  distance: string;
}) {
  const catStyle = getCategoryStyle(place.category);
  const angle = gradientAngle(place.id);
  const hoursData = getTodaysOpeningHours(place.raw_data);

  let hoursDisplay: {
    text: string;
    dotColor: string;
    statusText: string;
  } | null = null;

  if (hoursData) {
    const hoursLower = hoursData.text.toLowerCase();
    const isClosed =
      hoursLower.includes("stängt") || hoursLower.includes("closed");
    const is24h = hoursLower.includes("dygnet") || hoursLower.includes("24");

    if (isClosed) {
      hoursDisplay = {
        text: l.closedToday,
        dotColor: "bg-red-400",
        statusText: l.closedToday,
      };
    } else if (is24h) {
      hoursDisplay = {
        text: l.open24,
        dotColor: "bg-emerald-500",
        statusText: l.open24,
      };
    } else if (hoursData.isOpenNow) {
      hoursDisplay = {
        text: hoursData.text,
        dotColor: "bg-emerald-500",
        statusText: l.openNow,
      };
    } else {
      hoursDisplay = {
        text: hoursData.text,
        dotColor: "bg-stone-300",
        statusText: l.closedNow,
      };
    }
  }

  // Navigation logic (unchanged)
  const hasCoordinates = Boolean(place.latitude && place.longitude);
  const hasAddress = Boolean(place.address);
  const canNavigate = hasCoordinates || hasAddress;

  let mapLink = "";
  if (hasCoordinates) {
    mapLink = `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
  } else if (hasAddress) {
    mapLink = `https://maps.google.com/?q=${encodeURIComponent(place.address!)}`;
  }

  return (
    <motion.div
      className="flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-stone-200/60"
      whileTap={{ scale: 0.97 }}
      transition={SPRING_TAP}
    >
      {/* ── Gradient header ────────────────────────── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: "112px",
          background: buildGradientCSS(catStyle.colors, angle),
        }}
      >
        {/* Decorative background emoji — large, top-right */}
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

        {/* Decorative background emoji — medium, bottom-left */}
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

        {/* Bottom fade for smooth transition to white body */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "24px",
            background:
              "linear-gradient(to top, rgba(255,255,255,0.3), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Main emoji */}
        <span className="relative" style={{ fontSize: "36px", zIndex: 1 }}>
          {catStyle.emoji}
        </span>

        {/* Pinned / Staff pick badge */}
        {place.is_pinned && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-white"
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              backgroundColor: hexToRgba(brand, 0.75),
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 2,
            }}
          >
            <Star size={9} fill="currentColor" />
            {l.staffPick}
          </span>
        )}

        {/* Rating badge */}
        {place.rating != null && (
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
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* ── Card body ──────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        <h4 className="line-clamp-1 text-[14px] font-black leading-tight tracking-tight text-stone-800">
          {place.name}
        </h4>

        {/* Meta pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {place.is_on_site ? (
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

        {/* Owner note */}
        {place.owner_note && (
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
                    {l.originalLang}
                  </span>
                )}
                <p className="line-clamp-2 text-[11px] font-medium italic leading-relaxed text-stone-500">
                  &ldquo;{place.owner_note}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
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
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} strokeWidth={2.5} />
              {l.hitaHit}
            </motion.a>
          ) : place.is_on_site ? (
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
      </div>
    </motion.div>
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
