'use client';

import React, { useState, useTransition, useMemo } from 'react';
import type { Campground, CachedPlace, PlaceCategory } from '@/types/database';
import { togglePin, toggleHide, saveNote, addCustomPlace, deletePlace } from '../actions';
import {
  Star, Eye, EyeOff, MessageCircle, Trash2, Plus, X,
  Loader2, Check, Search, MapPin,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Utility
   ═══════════════════════════════════════════════════════ */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ═══════════════════════════════════════════════════════
   Constants — nature-themed category metadata
   ═══════════════════════════════════════════════════════ */
const CATEGORY_META: Record<PlaceCategory, { emoji: string; label: string }> = {
  restaurant: { emoji: '🍽️', label: 'Restaurang' },
  cafe: { emoji: '☕', label: 'Café' },
  beach: { emoji: '🏖️', label: 'Strand' },
  park: { emoji: '🌲', label: 'Natur' },
  museum: { emoji: '🏛️', label: 'Museum' },
  bowling: { emoji: '🎳', label: 'Bowling' },
  swimming: { emoji: '🏊', label: 'Bad' },
  shopping: { emoji: '🛒', label: 'Shopping' },
  cinema: { emoji: '🎬', label: 'Bio' },
  spa: { emoji: '💆', label: 'Spa' },
  other: { emoji: '📍', label: 'Övrigt' },
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
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<PlaceCategory | 'all'>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const brand = campground.primary_color || '#2A3C34';

  // Add form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<PlaceCategory>('other');
  const [newAddress, setNewAddress] = useState('');

  // Note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const filtered = useMemo(() => {
    return places
      .filter((p) => {
        if (!showHidden && p.is_hidden) return false;
        if (filterCat !== 'all' && p.category !== filterCat) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return a.name.localeCompare(b.name, 'sv');
      });
  }, [places, search, filterCat, showHidden]);

  const availableCats = useMemo(() => {
    const cats = new Set(places.map((p) => p.category));
    return ['all' as const, ...Array.from(cats)] as (PlaceCategory | 'all')[];
  }, [places]);

  const withAction = (placeId: string, action: () => Promise<void>) => {
    setActioningId(placeId);
    startTransition(async () => {
      try {
        await action();
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
      setActioningId(null);
    });
  };

  const handleAddPlace = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        await addCustomPlace(campground.id, newName.trim(), newCategory, newAddress.trim() || undefined);
        setNewName('');
        setNewAddress('');
        setNewCategory('other');
        setShowAddForm(false);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
    });
  };

  const handleSaveNote = (placeId: string) => {
    withAction(placeId, async () => {
      await saveNote(placeId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText('');
    });
  };

  const handleDelete = (placeId: string, name: string) => {
    if (!confirm(`Ta bort "${name}"? Kan inte ångras.`)) return;
    withAction(placeId, () => deletePlace(placeId));
  };

  return (
    <div className="space-y-4">
      {/* ━━━ TOOLBAR ━━━ */}
      <div>
        {/* Search — warm style */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök platser..."
            className="w-full rounded-xl border-0 bg-stone-100/80 py-2.5 pl-10 pr-4 text-[13px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': hexToRgba(brand, 0.3) } as React.CSSProperties}
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
            {availableCats.map((cat) => {
              const meta = cat === 'all' ? { emoji: '🗺️', label: 'Alla' } : CATEGORY_META[cat];
              const isActive = filterCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all active:scale-95"
                  style={
                    isActive
                      ? { backgroundColor: brand, color: '#fff' }
                      : { backgroundColor: '#f5f5f0', color: '#a8a29e' }
                  }
                >
                  <span className="text-sm">{meta.emoji}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all active:scale-95"
              style={
                showHidden
                  ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
                  : { backgroundColor: '#f5f5f0', color: '#a8a29e' }
              }
            >
              {showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
              Dolda
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-all active:scale-95"
              style={{
                backgroundColor: brand,
                boxShadow: `0 2px 8px ${hexToRgba(brand, 0.2)}`,
              }}
            >
              <Plus size={12} />
              Ny plats
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ ADD FORM ━━━ */}
      {showAddForm && (
        <div
          className="rounded-[20px] p-5"
          style={{ backgroundColor: hexToRgba(brand, 0.04) }}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-black tracking-tight text-stone-900">
              <span>📌</span> Lägg till egen plats
            </p>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-xl p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Namn, t.ex. Cykeluthyrning"
              className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-800 shadow-[0_1px_3px_rgba(120,80,30,0.04)] placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': hexToRgba(brand, 0.3) } as React.CSSProperties}
            />
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Adress (valfritt)"
              className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-800 shadow-[0_1px_3px_rgba(120,80,30,0.04)] placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': hexToRgba(brand, 0.3) } as React.CSSProperties}
            />

            {/* Category selector — camping-themed pills */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const m = CATEGORY_META[cat];
                const isActive = newCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold transition-all active:scale-95"
                    style={
                      isActive
                        ? { backgroundColor: brand, color: '#fff' }
                        : {
                            backgroundColor: 'white',
                            color: '#78716c',
                            boxShadow: '0 1px 3px rgba(120,80,30,0.04)',
                          }
                    }
                  >
                    <span className="text-sm">{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleAddPlace}
              disabled={!newName.trim() || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[12px] font-black text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                backgroundColor: brand,
                boxShadow: `0 3px 12px ${hexToRgba(brand, 0.2)}`,
              }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Lägg till
            </button>
          </div>
        </div>
      )}

      {/* ━━━ PLACES LIST ━━━ */}
      <div>
        {/* List header */}
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="text-base">📍</span>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            {filtered.length} {filtered.length === 1 ? 'plats' : 'platser'}
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((place) => {
              const meta = CATEGORY_META[place.category as PlaceCategory] || CATEGORY_META.other;
              const busy = actioningId === place.id;
              const editingNote = editingNoteId === place.id;

              return (
                <div
                  key={place.id}
                  className={`rounded-[20px] p-4 transition-all ${
                    place.is_hidden
                      ? 'bg-stone-50/60 opacity-50'
                      : place.is_pinned
                        ? 'bg-amber-50/40'
                        : 'bg-stone-50/80'
                  } ${busy ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Emoji badge */}
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-[0_1px_3px_rgba(120,80,30,0.06)]">
                      {meta.emoji}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate text-[13px] font-extrabold tracking-tight text-stone-900">
                          {place.name}
                        </h4>
                        {place.is_pinned && (
                          <WarmBadge
                            label="Pinnad"
                            emoji="⭐"
                            bgColor={hexToRgba(brand, 0.1)}
                            textColor={brand}
                          />
                        )}
                        {place.is_hidden && (
                          <WarmBadge
                            label="Dold"
                            bgColor="rgba(168,162,158,0.12)"
                            textColor="#78716c"
                          />
                        )}
                        {!place.google_place_id && (
                          <WarmBadge
                            label="Egen"
                            bgColor={hexToRgba(brand, 0.08)}
                            textColor={brand}
                          />
                        )}
                      </div>

                      {place.address && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-stone-400">
                          <MapPin size={10} className="shrink-0 text-stone-300" />
                          <span className="truncate">{place.address}</span>
                        </p>
                      )}

                      {place.owner_note && !editingNote && (
                        <p className="mt-1.5 text-[10px] font-medium italic text-stone-400">
                          💬 &ldquo;{place.owner_note}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <PlaceAction
                        title={place.is_pinned ? 'Ta bort rekommendation' : 'Rekommendera'}
                        isActive={place.is_pinned}
                        activeBg={hexToRgba(brand, 0.1)}
                        activeColor={brand}
                        onClick={() => withAction(place.id, () => togglePin(place.id, place.is_pinned))}
                        disabled={busy}
                      >
                        <Star size={14} fill={place.is_pinned ? 'currentColor' : 'none'} />
                      </PlaceAction>

                      <PlaceAction
                        title={place.is_hidden ? 'Visa för gäster' : 'Dölj för gäster'}
                        isActive={place.is_hidden}
                        activeBg="rgba(168,162,158,0.12)"
                        activeColor="#78716c"
                        onClick={() => withAction(place.id, () => toggleHide(place.id, place.is_hidden))}
                        disabled={busy}
                      >
                        {place.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </PlaceAction>

                      <PlaceAction
                        title="Skriv tips till gästerna"
                        isActive={editingNote}
                        activeBg={hexToRgba(brand, 0.1)}
                        activeColor={brand}
                        onClick={() => {
                          if (editingNote) {
                            setEditingNoteId(null);
                          } else {
                            setEditingNoteId(place.id);
                            setEditingNoteText(place.owner_note || '');
                          }
                        }}
                      >
                        <MessageCircle size={14} />
                      </PlaceAction>

                      {!place.google_place_id && (
                        <PlaceAction
                          title="Ta bort"
                          onClick={() => handleDelete(place.id, place.name)}
                          disabled={busy}
                          dangerHover
                        >
                          <Trash2 size={14} />
                        </PlaceAction>
                      )}
                    </div>
                  </div>

                  {/* Note editor — warm inline form */}
                  {editingNote && (
                    <div className="mt-3 flex gap-2 pl-[52px]">
                      <input
                        type="text"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        placeholder="Skriv ett tips till gästerna..."
                        autoFocus
                        className="flex-1 rounded-xl border-0 bg-white px-3.5 py-2 text-[12px] font-medium text-stone-700 shadow-[0_1px_3px_rgba(120,80,30,0.04)] placeholder:text-stone-300 focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': hexToRgba(brand, 0.3) } as React.CSSProperties}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(place.id);
                          if (e.key === 'Escape') setEditingNoteId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveNote(place.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black text-white shadow-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: brand,
                          boxShadow: `0 2px 8px ${hexToRgba(brand, 0.2)}`,
                        }}
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Spara
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] bg-stone-50/80 p-10 text-center">
            <span className="mb-3 block text-4xl">🌲</span>
            <p className="text-[13px] font-extrabold tracking-tight text-stone-900">
              {search ? 'Inga träffar' : 'Inga platser'}
            </p>
            <p className="mx-auto mt-1.5 max-w-[200px] text-[10px] font-medium text-stone-400">
              {search
                ? 'Prova ett annat sökord.'
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

/** Warm-toned status badge */
function WarmBadge({
  label,
  emoji,
  bgColor,
  textColor,
}: {
  label: string;
  emoji?: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-wider"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {emoji && <span className="mr-0.5">{emoji}</span>}
      {label}
    </span>
  );
}

/** Action button for place rows */
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
      className={`rounded-xl p-2 transition-all disabled:opacity-40 active:scale-90 ${
        dangerHover
          ? 'text-stone-400 hover:bg-red-50 hover:text-red-500'
          : 'text-stone-400 hover:bg-stone-100/80 hover:text-stone-600'
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