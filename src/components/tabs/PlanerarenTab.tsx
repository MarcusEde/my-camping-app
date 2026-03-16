// src/components/tabs/PlanerarenTab.tsx
"use client";

import {
  SPRING_TAP,
  STAGGER_CONTAINER,
  STAGGER_ITEM
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
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CloudRain,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
  Star
} from "lucide-react";

interface Props {
  campground: Campground;
  places: CachedPlace[];
  weather?: WeatherProp | null;
  lang: Lang;
  distanceMap: RoadDistanceMap;
  isSaved?: (id: string) => boolean;
  toggleSaved?: (id: string) => void;
}

export default function PlanerarenTab({
  campground,
  places,
  weather,
  lang,
  distanceMap,
  isSaved,
  toggleSaved,
}: Props) {
  const brand = campground.primary_color || "#059669";
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
      <PlannerHeader weather={weather} rain={rain} lang={lang} labels={l} />

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
          lang={lang}
          labels={l}
          distanceMap={distanceMap}
          periodName={periodName}
          getMapUrl={getMapUrl}
          isSaved={isSaved}
          toggleSaved={toggleSaved}
        />
      )}
    </motion.div>
  );
}

/* ── Planner Header ──────────────────────────────────── */

function PlannerHeader({
  weather,
  rain,
  lang,
  labels: l,
}: {
  weather?: WeatherProp | null;
  rain: boolean;
  lang: Lang;
  labels: PlannerLabels;
}) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-10)] text-[var(--brand)]">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[var(--brand)] mb-0.5">
              <Calendar size={12} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {getDayLabel(lang)} {getDateLabel(lang)}
              </span>
            </div>
            <p className="text-sm font-semibold text-stone-900 leading-tight">
              {l.subtitle}
            </p>
          </div>
        </div>
        {weather && (
          <div className="flex flex-col items-end pl-2">
            <span className="text-2xl leading-none">{weather.icon}</span>
            <span className="text-sm font-bold text-stone-700 mt-1">
              {Math.round(weather.temp)}°
            </span>
          </div>
        )}
      </div>
      <div className="bg-stone-50 border-t border-stone-100 px-5 py-2.5">
        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
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
      className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4"
    >
      <CloudRain size={20} className="text-sky-500 shrink-0 mt-0.5" />
      <p className="text-sm font-medium leading-relaxed text-sky-900">{note}</p>
    </motion.div>
  );
}

/* ── Loading Skeleton ────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          variants={STAGGER_ITEM}
          className="animate-pulse rounded-2xl bg-white p-5 border border-stone-200/50"
        >
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-stone-100" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="flex gap-2">
                <div className="h-3 w-16 rounded bg-stone-100" />
                <div className="h-3 w-20 rounded bg-stone-50" />
              </div>
              <div className="h-4 w-3/4 rounded bg-stone-100" />
              <div className="h-3 w-full rounded bg-stone-50" />
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
      <div className="rounded-3xl bg-white px-6 py-12 text-center border border-stone-200/75 shadow-sm">
        <span className="text-4xl block mb-4">⛺</span>
        <h3 className="text-base font-bold text-stone-900">
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
  lang,
  labels: l,
  distanceMap,
  periodName,
  getMapUrl,
  isSaved,
  toggleSaved,
}: {
  enriched: EnrichedItem[];
  hasPast: boolean;
  nowIdx: number;
  places: CachedPlace[];
  lang: Lang;
  labels: PlannerLabels;
  distanceMap: RoadDistanceMap;
  periodName: (p: string) => string;
  getMapUrl: (placeId?: string) => string | null;
  isSaved?: (id: string) => boolean;
  toggleSaved?: (id: string) => void;
}) {
  return (
    <div className="relative pl-[22px]">
      {/* Structural Vertical Line */}
      <div className="absolute bottom-8 left-[33px] top-8 w-px bg-stone-200" />

      <motion.div
        className="space-y-5"
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
            lang={lang}
            labels={l}
            distanceMap={distanceMap}
            periodName={periodName}
            mapUrl={getMapUrl(item.placeId)}
            isSaved={isSaved}
            toggleSaved={toggleSaved}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ── Now Divider ─────────────────────────────────────── */

function NowDivider({ label }: { label: string }) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="relative z-20 mb-4 flex items-center gap-3 -ml-[22px]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        <div className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 bg-[var(--brand)]" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 pr-4">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-[var(--brand)] shadow-sm">
          {label}
        </span>
        <div className="h-px flex-1 bg-stone-200" />
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
  lang,
  labels: l,
  distanceMap,
  periodName,
  mapUrl,
  isSaved,
  toggleSaved,
}: {
  item: EnrichedItem;
  idx: number;
  nowIdx: number;
  hasPast: boolean;
  places: CachedPlace[];
  lang: Lang;
  labels: PlannerLabels;
  distanceMap: RoadDistanceMap;
  periodName: (p: string) => string;
  mapUrl: string | null;
  isSaved?: (id: string) => boolean;
  toggleSaved?: (id: string) => void;
}) {
  const place = item.placeId ? places.find((x) => x.id === item.placeId) : null;
  const { dimmed } = item;
  const isNow = !dimmed && idx === nowIdx;
  const placeIsSaved = item.placeId && isSaved ? isSaved(item.placeId) : false;

  return (
    <div className="relative">
      {idx === nowIdx && hasPast && <NowDivider label={l.nowLabel} />}

      {idx === 0 && hasPast && (
        <motion.div
          variants={STAGGER_ITEM}
          className="mb-3 flex justify-center pl-6"
        >
          <span className="rounded-md bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {l.earlierToday}
          </span>
        </motion.div>
      )}

      <motion.div
        variants={STAGGER_ITEM}
        className={`relative flex items-start gap-4 transition-opacity duration-300 ${dimmed ? "opacity-50" : "opacity-100"}`}
      >
        {/* Timeline Node */}
        <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center -ml-[22px]">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm border ${
              isNow
                ? "bg-white border-[var(--brand)]"
                : dimmed
                  ? "bg-stone-50 border-stone-200"
                  : "bg-white border-stone-200"
            }`}
          >
            <span className={dimmed ? "grayscale" : ""}>{item.emoji}</span>
          </div>
        </div>

        {/* Card */}
        <motion.div
          className={`flex-1 overflow-hidden rounded-2xl border ${
            dimmed
              ? "bg-stone-50/50 border-stone-200/50"
              : isNow
                ? "bg-white border-[var(--brand)] shadow-[0_4px_20px_var(--brand-10)]"
                : "bg-white border-stone-200/75 shadow-sm"
          }`}
          whileTap={dimmed ? undefined : { scale: 0.98 }}
          transition={SPRING_TAP}
        >
          <div className="p-5">
            {/* Top row: Meta + Heart */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 font-mono text-xs font-bold ${dimmed ? "text-stone-400 line-through" : "text-stone-700"}`}
                >
                  <Clock size={12} className="text-stone-400" />
                  {item.time}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${dimmed ? "bg-stone-100 text-stone-400" : "bg-stone-100 text-stone-600"}`}
                >
                  {periodName(item.period)}
                </span>
              </div>

              {/* Heart toggle */}
              {item.placeId && !dimmed && toggleSaved && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaved(item.placeId!);
                  }}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    placeIsSaved
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-stone-50 hover:bg-stone-100 border border-stone-100"
                  }`}
                  whileTap={{ scale: 0.8 }}
                  aria-label={
                    placeIsSaved ? "Remove from My Stay" : "Save to My Stay"
                  }
                >
                  <motion.div
                    animate={
                      placeIsSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }
                    }
                    transition={{ duration: 0.3 }}
                  >
                    <Heart
                      size={14}
                      fill={placeIsSaved ? "#ef4444" : "none"}
                      className={
                        placeIsSaved ? "text-red-500" : "text-stone-400"
                      }
                    />
                  </motion.div>
                </motion.button>
              )}
            </div>

            {/* Badges (Opening hours, distance) */}
            {place && !dimmed && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badges
                  place={place}
                  dist={distanceMap[place.id] ?? ""}
                  labels={l}
                  lang={lang}
                  scheduledTime={item.time}
                />
              </div>
            )}

            {/* Content */}
            <h4
              className={`text-base font-bold leading-tight mb-1.5 ${dimmed ? "text-stone-500" : "text-stone-900"}`}
            >
              {item.title}
            </h4>

            <p
              className={`text-sm leading-relaxed ${dimmed ? "text-stone-400" : "text-stone-600"}`}
            >
              {item.description}
            </p>

            {/* AI Tip */}
            {item.tip && !dimmed && (
              <div className="mt-3 flex items-start gap-1.5 bg-amber-50/50 border border-amber-100/50 rounded-lg p-2.5">
                <Star
                  size={12}
                  className="mt-0.5 shrink-0 text-amber-400"
                  fill="currentColor"
                />
                <span className="text-xs font-medium text-amber-800">
                  {item.tip}
                </span>
              </div>
            )}

            {/* Owner Note */}
            {place?.owner_note && !dimmed && (
              <div className="mt-3 rounded-lg bg-stone-50 border border-stone-100 p-3">
                <p className="text-xs font-medium italic leading-relaxed text-stone-600">
                  "{place.owner_note}"
                </p>
              </div>
            )}

            {/* Map Link */}
            {mapUrl && !dimmed && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-[var(--brand-10)] hover:bg-[var(--brand-20)] text-[var(--brand)] text-xs font-bold transition-colors"
              >
                <MapPin size={14} />
                {l.directions}
                <ExternalLink size={12} className="opacity-50 ml-1" />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── Opening hours helpers (PRESERVED) ───────────────────────────── */

function parseHoursRange(text: string): { open: number; close: number } | null {
  if (!text) return null;
  if (/24\s*(hours|h|timmar|stunden|timer)|dygnet\s*runt|døgnåbent/i.test(text))
    return { open: 0, close: 24 };
  if (/closed|stängt|geschlossen|lukket/i.test(text)) return null;

  const m = text.match(/(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  if (m) {
    return {
      open: parseInt(m[1]) + parseInt(m[2]) / 60,
      close: parseInt(m[3]) + parseInt(m[4]) / 60,
    };
  }
  return null;
}

function currentHourDecimal(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function formatHourAsTime(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/* ── Badges Component (PRESERVED LOGIC, REDESIGNED UI) ──────────────────────────────────────────── */

type BadgeStatus =
  | { type: "open" }
  | { type: "opens_at"; time: string }
  | { type: "closed" }
  | { type: "unknown" };

function getPlaceStatus(
  place: CachedPlace,
  scheduledTime?: string,
): BadgeStatus {
  const hoursData = place.custom_hours
    ? { isOpenNow: false, text: place.custom_hours }
    : getTodaysOpeningHours(place.raw_data);

  if (!hoursData) return { type: "unknown" };

  const hoursText = hoursData.text ?? place.custom_hours ?? "";
  const range = parseHoursRange(hoursText);

  if (/closed|stängt|geschlossen|lukket/i.test(hoursText))
    return { type: "closed" };

  if (!range) {
    if (hoursData.isOpenNow) return { type: "open" };
    return { type: "unknown" };
  }

  const now = currentHourDecimal();
  if (now >= range.open && now < range.close) return { type: "open" };

  if (scheduledTime) {
    const timeParts = scheduledTime.match(/^(\d{1,2}):(\d{2})$/);
    if (timeParts) {
      const scheduledHour =
        parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;
      if (scheduledHour >= range.open && scheduledHour < range.close) {
        return { type: "opens_at", time: formatHourAsTime(range.open) };
      }
    }
  }

  return { type: "closed" };
}

const badgeLabels: Record<
  string,
  { openNow: string; opensAt: (t: string) => string; closed: string }
> = {
  sv: { openNow: "Öppet", opensAt: (t) => `Öppnar ${t}`, closed: "Stängt" },
  en: { openNow: "Open", opensAt: (t) => `Opens ${t}`, closed: "Closed" },
  de: {
    openNow: "Geöffnet",
    opensAt: (t) => `Öffnet ${t}`,
    closed: "Geschlossen",
  },
  da: { openNow: "Åben", opensAt: (t) => `Åbner ${t}`, closed: "Lukket" },
  nl: { openNow: "Open", opensAt: (t) => `Opent ${t}`, closed: "Gesloten" },
  no: { openNow: "Åpent", opensAt: (t) => `Åpner ${t}`, closed: "Stengt" },
};

function Badges({
  place,
  dist,
  labels: l,
  lang,
  scheduledTime,
}: {
  place: CachedPlace;
  dist: string;
  labels: PlannerLabels;
  lang: Lang;
  scheduledTime?: string;
}) {
  const status = getPlaceStatus(place, scheduledTime);
  const bl = badgeLabels[lang] ?? badgeLabels.en;

  return (
    <>
      {place.is_on_site ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          <MapPin size={10} /> {l.onSite}
        </span>
      ) : dist ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/50">
          <MapPin size={10} className="text-stone-400" /> {dist}
        </span>
      ) : null}

      {status.type !== "unknown" && (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
            status.type === "open"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : status.type === "opens_at"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-stone-50 text-stone-500 border-stone-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status.type === "open"
                ? "bg-emerald-500"
                : status.type === "opens_at"
                  ? "bg-amber-500"
                  : "bg-stone-300"
            }`}
          />
          {status.type === "open"
            ? bl.openNow
            : status.type === "opens_at"
              ? bl.opensAt(status.time)
              : bl.closed}
        </span>
      )}
    </>
  );
}
