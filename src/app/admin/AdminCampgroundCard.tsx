"use client";

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
import { useState, useTransition } from "react";
import {
  adminClearGooglePlaces,
  adminDeleteCampground,
  adminSyncCampground,
  adminUpdateCampground,
} from "./actions";
import type { CampStats } from "./page";

/* ── Helpers ─────────────────────────────────────────────── */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtRelative(d: string | null): string {
  if (!d) return "Aldrig";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just nu";
  if (mins < 60) return `${mins}m sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d sedan`;
  return fmtDate(d);
}

const CATEGORY_EMOJI: Record<string, string> = {
  park: "🌲",
  beach: "🏖️",
  shopping: "🛒",
  restaurant: "🍽️",
  cafe: "☕",
  museum: "🏛️",
  other: "📍",
  cinema: "🎬",
  spa: "💆",
  bowling: "🎳",
  swimming: "🏊",
};

export default function AdminCampgroundCard({ camp }: { camp: CampStats }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Editable state
  const [editForm, setEditForm] = useState({
    name: camp.name,
    slug: camp.slug,
    subscription_status: camp.subscription_status,
    trial_ends_at: camp.trial_ends_at?.slice(0, 10) ?? "",
    primary_color: camp.primary_color,
    latitude: String(camp.latitude),
    longitude: String(camp.longitude),
    wifi_name: camp.wifi_name ?? "",
    wifi_password: camp.wifi_password ?? "",
    check_out_info: camp.check_out_info ?? "",
    trash_rules: camp.trash_rules ?? "",
    emergency_info: camp.emergency_info ?? "",
    logo_url: camp.logo_url ?? "",
    hero_image_url: camp.hero_image_url ?? "",
    phone: (camp as any).phone ?? "",
    email: (camp as any).email ?? "",
    website: (camp as any).website ?? "",
    address: (camp as any).address ?? "",
    reception_hours: (camp as any).reception_hours ?? "",
    camp_rules: (camp as any).camp_rules ?? "",
  });

  const setField = (k: keyof typeof editForm, v: string) =>
    setEditForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    startTransition(async () => {
      try {
        await adminUpdateCampground(camp.id, {
          ...editForm,
          latitude: parseFloat(editForm.latitude),
          longitude: parseFloat(editForm.longitude),
          trial_ends_at: editForm.trial_ends_at
            ? new Date(editForm.trial_ends_at).toISOString()
            : null,
        });
        setIsEditing(false);
        alert("✅ Uppdaterat!");
      } catch (e: any) {
        alert(`❌ ${e.message}`);
      }
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      try {
        const res = await adminSyncCampground(camp.id);
        const summary = res.categorySummary
          ? Object.entries(res.categorySummary)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(
                ([cat, count]) =>
                  `  ${CATEGORY_EMOJI[cat] ?? "·"} ${cat}: ${count}`,
              )
              .join("\n")
          : "";
        alert(
          `✅ Synk klar!\n\nTillagda: ${res.addedCount}\nUppdaterade: ${res.updatedCount}\nNära-dubbletter: ${res.nearDupesRemoved}\nFiltrerade: ${res.filteredOut}\nAPI-fel: ${res.apiErrors}\nTotalt sparade: ${res.totalSaved}\n\nPer kategori:\n${summary}`,
        );
      } catch (e: any) {
        alert(`❌ ${e.message}`);
      }
    });
  };

  const handleClear = () => {
    if (!confirm(`Rensa alla Google-platser för "${camp.name}"?`)) return;
    startTransition(async () => {
      try {
        await adminClearGooglePlaces(camp.id);
        alert("🗑️ Rensat.");
      } catch (e: any) {
        alert(`❌ ${e.message}`);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`🚨 RADERA "${camp.name}" och ägarkonto?\nKan INTE ångras!`))
      return;
    startTransition(async () => {
      try {
        await adminDeleteCampground(camp.id, camp.owner_id);
        alert("✅ Raderat.");
      } catch (e: any) {
        alert(`❌ ${e.message}`);
      }
    });
  };

  const totalPlaces = camp.googlePlacesActive + camp.customPlaces;

  return (
    <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60 transition-all hover:shadow-md">
      {/* ━━━ HEADER ━━━ */}
      <div
        className="flex cursor-pointer select-none items-center justify-between px-5 py-4 transition-colors hover:bg-stone-50/50"
        onClick={() => setIsExpanded(!isExpanded)}
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

      {/* ━━━ EXPANDED BODY ━━━ */}
      {isExpanded && (
        <div className="border-t border-stone-100 bg-stone-50/30">
          <div className="flex items-center justify-between border-b border-stone-200/40 px-5 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              {isEditing ? "Redigera campingdetaljer" : "Campingdetaljer"}
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
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

          {isEditing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-5 px-5 py-4">
              <EditFieldset legend="Grunduppgifter">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EditField
                    label="Namn"
                    value={editForm.name}
                    onChange={(v: string) => setField("name", v)}
                  />
                  <EditField
                    label="Slug"
                    value={editForm.slug}
                    onChange={(v: string) => setField("slug", v)}
                    prefix="/camp/"
                  />
                  <EditField
                    label="Latitud"
                    value={editForm.latitude}
                    onChange={(v: string) => setField("latitude", v)}
                    type="number"
                  />
                  <EditField
                    label="Longitud"
                    value={editForm.longitude}
                    onChange={(v: string) => setField("longitude", v)}
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
                      onChange={(e) =>
                        setField("subscription_status", e.target.value)
                      }
                      className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <p className="mt-1.5 text-[10px] text-stone-400">
                      {editForm.subscription_status === "inactive" &&
                        '⏸️ Gästvyn visar "Tillfälligt otillgänglig"'}
                      {editForm.subscription_status === "cancelled" &&
                        '🚫 Gästvyn visar "Ej längre tillgänglig"'}
                      {editForm.subscription_status === "trial" &&
                        "⏳ Gästvyn är live tills trial löper ut"}
                      {editForm.subscription_status === "active" &&
                        "✅ Gästvyn är fullt aktiv"}
                    </p>
                  </div>
                  <EditField
                    label="Trial slutar"
                    value={editForm.trial_ends_at}
                    onChange={(v: string) => setField("trial_ends_at", v)}
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
                        onChange={(e) =>
                          setField("primary_color", e.target.value)
                        }
                        className="h-10 w-12 cursor-pointer rounded-[10px] border-0 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={editForm.primary_color}
                        onChange={(e) =>
                          setField("primary_color", e.target.value)
                        }
                        className="w-full rounded-[10px] bg-white px-3 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
                      />
                    </div>
                  </div>
                  <EditField
                    label="Logo URL"
                    value={editForm.logo_url}
                    onChange={(v: string) => setField("logo_url", v)}
                  />
                  <EditField
                    label="Hero bild URL"
                    value={editForm.hero_image_url}
                    onChange={(v: string) => setField("hero_image_url", v)}
                  />
                </div>
              </EditFieldset>

              <EditFieldset legend="Kontakt & Reception">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EditField
                    label="Telefon"
                    value={editForm.phone}
                    onChange={(v: string) => setField("phone", v)}
                  />
                  <EditField
                    label="E-post"
                    value={editForm.email}
                    onChange={(v: string) => setField("email", v)}
                  />
                  <EditField
                    label="Webbplats"
                    value={editForm.website}
                    onChange={(v: string) => setField("website", v)}
                  />
                  <EditField
                    label="Adress"
                    value={editForm.address}
                    onChange={(v: string) => setField("address", v)}
                  />
                </div>
                <div className="mt-3">
                  <EditTextarea
                    label="Receptionens öppettider"
                    value={editForm.reception_hours}
                    onChange={(v: string) => setField("reception_hours", v)}
                  />
                </div>
              </EditFieldset>

              <EditFieldset legend="Gästinfo">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EditField
                    label="WiFi-namn"
                    value={editForm.wifi_name}
                    onChange={(v: string) => setField("wifi_name", v)}
                  />
                  <EditField
                    label="WiFi-lösenord"
                    value={editForm.wifi_password}
                    onChange={(v: string) => setField("wifi_password", v)}
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <EditTextarea
                    label="Utcheckningsinfo"
                    value={editForm.check_out_info}
                    onChange={(v: string) => setField("check_out_info", v)}
                  />
                  <EditTextarea
                    label="Sopregler"
                    value={editForm.trash_rules}
                    onChange={(v: string) => setField("trash_rules", v)}
                  />
                  <EditTextarea
                    label="Nödinfo"
                    value={editForm.emergency_info}
                    onChange={(v: string) => setField("emergency_info", v)}
                  />
                  <EditTextarea
                    label="Ordningsregler"
                    value={editForm.camp_rules}
                    onChange={(v: string) => setField("camp_rules", v)}
                  />
                </div>
              </EditFieldset>

              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <Check size={14} />
                {isPending ? "Sparar…" : "Spara ändringar"}
              </button>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <Section title="Ägare & konto">
                  <InfoPair label="Email" value={camp.ownerEmail ?? "—"} />
                  <InfoPair
                    label="Konto skapat"
                    value={fmtDate(camp.ownerCreatedAt)}
                  />
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
                      warn={
                        camp.isTrialExpired || (camp.trialDaysLeft ?? 99) <= 3
                      }
                    />
                  )}
                  <InfoPair
                    label="MRR"
                    value={camp.mrr != null ? `${camp.mrr} SEK/mån` : "—"}
                  />
                  <InfoPair
                    label="Trial slutar"
                    value={fmtDate(camp.trial_ends_at)}
                  />
                  <InfoPair
                    label="Gästvy-status"
                    value={
                      camp.subscription_status === "active"
                        ? "✅ Live"
                        : camp.subscription_status === "trial"
                          ? camp.isTrialExpired
                            ? "⏰ Trial utgått — gatad"
                            : "⏳ Trial — live"
                          : camp.subscription_status === "inactive"
                            ? "⏸️ Pausad — gäster ser meddelande"
                            : "🚫 Avslutad — gäster ser meddelande"
                    }
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
                  <SetupDot ok={!!(camp as any).phone} label="Telefon" />
                  <SetupDot ok={!!(camp as any).camp_rules} label="Regler" />
                  <SetupDot
                    ok={
                      !!camp.supported_languages &&
                      camp.supported_languages.length > 0
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
                  <InfoPair
                    label="Egna platser"
                    value={String(camp.customPlaces)}
                  />
                  <InfoPair label="Fästa" value={String(camp.pinnedPlaces)} />
                  <InfoPair
                    label="Meddelanden"
                    value={String(camp.announcementCount)}
                  />
                  <InfoPair
                    label="Partners"
                    value={String(camp.partnerCount)}
                  />
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
          )}

          {/* ── Actions ── */}
          <div className="border-t border-stone-200/60 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSync}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-stone-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-stone-800 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={isPending ? "animate-spin" : ""}
                />
                Kör upptäcktsmotor
              </button>
              <button
                onClick={handleClear}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-stone-700 ring-1 ring-stone-200/60 transition-all hover:bg-stone-100 active:scale-95 disabled:opacity-50"
              >
                <Eraser size={14} />
                Rensa platser
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-[12px] bg-red-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 sm:w-auto"
              >
                <Trash2 size={14} />
                <span className="sm:hidden">Radera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── UI Helpers ── */

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
