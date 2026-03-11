// src/components/tabs/PlanerarenTab.tsx
"use client";

import {
  PERIOD_STYLES,
  SPRING_TAP,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
} from "@/lib/constants";
import type { EnrichedItem } from "@/lib/hooks/usePlanner";
import { usePlanner } from "@/lib/hooks/usePlanner";
import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { RoadDistanceMap } from "@/lib/routing";
import {
  getDateLabel,
  getDayLabel,
  noPlanLabels,
  plannerLabels,
  type PlannerLabels,
} from "@/lib/translations";
import { hexToRgba } from "@/lib/utils";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CloudRain,
  ExternalLink,
  MapPin,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";

interface Props {
  campground: Campground;
  places: CachedPlace[];
  weather?: WeatherProp | null;
  lang: Lang;
  distanceMap: RoadDistanceMap;
}

export default function PlanerarenTab({
  campground,
  places,
  weather,
  lang,
  distanceMap,
}: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const l = plannerLabels[lang];
  const rain = weather?.isRaining ?? false;

  const { loading, items, enriched, hasPast, nowIdx, getMapUrl } = usePlanner({
    campground,
    places,
    weather,
    lang,
    distanceMap,
  });

  const periodName = (p: string) =>
    ({
      morning: l.morning,
      lunch: l.lunch,
      afternoon: l.afternoon,
      evening: l.evening,
    })[p] ?? p;

  return (
    <motion.div
      className="space-y-5 pb-12"
      variants={STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
    >
      <PlannerHeader
        brand={brand}
        weather={weather}
        rain={rain}
        lang={lang}
        labels={l}
      />

      <AnimatePresence>
        {rain && <RainBanner note={l.rainNote} />}
      </AnimatePresence>

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <Timeline
          enriched={enriched}
          hasPast={hasPast}
          nowIdx={nowIdx}
          places={places}
          brand={brand}
          lang={lang}
          labels={l}
          distanceMap={distanceMap}
          periodName={periodName}
          getMapUrl={getMapUrl}
        />
      )}
    </motion.div>
  );
}

/* ── Planner Header ──────────────────────────────────── */

function PlannerHeader({
  brand,
  weather,
  rain,
  lang,
  labels: l,
}: {
  brand: string;
  weather?: WeatherProp | null;
  rain: boolean;
  lang: Lang;
  labels: PlannerLabels;
}) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="overflow-hidden rounded-[24px] bg-white ring-1 ring-stone-200/60"
    >
      <div
        className="px-5 py-4"
        style={{
          background: `linear-gradient(135deg,${hexToRgba(brand, 0.05)},${hexToRgba(brand, 0.01)})`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: hexToRgba(brand, 0.08) }}
            >
              <Sparkles size={15} style={{ color: brand }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Calendar size={10} className="text-stone-300" />
                <span className="text-[11px] font-bold text-stone-500">
                  {getDayLabel(lang)} {getDateLabel(lang)}
                </span>
              </div>
              <p className="mt-0.5 text-[9px] font-medium text-stone-300">
                {l.subtitle}
              </p>
            </div>
          </div>
          {weather && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-stone-100">
              {rain ? (
                <CloudRain size={13} className="text-sky-400" />
              ) : (
                <Sun size={13} className="text-amber-400" />
              )}
              <span className="text-[12px] font-bold tabular-nums text-stone-600">
                {Math.round(weather.temp)}°
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-stone-100 px-5 py-2">
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300">
          ✨ {l.aiNote}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Rain Banner ─────────────────────────────────────── */

function RainBanner({ note }: { note: string }) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 rounded-[18px] border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/50 p-3.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-sky-100">
        <CloudRain size={18} className="text-sky-400" />
      </div>
      <p className="text-[11px] font-medium leading-relaxed text-sky-700/80">
        {note}
      </p>
    </motion.div>
  );
}

/* ── Loading Skeleton ────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          variants={STAGGER_ITEM}
          className="animate-pulse rounded-[20px] bg-white p-4 ring-1 ring-stone-200/60"
        >
          <div className="flex gap-3">
            <div className="h-12 w-12 shrink-0 rounded-[14px] bg-stone-100" />
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-2">
                <div className="h-3 w-12 rounded-full bg-stone-100" />
                <div className="h-3 w-16 rounded-full bg-stone-50" />
              </div>
              <div className="h-4 w-3/5 rounded-full bg-stone-100" />
              <div className="h-3 w-full rounded-full bg-stone-50" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────── */

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <motion.div variants={STAGGER_ITEM}>
      <div className="rounded-[28px] bg-gradient-to-b from-white to-stone-50/50 px-6 py-12 text-center ring-1 ring-stone-200/60">
        <span className="text-3xl">⛺</span>
        <h3 className="mt-3 text-[15px] font-black text-stone-700">
          {noPlanLabels[lang]}
        </h3>
      </div>
    </motion.div>
  );
}

/* ── Timeline ────────────────────────────────────────── */

function Timeline({
  enriched,
  hasPast,
  nowIdx,
  places,
  brand,
  lang,
  labels: l,
  distanceMap,
  periodName,
  getMapUrl,
}: {
  enriched: EnrichedItem[];
  hasPast: boolean;
  nowIdx: number;
  places: CachedPlace[];
  brand: string;
  lang: Lang;
  labels: PlannerLabels;
  distanceMap: RoadDistanceMap;
  periodName: (p: string) => string;
  getMapUrl: (placeId?: string) => string | null;
}) {
  return (
    <div className="relative">
      <div
        className="absolute bottom-8 left-[23px] top-8 w-[1.5px]"
        style={{
          background: `repeating-linear-gradient(to bottom,${hexToRgba(brand, 0.12)} 0px,${hexToRgba(brand, 0.12)} 4px,transparent 4px,transparent 12px)`,
        }}
      />
      <motion.div
        className="space-y-3"
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
      >
        {enriched.map((item, idx) => (
          <TimelineEntry
            key={`${item.period}-${idx}-${item.time}`}
            item={item}
            idx={idx}
            nowIdx={nowIdx}
            hasPast={hasPast}
            places={places}
            brand={brand}
            lang={lang}
            labels={l}
            distanceMap={distanceMap}
            periodName={periodName}
            mapUrl={getMapUrl(item.placeId)}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ── Now Divider ─────────────────────────────────────── */

function NowDivider({ brand, label }: { brand: string; label: string }) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="relative z-20 mb-3 flex items-center gap-2 pl-1"
    >
      <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center">
        <div className="relative flex h-4 w-4 items-center justify-center">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
            style={{ backgroundColor: brand }}
          />
          <span
            className="relative inline-flex h-3 w-3 rounded-full"
            style={{ backgroundColor: brand }}
          />
        </div>
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div
          className="h-px flex-1"
          style={{ backgroundColor: hexToRgba(brand, 0.15) }}
        />
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white"
          style={{ backgroundColor: brand }}
        >
          {label}
        </span>
        <div
          className="h-px flex-1"
          style={{ backgroundColor: hexToRgba(brand, 0.15) }}
        />
      </div>
    </motion.div>
  );
}

/* ── Timeline Entry ──────────────────────────────────── */

function TimelineEntry({
  item,
  idx,
  nowIdx,
  hasPast,
  places,
  brand,
  lang,
  labels: l,
  distanceMap,
  periodName,
  mapUrl,
}: {
  item: EnrichedItem;
  idx: number;
  nowIdx: number;
  hasPast: boolean;
  places: CachedPlace[];
  brand: string;
  lang: Lang;
  labels: PlannerLabels;
  distanceMap: RoadDistanceMap;
  periodName: (p: string) => string;
  mapUrl: string | null;
}) {
  const s = PERIOD_STYLES[item.period] ?? PERIOD_STYLES.morning;
  const place = item.placeId ? places.find((x) => x.id === item.placeId) : null;
  const { dimmed } = item;

  return (
    <div>
      {idx === nowIdx && hasPast && (
        <NowDivider brand={brand} label={l.nowLabel} />
      )}

      {idx === 0 && hasPast && (
        <motion.div
          variants={STAGGER_ITEM}
          className="mb-2 flex justify-center"
        >
          <span className="rounded-full bg-stone-50 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-100">
            {l.earlierToday}
          </span>
        </motion.div>
      )}

      <motion.div
        variants={STAGGER_ITEM}
        className={`relative flex gap-3 pl-1 transition-opacity ${dimmed ? "opacity-40" : "opacity-100"}`}
      >
        {/* Timeline node */}
        <TimelineNode
          emoji={item.emoji}
          dimmed={dimmed}
          isNow={!dimmed && idx === nowIdx}
          periodStyle={s}
        />

        {/* Card */}
        <motion.div
          className={`flex-1 overflow-hidden rounded-[18px] ring-1 ${
            dimmed
              ? "bg-stone-50/80 ring-stone-100"
              : `bg-white ring-stone-200/60 ${idx === nowIdx ? "shadow-sm" : ""}`
          }`}
          whileTap={dimmed ? undefined : { scale: 0.985 }}
          transition={SPRING_TAP}
        >
          <div className="p-4">
            <ItemMeta
              time={item.time}
              period={periodName(item.period)}
              dimmed={dimmed}
              periodStyle={s}
            />

            {place && !dimmed && (
              <div className="mb-2 flex justify-end">
                <Badges
                  place={place}
                  dist={distanceMap[place.id] ?? ""}
                  labels={l}
                />
              </div>
            )}

            <h4
              className={`text-[14px] font-black leading-snug tracking-tight ${dimmed ? "text-stone-400" : "text-stone-800"}`}
            >
              {item.title}
            </h4>

            <p
              className={`mt-1 text-[11.5px] font-medium leading-relaxed ${dimmed ? "text-stone-300" : "text-stone-500"}`}
            >
              {item.description}
            </p>

            {item.tip && !dimmed && <TipBadge tip={item.tip} />}

            {place?.owner_note && !dimmed && (
              <OwnerNote
                note={place.owner_note}
                brand={brand}
                isSwedish={lang === "sv"}
              />
            )}

            {mapUrl && !dimmed && (
              <DirectionsButton
                href={mapUrl}
                label={l.directions}
                brand={brand}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── Timeline Node ───────────────────────────────────── */

function TimelineNode({
  emoji,
  dimmed,
  isNow,
  periodStyle: s,
}: {
  emoji: string;
  dimmed: boolean;
  isNow: boolean;
  periodStyle: (typeof PERIOD_STYLES)[string];
}) {
  return (
    <div className="relative z-10 flex h-[48px] w-[48px] shrink-0 items-center justify-center">
      <div
        className={`flex h-[48px] w-[48px] items-center justify-center rounded-[16px] text-xl ring-1 ring-stone-200/60 ${
          isNow
            ? `bg-gradient-to-br ${s.grad} shadow-sm`
            : dimmed
              ? "bg-stone-50"
              : "bg-white shadow-sm"
        }`}
      >
        {dimmed ? <span className="grayscale">{emoji}</span> : emoji}
      </div>
      {!dimmed && (
        <div
          className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-[2px] border-white shadow-sm ${s.dot}`}
        />
      )}
    </div>
  );
}

/* ── Item Meta ───────────────────────────────────────── */

function ItemMeta({
  time,
  period,
  dimmed,
  periodStyle: s,
}: {
  time: string;
  period: string;
  dimmed: boolean;
  periodStyle: (typeof PERIOD_STYLES)[string];
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div
        className={`flex items-center gap-1 ${dimmed ? "text-stone-400" : "text-stone-700"}`}
      >
        <Clock size={10} strokeWidth={2.5} className="text-stone-300" />
        <span
          className={`text-[12px] font-black tabular-nums tracking-tight ${dimmed ? "line-through decoration-stone-300" : ""}`}
        >
          {time}
        </span>
      </div>
      <span
        className={`rounded-full px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.18em] ${
          dimmed ? "bg-stone-100 text-stone-400" : `${s.bg} ${s.text}`
        }`}
      >
        {period}
      </span>
    </div>
  );
}

/* ── Tip Badge ───────────────────────────────────────── */

function TipBadge({ tip }: { tip: string }) {
  return (
    <div className="mt-2 flex items-start gap-1.5">
      <Star
        size={9}
        className="mt-[3px] shrink-0 text-amber-400"
        fill="currentColor"
      />
      <span className="text-[10px] font-semibold leading-relaxed text-stone-400">
        {tip}
      </span>
    </div>
  );
}

/* ── Owner Note ──────────────────────────────────────── */

function OwnerNote({
  note,
  brand,
  isSwedish,
}: {
  note: string;
  brand: string;
  isSwedish: boolean;
}) {
  return (
    <div
      className="mt-3 rounded-[12px] px-3 py-2.5"
      style={{
        backgroundColor: hexToRgba(brand, 0.03),
        borderLeft: `2px solid ${hexToRgba(brand, 0.15)}`,
      }}
    >
      {!isSwedish && (
        <span className="mb-0.5 block text-[7px] font-black uppercase tracking-[0.25em] text-stone-300">
          🇸🇪 Original
        </span>
      )}
      <p className="text-[10.5px] font-medium italic leading-relaxed text-stone-500">
        &ldquo;{note}&rdquo;
      </p>
    </div>
  );
}

/* ── Directions Button ───────────────────────────────── */

function DirectionsButton({
  href,
  label,
  brand,
}: {
  href: string;
  label: string;
  brand: string;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[12px] py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all"
      style={{
        backgroundColor: hexToRgba(brand, 0.05),
        color: brand,
      }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_TAP}
    >
      <MapPin size={12} strokeWidth={2.5} />
      {label}
      <ExternalLink size={8} className="opacity-30" />
    </motion.a>
  );
}

/* ── Badges ──────────────────────────────────────────── */

function Badges({
  place,
  dist,
  labels: l,
}: {
  place: CachedPlace;
  dist: string;
  labels: PlannerLabels;
}) {
  const h = place.custom_hours
    ? { isOpenNow: true }
    : getTodaysOpeningHours(place.raw_data);
  const closed = h ? !h.isOpenNow : false;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {place.is_on_site && (
        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-100">
          {l.onSite}
        </span>
      )}
      {place.is_pinned && !place.is_on_site && (
        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-600 ring-1 ring-amber-100">
          ⭐
        </span>
      )}
      {dist && !place.is_on_site && (
        <span className="rounded-full bg-stone-50 px-2 py-[3px] text-[8px] font-bold tabular-nums text-stone-400 ring-1 ring-stone-100">
          {dist}
        </span>
      )}
      {h && (
        <span
          className={`flex items-center gap-1 rounded-full px-1.5 py-[3px] text-[7px] font-black uppercase tracking-wider ring-1 ${
            closed
              ? "bg-red-50 text-red-400 ring-red-100"
              : "bg-emerald-50 text-emerald-600 ring-emerald-100"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${closed ? "bg-red-300" : "bg-emerald-400"}`}
          />
          {closed ? l.closed : l.openNow}
        </span>
      )}
    </div>
  );
}
