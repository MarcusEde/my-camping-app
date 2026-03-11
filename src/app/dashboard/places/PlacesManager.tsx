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
    <div className="space-y-4">
      {/* ━━━ TOP BAR: Search + Actions ━━━ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300"
          />
          <input
            type="text"
            value={s.search}
            onChange={(e) => s.setSearch(e.target.value)}
            placeholder="Sök platser..."
            className="w-full rounded-[10px] bg-stone-50/80 py-2.5 pl-10 pr-4 text-[12px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(s.brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={s.toggleShowHidden}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            style={
              s.showHidden
                ? { backgroundColor: hexToRgba(s.brand, 0.08), color: s.brand }
                : {
                    backgroundColor: "transparent",
                    color: "#a8a29e",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }
            }
          >
            {s.showHidden ? <Eye size={11} /> : <EyeOff size={11} />}
            Dolda
          </button>
          <button
            onClick={s.toggleShowAddForm}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
            style={{
              backgroundColor: s.brand,
              boxShadow: `0 2px 8px ${hexToRgba(s.brand, 0.18)}`,
            }}
          >
            <Plus size={12} strokeWidth={2.5} />
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
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
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
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {availableCats.map((cat) => {
          const meta =
            cat === "all" ? { emoji: "🗺️", label: "Alla" } : CATEGORY_META[cat];
          const isActive = filterCat === cat;
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              style={
                isActive
                  ? { backgroundColor: brand, color: "#fff" }
                  : {
                      backgroundColor: "transparent",
                      color: "#a8a29e",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    }
              }
            >
              <span className="text-xs">{meta.emoji}</span>
              {meta.label}
              {count > 0 && (
                <span
                  className="ml-0.5 text-[8px]"
                  style={{ opacity: isActive ? 0.7 : 0.5 }}
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
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-4 space-y-1">
        <SidebarButton
          emoji="🗺️"
          label="Alla platser"
          count={categoryCounts.all ?? 0}
          isActive={filterCat === "all"}
          brand={brand}
          onClick={() => onSelect("all")}
        />

        <div className="my-2 h-px bg-stone-100" />

        {CATEGORY_GROUPS.map((group) => {
          const groupCats = group.categories.filter(
            (c) => (categoryCounts[c] ?? 0) > 0,
          );
          if (groupCats.length === 0) return null;

          return (
            <div key={group.label} className="pb-2">
              <p className="mb-1 px-2 pt-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
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
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
        {count} {count === 1 ? "plats" : "platser"}
        {filterCat !== "all" && (
          <span className="ml-1.5 normal-case tracking-normal">
            i {CATEGORY_META[filterCat]?.label?.toLowerCase() ?? filterCat}
          </span>
        )}
      </p>
      {filterCat !== "all" && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] font-bold text-stone-400 transition-colors hover:text-stone-600"
        >
          <X size={10} />
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
    <div className="rounded-[20px] bg-white px-6 py-8 text-center ring-1 ring-stone-200/60">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
        <MapPin size={18} strokeWidth={1.5} className="text-stone-300" />
      </div>
      <p className="text-[13px] font-black tracking-tight text-stone-700">
        {hasSearch ? "Inga träffar" : "Inga platser"}
      </p>
      <p className="mx-auto mt-1 max-w-[200px] text-[11px] leading-relaxed text-stone-400">
        {hasSearch
          ? "Prova ett annat sökord."
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
      className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-all active:scale-[0.98]"
      style={
        isActive
          ? { backgroundColor: hexToRgba(brand, 0.07), color: brand }
          : { backgroundColor: "transparent", color: "#78716c" }
      }
    >
      <span className="text-sm">{emoji}</span>
      <span
        className="flex-1 text-[11px] font-bold"
        style={isActive ? { color: brand } : undefined}
      >
        {label}
      </span>
      <span
        className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[9px] font-black"
        style={
          isActive
            ? { backgroundColor: hexToRgba(brand, 0.12), color: brand }
            : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
        }
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
  // Note editing
  isEditingNote: boolean;
  noteText: string;
  onNoteTextChange: (v: string) => void;
  onToggleNoteEdit: () => void;
  onCancelNoteEdit: () => void;
  onSaveNote: () => void;
  // Details editing
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
  // Actions
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
      className={`rounded-[14px] p-3.5 ring-1 ring-stone-200/60 transition-all ${
        place.is_hidden ? "bg-stone-50/60 opacity-50" : "bg-white"
      } ${isBusy ? "opacity-40" : ""}`}
      style={
        place.is_pinned
          ? { boxShadow: `inset 0 0 0 1px ${hexToRgba(brand, 0.1)}` }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {/* Emoji badge */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-stone-50 text-sm ring-1 ring-stone-200/60">
          {meta.emoji}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-[12px] font-bold text-stone-800">
              {place.name}
            </h4>
            {place.is_pinned && (
              <StatusBadge
                label="⭐ Pinnad"
                bgColor={hexToRgba(brand, 0.06)}
                textColor={brand}
              />
            )}
            {place.is_hidden && (
              <StatusBadge
                label="Dold"
                bgColor="rgba(168,162,158,0.08)"
                textColor="#78716c"
              />
            )}
            {!place.google_place_id && (
              <StatusBadge
                label="Egen"
                bgColor={hexToRgba(brand, 0.06)}
                textColor={brand}
              />
            )}
            {place.is_on_site && (
              <StatusBadge
                label="På området"
                bgColor="rgba(16,185,129,0.08)"
                textColor="#059669"
              />
            )}
            {place.is_indoor && (
              <StatusBadge
                label="Inomhus"
                bgColor="rgba(99,102,241,0.08)"
                textColor="#4f46e5"
              />
            )}
          </div>

          {place.address && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{place.address}</span>
            </p>
          )}

          {place.custom_hours && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
              <Clock size={9} className="shrink-0" />
              <span>{place.custom_hours}</span>
            </p>
          )}

          {place.owner_note && !isEditingNote && (
            <p className="mt-1 text-[10px] font-medium italic text-stone-400">
              &ldquo;{place.owner_note}&rdquo;
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-0.5">
          <PlaceAction
            title={place.is_pinned ? "Ta bort rekommendation" : "Rekommendera"}
            isActive={place.is_pinned}
            activeBg={hexToRgba(brand, 0.08)}
            activeColor={brand}
            onClick={onTogglePin}
            disabled={isBusy}
          >
            <Star size={13} fill={place.is_pinned ? "currentColor" : "none"} />
          </PlaceAction>

          <PlaceAction
            title={place.is_hidden ? "Visa för gäster" : "Dölj för gäster"}
            isActive={place.is_hidden}
            activeBg="rgba(168,162,158,0.08)"
            activeColor="#78716c"
            onClick={onToggleHide}
            disabled={isBusy}
          >
            {place.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
          </PlaceAction>

          <PlaceAction
            title="Skriv tips till gästerna"
            isActive={isEditingNote}
            activeBg={hexToRgba(brand, 0.08)}
            activeColor={brand}
            onClick={onToggleNoteEdit}
          >
            <MessageCircle size={13} />
          </PlaceAction>

          <PlaceAction
            title="Öppettider & plats"
            isActive={isEditingDetails}
            activeBg={hexToRgba(brand, 0.08)}
            activeColor={brand}
            onClick={onToggleDetailsEdit}
          >
            <Clock size={13} />
          </PlaceAction>

          {!place.google_place_id && (
            <PlaceAction
              title="Ta bort"
              onClick={onDelete}
              disabled={isBusy}
              dangerHover
            >
              <Trash2 size={13} />
            </PlaceAction>
          )}
        </div>
      </div>

      {/* Note editor */}
      {isEditingNote && (
        <div className="mt-2.5 flex gap-1.5 pl-11">
          <input
            type="text"
            value={noteText}
            onChange={(e) => onNoteTextChange(e.target.value)}
            placeholder="Skriv ett tips till gästerna..."
            autoFocus
            className="flex-1 rounded-[8px] bg-white px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveNote();
              if (e.key === "Escape") onCancelNoteEdit();
            }}
          />
          <button
            onClick={onSaveNote}
            disabled={isPending}
            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
            style={{
              backgroundColor: brand,
              boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
            }}
          >
            {isBusy ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Check size={11} strokeWidth={2.5} />
            )}
            Spara
          </button>
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
   Details Editor (inline in PlaceCard)
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
    <div className="mt-3 space-y-2.5 rounded-[10px] bg-stone-50/80 p-3 pl-11">
      <button
        onClick={onToggleIsOnSite}
        className="flex w-full items-center gap-3 rounded-[8px] bg-white p-2.5 ring-1 ring-stone-200/60"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition-colors"
          style={
            isOnSite
              ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
              : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
          }
        >
          <Home size={12} strokeWidth={2} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] font-bold text-stone-700">
            På campingområdet
          </p>
        </div>
        <ToggleSwitch active={isOnSite} brand={brand} />
      </button>

      <button
        onClick={onToggleIsIndoor}
        className="flex w-full items-center gap-3 rounded-[8px] bg-white p-2.5 ring-1 ring-stone-200/60"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition-colors"
          style={
            isIndoor
              ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
              : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
          }
        >
          <Umbrella size={12} strokeWidth={2} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] font-bold text-stone-700">
            Inomhusaktivitet
          </p>
          <p className="text-[9px] text-stone-400">
            Föreslås vid regn av AI-planeraren
          </p>
        </div>
        <ToggleSwitch active={isIndoor} brand={brand} />
      </button>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
          Öppettider
        </label>
        <input
          type="text"
          value={customHours}
          onChange={(e) => onCustomHoursChange(e.target.value)}
          placeholder="T.ex. 09:00–18:00"
          className="w-full rounded-[8px] bg-white px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {!isValid && (
          <p className="text-right text-[9px] font-medium text-red-500">
            Platsen måste ha en adress eller vara &ldquo;På
            campingområdet&rdquo;.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
          >
            Avbryt
          </button>
          <button
            onClick={onSave}
            disabled={isPending || !isValid}
            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: brand,
              boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
            }}
          >
            {isBusy ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Check size={11} strokeWidth={2.5} />
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
    <div
      className="rounded-[16px] p-4 lg:p-5"
      style={{ backgroundColor: hexToRgba(brand, 0.03) }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-black tracking-tight text-stone-900">
          Lägg till egen plats
        </p>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors hover:text-stone-600"
        >
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {/* Left column */}
        <div className="space-y-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Namn, t.ex. Minigolf eller Cykeluthyrning"
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
          <input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Adress (krävs om inte på området)"
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
              Kategori
            </label>
            <div className="flex flex-wrap gap-1 lg:grid lg:grid-cols-3 lg:gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const m = CATEGORY_META[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 lg:rounded-[8px] lg:justify-center"
                    style={
                      isActive
                        ? { backgroundColor: brand, color: "#fff" }
                        : {
                            backgroundColor: "white",
                            color: "#78716c",
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                          }
                    }
                  >
                    <span className="text-xs">{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-2.5">
          <div className="rounded-[10px] bg-white p-3 ring-1 ring-stone-200/60">
            <button
              onClick={onToggleIsOnSite}
              className="flex w-full items-center gap-3"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors"
                style={
                  isOnSite
                    ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
                    : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
                }
              >
                <Home size={14} strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[11px] font-bold text-stone-700">
                  På campingområdet
                </p>
                <p className="text-[9px] text-stone-400">
                  Gäster behöver inte köra
                </p>
              </div>
              <ToggleSwitch active={isOnSite} brand={brand} />
            </button>
          </div>

          <div className="rounded-[10px] bg-white p-3 ring-1 ring-stone-200/60">
            <button
              onClick={onToggleIsIndoor}
              className="flex w-full items-center gap-3"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors"
                style={
                  isIndoor
                    ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
                    : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
                }
              >
                <Umbrella size={14} strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[11px] font-bold text-stone-700">
                  Inomhusaktivitet
                </p>
                <p className="text-[9px] text-stone-400">
                  AI-planeraren föreslår vid dåligt väder
                </p>
              </div>
              <ToggleSwitch active={isIndoor} brand={brand} />
            </button>
          </div>

          <div className="rounded-[10px] bg-white p-3 ring-1 ring-stone-200/60">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[6px]"
                style={{
                  backgroundColor: hexToRgba(brand, 0.07),
                  color: brand,
                }}
              >
                <Clock size={12} strokeWidth={2} />
              </div>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">
                Öppettider (valfritt)
              </label>
            </div>
            <input
              type="text"
              value={customHours}
              onChange={(e) => onCustomHoursChange(e.target.value)}
              placeholder="T.ex. 09:00–18:00 eller Mån–Fre 10–17"
              className="w-full rounded-[8px] bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-100 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={
                {
                  "--tw-ring-color": hexToRgba(brand, 0.25),
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <button
          onClick={onAdd}
          disabled={!isValid || isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50 lg:w-auto lg:self-end lg:px-8"
          style={{
            backgroundColor: brand,
            boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
          }}
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} strokeWidth={2.5} />
          )}
          Lägg till
        </button>

        {!isValid && name.trim() !== "" && (
          <p className="text-center text-[10px] font-medium text-red-500 lg:text-right">
            Platsen måste ha en adress eller vara markerad som &ldquo;På
            campingområdet&rdquo;.
          </p>
        )}
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
      className="h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors"
      style={{ backgroundColor: active ? brand : "#d6d3d1" }}
    >
      <div
        className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: active ? "translateX(16px)" : "translateX(0)" }}
      />
    </div>
  );
}

function StatusBadge({
  label,
  bgColor,
  textColor,
}: {
  label: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em]"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {label}
    </span>
  );
}

function PlaceAction({
  children,
  title,
  isActive,
  activeBg,
  activeColor,
  onClick,
  disabled,
  dangerHover,
}: {
  children: React.ReactNode;
  title: string;
  isActive?: boolean;
  activeBg?: string;
  activeColor?: string;
  onClick: () => void;
  disabled?: boolean;
  dangerHover?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-40 active:scale-90 ${
        dangerHover
          ? "text-stone-300 hover:bg-red-50 hover:text-red-500"
          : "text-stone-300 hover:bg-stone-50 hover:text-stone-500"
      }`}
      style={
        isActive && activeBg && activeColor
          ? { backgroundColor: activeBg, color: activeColor }
          : undefined
      }
    >
      {children}
    </button>
  );
}
