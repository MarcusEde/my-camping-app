"use client";

import { usePlacesManager } from "@/lib/hooks/usePlacesManager";
import { hexToRgba } from "@/lib/utils";
import type { CachedPlace, Campground, PlaceCategory } from "@/types/database";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  Umbrella,
  X,
} from "lucide-react";
import React from "react";

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */
const CATEGORY_META: Record<PlaceCategory, { emoji: string; label: string }> = {
  restaurant: { emoji: "🍽️", label: "Restaurang" },
  cafe: { emoji: "☕", label: "Café" },
  beach: { emoji: "🏖️", label: "Strand" },
  park: { emoji: "🌲", label: "Natur" },
  museum: { emoji: "🏛️", label: "Museum" },
  bowling: { emoji: "🎳", label: "Bowling" },
  swimming: { emoji: "🏊", label: "Bad" },
  shopping: { emoji: "🛒", label: "Shopping" },
  cinema: { emoji: "🎬", label: "Bio" },
  spa: { emoji: "💆", label: "Spa" },
  activity: { emoji: "🎯", label: "Aktivitet" },
  playground: { emoji: "🛝", label: "Lekplats" },
  sports: { emoji: "🏸", label: "Sport" },
  attraction: { emoji: "🎡", label: "Attraktion" },
  other: { emoji: "📍", label: "Övrigt" },
};

const CATEGORY_GROUPS: { label: string; categories: PlaceCategory[] }[] = [
  { label: "Mat & dryck", categories: ["restaurant", "cafe"] },
  {
    label: "Natur & friluftsliv",
    categories: ["beach", "park", "playground", "sports"],
  },
  { label: "Kultur & nöje", categories: ["museum", "cinema", "attraction"] },
  {
    label: "Aktiviteter",
    categories: ["bowling", "swimming", "spa", "activity"],
  },
  { label: "Övrigt", categories: ["shopping", "other"] },
];

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as PlaceCategory[];

/* ═══════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════ */
interface Props {
  campground: Campground;
  places: CachedPlace[];
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function PlacesManager({ campground, places }: Props) {
  const s = usePlacesManager({ campground, places });

  return (
    <div className="space-y-5">
      {/* ━━━ TOP BAR: Search + Actions ━━━ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={s.search}
            onChange={(e) => s.setSearch(e.target.value)}
            placeholder="Sök platser..."
            className="w-full rounded-lg border-0 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={s.toggleShowHidden}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] ${
              s.showHidden
                ? "bg-stone-800 text-white shadow-sm"
                : "bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
            }`}
          >
            {s.showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            Dolda
          </button>
          <button
            onClick={s.toggleShowAddForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Ny plats
          </button>
        </div>
      </div>

      {/* ━━━ MOBILE CATEGORY PILLS ━━━ */}
      <MobileCategoryPills
        availableCats={s.availableCats}
        filterCat={s.filterCat}
        categoryCounts={s.categoryCounts}
        brand={s.brand}
        onSelect={s.setFilterCat}
      />

      {/* ━━━ ADD FORM ━━━ */}
      {s.showAddForm && (
        <AddPlaceForm
          brand={s.brand}
          isPending={s.isPending}
          name={s.newName}
          onNameChange={s.setNewName}
          category={s.newCategory}
          onCategoryChange={s.setNewCategory}
          address={s.newAddress}
          onAddressChange={s.setNewAddress}
          isOnSite={s.newIsOnSite}
          onToggleIsOnSite={s.toggleNewIsOnSite}
          isIndoor={s.newIsIndoor}
          onToggleIsIndoor={s.toggleNewIsIndoor}
          customHours={s.newCustomHours}
          onCustomHoursChange={s.setNewCustomHours}
          isValid={s.isAddFormValid}
          onAdd={s.handleAddPlace}
          onClose={s.closeAddForm}
        />
      )}

      {/* ━━━ DESKTOP SIDEBAR + GRID ━━━ */}
      <div className="flex gap-6">
        <DesktopSidebar
          filterCat={s.filterCat}
          categoryCounts={s.categoryCounts}
          brand={s.brand}
          onSelect={s.setFilterCat}
        />

        <div className="min-w-0 flex-1">
          <FilterStatus
            count={s.filtered.length}
            filterCat={s.filterCat}
            onClear={s.clearFilter}
          />

          {s.filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
              {s.filtered.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  brand={s.brand}
                  isBusy={s.actioningId === place.id}
                  isPending={s.isPending}
                  isEditingNote={s.editingNoteId === place.id}
                  noteText={s.editingNoteText}
                  onNoteTextChange={s.setEditingNoteText}
                  onToggleNoteEdit={() => s.handleToggleNoteEdit(place)}
                  onCancelNoteEdit={s.handleCancelNoteEdit}
                  onSaveNote={() => s.handleSaveNote(place.id)}
                  isEditingDetails={s.editingDetailsId === place.id}
                  isEditDetailsValid={s.getIsEditDetailsValid(place)}
                  editIsOnSite={s.editIsOnSite}
                  onToggleEditIsOnSite={s.toggleEditIsOnSite}
                  editIsIndoor={s.editIsIndoor}
                  onToggleEditIsIndoor={s.toggleEditIsIndoor}
                  editCustomHours={s.editCustomHours}
                  onEditCustomHoursChange={s.setEditCustomHours}
                  onToggleDetailsEdit={() => s.handleToggleDetailsEdit(place)}
                  onCancelDetailsEdit={s.handleCancelDetailsEdit}
                  onSaveDetails={() => s.handleSaveDetails(place.id)}
                  onTogglePin={() =>
                    s.handleTogglePin(place.id, place.is_pinned)
                  }
                  onToggleHide={() =>
                    s.handleToggleHide(place.id, place.is_hidden)
                  }
                  onDelete={() => s.handleDelete(place.id, place.name)}
                />
              ))}
            </div>
          ) : (
            <EmptyState hasSearch={!!s.search} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Mobile Category Pills
   ═══════════════════════════════════════════════════════ */
function MobileCategoryPills({
  availableCats,
  filterCat,
  categoryCounts,
  brand,
  onSelect,
}: {
  availableCats: (PlaceCategory | "all")[];
  filterCat: PlaceCategory | "all";
  categoryCounts: Record<string, number>;
  brand: string;
  onSelect: (cat: PlaceCategory | "all") => void;
}) {
  return (
    <div className="lg:hidden">
      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-1">
        {availableCats.map((cat) => {
          const meta =
            cat === "all" ? { emoji: "🗺️", label: "Alla" } : CATEGORY_META[cat];
          const isActive = filterCat === cat;
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              <span className="text-sm">{meta.emoji}</span>
              {meta.label}
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Desktop Sidebar
   ═══════════════════════════════════════════════════════ */
function DesktopSidebar({
  filterCat,
  categoryCounts,
  brand,
  onSelect,
}: {
  filterCat: PlaceCategory | "all";
  categoryCounts: Record<string, number>;
  brand: string;
  onSelect: (cat: PlaceCategory | "all") => void;
}) {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-4 rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
        <SidebarButton
          emoji="🗺️"
          label="Alla platser"
          count={categoryCounts.all ?? 0}
          isActive={filterCat === "all"}
          brand={brand}
          onClick={() => onSelect("all")}
        />

        {CATEGORY_GROUPS.map((group) => {
          const groupCats = group.categories.filter(
            (c) => (categoryCounts[c] ?? 0) > 0,
          );
          if (groupCats.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="mx-2 my-1.5 border-t border-stone-100" />
              <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {group.label}
              </p>
              {groupCats.map((cat) => (
                <SidebarButton
                  key={cat}
                  emoji={CATEGORY_META[cat].emoji}
                  label={CATEGORY_META[cat].label}
                  count={categoryCounts[cat] ?? 0}
                  isActive={filterCat === cat}
                  brand={brand}
                  onClick={() => onSelect(cat)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════
   Filter Status Bar
   ═══════════════════════════════════════════════════════ */
function FilterStatus({
  count,
  filterCat,
  onClear,
}: {
  count: number;
  filterCat: PlaceCategory | "all";
  onClear: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-semibold text-stone-500">
        {count} {count === 1 ? "plats" : "platser"}
        {filterCat !== "all" && (
          <span className="ml-1 text-stone-400">
            i {CATEGORY_META[filterCat]?.label?.toLowerCase() ?? filterCat}
          </span>
        )}
      </p>
      {filterCat !== "all" && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-400 transition-colors hover:text-stone-700"
        >
          <X size={12} />
          Rensa filter
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════ */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-14">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
        <MapPin size={20} className="text-stone-400" />
      </div>
      <p className="text-sm font-semibold text-stone-700">
        {hasSearch ? "Inga träffar" : "Inga platser tillagda"}
      </p>
      <p className="mt-1 max-w-[240px] text-center text-xs leading-relaxed text-stone-500">
        {hasSearch
          ? "Prova ett annat sökord eller rensa filtret."
          : 'Klicka på "Ny plats" för att lägga till din första!'}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sidebar Button
   ═══════════════════════════════════════════════════════ */
function SidebarButton({
  emoji,
  label,
  count,
  isActive,
  brand,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  isActive: boolean;
  brand: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all active:scale-[0.98] ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "text-stone-600 hover:bg-stone-50"
      }`}
    >
      <span className="text-sm">{emoji}</span>
      <span
        className={`flex-1 text-xs font-semibold ${
          isActive ? "text-emerald-700" : "text-stone-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`min-w-[22px] rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold ${
          isActive
            ? "bg-emerald-100 text-emerald-600"
            : "bg-stone-100 text-stone-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Place Card
   ═══════════════════════════════════════════════════════ */
interface PlaceCardProps {
  place: CachedPlace;
  brand: string;
  isBusy: boolean;
  isPending: boolean;
  isEditingNote: boolean;
  noteText: string;
  onNoteTextChange: (v: string) => void;
  onToggleNoteEdit: () => void;
  onCancelNoteEdit: () => void;
  onSaveNote: () => void;
  isEditingDetails: boolean;
  isEditDetailsValid: boolean;
  editIsOnSite: boolean;
  onToggleEditIsOnSite: () => void;
  editIsIndoor: boolean;
  onToggleEditIsIndoor: () => void;
  editCustomHours: string;
  onEditCustomHoursChange: (v: string) => void;
  onToggleDetailsEdit: () => void;
  onCancelDetailsEdit: () => void;
  onSaveDetails: () => void;
  onTogglePin: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
}

function PlaceCard({
  place,
  brand,
  isBusy,
  isPending,
  isEditingNote,
  noteText,
  onNoteTextChange,
  onToggleNoteEdit,
  onCancelNoteEdit,
  onSaveNote,
  isEditingDetails,
  isEditDetailsValid,
  editIsOnSite,
  onToggleEditIsOnSite,
  editIsIndoor,
  onToggleEditIsIndoor,
  editCustomHours,
  onEditCustomHoursChange,
  onToggleDetailsEdit,
  onCancelDetailsEdit,
  onSaveDetails,
  onTogglePin,
  onToggleHide,
  onDelete,
}: PlaceCardProps) {
  const meta =
    CATEGORY_META[place.category as PlaceCategory] || CATEGORY_META.other;

  return (
    <div
      className={`group rounded-xl ring-1 transition-all ${
        place.is_hidden
          ? "bg-stone-50/60 opacity-60 ring-stone-200/60"
          : place.is_pinned
            ? "bg-white ring-emerald-200 shadow-sm"
            : "bg-white ring-stone-200 hover:shadow-sm"
      } ${isBusy ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          {/* Emoji badge */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-50 text-lg ring-1 ring-stone-100">
            {meta.emoji}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate text-sm font-semibold text-stone-800">
                {place.name}
              </h4>
              {place.is_pinned && (
                <StatusBadge
                  icon={<Star size={8} fill="currentColor" />}
                  label="Rekommenderad"
                  variant="emerald"
                />
              )}
              {place.is_hidden && <StatusBadge label="Dold" variant="stone" />}
              {!place.google_place_id && (
                <StatusBadge label="Egen plats" variant="brand" brand={brand} />
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {place.address && (
                <p className="flex items-center gap-1 text-xs text-stone-500">
                  <MapPin size={10} className="shrink-0 text-stone-400" />
                  <span className="truncate">{place.address}</span>
                </p>
              )}
              {place.is_on_site && (
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <Home size={10} className="shrink-0" />
                  På området
                </p>
              )}
              {place.is_indoor && (
                <p className="flex items-center gap-1 text-xs text-indigo-500">
                  <Umbrella size={10} className="shrink-0" />
                  Inomhus
                </p>
              )}
              {place.custom_hours && (
                <p className="flex items-center gap-1 text-xs text-stone-500">
                  <Clock size={10} className="shrink-0 text-stone-400" />
                  {place.custom_hours}
                </p>
              )}
            </div>

            {place.owner_note && !isEditingNote && (
              <p className="mt-1.5 text-xs italic leading-relaxed text-stone-400">
                &ldquo;{place.owner_note}&rdquo;
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            <PlaceAction
              title={
                place.is_pinned ? "Ta bort rekommendation" : "Rekommendera"
              }
              isActive={place.is_pinned}
              onClick={onTogglePin}
              disabled={isBusy}
            >
              <Star
                size={14}
                fill={place.is_pinned ? "currentColor" : "none"}
                className={
                  place.is_pinned
                    ? "text-emerald-500"
                    : "text-stone-300 group-hover/action:text-amber-500"
                }
              />
            </PlaceAction>

            <PlaceAction
              title={place.is_hidden ? "Visa för gäster" : "Dölj för gäster"}
              isActive={place.is_hidden}
              onClick={onToggleHide}
              disabled={isBusy}
            >
              {place.is_hidden ? (
                <Eye size={14} className="text-stone-500" />
              ) : (
                <EyeOff
                  size={14}
                  className="text-stone-300 group-hover/action:text-stone-500"
                />
              )}
            </PlaceAction>

            <PlaceAction
              title="Skriv tips till gästerna"
              isActive={isEditingNote}
              onClick={onToggleNoteEdit}
            >
              <MessageCircle
                size={14}
                className={
                  isEditingNote
                    ? "text-emerald-500"
                    : "text-stone-300 group-hover/action:text-stone-500"
                }
              />
            </PlaceAction>

            <PlaceAction
              title="Öppettider & plats"
              isActive={isEditingDetails}
              onClick={onToggleDetailsEdit}
            >
              <Settings2
                size={14}
                className={
                  isEditingDetails
                    ? "text-emerald-500"
                    : "text-stone-300 group-hover/action:text-stone-500"
                }
              />
            </PlaceAction>

            {!place.google_place_id && (
              <PlaceAction
                title="Ta bort"
                onClick={onDelete}
                disabled={isBusy}
                dangerHover
              >
                <Trash2 size={14} />
              </PlaceAction>
            )}
          </div>
        </div>
      </div>

      {/* Note editor */}
      {isEditingNote && (
        <div className="border-t border-stone-100 px-4 py-3">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Tips till gästerna
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              placeholder="T.ex. Boka bord i förväg på helger!"
              autoFocus
              className="flex-1 rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveNote();
                if (e.key === "Escape") onCancelNoteEdit();
              }}
            />
            <button
              onClick={onCancelNoteEdit}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
            >
              Avbryt
            </button>
            <button
              onClick={onSaveNote}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} strokeWidth={2.5} />
              )}
              Spara
            </button>
          </div>
        </div>
      )}

      {/* Details editor */}
      {isEditingDetails && (
        <DetailsEditor
          brand={brand}
          isPending={isPending}
          isBusy={isBusy}
          isValid={isEditDetailsValid}
          isOnSite={editIsOnSite}
          onToggleIsOnSite={onToggleEditIsOnSite}
          isIndoor={editIsIndoor}
          onToggleIsIndoor={onToggleEditIsIndoor}
          customHours={editCustomHours}
          onCustomHoursChange={onEditCustomHoursChange}
          onCancel={onCancelDetailsEdit}
          onSave={onSaveDetails}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Details Editor
   ═══════════════════════════════════════════════════════ */
function DetailsEditor({
  brand,
  isPending,
  isBusy,
  isValid,
  isOnSite,
  onToggleIsOnSite,
  isIndoor,
  onToggleIsIndoor,
  customHours,
  onCustomHoursChange,
  onCancel,
  onSave,
}: {
  brand: string;
  isPending: boolean;
  isBusy: boolean;
  isValid: boolean;
  isOnSite: boolean;
  onToggleIsOnSite: () => void;
  isIndoor: boolean;
  onToggleIsIndoor: () => void;
  customHours: string;
  onCustomHoursChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="border-t border-stone-100 px-4 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Platsinställningar
      </p>

      <div className="space-y-2.5">
        {/* On-site toggle */}
        <button
          onClick={onToggleIsOnSite}
          className="flex w-full items-center gap-3 rounded-lg bg-stone-50/80 p-3 ring-1 ring-stone-100 transition-all hover:bg-stone-50"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isOnSite
                ? "bg-emerald-100 text-emerald-600"
                : "bg-stone-100 text-stone-400"
            }`}
          >
            <Home size={14} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-stone-700">
              På campingområdet
            </p>
            <p className="text-[10px] text-stone-400">
              Gästerna behöver inte köra
            </p>
          </div>
          <ToggleSwitch active={isOnSite} brand={brand} />
        </button>

        {/* Indoor toggle */}
        <button
          onClick={onToggleIsIndoor}
          className="flex w-full items-center gap-3 rounded-lg bg-stone-50/80 p-3 ring-1 ring-stone-100 transition-all hover:bg-stone-50"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isIndoor
                ? "bg-indigo-100 text-indigo-600"
                : "bg-stone-100 text-stone-400"
            }`}
          >
            <Umbrella size={14} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-stone-700">
              Inomhusaktivitet
            </p>
            <p className="text-[10px] text-stone-400">
              Föreslås vid regn av AI-planeraren
            </p>
          </div>
          <ToggleSwitch active={isIndoor} brand={brand} />
        </button>

        {/* Custom hours */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Öppettider
          </label>
          <input
            type="text"
            value={customHours}
            onChange={(e) => onCustomHoursChange(e.target.value)}
            placeholder="T.ex. 09:00–18:00"
            className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Validation + Actions */}
        {!isValid && (
          <p className="text-xs font-medium text-red-500">
            Platsen måste ha en adress eller vara &ldquo;På
            campingområdet&rdquo;.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-500 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
          >
            Avbryt
          </button>
          <button
            onClick={onSave}
            disabled={isPending || !isValid}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} strokeWidth={2.5} />
            )}
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Add Place Form
   ═══════════════════════════════════════════════════════ */
function AddPlaceForm({
  brand,
  isPending,
  name,
  onNameChange,
  category,
  onCategoryChange,
  address,
  onAddressChange,
  isOnSite,
  onToggleIsOnSite,
  isIndoor,
  onToggleIsIndoor,
  customHours,
  onCustomHoursChange,
  isValid,
  onAdd,
  onClose,
}: {
  brand: string;
  isPending: boolean;
  name: string;
  onNameChange: (v: string) => void;
  category: PlaceCategory;
  onCategoryChange: (v: PlaceCategory) => void;
  address: string;
  onAddressChange: (v: string) => void;
  isOnSite: boolean;
  onToggleIsOnSite: () => void;
  isIndoor: boolean;
  onToggleIsIndoor: () => void;
  customHours: string;
  onCustomHoursChange: (v: string) => void;
  isValid: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
            <Plus size={16} className="text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-stone-800">
            Lägg till egen plats
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
        {/* Left column */}
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Namn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="T.ex. Minigolf eller Cykeluthyrning"
              className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Adress
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Krävs om inte på området"
              className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Kategori
            </label>
            <div className="flex flex-wrap gap-1.5 lg:grid lg:grid-cols-3 lg:gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const m = CATEGORY_META[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] lg:justify-center ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-sm">{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* On site */}
          <button
            onClick={onToggleIsOnSite}
            className="flex w-full items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-stone-300"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isOnSite
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              <Home size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-stone-700">
                På campingområdet
              </p>
              <p className="text-[10px] text-stone-400">
                Gästerna behöver inte köra
              </p>
            </div>
            <ToggleSwitch active={isOnSite} brand={brand} />
          </button>

          {/* Indoor */}
          <button
            onClick={onToggleIsIndoor}
            className="flex w-full items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-stone-300"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isIndoor
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              <Umbrella size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-stone-700">
                Inomhusaktivitet
              </p>
              <p className="text-[10px] text-stone-400">
                AI-planeraren föreslår vid dåligt väder
              </p>
            </div>
            <ToggleSwitch active={isIndoor} brand={brand} />
          </button>

          {/* Custom hours */}
          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-stone-200">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100">
                <Clock size={13} className="text-amber-600" />
              </div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Öppettider (valfritt)
              </label>
            </div>
            <input
              type="text"
              value={customHours}
              onChange={(e) => onCustomHoursChange(e.target.value)}
              placeholder="T.ex. 09:00–18:00 eller Mån–Fre 10–17"
              className="w-full rounded-lg border-0 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 ring-1 ring-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-col items-end gap-2">
        {!isValid && name.trim() !== "" && (
          <p className="text-xs font-medium text-red-500">
            Platsen måste ha en adress eller vara markerad som &ldquo;På
            campingområdet&rdquo;.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-500 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
          >
            Avbryt
          </button>
          <button
            onClick={onAdd}
            disabled={!isValid || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} strokeWidth={2.5} />
            )}
            Lägg till plats
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared Primitives
   ═══════════════════════════════════════════════════════ */

function ToggleSwitch({ active, brand }: { active: boolean; brand: string }) {
  return (
    <div
      className={`h-[22px] w-10 shrink-0 rounded-full p-0.5 transition-colors ${
        active ? "bg-emerald-500" : "bg-stone-300"
      }`}
    >
      <div
        className="h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: active ? "translateX(18px)" : "translateX(0)" }}
      />
    </div>
  );
}

function StatusBadge({
  icon,
  label,
  variant,
  brand,
}: {
  icon?: React.ReactNode;
  label: string;
  variant: "emerald" | "stone" | "brand";
  brand?: string;
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60",
    stone: "bg-stone-100 text-stone-500 ring-1 ring-stone-200/60",
    brand: "",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        variant === "brand" ? "ring-1 ring-stone-200/60" : styles[variant]
      }`}
      style={
        variant === "brand" && brand
          ? {
              backgroundColor: hexToRgba(brand, 0.06),
              color: brand,
            }
          : undefined
      }
    >
      {icon}
      {label}
    </span>
  );
}

function PlaceAction({
  children,
  title,
  isActive,
  onClick,
  disabled,
  dangerHover,
}: {
  children: React.ReactNode;
  title: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  dangerHover?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`group/action flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-40 active:scale-90 ${
        isActive
          ? "bg-emerald-50"
          : dangerHover
            ? "text-stone-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            : "hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
