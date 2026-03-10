// app/dashboard/partners/PartnerManager.tsx
"use client";

import type {
  CachedPlace,
  Campground,
  PromotedPartnerWithClicks,
} from "@/types/database";
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Link2,
  Loader2,
  MousePointerClick,
  Phone,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import React, { useMemo, useState, useTransition } from "react";
import {
  createPromotedPartner,
  deletePromotedPartner,
  togglePromotedPartnerActive,
  updatePromotedPartner,
} from "./actions";

/* ═══════════════════════════════════════════
   Utility
   ═══════════════════════════════════════════ */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isCurrentlyActive(partner: PromotedPartnerWithClicks): boolean {
  if (!partner.is_active) return false;
  const now = new Date();
  if (partner.starts_at && new Date(partner.starts_at) > now) return false;
  if (partner.ends_at && new Date(partner.ends_at) < now) return false;
  return true;
}

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */
interface Props {
  campground: Campground;
  partners: PromotedPartnerWithClicks[];
  places: CachedPlace[];
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
export default function PartnerManager({
  campground,
  partners,
  places,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const brand = campground.primary_color || "#2A3C34";

  // ── Add form state ──
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newPlaceId, setNewPlaceId] = useState("");
  const [newRank, setNewRank] = useState(0);
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");

  // ── Edit state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editPlaceId, setEditPlaceId] = useState("");
  const [editRank, setEditRank] = useState(0);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  // ── Linkable places (not hidden, for the dropdown) ──
  const linkablePlaces = useMemo(
    () =>
      places
        .filter((p) => !p.is_hidden)
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [places],
  );

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return partners
      .filter((p) => {
        const live = isCurrentlyActive(p);
        if (!showInactive && !live) return false;
        if (
          search &&
          !p.business_name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.priority_rank !== b.priority_rank)
          return a.priority_rank - b.priority_rank;
        return b.click_count - a.click_count;
      });
  }, [partners, search, showInactive]);

  const totalClicks = useMemo(
    () => partners.reduce((s, p) => s + p.click_count, 0),
    [partners],
  );

  // ── Helpers ──
  const withAction = (id: string, action: () => Promise<void>) => {
    setActioningId(id);
    startTransition(async () => {
      try {
        await action();
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
      setActioningId(null);
    });
  };

  const resetAddForm = () => {
    setNewName("");
    setNewDescription("");
    setNewWebsite("");
    setNewPhone("");
    setNewLogoUrl("");
    setNewPlaceId("");
    setNewRank(0);
    setNewStartsAt("");
    setNewEndsAt("");
    setShowAddForm(false);
  };

  // ── Handlers ──
  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        await createPromotedPartner(campground.id, {
          business_name: newName.trim(),
          description: newDescription.trim() || undefined,
          website_url: newWebsite.trim() || undefined,
          phone: newPhone.trim() || undefined,
          logo_url: newLogoUrl.trim() || undefined,
          cached_place_id: newPlaceId || undefined,
          priority_rank: newRank,
          // FIX: Konvertera till korrekt ISO-format för server-validering
          starts_at: newStartsAt
            ? new Date(newStartsAt).toISOString()
            : undefined,
          ends_at: newEndsAt ? new Date(newEndsAt).toISOString() : undefined,
        });
        resetAddForm();
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
    });
  };

  const handleStartEdit = (p: PromotedPartnerWithClicks) => {
    setShowAddForm(false);
    setEditingId(p.id);
    setEditName(p.business_name);
    setEditDescription(p.description || "");
    setEditWebsite(p.website_url || "");
    setEditPhone(p.phone || "");
    setEditLogoUrl(p.logo_url || "");
    setEditPlaceId(p.cached_place_id || "");
    setEditRank(p.priority_rank);
    // För datetime-local input krävs formatet YYYY-MM-DDTHH:MM
    setEditStartsAt(p.starts_at ? p.starts_at.slice(0, 16) : "");
    setEditEndsAt(p.ends_at ? p.ends_at.slice(0, 16) : "");
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    startTransition(async () => {
      try {
        await updatePromotedPartner(editingId, {
          business_name: editName.trim(),
          description: editDescription.trim() || undefined,
          website_url: editWebsite.trim() || undefined,
          phone: editPhone.trim() || undefined,
          logo_url: editLogoUrl.trim() || undefined,
          cached_place_id: editPlaceId || null,
          priority_rank: editRank,
          // FIX: Konvertera till korrekt ISO-format för server-validering
          starts_at: editStartsAt
            ? new Date(editStartsAt).toISOString()
            : undefined,
          ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : null,
        });
        setEditingId(null);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (
      !confirm(`Ta bort "${name}"? All klick-data försvinner. Kan ej ångras.`)
    )
      return;
    withAction(id, () => deletePromotedPartner(id));
  };

  /* ═══════════════════════════════════════════
     Reusable inline form
     ═══════════════════════════════════════════ */
  const renderForm = (
    mode: "add" | "edit",
    opts: {
      name: string;
      setName: (v: string) => void;
      description: string;
      setDescription: (v: string) => void;
      website: string;
      setWebsite: (v: string) => void;
      phone: string;
      setPhone: (v: string) => void;
      logoUrl: string;
      setLogoUrl: (v: string) => void;
      placeId: string;
      setPlaceId: (v: string) => void;
      rank: number;
      setRank: (v: number) => void;
      startsAt: string;
      setStartsAt: (v: string) => void;
      endsAt: string;
      setEndsAt: (v: string) => void;
      onSubmit: () => void;
      onCancel: () => void;
    },
  ) => (
    <div
      className="space-y-3 rounded-[16px] p-4"
      style={{ backgroundColor: hexToRgba(brand, 0.03) }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-black tracking-tight text-stone-900">
          {mode === "add" ? "Ny sponsrad partner" : "Redigera partner"}
        </p>
        <button
          onClick={opts.onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors hover:text-stone-600"
        >
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Business Name */}
      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Företagsnamn *
        </label>
        <input
          type="text"
          value={opts.name}
          onChange={(e) => opts.setName(e.target.value)}
          placeholder='T.ex. "Roma Pizzeria (Sponsored)"'
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Beskrivning / Erbjudande
        </label>
        <textarea
          value={opts.description}
          onChange={(e) => opts.setDescription(e.target.value)}
          placeholder="T.ex. Visa appen i kassan för 10% rabatt..."
          rows={2}
          className="w-full resize-none rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        />
      </div>

      {/* Website + Phone row */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Webbplats
          </label>
          <div className="relative">
            <Globe
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300"
            />
            <input
              type="url"
              value={opts.website}
              onChange={(e) => opts.setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-[10px] bg-white py-2.5 pl-9 pr-3 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={
                {
                  "--tw-ring-color": hexToRgba(brand, 0.25),
                } as React.CSSProperties
              }
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Telefon
          </label>
          <div className="relative">
            <Phone
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300"
            />
            <input
              type="tel"
              value={opts.phone}
              onChange={(e) => opts.setPhone(e.target.value)}
              placeholder="070-123 45 67"
              className="w-full rounded-[10px] bg-white py-2.5 pl-9 pr-3 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={
                {
                  "--tw-ring-color": hexToRgba(brand, 0.25),
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Logotyp (URL)
        </label>
        <input
          type="url"
          value={opts.logoUrl}
          onChange={(e) => opts.setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        />
      </div>

      {/* Link to existing place */}
      <div>
        <label className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          <Link2 size={10} />
          Länka till befintlig plats (valfritt)
        </label>
        <select
          value={opts.placeId}
          onChange={(e) => opts.setPlaceId(e.target.value)}
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        >
          <option value="">— Ingen koppling —</option>
          {linkablePlaces.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Priority + Dates row */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Prioritet (lägre = högre)
          </label>
          <input
            type="number"
            min={0}
            value={opts.rank}
            onChange={(e) => opts.setRank(parseInt(e.target.value) || 0)}
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Startar
          </label>
          <input
            type="datetime-local"
            value={opts.startsAt}
            onChange={(e) => opts.setStartsAt(e.target.value)}
            className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[11px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Slutar (valfritt)
          </label>
          <input
            type="datetime-local"
            value={opts.endsAt}
            onChange={(e) => opts.setEndsAt(e.target.value)}
            className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[11px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={opts.onSubmit}
          disabled={!opts.name.trim() || isPending}
          className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: brand,
            boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
          }}
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : mode === "add" ? (
            <Plus size={13} strokeWidth={2.5} />
          ) : (
            <Check size={13} strokeWidth={2.5} />
          )}
          {mode === "add" ? "Lägg till" : "Spara"}
        </button>
        <button
          onClick={opts.onCancel}
          className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
        >
          Avbryt
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-4">
      {/* ━━━ STATS BANNER ━━━ */}
      {partners.length > 0 && (
        <div
          className="flex items-center justify-between rounded-[14px] px-4 py-3"
          style={{ backgroundColor: hexToRgba(brand, 0.04) }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[8px]"
              style={{
                backgroundColor: hexToRgba(brand, 0.08),
                color: brand,
              }}
            >
              <MousePointerClick size={15} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                Totala klick
              </p>
              <p
                className="text-[18px] font-black tabular-nums tracking-tight"
                style={{ color: brand }}
              >
                {totalClicks}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
              Aktiva nu
            </p>
            <p className="text-[18px] font-black tabular-nums tracking-tight text-stone-700">
              {partners.filter(isCurrentlyActive).length}
            </p>
          </div>
        </div>
      )}

      {/* ━━━ TOOLBAR ━━━ */}
      <div>
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
            placeholder="Sök partners..."
            className="w-full rounded-[10px] bg-stone-50/80 py-2.5 pl-10 pr-4 text-[12px] font-medium text-stone-700 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
              } as React.CSSProperties
            }
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            style={
              showInactive
                ? { backgroundColor: hexToRgba(brand, 0.08), color: brand }
                : {
                    backgroundColor: "transparent",
                    color: "#a8a29e",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }
            }
          >
            {showInactive ? <Eye size={11} /> : <EyeOff size={11} />}
            Inaktiva
          </button>

          <div className="flex-1" />

          <button
            onClick={() => {
              setEditingId(null);
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
            style={{
              backgroundColor: brand,
              boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
            }}
          >
            <Plus size={12} strokeWidth={2.5} />
            Ny partner
          </button>
        </div>
      </div>

      {/* ━━━ ADD FORM ━━━ */}
      {showAddForm &&
        renderForm("add", {
          name: newName,
          setName: setNewName,
          description: newDescription,
          setDescription: setNewDescription,
          website: newWebsite,
          setWebsite: setNewWebsite,
          phone: newPhone,
          setPhone: setNewPhone,
          logoUrl: newLogoUrl,
          setLogoUrl: setNewLogoUrl,
          placeId: newPlaceId,
          setPlaceId: setNewPlaceId,
          rank: newRank,
          setRank: setNewRank,
          startsAt: newStartsAt,
          setStartsAt: setNewStartsAt,
          endsAt: newEndsAt,
          setEndsAt: setNewEndsAt,
          onSubmit: handleAdd,
          onCancel: resetAddForm,
        })}

      {/* ━━━ PARTNERS LIST ━━━ */}
      <div>
        <div className="mb-2 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            {filtered.length} {filtered.length === 1 ? "partner" : "partners"}
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-1.5">
            {filtered.map((partner) => {
              const busy = actioningId === partner.id;
              const live = isCurrentlyActive(partner);
              const isEditing = editingId === partner.id;

              if (isEditing) {
                return (
                  <div
                    key={partner.id}
                    className="ring-1 ring-stone-200 rounded-[16px]"
                  >
                    {renderForm("edit", {
                      name: editName,
                      setName: setEditName,
                      description: editDescription,
                      setDescription: setEditDescription,
                      website: editWebsite,
                      setWebsite: setEditWebsite,
                      phone: editPhone,
                      setPhone: setEditPhone,
                      logoUrl: editLogoUrl,
                      setLogoUrl: setEditLogoUrl,
                      placeId: editPlaceId,
                      setPlaceId: setEditPlaceId,
                      rank: editRank,
                      setRank: setEditRank,
                      startsAt: editStartsAt,
                      setStartsAt: setEditStartsAt,
                      endsAt: editEndsAt,
                      setEndsAt: setEditEndsAt,
                      onSubmit: handleUpdate,
                      onCancel: () => setEditingId(null),
                    })}
                  </div>
                );
              }

              return (
                <div
                  key={partner.id}
                  className={`rounded-[14px] p-3.5 ring-1 ring-stone-200/60 transition-all ${
                    !live ? "bg-stone-50/60 opacity-60" : "bg-white"
                  } ${busy ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-stone-50 ring-1 ring-stone-200/60">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.business_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base">🤝</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate text-[12px] font-bold text-stone-800">
                          {partner.business_name}
                        </h4>
                        {live && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em]"
                            style={{
                              backgroundColor: "rgba(5,150,105,0.08)",
                              color: "#059669",
                            }}
                          >
                            Live
                          </span>
                        )}
                        {!partner.is_active && (
                          <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-stone-400">
                            Inaktiv
                          </span>
                        )}
                        {partner.is_active && !live && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-amber-600">
                            Schemalagd
                          </span>
                        )}
                        {partner.priority_rank > 0 && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em]"
                            style={{
                              backgroundColor: hexToRgba(brand, 0.06),
                              color: brand,
                            }}
                          >
                            #{partner.priority_rank}
                          </span>
                        )}
                      </div>

                      {partner.description && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400 line-clamp-2">
                          {partner.description}
                        </p>
                      )}

                      <div className="mt-2">
                        <div
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                          style={{ backgroundColor: hexToRgba(brand, 0.06) }}
                        >
                          <MousePointerClick
                            size={11}
                            strokeWidth={2}
                            style={{ color: brand }}
                          />
                          <span
                            className="text-[11px] font-black tabular-nums"
                            style={{ color: brand }}
                          >
                            {partner.click_count}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-stone-300">
                            klick
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row">
                      <button
                        onClick={() =>
                          withAction(partner.id, () =>
                            togglePromotedPartnerActive(
                              partner.id,
                              partner.is_active,
                            ),
                          )
                        }
                        disabled={busy}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-all hover:bg-stone-50 hover:text-stone-500 active:scale-90 disabled:opacity-40"
                      >
                        {partner.is_active ? (
                          <EyeOff size={13} />
                        ) : (
                          <Eye size={13} />
                        )}
                      </button>

                      <button
                        onClick={() => handleStartEdit(partner)}
                        disabled={busy}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-all hover:bg-stone-50 hover:text-stone-500 active:scale-90 disabled:opacity-40"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(partner.id, partner.business_name)
                        }
                        disabled={busy}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90 disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] bg-white px-6 py-8 text-center ring-1 ring-stone-200/60">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
              🤝
            </div>
            <p className="text-[13px] font-black tracking-tight text-stone-700">
              {search ? "Inga träffar" : "Inga sponsrade partners ännu"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
