"use client";

import {
  useAdminCampgroundCard,
  type EditFormState,
} from "@/lib/hooks/useAdminCampgroundCard";
import { fmtDate, fmtRelative } from "@/lib/utils";
import type { CampStats } from "@/types/admin";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eraser,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

/* ── Props ───────────────────────────────────────────── */
interface Props {
  camp: CampStats;
}

/* ── Main Component ──────────────────────────────────── */
export default function AdminCampgroundCard({ camp }: Props) {
  const s = useAdminCampgroundCard({ camp });

  return (
    <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60 transition-all hover:shadow-md">
      {/* ━━━ HEADER ━━━ */}
      <CardHeader
        camp={camp}
        totalPlaces={s.totalPlaces}
        isExpanded={s.isExpanded}
        onToggle={s.toggleExpanded}
      />

      {/* ━━━ EXPANDED BODY ━━━ */}
      {s.isExpanded && (
        <div className="border-t border-stone-100 bg-stone-50/30">
          <EditToggleBar isEditing={s.isEditing} onToggle={s.toggleEditing} />

          {s.isEditing ? (
            <EditMode
              editForm={s.editForm}
              setField={s.setField}
              isPending={s.isPending}
              onSave={s.handleSave}
            />
          ) : (
            <ViewMode camp={camp} />
          )}

          {/* ── Actions ── */}
          <ActionBar
            isPending={s.isPending}
            onSync={s.handleSync}
            onClear={s.handleClear}
            onDelete={s.handleDelete}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Card Header
   ═══════════════════════════════════════════════════════ */
function CardHeader({
  camp,
  totalPlaces,
  isExpanded,
  onToggle,
}: {
  camp: CampStats;
  totalPlaces: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer select-none items-center justify-between px-5 py-4 transition-colors hover:bg-stone-50/50"
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-xl text-white shadow-inner"
          style={{ backgroundColor: camp.primary_color }}
        >
          🏕️
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-black tracking-tight text-stone-900">
              {camp.name}
            </h3>
            <StatusBadge status={camp.subscription_status} />
            {camp.isTrialExpired && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-red-600 ring-1 ring-red-500/20">
                Utgått
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] font-medium text-stone-400">
            /camp/{camp.slug}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-stone-400">
            <span>📍 {totalPlaces} platser</span>
            {camp.googlePlacesHidden > 0 && (
              <span className="text-stone-300">
                ({camp.googlePlacesHidden} dolda)
              </span>
            )}
            {camp.announcementCount > 0 && (
              <span>📢 {camp.announcementCount}</span>
            )}
            {camp.partnerCount > 0 && <span>🤝 {camp.partnerCount}</span>}
            <span>⏱ {fmtRelative(camp.lastSyncedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200">
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Edit Toggle Bar
   ═══════════════════════════════════════════════════════ */
function EditToggleBar({
  isEditing,
  onToggle,
}: {
  isEditing: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/40 px-5 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {isEditing ? "Redigera campingdetaljer" : "Campingdetaljer"}
      </span>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-stone-200/60"
        style={{ color: isEditing ? "#ef4444" : "#78716c" }}
      >
        {isEditing ? (
          <>
            <X size={12} /> Avbryt
          </>
        ) : (
          <>
            <Edit3 size={12} /> Redigera
          </>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Edit Mode
   ═══════════════════════════════════════════════════════ */
function EditMode({
  editForm,
  setField,
  isPending,
  onSave,
}: {
  editForm: EditFormState;
  setField: (key: keyof EditFormState, value: string) => void;
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5 px-5 py-4">
      <EditFieldset legend="Grunduppgifter">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditField
            label="Namn"
            value={editForm.name}
            onChange={(v) => setField("name", v)}
          />
          <EditField
            label="Slug"
            value={editForm.slug}
            onChange={(v) => setField("slug", v)}
            prefix="/camp/"
          />
          <EditField
            label="Latitud"
            value={editForm.latitude}
            onChange={(v) => setField("latitude", v)}
            type="number"
          />
          <EditField
            label="Longitud"
            value={editForm.longitude}
            onChange={(v) => setField("longitude", v)}
            type="number"
          />
        </div>
      </EditFieldset>

      <EditFieldset legend="Abonnemang">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={editForm.subscription_status}
              onChange={(e) => setField("subscription_status", e.target.value)}
              className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <SubscriptionHint status={editForm.subscription_status} />
          </div>
          <EditField
            label="Trial slutar"
            value={editForm.trial_ends_at}
            onChange={(v) => setField("trial_ends_at", v)}
            type="date"
          />
        </div>
      </EditFieldset>

      <EditFieldset legend="Branding">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Färg</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editForm.primary_color}
                onChange={(e) => setField("primary_color", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-[10px] border-0 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={editForm.primary_color}
                onChange={(e) => setField("primary_color", e.target.value)}
                className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
              />
            </div>
          </div>
          <EditField
            label="Logo URL"
            value={editForm.logo_url}
            onChange={(v) => setField("logo_url", v)}
          />
          <EditField
            label="Hero bild URL"
            value={editForm.hero_image_url}
            onChange={(v) => setField("hero_image_url", v)}
          />
        </div>
      </EditFieldset>

      <EditFieldset legend="Kontakt & Reception">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditField
            label="Telefon"
            value={editForm.phone}
            onChange={(v) => setField("phone", v)}
          />
          <EditField
            label="E-post"
            value={editForm.email}
            onChange={(v) => setField("email", v)}
          />
          <EditField
            label="Webbplats"
            value={editForm.website}
            onChange={(v) => setField("website", v)}
          />
          <EditField
            label="Adress"
            value={editForm.address}
            onChange={(v) => setField("address", v)}
          />
        </div>
        <div className="mt-3">
          <EditTextarea
            label="Receptionens öppettider"
            value={editForm.reception_hours}
            onChange={(v) => setField("reception_hours", v)}
          />
        </div>
      </EditFieldset>

      <EditFieldset legend="Gästinfo">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditField
            label="WiFi-namn"
            value={editForm.wifi_name}
            onChange={(v) => setField("wifi_name", v)}
          />
          <EditField
            label="WiFi-lösenord"
            value={editForm.wifi_password}
            onChange={(v) => setField("wifi_password", v)}
          />
        </div>
        <div className="mt-3 space-y-3">
          <EditTextarea
            label="Utcheckningsinfo"
            value={editForm.check_out_info}
            onChange={(v) => setField("check_out_info", v)}
          />
          <EditTextarea
            label="Sopregler"
            value={editForm.trash_rules}
            onChange={(v) => setField("trash_rules", v)}
          />
          <EditTextarea
            label="Nödinfo"
            value={editForm.emergency_info}
            onChange={(v) => setField("emergency_info", v)}
          />
          <EditTextarea
            label="Ordningsregler"
            value={editForm.camp_rules}
            onChange={(v) => setField("camp_rules", v)}
          />
        </div>
      </EditFieldset>

      <button
        onClick={onSave}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
      >
        <Check size={14} />
        {isPending ? "Sparar…" : "Spara ändringar"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   View Mode
   ═══════════════════════════════════════════════════════ */
function ViewMode({ camp }: { camp: CampStats }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <Section title="Ägare & konto">
          <InfoPair label="Email" value={camp.ownerEmail ?? "—"} />
          <InfoPair label="Konto skapat" value={fmtDate(camp.ownerCreatedAt)} />
          <InfoPair
            label="Senaste inloggning"
            value={fmtRelative(camp.ownerLastSignIn)}
          />
          <InfoPair label="Ägar-ID" value={camp.owner_id ?? "—"} mono />
        </Section>
        <Section title="Fakturering" borderLeft>
          <InfoPair label="Plan" value={camp.billingPlan} />
          {camp.trialDaysLeft !== null && (
            <InfoPair
              label="Trial"
              value={
                camp.isTrialExpired
                  ? "⛔ Utgått"
                  : `${camp.trialDaysLeft} dagar kvar`
              }
              warn={camp.isTrialExpired || (camp.trialDaysLeft ?? 99) <= 3}
            />
          )}
          <InfoPair
            label="MRR"
            value={camp.mrr != null ? `${camp.mrr} SEK/mån` : "—"}
          />
          <InfoPair label="Trial slutar" value={fmtDate(camp.trial_ends_at)} />
          <InfoPair
            label="Gästvy-status"
            value={getGuestViewStatus(camp)}
            warn={
              camp.subscription_status === "cancelled" ||
              camp.subscription_status === "inactive" ||
              camp.isTrialExpired
            }
          />
        </Section>
      </div>

      <Section title="Konfiguration" fullBorder>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <SetupDot ok={!!camp.wifi_name} label="WiFi" />
          <SetupDot ok={!!camp.check_out_info} label="Utcheckning" />
          <SetupDot ok={!!camp.emergency_info} label="Nöd-info" />
          <SetupDot ok={!!camp.trash_rules} label="Sopor" />
          <SetupDot ok={!!camp.logo_url} label="Logotyp" />
          <SetupDot ok={!!camp.hero_image_url} label="Hero-bild" />
          <SetupDot ok={!!camp.phone} label="Telefon" />
          <SetupDot ok={!!camp.camp_rules} label="Regler" />
          <SetupDot
            ok={
              !!camp.supported_languages && camp.supported_languages.length > 0
            }
            label={`Språk: ${camp.supported_languages?.join(", ") ?? "—"}`}
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <Section title="Innehåll">
          <InfoPair
            label="Google-platser"
            value={`${camp.googlePlacesActive} aktiva · ${camp.googlePlacesHidden} dolda`}
          />
          <InfoPair label="Egna platser" value={String(camp.customPlaces)} />
          <InfoPair label="Fästa" value={String(camp.pinnedPlaces)} />
          <InfoPair
            label="Meddelanden"
            value={String(camp.announcementCount)}
          />
          <InfoPair label="Partners" value={String(camp.partnerCount)} />
          <InfoPair
            label="Senaste synk"
            value={fmtRelative(camp.lastSyncedAt)}
          />
        </Section>
        <Section title="Plats & branding" borderLeft>
          <InfoPair
            label="Koordinater"
            value={`${camp.latitude}, ${camp.longitude}`}
          />
          <div className="flex items-center gap-3 py-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
              Färg
            </span>
            <div
              className="h-5 w-5 rounded-md ring-1 ring-black/10"
              style={{ backgroundColor: camp.primary_color }}
            />
            <span className="font-mono text-[11px] text-stone-500">
              {camp.primary_color}
            </span>
          </div>
          <InfoPair label="ID" value={camp.id} mono />
          <div className="pt-1">
            <a
              href={`/camp/${camp.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:underline"
            >
              Öppna gästvy <ExternalLink size={11} />
            </a>
          </div>
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Action Bar
   ═══════════════════════════════════════════════════════ */
function ActionBar({
  isPending,
  onSync,
  onClear,
  onDelete,
}: {
  isPending: boolean;
  onSync: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-t border-stone-200/60 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onSync}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-stone-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-stone-800 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          Kör upptäcktsmotor
        </button>
        <button
          onClick={onClear}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-stone-700 ring-1 ring-stone-200/60 transition-all hover:bg-stone-100 active:scale-95 disabled:opacity-50"
        >
          <Eraser size={14} />
          Rensa platser
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-[12px] bg-red-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 sm:w-auto"
        >
          <Trash2 size={14} />
          <span className="sm:hidden">Radera</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Helpers (pure display logic)
   ═══════════════════════════════════════════════════════ */

function getGuestViewStatus(camp: CampStats): string {
  if (camp.subscription_status === "active") return "✅ Live";
  if (camp.subscription_status === "trial") {
    return camp.isTrialExpired ? "⏰ Trial utgått — gatad" : "⏳ Trial — live";
  }
  if (camp.subscription_status === "inactive")
    return "⏸️ Pausad — gäster ser meddelande";
  return "🚫 Avslutad — gäster ser meddelande";
}

function SubscriptionHint({ status }: { status: string }) {
  const hints: Record<string, string> = {
    inactive: '⏸️ Gästvyn visar "Tillfälligt otillgänglig"',
    cancelled: '🚫 Gästvyn visar "Ej längre tillgänglig"',
    trial: "⏳ Gästvyn är live tills trial löper ut",
    active: "✅ Gästvyn är fullt aktiv",
  };
  const hint = hints[status];
  if (!hint) return null;
  return <p className="mt-1.5 text-[10px] text-stone-400">{hint}</p>;
}

/* ═══════════════════════════════════════════════════════
   Shared Primitives
   ═══════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
    trial: "bg-amber-50 text-amber-600 ring-amber-500/20",
    inactive: "bg-stone-100 text-stone-500 ring-stone-300/60",
    cancelled: "bg-red-50 text-red-500 ring-red-500/20",
  };
  const labels: Record<string, string> = {
    active: "Aktiv",
    trial: "Trial",
    inactive: "Inaktiv",
    cancelled: "Avslutad",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] ring-1 ${styles[status] ?? styles.trial}`}
    >
      {labels[status] ?? "Trial"}
    </span>
  );
}

function Section({
  title,
  children,
  borderLeft,
  fullBorder,
}: {
  title: string;
  children: React.ReactNode;
  borderLeft?: boolean;
  fullBorder?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 ${borderLeft ? "md:border-l md:border-stone-200/60" : ""} ${fullBorder ? "border-t border-stone-200/60" : ""}`}
    >
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoPair({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
        {label}
      </span>
      <span
        className={`text-right text-[12px] ${mono ? "font-mono" : "font-medium"} ${warn ? "text-red-600" : "text-stone-700"}`}
      >
        {value}
      </span>
    </div>
  );
}

function SetupDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
      />
      <span
        className={`text-[11px] font-medium ${ok ? "text-stone-600" : "text-red-600"}`}
      >
        {label}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
      {children}
    </label>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {prefix ? (
        <div className="flex items-center overflow-hidden rounded-[10px] ring-1 ring-stone-200/60">
          <span className="bg-stone-50 px-3 py-2.5 text-[12px] text-stone-400">
            {prefix}
          </span>
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2.5 text-[12px] outline-none"
          />
        </div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[10px] px-3.5 py-2.5 text-[12px] ring-1 ring-stone-200/60 outline-none"
        />
      )}
    </div>
  );
}

function EditFieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {legend}
      </p>
      {children}
    </div>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
      />
    </div>
  );
}
