// components/tabs/explore/FilterBar.tsx
"use client";

import type { Lang } from "@/types/guest";
import { Calendar, LayoutGrid, List, Search, X } from "lucide-react";
import React from "react";
import { EVENT_LABELS } from "./types";

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

interface FilterBarProps {
  showEvents: boolean;
  setShowEvents: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
  eventCount: number;
  lang: Lang;
}

export function FilterBar({
  showEvents,
  setShowEvents,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  eventCount,
  lang,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1">
          <FilterPill active={!showEvents} onPress={() => { setShowEvents(false); setSearchQuery(""); }} label="🗺️ Explore" isExplore />
          {eventCount > 0 && (
            <FilterPill
              active={showEvents}
              onPress={() => { setShowEvents(true); setSearchQuery(""); }}
              label={`${EVENT_LABELS[lang]} (${eventCount})`}
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
  );
}

export { FilterPill };
