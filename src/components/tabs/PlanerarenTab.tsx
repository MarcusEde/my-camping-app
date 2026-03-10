// src/app/camp/[slug]/tabs/PlanerarenTab.tsx
"use client";

import { getAiPlan, type ItineraryItem } from "@/app/camp/[slug]/ai-action";
import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { RoadDistanceMap } from "@/lib/routing";
import type { CachedPlace, Campground } from "@/types/database";
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
import { useEffect, useRef, useState } from "react";
import type { Lang, WeatherProp } from "../GuestAppUI";

/* ── helpers ─────────────────────────────────────────── */

function rgba(hex: string, a: number) {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

function buildMapLink(
  lat?: number | null,
  lng?: number | null,
  name?: string,
): string | null {
  if (lat && lng)
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (name)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  return null;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Parse "HH:MM" → minutes since midnight */
function getItemMinutes(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
}

/** Current minutes since midnight (browser local time) */
function browserNowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Time-based dimming: an item is "past" when
 *   • the NEXT item's start time has been reached, OR
 *   • (last item) 90 minutes after its start time.
 *
 * This replaces the old period-threshold approach that let
 * an 18:30 evening item stay "current" until 23:00.
 */
function computeDimming(items: { time: string }[], nowMin: number): boolean[] {
  return items.map((item, i) => {
    const next = items[i + 1];
    if (next) return nowMin >= getItemMinutes(next.time);
    return nowMin > getItemMinutes(item.time) + 90;
  });
}

const SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: SPRING },
};

/* ── i18n ────────────────────────────────────────────── */

interface L {
  subtitle: string;
  morning: string;
  lunch: string;
  afternoon: string;
  evening: string;
  rainNote: string;
  directions: string;
  closed: string;
  openNow: string;
  aiNote: string;
  nowLabel: string;
  earlierToday: string;
  onSite: string;
}

const T: Record<Lang, L> = {
  sv: {
    subtitle: "Din dag — baserad på väder, dag & plats",
    morning: "Förmiddag",
    lunch: "Lunch",
    afternoon: "Eftermiddag",
    evening: "Kväll",
    rainNote: "Mysväder ute! Tipsen är anpassade för en skön dag inomhus 🛋️",
    directions: "Visa vägen",
    closed: "Stängt",
    openNow: "Öppet",
    aiNote: "Skapad med AI baserat på plats, väder & dag",
    nowLabel: "Nu",
    earlierToday: "Tidigare idag",
    onSite: "På området",
  },
  en: {
    subtitle: "Your day — based on weather, day & location",
    morning: "Morning",
    lunch: "Lunch",
    afternoon: "Afternoon",
    evening: "Evening",
    rainNote: "Cozy weather outside! Tips adapted for a great indoor day 🛋️",
    directions: "Directions",
    closed: "Closed",
    openNow: "Open",
    aiNote: "Created with AI based on location, weather & day",
    nowLabel: "Now",
    earlierToday: "Earlier today",
    onSite: "On site",
  },
  de: {
    subtitle: "Ihr Tag — basierend auf Wetter, Tag & Standort",
    morning: "Vormittag",
    lunch: "Mittagessen",
    afternoon: "Nachmittag",
    evening: "Abend",
    rainNote: "Gemütliches Wetter! Tipps für einen tollen Tag drinnen 🛋️",
    directions: "Route",
    closed: "Geschlossen",
    openNow: "Geöffnet",
    aiNote: "Mit KI erstellt basierend auf Standort, Wetter & Tag",
    nowLabel: "Jetzt",
    earlierToday: "Früher heute",
    onSite: "Vor Ort",
  },
  da: {
    subtitle: "Din dag — baseret på vejr, dag & placering",
    morning: "Morgen",
    lunch: "Frokost",
    afternoon: "Eftermiddag",
    evening: "Aften",
    rainNote: "Hyggevejr! Tips tilpasset en god dag indendørs 🛋️",
    directions: "Vej",
    closed: "Lukket",
    openNow: "Åben",
    aiNote: "Lavet med AI baseret på placering, vejr & dag",
    nowLabel: "Nu",
    earlierToday: "Tidligere i dag",
    onSite: "På området",
  },
  nl: {
    subtitle: "Jouw dag — gebaseerd op weer, dag & locatie",
    morning: "Ochtend",
    lunch: "Lunch",
    afternoon: "Middag",
    evening: "Avond",
    rainNote:
      "Gezellig weer buiten! Tips aangepast voor een fijne dag binnen 🛋️",
    directions: "Route",
    closed: "Gesloten",
    openNow: "Open",
    aiNote: "Gemaakt met AI op basis van locatie, weer & dag",
    nowLabel: "Nu",
    earlierToday: "Eerder vandaag",
    onSite: "Op het terrein",
  },
  no: {
    subtitle: "Dagen din — basert på vær, dag & sted",
    morning: "Formiddag",
    lunch: "Lunsj",
    afternoon: "Ettermiddag",
    evening: "Kveld",
    rainNote: "Kosevær ute! Tipsene er tilpasset en fin dag innendørs 🛋️",
    directions: "Veibeskrivelse",
    closed: "Stengt",
    openNow: "Åpent",
    aiNote: "Laget med AI basert på sted, vær & dag",
    nowLabel: "Nå",
    earlierToday: "Tidligere i dag",
    onSite: "På området",
  },
};

/* ── period styles ───────────────────────────────────── */

const PS: Record<
  string,
  { dot: string; bg: string; text: string; grad: string }
> = {
  morning: {
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
    grad: "from-amber-50 to-orange-50/40",
  },
  lunch: {
    dot: "bg-orange-400",
    bg: "bg-orange-50",
    text: "text-orange-700",
    grad: "from-orange-50 to-red-50/30",
  },
  afternoon: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    grad: "from-emerald-50 to-teal-50/30",
  },
  evening: {
    dot: "bg-indigo-400",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    grad: "from-indigo-50 to-purple-50/30",
  },
};

function dayLabel(lang: Lang): string {
  const d = new Date().getDay();
  return n[lang][d];
}

const n: Record<Lang, string[]> = {
  sv: ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"],
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  de: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  da: ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"],
  nl: [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ],
  no: ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"],
};

function dateLabel(lang: Lang): string {
  const d = new Date();
  const m: Record<Lang, string[]> = {
    sv: [
      "jan",
      "feb",
      "mar",
      "apr",
      "maj",
      "jun",
      "jul",
      "aug",
      "sep",
      "okt",
      "nov",
      "dec",
    ],
    en: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    de: [
      "Jan",
      "Feb",
      "Mär",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dez",
    ],
    da: [
      "jan",
      "feb",
      "mar",
      "apr",
      "maj",
      "jun",
      "jul",
      "aug",
      "sep",
      "okt",
      "nov",
      "dec",
    ],
    nl: [
      "jan",
      "feb",
      "mrt",
      "apr",
      "mei",
      "jun",
      "jul",
      "aug",
      "sep",
      "okt",
      "nov",
      "dec",
    ],
    no: [
      "jan",
      "feb",
      "mar",
      "apr",
      "mai",
      "jun",
      "jul",
      "aug",
      "sep",
      "okt",
      "nov",
      "dec",
    ],
  };
  return `${d.getDate()} ${m[lang][d.getMonth()]}`;
}

/* ── component ───────────────────────────────────────── */

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
  const l = T[lang];
  const rain = weather?.isRaining ?? false;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [nowMin, setNowMin] = useState(browserNowMinutes);

  /* ── stable fetch ── */
  const dateKey = todayKey();
  const fetchKey = `${campground.id}-${lang}-${dateKey}`;
  const lastFetchKey = useRef<string | null>(null);
  const argsRef = useRef({ campground, weather, places, distanceMap });
  argsRef.current = { campground, weather, places, distanceMap };

  useEffect(() => {
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    setLoading(true);
    const {
      campground: cg,
      weather: w,
      places: p,
      distanceMap: dm,
    } = argsRef.current;

    getAiPlan(cg, w ?? undefined, p, lang, dateKey, dm)
      .then((plan) => setItems(plan))
      .catch((err) => {
        console.error("[Planner]", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [fetchKey, lang, dateKey]);

  /* ── tick every minute ── */
  useEffect(() => {
    const id = setInterval(() => setNowMin(browserNowMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  const getMapUrl = (pid?: string) => {
    if (!pid) return null;
    const p = places.find((x) => x.id === pid);
    if (!p) return null;
    if (p.is_on_site) return null;
    return buildMapLink(p.latitude, p.longitude, p.name);
  };

  /* ── time-based dimming ── */
  const dimFlags = computeDimming(items, nowMin);
  const enriched = items.map((item, i) => ({ ...item, dimmed: dimFlags[i] }));
  const hasPast = enriched.some((i) => i.dimmed);
  const nowIdx = enriched.findIndex((i) => !i.dimmed);

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
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ── Header ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="overflow-hidden rounded-[24px] bg-white ring-1 ring-stone-200/60"
      >
        <div
          className="px-5 py-4"
          style={{
            background: `linear-gradient(135deg,${rgba(brand, 0.05)},${rgba(brand, 0.01)})`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: rgba(brand, 0.08) }}
              >
                <Sparkles size={15} style={{ color: brand }} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-stone-300" />
                  <span className="text-[11px] font-bold text-stone-500">
                    {dayLabel(lang)} {dateLabel(lang)}
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

      {/* ── Rain banner ────────────────────────────── */}
      <AnimatePresence>
        {rain && (
          <motion.div
            variants={fadeUp}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-[18px] border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/50 p-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-sky-100">
              <CloudRain size={18} className="text-sky-400" />
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-sky-700/80">
              {l.rainNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading skeleton ───────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              variants={fadeUp}
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
      ) : items.length === 0 ? (
        <motion.div variants={fadeUp}>
          <div className="rounded-[28px] bg-gradient-to-b from-white to-stone-50/50 px-6 py-12 text-center ring-1 ring-stone-200/60">
            <span className="text-3xl">⛺</span>
            <h3 className="mt-3 text-[15px] font-black text-stone-700">
              {lang === "sv"
                ? "Ingen plan kunde skapas"
                : lang === "de"
                  ? "Kein Plan verfügbar"
                  : lang === "da"
                    ? "Ingen plan tilgængelig"
                    : lang === "no"
                      ? "Ingen plan tilgjengelig"
                      : lang === "nl"
                        ? "Geen plan beschikbaar"
                        : "No plan available"}
            </h3>
          </div>
        </motion.div>
      ) : (
        /* ── Timeline ──────────────────────────────── */
        <div className="relative">
          <div
            className="absolute bottom-8 left-[23px] top-8 w-[1.5px]"
            style={{
              background: `repeating-linear-gradient(to bottom,${rgba(brand, 0.12)} 0px,${rgba(brand, 0.12)} 4px,transparent 4px,transparent 12px)`,
            }}
          />

          <motion.div
            className="space-y-3"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {enriched.map((item, idx) => {
              const link = getMapUrl(item.placeId);
              const s = PS[item.period] ?? PS.morning;
              const place = item.placeId
                ? places.find((x) => x.id === item.placeId)
                : null;
              const dimmed = item.dimmed;

              return (
                <div key={`${item.period}-${idx}-${item.time}`}>
                  {/* ── "NOW" divider ── */}
                  {idx === nowIdx && hasPast && (
                    <motion.div
                      variants={fadeUp}
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
                          style={{ backgroundColor: rgba(brand, 0.15) }}
                        />
                        <span
                          className="shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white"
                          style={{ backgroundColor: brand }}
                        >
                          {l.nowLabel}
                        </span>
                        <div
                          className="h-px flex-1"
                          style={{ backgroundColor: rgba(brand, 0.15) }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* ── "Earlier today" label ── */}
                  {idx === 0 && hasPast && (
                    <motion.div
                      variants={fadeUp}
                      className="mb-2 flex justify-center"
                    >
                      <span className="rounded-full bg-stone-50 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-100">
                        {l.earlierToday}
                      </span>
                    </motion.div>
                  )}

                  <motion.div
                    variants={fadeUp}
                    className={`relative flex gap-3 pl-1 transition-opacity ${dimmed ? "opacity-40" : "opacity-100"}`}
                  >
                    {/* Timeline node */}
                    <div className="relative z-10 flex h-[48px] w-[48px] shrink-0 items-center justify-center">
                      <div
                        className={`flex h-[48px] w-[48px] items-center justify-center rounded-[16px] text-xl ring-1 ring-stone-200/60 ${
                          !dimmed && idx === nowIdx
                            ? `bg-gradient-to-br ${s.grad} shadow-sm`
                            : dimmed
                              ? "bg-stone-50"
                              : "bg-white shadow-sm"
                        }`}
                      >
                        {dimmed ? (
                          <span className="grayscale">{item.emoji}</span>
                        ) : (
                          item.emoji
                        )}
                      </div>
                      {!dimmed && (
                        <div
                          className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-[2px] border-white shadow-sm ${s.dot}`}
                        />
                      )}
                    </div>

                    {/* Card */}
                    <motion.div
                      className={`flex-1 overflow-hidden rounded-[18px] ring-1 ${
                        dimmed
                          ? "bg-stone-50/80 ring-stone-100"
                          : `bg-white ring-stone-200/60 ${idx === nowIdx ? "shadow-sm" : ""}`
                      }`}
                      whileTap={dimmed ? undefined : { scale: 0.985 }}
                      transition={SPRING}
                    >
                      <div className="p-4">
                        {/* Meta */}
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1 ${dimmed ? "text-stone-400" : "text-stone-700"}`}
                            >
                              <Clock
                                size={10}
                                strokeWidth={2.5}
                                className="text-stone-300"
                              />
                              <span
                                className={`text-[12px] font-black tabular-nums tracking-tight ${dimmed ? "line-through decoration-stone-300" : ""}`}
                              >
                                {item.time}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.18em] ${
                                dimmed
                                  ? "bg-stone-100 text-stone-400"
                                  : `${s.bg} ${s.text}`
                              }`}
                            >
                              {periodName(item.period)}
                            </span>
                          </div>
                          {place && !dimmed && (
                            <Badges
                              place={place}
                              dist={distanceMap[place.id] ?? ""}
                              l={l}
                            />
                          )}
                        </div>

                        {/* Title */}
                        <h4
                          className={`text-[14px] font-black leading-snug tracking-tight ${dimmed ? "text-stone-400" : "text-stone-800"}`}
                        >
                          {item.title}
                        </h4>

                        {/* Description */}
                        <p
                          className={`mt-1 text-[11.5px] font-medium leading-relaxed ${dimmed ? "text-stone-300" : "text-stone-500"}`}
                        >
                          {item.description}
                        </p>

                        {/* Tip */}
                        {item.tip && !dimmed && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <Star
                              size={9}
                              className="mt-[3px] shrink-0 text-amber-400"
                              fill="currentColor"
                            />
                            <span className="text-[10px] font-semibold leading-relaxed text-stone-400">
                              {item.tip}
                            </span>
                          </div>
                        )}

                        {/* Owner note */}
                        {place?.owner_note && !dimmed && (
                          <div
                            className="mt-3 rounded-[12px] px-3 py-2.5"
                            style={{
                              backgroundColor: rgba(brand, 0.03),
                              borderLeft: `2px solid ${rgba(brand, 0.15)}`,
                            }}
                          >
                            {lang !== "sv" && (
                              <span className="mb-0.5 block text-[7px] font-black uppercase tracking-[0.25em] text-stone-300">
                                🇸🇪 Original
                              </span>
                            )}
                            <p className="text-[10.5px] font-medium italic leading-relaxed text-stone-500">
                              &ldquo;{place.owner_note}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Directions */}
                        {link && !dimmed && (
                          <motion.a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[12px] py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all"
                            style={{
                              backgroundColor: rgba(brand, 0.05),
                              color: brand,
                            }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                          >
                            <MapPin size={12} strokeWidth={2.5} />
                            {l.directions}
                            <ExternalLink size={8} className="opacity-30" />
                          </motion.a>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Badges ──────────────────────────────────────────── */

function Badges({
  place,
  dist,
  l,
}: {
  place: CachedPlace;
  dist: string;
  l: L;
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
