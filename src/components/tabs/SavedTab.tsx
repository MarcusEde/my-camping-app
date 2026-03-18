// src/components/tabs/SavedTab.tsx
"use client";

import type { RoadDistanceMap } from "@/lib/routing";
import type { CachedPlace } from "@/types/database";
import type { Lang } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Heart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EMOJI: Record<string, string> = {
  beach: "🏖️", cafe: "☕", restaurant: "🍽️", park: "🌲", shopping: "🛒",
  bowling: "🎳", museum: "🏛️", swimming: "🏊", cinema: "🎬", spa: "💆",
  activity: "🎯", playground: "🛝", sports: "🏸", attraction: "🎡", other: "📍",
};

const LABELS: Record<Lang, { title: string; empty: string; emptySub: string; onSite: string; remove: string; directions: string; closedToday: string; openNow: string; closedNow: string }> = {
  sv: { title: "Sparade platser", empty: "Inga sparade platser än", emptySub: "Hjärta ♥ platser i Utforska-fliken för att spara dem här.", onSite: "På området", remove: "Ta bort", directions: "Visa vägen", closedToday: "Stängt idag", openNow: "Öppet", closedNow: "Stängt nu" },
  en: { title: "Saved places", empty: "No saved places yet", emptySub: "Heart ♥ places in the Explore tab to save them here.", onSite: "On site", remove: "Remove", directions: "Directions", closedToday: "Closed today", openNow: "Open", closedNow: "Closed now" },
  de: { title: "Gespeicherte Orte", empty: "Noch keine gespeicherten Orte", emptySub: "Markieren Sie ♥ Orte im Entdecken-Tab.", onSite: "Vor Ort", remove: "Entfernen", directions: "Route", closedToday: "Heute geschlossen", openNow: "Geöffnet", closedNow: "Jetzt geschlossen" },
  da: { title: "Gemte steder", empty: "Ingen gemte steder endnu", emptySub: "Hjerter ♥ steder i Udforsk-fanen for at gemme dem.", onSite: "På pladsen", remove: "Fjern", directions: "Find vej", closedToday: "Lukket i dag", openNow: "Åben", closedNow: "Lukket nu" },
  nl: { title: "Opgeslagen plekken", empty: "Nog geen opgeslagen plekken", emptySub: "Hart ♥ plekken in de Verkennen-tab.", onSite: "Op terrein", remove: "Verwijderen", directions: "Route", closedToday: "Gesloten", openNow: "Open", closedNow: "Nu gesloten" },
  no: { title: "Lagrede steder", empty: "Ingen lagrede steder ennå", emptySub: "Hjerter ♥ steder i Utforsk-fanen.", onSite: "På plassen", remove: "Fjern", directions: "Finn vei", closedToday: "Stengt i dag", openNow: "Åpent", closedNow: "Stengt nå" },
};

export default function SavedTab({ savedIds, places, distanceMap, removeSaved, onDirectionsClick, lang }: {
  savedIds: string[];
  places: CachedPlace[];
  distanceMap: RoadDistanceMap;
  removeSaved: (id: string) => void;
  onDirectionsClick?: (id: string) => void;
  lang: Lang;
}) {
  const l = LABELS[lang];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const savedPlaces = useMemo(() => {
    if (!mounted || !savedIds || savedIds.length === 0) return [];
    return savedIds
      .map((id) => places.find((p) => p.id === id))
      .filter((p): p is CachedPlace => p != null && !p.is_hidden);
  }, [mounted, savedIds, places]);

  const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  if (!mounted) return null; // Prevent hydration mismatch

  if (savedPlaces.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[calc(100svh-288px)] flex-col items-center justify-center px-8 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <Heart size={28} className="text-stone-300" />
        </div>
        <p className="mb-1 text-base font-bold text-stone-700">{l.empty}</p>
        <p className="max-w-xs text-sm leading-relaxed text-stone-400">{l.emptySub}</p>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-3 pb-10" variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="px-1 pt-1">
        <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
          {l.title} ({savedPlaces.length})
        </h2>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {savedPlaces.map((place) => {
          // FIX: Use the standard URL generation that works
          const mapLink = place.latitude && place.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=$${place.latitude},${place.longitude}`
            : place.address
              ? `https://www.google.com/maps/dir/?api=1&destination=$${encodeURIComponent(place.address)}`
              : null;

          const distance = distanceMap[place.id] ?? "";

          return (
            <motion.div
              key={place.id}
              variants={fadeUp}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              className="bg-white border border-stone-200/75 rounded-2xl shadow-sm p-4 flex items-center gap-4"
            >
              <div className="h-12 w-12 shrink-0 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center text-2xl">
                {EMOJI[place.category] ?? "📍"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-stone-900 truncate">{place.name}</p>
                <p className="text-xs font-medium text-stone-400 mt-0.5">
                  {place.is_on_site ? l.onSite : distance}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onDirectionsClick?.(place.id)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--brand-10)] text-[var(--brand)] hover:bg-[var(--brand-20)] transition-colors"
                    aria-label={l.directions}
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button
                  onClick={() => removeSaved(place.id)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label={l.remove}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
