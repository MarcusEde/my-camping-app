// src/app/dashboard/places/PlacesManager.tsx
"use client";

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
  X
} from "lucide-react";
import React, { useMemo, useState, useTransition } from "react";
import {
  addCustomPlace,
  deletePlace,
  saveNote,
  toggleHide,
  togglePin,
  updatePlaceDetails,
} from "../actions";

/* ═══════════════════════════════════════════════════════
   Utility
   ═══════════════════════════════════════════════════════ */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<PlaceCategory | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const brand = campground.primary_color || "#2A3C34";

  // Add form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<PlaceCategory>("other");
  const [newAddress, setNewAddress] = useState("");
  const [newIsOnSite, setNewIsOnSite] = useState(false);
  const [newIsIndoor, setNewIsIndoor] = useState(false);
  const [newCustomHours, setNewCustomHours] = useState("");

  // Note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Hours/details editing
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editIsOnSite, setEditIsOnSite] = useState(false);
  const [editIsIndoor, setEditIsIndoor] = useState(false);
  const [editCustomHours, setEditCustomHours] = useState("");

  const filtered = useMemo(() => {
    return places
      .filter((p) => {
        if (!showHidden && p.is_hidden) return false;
        if (filterCat !== "all" && p.category !== filterCat) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return a.name.localeCompare(b.name, "sv");
      });
  }, [places, search, filterCat, showHidden]);

  const availableCats = useMemo(() => {
    const cats = new Set(places.map((p) => p.category));
    return ["all" as const, ...Array.from(cats)] as (PlaceCategory | "all")[];
  }, [places]);

  const withAction = (placeId: string, action: () => Promise<void>) => {
    setActioningId(placeId);
    startTransition(async () => {
      try {
        await action();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
      setActioningId(null);
    });
  };

  const handleAddPlace = () => {
    if (!newName.trim() || (!newAddress.trim() && !newIsOnSite)) return;
    startTransition(async () => {
      try {
        await addCustomPlace(
          campground.id,
          newName.trim(),
          newCategory,
          newAddress.trim() || undefined,
          newIsOnSite,
          newIsIndoor,
          newCustomHours.trim() || undefined,
        );
        setNewName("");
        setNewAddress("");
        setNewCategory("other");
        setNewIsOnSite(false);
        setNewIsIndoor(false);
        setNewCustomHours("");
        setShowAddForm(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleSaveNote = (placeId: string) => {
    withAction(placeId, async () => {
      await saveNote(placeId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText("");
    });
  };

  const handleSaveDetails = (placeId: string) => {
    withAction(placeId, async () => {
      await updatePlaceDetails(placeId, {
        is_on_site: editIsOnSite,
        is_indoor: editIsIndoor,
        custom_hours: editCustomHours.trim() || null,
      });
      setEditingDetailsId(null);
    });
  };

  const handleDelete = (placeId: string, name: string) => {
    if (!confirm(`Ta bort "${name}"? Kan inte ångras.`)) return;
    withAction(placeId, () => deletePlace(placeId));
  };

  const startEditingDetails = (place: CachedPlace) => {
    setEditingDetailsId(place.id);
    setEditIsOnSite(place.is_on_site ?? false);
    setEditIsIndoor(place.is_indoor ?? false);
    setEditCustomHours(place.custom_hours ?? "");
    setEditingNoteId(null);
  };

  const isAddFormValid =
    newName.trim() !== "" && (newAddress.trim() !== "" || newIsOnSite);

  return (
    <div className="space-y-4">
      {/* ━━━ TOOLBAR ━━━ */}
      <div>
        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök platser..."
            className="w-full rounded-[10px] bg-stone-50/80 py-2.5 pl-10 pr-4 text-[12px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1 overflow-x-auto"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {availableCats.map((cat) => {
              const meta =
                cat === "all"
                  ? { emoji: "🗺️", label: "Alla" }
                  : CATEGORY_META[cat];
              const isActive = filterCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
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
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              style={
                showHidden
                  ? { backgroundColor: hexToRgba(brand, 0.08), color: brand }
                  : {
                      backgroundColor: "transparent",
                      color: "#a8a29e",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    }
              }
            >
              {showHidden ? <Eye size={11} /> : <EyeOff size={11} />}
              Dolda
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
              style={{
                backgroundColor: brand,
                boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
              }}
            >
              <Plus size={12} strokeWidth={2.5} />
              Ny plats
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ ADD FORM ━━━ */}
      {showAddForm && (
        <div
          className="rounded-[16px] p-4"
          style={{ backgroundColor: hexToRgba(brand, 0.03) }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-black tracking-tight text-stone-900">
              Lägg till egen plats
            </p>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors hover:text-stone-600"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-2.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Adress (krävs om inte på området)"
              className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={
                {
                  "--tw-ring-color": hexToRgba(brand, 0.25),
                } as React.CSSProperties
              }
            />

            {/* Category selector */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                Kategori
              </label>
              <div className="flex flex-wrap gap-1">
                {ALL_CATEGORIES.map((cat) => {
                  const m = CATEGORY_META[cat];
                  const isActive = newCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
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

            {/* On-site toggle */}
            <div className="rounded-[10px] bg-white p-3 ring-1 ring-stone-200/60">
              <button
                onClick={() => setNewIsOnSite(!newIsOnSite)}
                className="flex w-full items-center gap-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors"
                  style={
                    newIsOnSite
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
                    Gäster behöver inte köra — nås till fots
                  </p>
                </div>
                <ToggleSwitch active={newIsOnSite} brand={brand} />
              </button>
            </div>

            {/* Indoor toggle */}
            <div className="rounded-[10px] bg-white p-3 ring-1 ring-stone-200/60">
              <button
                onClick={() => setNewIsIndoor(!newIsIndoor)}
                className="flex w-full items-center gap-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors"
                  style={
                    newIsIndoor
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
                    Bra vid regn — AI-planeraren föreslår detta vid dåligt väder
                  </p>
                </div>
                <ToggleSwitch active={newIsIndoor} brand={brand} />
              </button>
            </div>

            {/* Opening hours */}
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
                value={newCustomHours}
                onChange={(e) => setNewCustomHours(e.target.value)}
                placeholder="T.ex. 09:00–18:00 eller Mån–Fre 10–17"
                className="w-full rounded-[8px] bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-100 placeholder:text-stone-300 focus:outline-none focus:ring-2"
                style={
                  {
                    "--tw-ring-color": hexToRgba(brand, 0.25),
                  } as React.CSSProperties
                }
              />
              <p className="mt-1.5 px-1 text-[9px] text-stone-400">
                Visas för gäster och hjälper AI-planeraren välja rätt tid.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleAddPlace}
                disabled={!isAddFormValid || isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
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

              {!isAddFormValid && newName.trim() !== "" && (
                <p className="text-center text-[10px] font-medium text-red-500">
                  Platsen måste ha en adress eller vara markerad som &ldquo;På
                  campingområdet&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ PLACES LIST ━━━ */}
      <div>
        <div className="mb-2 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            {filtered.length} {filtered.length === 1 ? "plats" : "platser"}
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-1.5">
            {filtered.map((place) => {
              const meta =
                CATEGORY_META[place.category as PlaceCategory] ||
                CATEGORY_META.other;
              const busy = actioningId === place.id;
              const editingNote = editingNoteId === place.id;
              const editingDetails = editingDetailsId === place.id;

              const hasCoordinates = Boolean(place.latitude && place.longitude);
              const hasAddress = Boolean(place.address);
              const isEditDetailsValid =
                hasAddress || hasCoordinates || editIsOnSite;

              return (
                <div
                  key={place.id}
                  className={`rounded-[14px] p-3.5 ring-1 ring-stone-200/60 transition-all ${
                    place.is_hidden ? "bg-stone-50/60 opacity-50" : "bg-white"
                  } ${busy ? "opacity-40" : ""}`}
                  style={
                    place.is_pinned
                      ? {
                          boxShadow: `inset 0 0 0 1px ${hexToRgba(brand, 0.1)}`,
                        }
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

                      {place.owner_note && !editingNote && (
                        <p className="mt-1 text-[10px] font-medium italic text-stone-400">
                          &ldquo;{place.owner_note}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <PlaceAction
                        title={
                          place.is_pinned
                            ? "Ta bort rekommendation"
                            : "Rekommendera"
                        }
                        isActive={place.is_pinned}
                        activeBg={hexToRgba(brand, 0.08)}
                        activeColor={brand}
                        onClick={() =>
                          withAction(place.id, () =>
                            togglePin(place.id, place.is_pinned),
                          )
                        }
                        disabled={busy}
                      >
                        <Star
                          size={13}
                          fill={place.is_pinned ? "currentColor" : "none"}
                        />
                      </PlaceAction>

                      <PlaceAction
                        title={
                          place.is_hidden
                            ? "Visa för gäster"
                            : "Dölj för gäster"
                        }
                        isActive={place.is_hidden}
                        activeBg="rgba(168,162,158,0.08)"
                        activeColor="#78716c"
                        onClick={() =>
                          withAction(place.id, () =>
                            toggleHide(place.id, place.is_hidden),
                          )
                        }
                        disabled={busy}
                      >
                        {place.is_hidden ? (
                          <Eye size={13} />
                        ) : (
                          <EyeOff size={13} />
                        )}
                      </PlaceAction>

                      <PlaceAction
                        title="Skriv tips till gästerna"
                        isActive={editingNote}
                        activeBg={hexToRgba(brand, 0.08)}
                        activeColor={brand}
                        onClick={() => {
                          if (editingNote) {
                            setEditingNoteId(null);
                          } else {
                            setEditingNoteId(place.id);
                            setEditingNoteText(place.owner_note || "");
                            setEditingDetailsId(null);
                          }
                        }}
                      >
                        <MessageCircle size={13} />
                      </PlaceAction>

                      <PlaceAction
                        title="Öppettider & plats"
                        isActive={editingDetails}
                        activeBg={hexToRgba(brand, 0.08)}
                        activeColor={brand}
                        onClick={() => {
                          if (editingDetails) {
                            setEditingDetailsId(null);
                          } else {
                            startEditingDetails(place);
                          }
                        }}
                      >
                        <Clock size={13} />
                      </PlaceAction>

                      {!place.google_place_id && (
                        <PlaceAction
                          title="Ta bort"
                          onClick={() => handleDelete(place.id, place.name)}
                          disabled={busy}
                          dangerHover
                        >
                          <Trash2 size={13} />
                        </PlaceAction>
                      )}
                    </div>
                  </div>

                  {/* Note editor */}
                  {editingNote && (
                    <div className="mt-2.5 flex gap-1.5 pl-11">
                      <input
                        type="text"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        placeholder="Skriv ett tips till gästerna..."
                        autoFocus
                        className="flex-1 rounded-[8px] bg-white px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
                        style={
                          {
                            "--tw-ring-color": hexToRgba(brand, 0.25),
                          } as React.CSSProperties
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveNote(place.id);
                          if (e.key === "Escape") setEditingNoteId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveNote(place.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
                        style={{
                          backgroundColor: brand,
                          boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
                        }}
                      >
                        {busy ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Check size={11} strokeWidth={2.5} />
                        )}
                        Spara
                      </button>
                    </div>
                  )}

                  {/* Details editor */}
                  {editingDetails && (
                    <div className="mt-3 space-y-2.5 rounded-[10px] bg-stone-50/80 p-3 pl-11">
                      {/* On-site toggle */}
                      <button
                        onClick={() => setEditIsOnSite(!editIsOnSite)}
                        className="flex w-full items-center gap-3 rounded-[8px] bg-white p-2.5 ring-1 ring-stone-200/60"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition-colors"
                          style={
                            editIsOnSite
                              ? {
                                  backgroundColor: hexToRgba(brand, 0.1),
                                  color: brand,
                                }
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
                        <ToggleSwitch active={editIsOnSite} brand={brand} />
                      </button>

                      {/* Indoor toggle */}
                      <button
                        onClick={() => setEditIsIndoor(!editIsIndoor)}
                        className="flex w-full items-center gap-3 rounded-[8px] bg-white p-2.5 ring-1 ring-stone-200/60"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition-colors"
                          style={
                            editIsIndoor
                              ? {
                                  backgroundColor: hexToRgba(brand, 0.1),
                                  color: brand,
                                }
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
                        <ToggleSwitch active={editIsIndoor} brand={brand} />
                      </button>

                      {/* Hours input */}
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                          Öppettider
                        </label>
                        <input
                          type="text"
                          value={editCustomHours}
                          onChange={(e) => setEditCustomHours(e.target.value)}
                          placeholder="T.ex. 09:00–18:00"
                          className="w-full rounded-[8px] bg-white px-3 py-2 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
                          style={
                            {
                              "--tw-ring-color": hexToRgba(brand, 0.25),
                            } as React.CSSProperties
                          }
                        />
                      </div>

                      {/* Save */}
                      <div className="flex flex-col gap-2 pt-1">
                        {!isEditDetailsValid && (
                          <p className="text-right text-[9px] font-medium text-red-500">
                            Eftersom platsen saknar adress måste den vara
                            &ldquo;På campingområdet&rdquo;.
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingDetailsId(null)}
                            className="rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={() => handleSaveDetails(place.id)}
                            disabled={isPending || !isEditDetailsValid}
                            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
                            style={{
                              backgroundColor: brand,
                              boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
                            }}
                          >
                            {busy ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Check size={11} strokeWidth={2.5} />
                            )}
                            Spara
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] bg-white px-6 py-8 text-center ring-1 ring-stone-200/60">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
              <MapPin size={18} strokeWidth={1.5} className="text-stone-300" />
            </div>
            <p className="text-[13px] font-black tracking-tight text-stone-700">
              {search ? "Inga träffar" : "Inga platser"}
            </p>
            <p className="mx-auto mt-1 max-w-[200px] text-[11px] leading-relaxed text-stone-400">
              {search
                ? "Prova ett annat sökord."
                : 'Klicka på "Ny plats" för att lägga till din första!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Internal Sub-Components
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
