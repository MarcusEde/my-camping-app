// components/tabs/explore/index.tsx
"use client";

import { ROW_DEFS } from "@/lib/explore-config";
import { calculateRelevanceScore, getFormattedDistance } from "@/lib/place-utils";
import { type RoadDistanceMap } from "@/lib/routing";
import { getOwnerNote, utforskaLabels } from "@/lib/translations";
import type { CachedPlace, PromotedPartner } from "@/types/database";
import { motion } from "framer-motion";
import { CalendarDays, Megaphone } from "lucide-react";
import React, { useState } from "react";
import { EmptyState, RowHeader } from "./EmptyState";
import { FilterBar } from "./FilterBar";
import { UnlinkedPartnerCard } from "./PartnerCard";
import { ListViewRow, PlaceCardRouter } from "./PlaceCard";
import { PlannerSheet } from "./PlannerSheet";
import { EVENT_LABELS, type ExploreTabProps } from "./types";

const NO_EVENTS_LABEL: Record<string, string> = {
  sv: "Inga evenemang just nu", en: "No events right now", de: "Keine Veranstaltungen im Moment",
  da: "Ingen begivenheder lige nu", nl: "Geen evenementen op dit moment", no: "Ingen arrangementer akkurat nå",
};

const NO_PLACES_SEARCH: Record<string, [string, string]> = {
  sv: ["Inga platser hittades för", "Testa en annan sökning eller rensa filtret."],
  en: ["No places found for", "Try another search or clear the filter."],
  de: ["Keine Orte gefunden für", "Versuche eine andere Suche oder lösche den Filter."],
  da: ["Ingen steder fundet for", "Prøv en anden søgning eller ryd filteret."],
  nl: ["Geen plaatsen gevonden voor", "Probeer een andere zoekopdracht of wis het filter."],
  no: ["Ingen steder funnet for", "Prøv et annet søk eller tøm filteret."],
};

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
}: ExploreTabProps) {
  const l = utforskaLabels[lang];
  const isSwedish = lang === "sv";
  const campLat = campground.latitude ?? 0;
  const campLon = campground.longitude ?? 0;

  // ── Events filter (DF2: only type="event" announcements live here) ───
  const [showEvents, setShowEvents] = useState(false);
  const eventAnnouncements = announcements.filter((a) => a.type === "event");

  // ── View mode state ───────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

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

    const weatherTipLabels: Record<string, [string, string, string]> = {
      sv: ["✨ Dagens tips", "🌧 Perfekt idag", "☀️ Perfekt idag"],
      en: ["✨ Today's pick", "🌧 Perfect today", "☀️ Perfect today"],
      de: ["✨ Heute empfohlen", "🌧 Perfekt heute", "☀️ Perfekt heute"],
      da: ["✨ Dagens valg", "🌧 Perfekt i dag", "☀️ Perfekt i dag"],
      nl: ["✨ Tip van de dag", "🌧 Perfect vandaag", "☀️ Perfect vandaag"],
      no: ["✨ Dagens tips", "🌧 Perfekt i dag", "☀️ Perfekt i dag"],
    };
    const [defaultTip, rainyTip, sunnyTip] = weatherTipLabels[lang] ?? weatherTipLabels.sv;
    let text = defaultTip;
    if (weather.isRaining && top.is_indoor) text = rainyTip;
    else if (!weather.isRaining && weather.temp >= 15 && !top.is_indoor) text = sunnyTip;

    return { tipId: top.id, badgeText: text };
  }, [weather, places, lang]);

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
      <FilterBar
        showEvents={showEvents}
        setShowEvents={setShowEvents}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        eventCount={eventAnnouncements.length}
        lang={lang}
      />

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
              <p className="text-base font-bold text-stone-700">{NO_EVENTS_LABEL[lang] ?? NO_EVENTS_LABEL.en}</p>
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
                <EmptyState
                  title={`${(NO_PLACES_SEARCH[lang] ?? NO_PLACES_SEARCH.en)[0]} "${searchQuery}"`}
                  subtitle={(NO_PLACES_SEARCH[lang] ?? NO_PLACES_SEARCH.en)[1]}
                />
              ) : (
                <EmptyState title={l.noPlaces} subtitle={l.noPlacesSub} />
              )}
            </motion.div>
          )}

          {/* ── Unlinked partner row (moved to bottom) ──────────────── */}
          {!searchQuery && unlinkedPartners.length > 0 && (
            <motion.section className="mt-6 pb-20" variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}>
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {{ sv: "Fler erbjudanden", en: "More offers", de: "Weitere Angebote", da: "Flere tilbud", nl: "Meer aanbiedingen", no: "Flere tilbud" }[lang] ?? "More offers"}
                </span>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
                {unlinkedPartners.map(p => (
                  <UnlinkedPartnerCard key={p.id} partner={p} lang={lang} />
                ))}
                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}
        </motion.div>
      )}

      {/* ── FAB + AI Planner Bottom Sheet ────────────────────────────── */}
      <PlannerSheet
        campground={campground}
        places={places}
        weather={weather}
        lang={lang}
        distanceMap={distanceMap}
        showEvents={showEvents}
      />
    </div>
  );
}
