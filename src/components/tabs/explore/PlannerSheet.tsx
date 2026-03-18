// components/tabs/explore/PlannerSheet.tsx
"use client";

import { getAiPlan, type ItineraryItem, type PlanLang } from "@/app/camp/[slug]/ai-action";
import type { RoadDistanceMap } from "@/lib/routing";
import type { CachedPlace, Campground } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { Sparkles, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AFTERNOON_LABELS, CLOSE_LABELS, EVENING_LABELS, LUNCH_LABELS, MORNING_LABELS, PLAN_LABELS } from "./types";

interface PlannerSheetProps {
  campground: Campground;
  places: CachedPlace[];
  weather: WeatherProp | null | undefined;
  lang: Lang;
  distanceMap: RoadDistanceMap;
  showEvents: boolean;
}

export function PlannerSheet({
  campground,
  places,
  weather,
  lang,
  distanceMap,
  showEvents,
}: PlannerSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<ItineraryItem[] | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

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

  return (
    <>
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
    </>
  );
}
