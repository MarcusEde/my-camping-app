"use client";

import {
  isCurrentlyActive,
  usePartnerManager,
} from "@/lib/hooks/usePartnerManager";
import { hexToRgba } from "@/lib/utils";
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
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  partners: PromotedPartnerWithClicks[];
  places: CachedPlace[];
}

/* ── Main Component ──────────────────────────────────── */
export default function PartnerManager({
  campground,
  partners,
  places,
}: Props) {
  const s = usePartnerManager({ campground, partners, places });

  return (
    <div className="space-y-4">
      {/* ━━━ STATS BANNER ━━━ */}
      {partners.length > 0 && (
        <StatsBanner
          brand={s.brand}
          totalClicks={s.totalClicks}
          activeCount={s.activeCount}
        />
      )}

      {/* ━━━ TOOLBAR ━━━ */}
      <Toolbar
        brand={s.brand}
        search={s.search}
        onSearchChange={s.setSearch}
        showInactive={s.showInactive}
        onToggleShowInactive={s.toggleShowInactive}
        onOpenAddForm={s.openAddForm}
      />

      {/* ━━━ ADD FORM ━━━ */}
      {s.showAddForm && (
        <PartnerForm
          mode="add"
          brand={s.brand}
          isPending={s.isPending}
          linkablePlaces={s.linkablePlaces}
          name={s.newName}
          onNameChange={s.setNewName}
          description={s.newDescription}
          onDescriptionChange={s.setNewDescription}
          website={s.newWebsite}
          onWebsiteChange={s.setNewWebsite}
          phone={s.newPhone}
          onPhoneChange={s.setNewPhone}
          logoUrl={s.newLogoUrl}
          onLogoUrlChange={s.setNewLogoUrl}
          placeId={s.newPlaceId}
          onPlaceIdChange={s.setNewPlaceId}
          rank={s.newRank}
          onRankChange={s.setNewRank}
          startsAt={s.newStartsAt}
          onStartsAtChange={s.setNewStartsAt}
          endsAt={s.newEndsAt}
          onEndsAtChange={s.setNewEndsAt}
          couponCode={s.newCouponCode}
          onCouponCodeChange={s.setNewCouponCode}
          onSubmit={s.handleAdd}
          onCancel={s.resetAddForm}
        />
      )}

      {/* ━━━ PARTNERS LIST ━━━ */}
      <div>
        <div className="mb-2 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            {s.filtered.length}{" "}
            {s.filtered.length === 1 ? "partner" : "partners"}
          </p>
        </div>

        {s.filtered.length > 0 ? (
          <div className="space-y-1.5">
            {s.filtered.map((partner) => {
              if (s.editingId === partner.id) {
                return (
                  <div
                    key={partner.id}
                    className="rounded-[16px] ring-1 ring-stone-200"
                  >
                    <PartnerForm
                      mode="edit"
                      brand={s.brand}
                      isPending={s.isPending}
                      linkablePlaces={s.linkablePlaces}
                      name={s.editName}
                      onNameChange={s.setEditName}
                      description={s.editDescription}
                      onDescriptionChange={s.setEditDescription}
                      website={s.editWebsite}
                      onWebsiteChange={s.setEditWebsite}
                      phone={s.editPhone}
                      onPhoneChange={s.setEditPhone}
                      logoUrl={s.editLogoUrl}
                      onLogoUrlChange={s.setEditLogoUrl}
                      placeId={s.editPlaceId}
                      onPlaceIdChange={s.setEditPlaceId}
                      rank={s.editRank}
                      onRankChange={s.setEditRank}
                      startsAt={s.editStartsAt}
                      onStartsAtChange={s.setEditStartsAt}
                      endsAt={s.editEndsAt}
                      onEndsAtChange={s.setEditEndsAt}
                      couponCode={s.editCouponCode}
                      onCouponCodeChange={s.setEditCouponCode}
                      onSubmit={s.handleUpdate}
                      onCancel={s.handleCancelEdit}
                    />
                  </div>
                );
              }

              return (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  brand={s.brand}
                  isBusy={s.actioningId === partner.id}
                  onToggleActive={() =>
                    s.handleToggleActive(partner.id, partner.is_active)
                  }
                  onEdit={() => s.handleStartEdit(partner)}
                  onDelete={() =>
                    s.handleDelete(partner.id, partner.business_name)
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState hasSearch={!!s.search} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════ */

function StatsBanner({
  brand,
  totalClicks,
  activeCount,
}: {
  brand: string;
  totalClicks: number;
  activeCount: number;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[14px] px-4 py-3"
      style={{ backgroundColor: hexToRgba(brand, 0.04) }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: hexToRgba(brand, 0.08), color: brand }}
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
          {activeCount}
        </p>
      </div>
    </div>
  );
}

function Toolbar({
  brand,
  search,
  onSearchChange,
  showInactive,
  onToggleShowInactive,
  onOpenAddForm,
}: {
  brand: string;
  search: string;
  onSearchChange: (v: string) => void;
  showInactive: boolean;
  onToggleShowInactive: () => void;
  onOpenAddForm: () => void;
}) {
  return (
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
          onChange={(e) => onSearchChange(e.target.value)}
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
          onClick={onToggleShowInactive}
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
          onClick={onOpenAddForm}
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
  );
}

/* ═══════════════════════════════════════════════════════
   Partner Card
   ═══════════════════════════════════════════════════════ */
function PartnerCard({
  partner,
  brand,
  isBusy,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  partner: PromotedPartnerWithClicks;
  brand: string;
  isBusy: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const live = isCurrentlyActive(partner);

  return (
    <div
      className={`rounded-[14px] p-3.5 ring-1 ring-stone-200/60 transition-all ${
        !live ? "bg-stone-50/60 opacity-60" : "bg-white"
      } ${isBusy ? "opacity-40" : ""}`}
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
              <StatusBadge
                label="Live"
                bgColor="rgba(5,150,105,0.08)"
                textColor="#059669"
              />
            )}
            {!partner.is_active && (
              <StatusBadge
                label="Inaktiv"
                bgColor="#f5f5f4"
                textColor="#a8a29e"
              />
            )}
            {partner.is_active && !live && (
              <StatusBadge
                label="Schemalagd"
                bgColor="rgba(245,158,11,0.08)"
                textColor="#d97706"
              />
            )}
            {partner.priority_rank > 0 && (
              <StatusBadge
                label={`#${partner.priority_rank}`}
                bgColor={hexToRgba(brand, 0.06)}
                textColor={brand}
              />
            )}
          </div>

          {partner.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-400">
              {partner.description}
            </p>
          )}

          {/* ── Coupon badge (owner view) ── */}
          {partner.coupon_code && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 ring-1 ring-amber-200/60">
              <Ticket size={10} strokeWidth={2} className="text-amber-500" />
              <span className="text-[10px] font-black tracking-wide text-amber-700">
                {partner.coupon_code}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
          <ActionButton
            title={partner.is_active ? "Inaktivera" : "Aktivera"}
            onClick={onToggleActive}
            disabled={isBusy}
          >
            {partner.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
          </ActionButton>
          <ActionButton title="Redigera" onClick={onEdit} disabled={isBusy}>
            <Edit3 size={13} />
          </ActionButton>
          <ActionButton
            title="Ta bort"
            onClick={onDelete}
            disabled={isBusy}
            dangerHover
          >
            <Trash2 size={13} />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Partner Form (shared for add & edit)
   ═══════════════════════════════════════════════════════ */
interface PartnerFormProps {
  mode: "add" | "edit";
  brand: string;
  isPending: boolean;
  linkablePlaces: CachedPlace[];
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  logoUrl: string;
  onLogoUrlChange: (v: string) => void;
  placeId: string;
  onPlaceIdChange: (v: string) => void;
  rank: number;
  onRankChange: (v: number) => void;
  startsAt: string;
  onStartsAtChange: (v: string) => void;
  endsAt: string;
  onEndsAtChange: (v: string) => void;
  couponCode: string;
  onCouponCodeChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function PartnerForm({
  mode,
  brand,
  isPending,
  linkablePlaces,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  website,
  onWebsiteChange,
  phone,
  onPhoneChange,
  logoUrl,
  onLogoUrlChange,
  placeId,
  onPlaceIdChange,
  rank,
  onRankChange,
  startsAt,
  onStartsAtChange,
  endsAt,
  onEndsAtChange,
  couponCode,
  onCouponCodeChange,
  onSubmit,
  onCancel,
}: PartnerFormProps) {
  const ringStyle = {
    "--tw-ring-color": hexToRgba(brand, 0.25),
  } as React.CSSProperties;

  return (
    <div
      className="space-y-3 rounded-[16px] p-4"
      style={{ backgroundColor: hexToRgba(brand, 0.03) }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-black tracking-tight text-stone-900">
          {mode === "add" ? "Ny sponsrad partner" : "Redigera partner"}
        </p>
        <button
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors hover:text-stone-600"
        >
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Företagsnamn *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='T.ex. "Roma Pizzeria (Sponsored)"'
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={ringStyle}
        />
      </div>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Beskrivning / Erbjudande
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="T.ex. Visa appen i kassan för 10% rabatt..."
          rows={2}
          className="w-full resize-none rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={ringStyle}
        />
      </div>

      {/* ── Coupon Code field ── */}
      <div>
        <label className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          <Ticket size={10} />
          Rabattkod (valfritt)
        </label>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
          placeholder='T.ex. "CAMPING20"'
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-widest text-stone-800 ring-1 ring-stone-200/60 placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={ringStyle}
        />
        <p className="mt-1 px-1 text-[10px] leading-relaxed text-stone-300">
          Gäster klickar &quot;Hämta rabatt&quot; för att se koden — varje klick
          spåras som en inlöst kupong.
        </p>
      </div>

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
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-[10px] bg-white py-2.5 pl-9 pr-3 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={ringStyle}
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
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="070-123 45 67"
              className="w-full rounded-[10px] bg-white py-2.5 pl-9 pr-3 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
              style={ringStyle}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          Logotyp (URL)
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => onLogoUrlChange(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
          style={ringStyle}
        />
      </div>

      <div>
        <label className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          <Link2 size={10} />
          Länka till befintlig plats (valfritt)
        </label>
        <select
          value={placeId}
          onChange={(e) => onPlaceIdChange(e.target.value)}
          className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
          style={ringStyle}
        >
          <option value="">— Ingen koppling —</option>
          {linkablePlaces.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Prioritet (lägre = högre)
          </label>
          <input
            type="number"
            min={0}
            value={rank}
            onChange={(e) => onRankChange(parseInt(e.target.value) || 0)}
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={ringStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Startar
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => onStartsAtChange(e.target.value)}
            className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[11px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={ringStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
            Slutar (valfritt)
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => onEndsAtChange(e.target.value)}
            className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[11px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={ringStyle}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={!name.trim() || isPending}
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
          onClick={onCancel}
          className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
        >
          Avbryt
        </button>
      </div>
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
        🤝
      </div>
      <p className="text-[13px] font-black tracking-tight text-stone-700">
        {hasSearch ? "Inga träffar" : "Inga sponsrade partners ännu"}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared Primitives
   ═══════════════════════════════════════════════════════ */

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

function ActionButton({
  children,
  title,
  onClick,
  disabled,
  dangerHover,
}: {
  children: React.ReactNode;
  title: string;
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
    >
      {children}
    </button>
  );
}
