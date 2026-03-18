// src/components/tabs/ExploreTab.tsx
// Replaces UtforskaTab + AktiviteterTab + PlanerarenTab — ia-spec v2.0 tab_2 "Explore"
// Absorbs: place cards (all categories), Events filter (type="event" announcements),
//          partner badges, AI Planner FAB → bottom sheet (uses .bottom-sheet CSS base class)
"use client";

import { getAiPlan, type ItineraryItem, type PlanLang } from "@/app/camp/[slug]/ai-action";
import { ROW_DEFS } from "@/lib/explore-config";
import {
  calculateRelevanceScore,
  getFormattedDistance,
  getMapLink,
  getOpeningHoursDisplay,
} from "@/lib/place-utils";
import { type RoadDistanceMap } from "@/lib/routing";
import { getOwnerNote, utforskaLabels, type UtforskaLabels } from "@/lib/translations";
import type { Announcement, CachedPlace, Campground, PromotedPartner } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Megaphone,
  Navigation,
  Search,
  Sparkles,
  Star,
  X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ── Resolve distance (3-tier: OSRM → road_distance_km → haversine) ──── */
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
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km % 1 === 0 ? km : km.toFixed(1)} km`;
  }
  return getFormattedDistance(campLat, campLon, place.latitude, place.longitude) ?? "";
}

/* ── Category config (unchanged from UtforskaTab) ────────────────────── */
interface CatCfg { emoji: string; gradient: string; ctaGradient: string; bodyTint: string; }
const CAT: Record<string, CatCfg> = {
  beach: { emoji: "🏖️", gradient: "from-sky-200 via-cyan-100 to-teal-100", ctaGradient: "from-sky-400 to-teal-400", bodyTint: "bg-sky-50/60" },
  swimming: { emoji: "🏊", gradient: "from-blue-200 via-sky-100 to-cyan-100", ctaGradient: "from-blue-400 to-cyan-400", bodyTint: "bg-blue-50/60" },
  park: { emoji: "🌲", gradient: "from-emerald-200 via-green-100 to-teal-100", ctaGradient: "from-emerald-500 to-teal-400", bodyTint: "bg-emerald-50/60" },
  restaurant: { emoji: "🍽️", gradient: "from-rose-200 via-pink-100 to-orange-100", ctaGradient: "from-rose-400 to-orange-400", bodyTint: "bg-rose-50/50" },
  cafe: { emoji: "☕", gradient: "from-amber-200 via-yellow-100 to-orange-100", ctaGradient: "from-amber-500 to-yellow-400", bodyTint: "bg-amber-50/50" },
  bowling: { emoji: "🎳", gradient: "from-violet-200 via-purple-100 to-indigo-100", ctaGradient: "from-violet-500 to-indigo-500", bodyTint: "bg-violet-50/50" },
  cinema: { emoji: "🎬", gradient: "from-red-200 via-rose-100 to-pink-100", ctaGradient: "from-red-500 to-rose-400", bodyTint: "bg-red-50/50" },
  spa: { emoji: "🧖", gradient: "from-teal-200 via-cyan-100 to-sky-100", ctaGradient: "from-teal-400 to-sky-400", bodyTint: "bg-teal-50/50" },
  playground: { emoji: "🛝", gradient: "from-yellow-200 via-amber-100 to-orange-100", ctaGradient: "from-yellow-400 to-orange-400", bodyTint: "bg-yellow-50/50" },
  sports: { emoji: "⚽", gradient: "from-green-200 via-lime-100 to-emerald-100", ctaGradient: "from-green-500 to-emerald-400", bodyTint: "bg-green-50/50" },
  museum: { emoji: "🏛️", gradient: "from-purple-200 via-violet-100 to-indigo-100", ctaGradient: "from-purple-500 to-indigo-400", bodyTint: "bg-purple-50/50" },
  attraction: { emoji: "🎡", gradient: "from-fuchsia-200 via-pink-100 to-rose-100", ctaGradient: "from-fuchsia-400 to-pink-400", bodyTint: "bg-fuchsia-50/50" },
  shopping: { emoji: "🛍️", gradient: "from-pink-200 via-fuchsia-100 to-purple-100", ctaGradient: "from-pink-400 to-purple-400", bodyTint: "bg-pink-50/50" },
  activity: { emoji: "🎯", gradient: "from-orange-200 via-amber-100 to-yellow-100", ctaGradient: "from-orange-400 to-amber-400", bodyTint: "bg-orange-50/50" },
  other: { emoji: "📍", gradient: "from-stone-200 via-slate-100 to-gray-100", ctaGradient: "from-stone-500 to-slate-400", bodyTint: "bg-stone-50/50" },
};
function getCat(cat: string): CatCfg { return CAT[cat] ?? CAT.other; }

/* ── Event filter labels ─────────────────────────────────────────────── */
const EVENT_LABELS: Record<Lang, string> = {
  sv: "Evenemang", en: "Events", de: "Veranstaltungen", da: "Arrangementer", nl: "Evenementen", no: "Arrangementer",
};
const PLAN_LABELS: Record<Lang, string> = {
  sv: "Planera dagen ✦", en: "Plan my day ✦", de: "Tag planen ✦", da: "Planlæg dagen ✦", nl: "Plan mijn dag ✦", no: "Planlegg dagen ✦",
};
const CLOSE_LABELS: Record<Lang, string> = {
  sv: "Stäng", en: "Close", de: "Schließen", da: "Luk", nl: "Sluiten", no: "Lukk",
};
const MORNING_LABELS: Record<Lang, string> = { sv: "Morgon", en: "Morning", de: "Morgen", da: "Morgen", nl: "Ochtend", no: "Morgen" };
const LUNCH_LABELS: Record<Lang, string> = { sv: "Lunch", en: "Lunch", de: "Mittag", da: "Frokost", nl: "Lunch", no: "Lunsj" };
const AFTERNOON_LABELS: Record<Lang, string> = { sv: "Eftermiddag", en: "Afternoon", de: "Nachmittag", da: "Eftermiddag", nl: "Middag", no: "Ettermiddag" };
const EVENING_LABELS: Record<Lang, string> = { sv: "Kväll", en: "Evening", de: "Abend", da: "Aften", nl: "Avond", no: "Kveld" };

/* ── Props ───────────────────────────────────────────────────────────── */
interface Props {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[];
  weather?: WeatherProp | null;
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
  activePartner?: PromotedPartner | null;
  weatherBadge?: string | null;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ExploreTab({
  campground,
  places,
  announcements = [],
  partners = [],
  weather,
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

  // ── Events filter (DF2: only type="event" announcements live here) ───
  const [showEvents, setShowEvents] = useState(false);
  const eventAnnouncements = announcements.filter((a) => a.type === "event");

  // ── AI Planner bottom sheet state ────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<ItineraryItem[] | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // ── View mode state ───────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (sheetOpen && !plan && !isLoadingPlan) {
      setIsLoadingPlan(true);
      const visiblePlaces = places.filter((p) => !p.is_hidden);
      getAiPlan(campground, weather, visiblePlaces, lang as PlanLang, undefined, distanceMap)
        .then((data) => {
          setPlan(data);
          setIsLoadingPlan(false);
        })
        .catch((err) => {
          console.error("[ExploreTab] AI Plan Error:", err);
          setIsLoadingPlan(false);
        });
    }
  }, [sheetOpen, plan, isLoadingPlan, campground, weather, places, lang, distanceMap]);

  // ── Partner lookup by place_id (linked partners → badge on place card) ─
  const partnerByPlaceId = new Map<string, PromotedPartner>();
  const now = new Date();
  for (const p of partners) {
    if (!p.is_active || !p.cached_place_id) continue;
    if (p.starts_at && new Date(p.starts_at) > now) continue;
    if (p.ends_at && new Date(p.ends_at) < now) continue;
    partnerByPlaceId.set(p.cached_place_id, p);
  }

  // ── Unlinked active partners (cached_place_id is null) ───────────────
  const unlinkedPartners = partners
    .filter(p => {
      if (!p.is_active || p.cached_place_id != null) return false;
      if (p.starts_at && new Date(p.starts_at) > now) return false;
      if (p.ends_at && new Date(p.ends_at) < now) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.priority_rank !== b.priority_rank) return a.priority_rank - b.priority_rank;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ── Inline Weather Tip Computation ──────────────────────────────────
  const { tipId: weatherTipId, badgeText: weatherBadgeText } = React.useMemo(() => {
    if (!weather || places.length === 0) return { tipId: null, badgeText: null };
    const isIndoorNeeded = weather.isRaining || weather.temp < 15;
    const targets = isIndoorNeeded ? ["cafe", "museum", "cinema", "shopping", "bowling"] : ["beach", "park", "attraction", "playground"];
    const candidates = places.filter((p) => !p.is_hidden && targets.includes(p.category));
    candidates.sort((a, b) => {
      const aScore = (a.is_pinned ? 10 : 0) + (a.rating || 0);
      const bScore = (b.is_pinned ? 10 : 0) + (b.rating || 0);
      return bScore - aScore;
    });
    const top = candidates[0];
    if (!top) return { tipId: null, badgeText: null };

    let text = "✨ Dagens tips";
    if (weather.isRaining && top.is_indoor) text = "🌧 Perfekt idag";
    else if (!weather.isRaining && weather.temp >= 15 && !top.is_indoor) text = "☀️ Perfekt idag";

    return { tipId: top.id, badgeText: text };
  }, [weather, places]);

  // ── Place rows (standard IA categories) ──────────────────────────────
  const placeRows = showEvents ? null : ROW_DEFS.map((row) => {
    const query = searchQuery.toLowerCase();
    const filtered = places
      .filter(row.filter)
      .filter((p) => {
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (getOwnerNote(p, lang) && getOwnerNote(p, lang)!.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => calculateRelevanceScore(b, distanceMap, campLat, campLon) - calculateRelevanceScore(a, distanceMap, campLat, campLon));

    if (filtered.length === 0) return null;
    return (
      <motion.section
        key={row.id}
        variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
      >
        <RowHeader emoji={row.emoji} title={row.title[lang]} subtitle={row.subtitle[lang]} count={filtered.length} />
        {viewMode === "grid" ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 scrollbar-hide">
            {filtered.map((place) => {
              const partner = partnerByPlaceId.get(place.id);
              return (
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
                  activePartner={partner ?? null}
                  weatherBadge={!searchQuery && place.id === weatherTipId ? weatherBadgeText : null}
                />
              );
            })}
            <div className="w-2 shrink-0" />
          </div>
        ) : (
          <div className="flex flex-col mb-4">
            {filtered.map((place) => {
              const partner = partnerByPlaceId.get(place.id);
              return (
                <ListViewRow
                  key={place.id}
                  place={place}
                  lang={lang}
                  distance={resolveDistance(place, distanceMap, campLat, campLon)}
                  onDirectionsClick={onDirectionsClick}
                  activePartner={partner ?? null}
                  isWeatherTip={!searchQuery && place.id === weatherTipId}
                />
              );
            })}
          </div>
        )}
      </motion.section>
    );
  }).filter(Boolean);

  return (
    <div className="relative pb-24">
      {/* ── Filter pills, search, & view toggle ────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1">
            <FilterPill active={!showEvents} onPress={() => { setShowEvents(false); setSearchQuery(""); }} label="🗺️ Explore" isExplore />
            {eventAnnouncements.length > 0 && (
              <FilterPill
                active={showEvents}
                onPress={() => { setShowEvents(true); setSearchQuery(""); }}
                label={`${EVENT_LABELS[lang]} (${eventAnnouncements.length})`}
                icon={Calendar}
              />
            )}
          </div>
          {!showEvents && (
            <div className="ml-auto flex shrink-0 items-center gap-1 bg-stone-100/80 rounded-full p-1 border border-stone-200/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === "grid" ? "bg-white text-[var(--brand)] shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === "list" ? "bg-white text-[var(--brand)] shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>

        {!showEvents && (
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={16} className="text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök platser..."
              className="w-full h-10 pl-10 pr-10 rounded-full border-0 outline-none focus:ring-2 focus:ring-[var(--brand)] text-[14px] text-stone-900 placeholder:text-stone-500 transition-all shadow-inner"
              style={{ backgroundColor: "var(--surface-subtle, #f5f5f4)" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Events view (DF2) ────────────────────────────────────────── */}
      {showEvents && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {eventAnnouncements.length === 0 ? (
            <div className="rounded-2xl bg-white border border-stone-200/75 shadow-sm px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
                <Megaphone size={22} className="text-stone-400" />
              </div>
              <p className="text-base font-bold text-stone-700">No events right now</p>
            </div>
          ) : (
            eventAnnouncements.map((ann) => {
              const eventDate = ann.expires_at ? new Date(ann.expires_at).toLocaleDateString(lang, { day: 'numeric', month: 'short' }) : new Date(ann.created_at).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
              return (
                <div key={ann.id} className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 flex flex-col gap-1.5 border-b border-stone-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2" style={{ color: "var(--brand, #059669)" }}>
                        <CalendarDays size={16} />
                        <span className="text-[11px] font-bold tracking-wider">{EVENT_LABELS[lang]}</span>
                      </div>
                      {ann.expires_at && (
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                          Till {new Date(ann.expires_at).toLocaleDateString("sv-SE", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <h4 className="text-[15px] font-[600] text-stone-900 mb-1.5">{ann.translations?.[lang as "en" | "de" | "da" | "nl" | "no"]?.title ?? ann.title}</h4>
                    <p className="text-[14px] text-stone-500 leading-relaxed text-balance whitespace-pre-line">{ann.translations?.[lang as "en" | "de" | "da" | "nl" | "no"]?.content ?? ann.content}</p>
                    {eventDate && !ann.expires_at && (
                      <p className="text-[11px] font-medium text-stone-400 mt-3">
                        {new Date(ann.created_at).toLocaleDateString("sv-SE", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ── Place rows ───────────────────────────────────────────────── */}
      {!showEvents && (
        <motion.div
          className="space-y-5"
          variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
          initial="initial"
          animate="animate"
        >
          {placeRows && placeRows.length > 0 ? (
            placeRows
          ) : (
            <motion.div variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}>
              {searchQuery ? (
                <EmptyState title={`Inga platser hittades för "${searchQuery}"`} subtitle="Testa en annan sökning eller rensa filtret." />
              ) : (
                <EmptyState title={l.noPlaces} subtitle={l.noPlacesSub} />
              )}
            </motion.div>
          )}

          {/* ── Unlinked partner row (moved to bottom) ──────────────── */}
          {!searchQuery && unlinkedPartners.length > 0 && (
            <motion.section className="mt-6 pb-20" variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}>
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Fler erbjudanden</span>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
                {unlinkedPartners.map(p => (
                  <UnlinkedPartnerCard key={p.id} partner={p} />
                ))}
                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}
        </motion.div>
      )}

      {/* ── FAB: "Plan my day ✦" (UP2 pattern) ──────────────────────── */}
      {!showEvents && !sheetOpen && (
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-xl transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 70%, #7C3AED) 100%)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--brand) 40%, transparent)",
          }}
        >
          <Sparkles size={16} />
          {PLAN_LABELS[lang]}
        </button>
      )}

      {/* ── AI Planner Bottom Sheet (UP1 — uses .bottom-sheet CSS base class from globals.css step 1) */}
      {mounted && sheetOpen && createPortal(
        <div className="bottom-sheet-overlay" data-open="true" style={{ "--brand": campground.primary_color || "#059669" } as React.CSSProperties}>
          <div className="bottom-sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="bottom-sheet-panel">
            <div className="bottom-sheet-handle" />
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {new Date().toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <h2 className="text-lg font-bold text-stone-900 mt-0.5 flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--brand)]" />
                  {PLAN_LABELS[lang]}
                </h2>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
                aria-label={CLOSE_LABELS[lang]}
              >
                <X size={18} />
              </button>
            </div>

            {/* Weather context banner */}
            {weather?.isRaining && (
              <div className="mx-4 mt-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🌧️</span>
                <p className="text-sm text-sky-800 font-medium">
                  {lang === "sv" ? "Regn förväntas — vi rekommenderar inomhusaktiviteter idag."
                    : lang === "de" ? "Regen erwartet — wir empfehlen Innenaktivitäten."
                      : "Rain expected — we recommend indoor activities today."}
                </p>
              </div>
            )}

            {/* Itinerary timeline blocks */}
            <div className="px-4 py-4 space-y-3">
              {isLoadingPlan ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent"></div>
                </div>
              ) : plan && plan.length > 0 ? (
                plan.map((item, i) => {
                  const labels: Record<string, Record<Lang, string>> = {
                    morning: MORNING_LABELS,
                    lunch: LUNCH_LABELS,
                    afternoon: AFTERNOON_LABELS,
                    evening: EVENING_LABELS,
                  };
                  const periodLabel = labels[item.period]?.[lang] ?? item.period;

                  return (
                    <div key={i} className="flex items-start gap-3 bg-stone-50/80 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-xl">
                        {item.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)]">
                          {periodLabel} &bull; {item.time}
                        </p>
                        <p className="text-[14px] font-bold text-stone-900 mt-0.5 truncate">{item.title}</p>
                        <p className="text-[12.5px] text-stone-600 mt-1 leading-relaxed">{item.description}</p>
                        {item.tip && (
                          <div className="mt-2 rounded-lg bg-white/60 px-2.5 py-2 border border-stone-200/50">
                            <p className="text-[11px] font-semibold text-stone-700 leading-relaxed text-balance">
                              <span className="text-[12px] align-text-bottom text-stone-500 mr-1">💡</span>
                              {item.tip}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : plan && plan.length === 0 ? (
                <p className="text-center text-sm text-stone-400 py-6">
                  {lang === "sv" ? "Inget förslag tillgängligt" :
                    lang === "de" ? "Kein Plan verfügbar" :
                      lang === "da" ? "Ingen plan tilgængelig" :
                        lang === "nl" ? "Geen plan beschikbaar" :
                          lang === "no" ? "Ingen plan tilgjengelig" :
                            "No plan available"}
                </p>
              ) : (
                <p className="text-center text-sm text-stone-500 py-6">
                  {lang === "sv" ? "Kunde inte skapa en plan. Försök igen senare." :
                    lang === "de" ? "Konnte keinen Plan erstellen. Versuchen Sie es später." :
                      lang === "da" ? "Kunne ikke oprette en plan. Prøv igen senere." :
                        lang === "nl" ? "Kon geen plan maken. Probeer het later opnieuw." :
                          lang === "no" ? "Kunne ikke lage en plan. Prøv igjen senere." :
                            "Could not create a plan. Try again later."}
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

/* ── Sub-components (preserved from UtforskaTab) ──────────────────────── */

function FilterPill({ active, onPress, label, isExplore, icon: Icon }: { active: boolean; onPress: () => void; label: string; isExplore?: boolean; icon?: React.ElementType }) {
  return (
    <button
      onClick={onPress}
      className={`flex items-center gap-1.5 shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all border ${active
        ? `bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm ${isExplore ? "underline underline-offset-4 decoration-2 decoration-white/40" : ""}`
        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
        }`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

function RowHeader({ emoji, title, subtitle, count }: { emoji: string; title: string; subtitle: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-3 px-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg">{emoji}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">{subtitle}</p>
        <h3 className="text-sm font-bold tracking-tight text-stone-900 leading-tight">{title}</h3>
      </div>
      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-500">{count}</span>
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
      <p className="mx-auto mt-1.5 max-w-[220px] text-sm text-stone-500 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function SaveButton({ saved, onToggleSave }: { saved: boolean; onToggleSave: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSave(); }}
      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white/90 hover:bg-white shadow-sm transition-all"
    >
      <Heart size={14} fill={saved ? "#ef4444" : "none"} className={saved ? "text-red-500" : "text-stone-400"} />
    </button>
  );
}

/* ── Unlinked partner card ───────────────────────────────────────────── */
function UnlinkedPartnerCard({ partner }: { partner: PromotedPartner }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = partner.business_name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");

  const handleCopy = () => {
    if (partner.coupon_code) {
      navigator.clipboard.writeText(partner.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardInner = (
    <div className="flex w-[200px] shrink-0 snap-start flex-col rounded-2xl bg-white border border-stone-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover border border-stone-100"
          />
        ) : (
          <div
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: "var(--brand, #059669)" }}
          >
            {initials}
          </div>
        )}
        <p className="flex-1 min-w-0 text-[13px] font-semibold text-stone-900 leading-tight truncate">
          {partner.business_name}
        </p>
      </div>

      {/* Description */}
      {partner.description && (
        <p className="px-3 pb-2 text-[11.5px] text-stone-500 leading-snug line-clamp-1">
          {partner.description}
        </p>
      )}

      {/* Coupon */}
      {partner.coupon_code && (
        <div className="px-3 pb-3">
          {!revealed ? (
            <button
              onClick={e => { e.stopPropagation(); setRevealed(true); }}
              className="w-full rounded-xl border border-dashed border-amber-500 py-1.5 text-[11px] font-bold text-amber-600 hover:bg-amber-50 transition-colors"
            >
              🤝 Avslöja rabatt
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 pl-3 pr-1.5 py-1.5">
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest leading-none mb-0.5">Rabattkod</span>
                <code className="text-[12px] font-black tracking-widest text-amber-700 leading-none">{partner.coupon_code}</code>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleCopy(); }}
                className="h-7 w-7 flex items-center justify-center bg-white border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors shadow-sm"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spacer when no coupon to keep card height consistent */}
      {!partner.coupon_code && <div className="pb-3" />}
    </div>
  );

  if (partner.website_url) {
    return (
      <a
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-transform active:scale-[0.98]"
      >
        {cardInner}
      </a>
    );
  }
  return <div>{cardInner}</div>;
}

function PartnerBadge({ coupon }: { coupon?: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (coupon) {
      navigator.clipboard.writeText(coupon);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-2">
      {!revealed ? (
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
          className="w-full rounded-xl border border-dashed border-amber-500 py-2 text-[11px] font-bold text-amber-600 hover:bg-amber-50 transition-colors"
        >
          🤝 Partnererbjudande — Avslöja rabatt
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 pl-3 pr-1.5 py-1.5">
          <div className="flex flex-col items-start pt-0.5">
            <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest leading-none mb-0.5">Rabattkod</span>
            <code className="text-sm font-black tracking-widest text-amber-700 leading-none">{coupon ?? "INGEN KOD"}</code>
          </div>
          {coupon && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="h-8 w-8 flex items-center justify-center bg-white border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors shadow-sm"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HoursBlock({ place, labels: l }: { place: CachedPlace; labels: UtforskaLabels }) {
  if (place.custom_hours) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
        <span className="text-[12px] font-semibold text-stone-600">Info <span className="font-normal text-stone-400">{place.custom_hours}</span></span>
      </div>
    );
  }
  const hours = getOpeningHoursDisplay(place.raw_data, l);
  if (!hours) return null;
  const isOpen = hours.dotColor === "bg-emerald-500";
  const isClosedToday = hours.dotColor === "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${hours.dotColor}`} />
      <span className={`text-[12px] font-bold ${isOpen ? "text-emerald-700" : isClosedToday ? "text-red-500" : "text-stone-500"}`}>{hours.statusText}</span>
      {hours.text !== hours.statusText && <span className="text-[11px] text-stone-400">{hours.text}</span>}
    </div>
  );
}

function PlaceCardRouter(props: CardProps) {
  const { place } = props;
  if (["beach", "park", "swimming"].includes(place.category)) return <NatureCard {...props} />;
  if (["restaurant", "cafe"].includes(place.category)) return <FoodCard {...props} />;
  return <ActivityCard {...props} />;
}

function ListViewRow({
  place,
  distance,
  lang,
  activePartner,
  onDirectionsClick,
  isWeatherTip,
}: Omit<CardProps, "saved" | "onToggleSave" | "emoji" | "labels" | "isSwedish" | "weatherBadge"> & { activePartner?: PromotedPartner | null; onDirectionsClick?: (id: string) => void; isWeatherTip?: boolean }) {
  const cfg = getCat(place.category);
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const l = utforskaLabels[lang];

  let dotColor = "bg-stone-300";
  if (place.custom_hours) {
    dotColor = "bg-sky-400";
  } else {
    const hours = getOpeningHoursDisplay(place.raw_data, l);
    if (hours) dotColor = hours.dotColor;
  }

  return (
    <div
      className="flex items-center gap-3 py-[12px] h-[56px] border-b border-stone-100 last:border-0 cursor-pointer transition-colors hover:bg-stone-50/50 active:bg-stone-100"
      onClick={() => {
        if (canNavigate) {
          onDirectionsClick?.(place.id);
          window.open(mapLink, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <div className="w-8 h-8 shrink-0 flex items-center justify-center text-[24px]">
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-[14px] font-medium text-stone-900 truncate flex items-center gap-1">
          {isWeatherTip && <span className="text-[12px] leading-none">✨</span>}
          {place.is_pinned && <Star size={11} className="text-amber-500 shrink-0" fill="currentColor" />}
          <span className="truncate">{place.name}</span>
        </h4>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {activePartner && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        <span className="text-[12px] text-stone-500">{distance || "–"}</span>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      </div>
    </div>
  );
}

const STAFF_PICK: Record<Lang, string> = { sv: "Rekommenderas", en: "Recommended", de: "Empfohlen", da: "Anbefalet", nl: "Aanbevolen", no: "Anbefalt" };

function NatureCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[96px]`}>
        <span className="absolute -right-2 -bottom-4 text-[90px] opacity-[0.15] select-none pointer-events-none leading-none rotate-6">{cfg.emoji}</span>
        <span className="absolute left-3 top-2 text-[28px] opacity-[0.12] select-none pointer-events-none">{cfg.emoji}</span>
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 items-start">
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
            {!place.is_on_site && distance && <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80"><Navigation size={9} />{distance}</span>}
            {place.is_on_site && <span className="inline-flex items-center gap-1 bg-emerald-100/90 backdrop-blur-sm text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">📍 På området</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">{place.name}</h4>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">“{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}”</p>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && (
          <div className="mt-auto pt-1">
            <a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}>
              <Navigation size={13} /> {l.hitaHit}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FoodCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[80px]`}>
        <span className="absolute -right-2 -bottom-4 text-[80px] opacity-[0.15] select-none pointer-events-none leading-none">{cfg.emoji}</span>
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 items-start">
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {place.rating != null && <span className="inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80"><Star size={9} className="text-amber-500" fill="currentColor" /> {place.rating.toFixed(1)}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">{place.name}</h4>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">“{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}”</p>}
        {place.is_on_site ? <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">📍 På området</span> : <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700"><Navigation size={9} className="text-stone-400" />{distance || "–"}</span>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && <div className="mt-auto pt-1"><a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}><ExternalLink size={13} /> {l.hitaHit}</a></div>}
      </div>
    </div>
  );
}

function ActivityCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden px-4 pt-3.5 pb-8`}>
        <span className="absolute -right-2 top-0 text-[72px] opacity-[0.15] select-none pointer-events-none leading-none">{cfg.emoji}</span>
        <div className="relative flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col gap-1.5 items-start">
            <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-600 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20 shadow-sm">{cfg.emoji} Aktivitet</span>
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
        <h4 className="relative text-[15px] font-bold leading-snug text-stone-900 max-w-[200px]">{place.name}</h4>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white" style={{ borderRadius: "55% 55% 0 0 / 100% 100% 0 0" }} />
        <div className="absolute bottom-[-9px] left-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
        <div className="absolute bottom-[-9px] right-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">“{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}”</p>}
        {place.is_on_site ? <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">📍 På området</span> : <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700"><Navigation size={9} className="text-stone-400" />{distance || "–"}</span>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && <div className="mt-auto pt-1"><a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}><MapPin size={13} /> {l.hitaHit}</a></div>}
      </div>
    </div>
  );
}
