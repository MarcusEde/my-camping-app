// src/app/dashboard/settings/SettingsForm.tsx
"use client";

import type { Announcement, Campground } from "@/types/database";
import {
  Check,
  Clock,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  Palette,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import React, { useState, useTransition } from "react";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  updateCampgroundSettings,
} from "../actions";

/* ── Utility ─────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ── Constants ───────────────────────────────────────── */
const ANNOUNCEMENT_TYPES = [
  { value: "info" as const, label: "Information", emoji: "📢" },
  { value: "event" as const, label: "Evenemang", emoji: "🎉" },
  { value: "warning" as const, label: "Varning", emoji: "⚠️" },
];

const COLOR_PRESETS = [
  { color: "#2A3C34", label: "Skog" },
  { color: "#1B4D3E", label: "Gran" },
  { color: "#2563EB", label: "Sjö" },
  { color: "#7C3AED", label: "Lavendel" },
  { color: "#DC2626", label: "Stuga" },
  { color: "#D97706", label: "Sand" },
  { color: "#059669", label: "Äng" },
  { color: "#334155", label: "Granit" },
];

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  announcements: Announcement[];
}

/* ── Main Component ──────────────────────────────────── */
export default function SettingsForm({ campground, announcements }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "branding" | "contact" | "guest" | "announcements"
  >("branding");

  const [primaryColor, setPrimaryColor] = useState(
    campground.primary_color || "#2A3C34",
  );

  // ── Form state — Branding ──
  const brand = primaryColor;
  const [heroImage, setHeroImage] = useState(campground.hero_image_url || "");
  const [logoImage, setLogoImage] = useState(campground.logo_url || "");

  // ── Form state — Contact / Reception ──
  const [phone, setPhone] = useState(campground.phone || "");
  const [email, setEmail] = useState(campground.email || "");
  const [website, setWebsite] = useState(campground.website || "");
  const [address, setAddress] = useState(campground.address || "");
  const [receptionHours, setReceptionHours] = useState(
    campground.reception_hours || "",
  );

  // ── Form state — Guest info ──
  const [wifiName, setWifiName] = useState(campground.wifi_name || "");
  const [wifiPassword, setWifiPassword] = useState(
    campground.wifi_password || "",
  );
  const [trashRules, setTrashRules] = useState(campground.trash_rules || "");
  const [checkOutInfo, setCheckOutInfo] = useState(
    campground.check_out_info || "",
  );
  const [emergencyInfo, setEmergencyInfo] = useState(
    campground.emergency_info || "",
  );
  const [campRules, setCampRules] = useState(campground.camp_rules || "");

  // ── Announcement form ──
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"info" | "event" | "warning">("info");
  const [showNewForm, setShowNewForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"info" | "event" | "warning">(
    "info",
  );

  // Wi-Fi preview
  const wifiPreviewMode =
    wifiName && wifiPassword
      ? "full"
      : wifiName
        ? "portal"
        : wifiPassword
          ? "password-only"
          : "none";

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCampgroundSettings(campground.id, {
          primary_color: primaryColor,
          hero_image_url: heroImage || undefined,
          logo_url: logoImage || undefined,
          wifi_name: wifiName || undefined,
          wifi_password: wifiPassword || undefined,
          trash_rules: trashRules || undefined,
          check_out_info: checkOutInfo || undefined,
          emergency_info: emergencyInfo || undefined,
          phone: phone || undefined,
          email: email || undefined,
          website: website || undefined,
          address: address || undefined,
          reception_hours: receptionHours || undefined,
          camp_rules: campRules || undefined,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleCreateAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    startTransition(async () => {
      try {
        await createAnnouncement(campground.id, newTitle, newContent, newType);
        setNewTitle("");
        setNewContent("");
        setNewType("info");
        setShowNewForm(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleStartEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditType(ann.type as "info" | "event" | "warning");
  };

  const handleUpdateAnnouncement = () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    startTransition(async () => {
      try {
        await updateAnnouncement(editingId, editTitle, editContent, editType);
        setEditingId(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const tabs = [
    {
      id: "branding" as const,
      label: "Branding",
      icon: <Palette size={14} strokeWidth={2} />,
    },
    {
      id: "contact" as const,
      label: "Kontakt",
      icon: <Phone size={14} strokeWidth={2} />,
    },
    {
      id: "guest" as const,
      label: "Gästinfo",
      icon: <Info size={14} strokeWidth={2} />,
    },
    {
      id: "announcements" as const,
      label: "Anslag",
      icon: <Megaphone size={14} strokeWidth={2} />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── TABS ── */}
      <div className="flex gap-1 rounded-full bg-stone-100/80 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            style={
              activeSection === tab.id
                ? {
                    backgroundColor: "white",
                    color: brand,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.02)",
                  }
                : { color: "#a8a29e" }
            }
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ━━━ BRANDING ━━━ */}
      {activeSection === "branding" && (
        <div className="space-y-5">
          <div>
            <SectionLabel label="Signaturfärg" />
            <p className="mb-4 px-1 text-[11px] text-stone-400">
              Välj en färg som representerar er camping. Den används i gästvyn
              för knappar, ikoner och accenter.
            </p>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setPrimaryColor(p.color)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 transition-all active:scale-95"
                  style={{
                    backgroundColor:
                      primaryColor === p.color
                        ? hexToRgba(p.color, 0.08)
                        : "transparent",
                    boxShadow:
                      primaryColor === p.color
                        ? `0 0 0 1.5px ${p.color}`
                        : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-[14px] bg-stone-50/80 p-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-[10px] border-0 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-24 rounded-[10px] bg-white px-3 py-2 font-mono text-[12px] font-black text-stone-700 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
                style={
                  {
                    "--tw-ring-color": hexToRgba(primaryColor, 0.3),
                  } as React.CSSProperties
                }
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                Egen hex
              </span>
            </div>

            <div className="overflow-hidden rounded-[16px] ring-1 ring-stone-200/60">
              <div
                className="p-4 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                  Förhandsvisning
                </p>
                <p className="mt-1 text-[15px] font-black tracking-tight">
                  {campground.name}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#FDFCFB] p-3.5">
                <span
                  className="rounded-full px-4 py-2 text-[11px] font-black text-white"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 2px 8px ${hexToRgba(primaryColor, 0.18)}`,
                  }}
                >
                  Primär knapp
                </span>
                <span
                  className="rounded-full px-4 py-2 text-[11px] font-black"
                  style={{
                    color: primaryColor,
                    backgroundColor: hexToRgba(primaryColor, 0.06),
                  }}
                >
                  Sekundär
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-2">
            <SectionLabel label="Bilder (URL)" />
            <p className="mb-4 px-1 text-[11px] text-stone-400">
              Klistra in en bildlänk för logotyp och bakgrundsbild.
            </p>
            <div className="space-y-3">
              <FieldGroup
                icon={<ImageIcon size={14} strokeWidth={2} />}
                label="Hero Image (Bakgrund)"
                brand={brand}
              >
                <FormInput
                  value={heroImage}
                  onChange={setHeroImage}
                  placeholder="https://exempel.se/bild.jpg"
                  brand={brand}
                />
                {heroImage && (
                  <div className="mt-2 h-24 w-full overflow-hidden rounded-[8px] ring-1 ring-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImage}
                      alt="Hero preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </FieldGroup>
              <FieldGroup
                icon={<ImageIcon size={14} strokeWidth={2} />}
                label="Logotyp"
                brand={brand}
              >
                <FormInput
                  value={logoImage}
                  onChange={setLogoImage}
                  placeholder="https://exempel.se/logga.png"
                  brand={brand}
                />
              </FieldGroup>
            </div>
          </div>

          <SaveBtn
            onClick={handleSave}
            isPending={isPending}
            saved={saved}
            brand={primaryColor}
          />
        </div>
      )}

      {/* ━━━ CONTACT / RECEPTION ━━━ */}
      {activeSection === "contact" && (
        <div className="space-y-5">
          <div>
            <SectionLabel label="Kontaktuppgifter & Reception" />
            <p className="mb-5 px-1 text-[11px] text-stone-400">
              Denna info visas i gästappen så gäster kan ringa, hitta er och se
              öppettider.
            </p>

            <div className="space-y-3">
              <FieldGroup
                icon={<Phone size={14} strokeWidth={2} />}
                label="Telefonnummer (reception)"
                brand={brand}
              >
                <FormInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="0123-456 78"
                  brand={brand}
                />
                <p className="mt-1.5 px-1 text-[10px] text-stone-400">
                  Visas som &ldquo;Ring receptionen&rdquo;-knapp i gästappen.
                </p>
              </FieldGroup>

              <FieldGroup
                icon={<Globe size={14} strokeWidth={2} />}
                label="E-post"
                brand={brand}
              >
                <FormInput
                  value={email}
                  onChange={setEmail}
                  placeholder="info@camping.se"
                  brand={brand}
                />
              </FieldGroup>

              <FieldGroup
                icon={<Globe size={14} strokeWidth={2} />}
                label="Webbplats"
                brand={brand}
              >
                <FormInput
                  value={website}
                  onChange={setWebsite}
                  placeholder="https://www.camping.se"
                  brand={brand}
                />
              </FieldGroup>

              <FieldGroup
                icon={<MapPin size={14} strokeWidth={2} />}
                label="Adress"
                brand={brand}
              >
                <FormInput
                  value={address}
                  onChange={setAddress}
                  placeholder="Strandvägen 1, 123 45 Ort"
                  brand={brand}
                />
                <p className="mt-1.5 px-1 text-[10px] text-stone-400">
                  Visas i info-fliken. Koordinater används automatiskt för
                  &ldquo;Hitta hit&rdquo;.
                </p>
              </FieldGroup>

              <FieldGroup
                icon={<Clock size={14} strokeWidth={2} />}
                label="Receptionens öppettider"
                brand={brand}
              >
                <FormTextArea
                  value={receptionHours}
                  onChange={setReceptionHours}
                  placeholder={
                    "Måndag–fredag: 08:00–20:00\nLördag–söndag: 09:00–18:00"
                  }
                  rows={3}
                  brand={brand}
                />
              </FieldGroup>
            </div>

            {/* Preview */}
            {phone && (
              <div className="mt-4 rounded-[14px] bg-stone-50/80 p-3.5">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
                  Gästen ser i appen
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 rounded-[10px] bg-white px-3.5 py-3 ring-1 ring-stone-200/60">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                      style={{
                        backgroundColor: hexToRgba(brand, 0.07),
                        color: brand,
                      }}
                    >
                      <Phone size={14} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-stone-800">
                        Ring receptionen
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-300">
                        {phone}
                      </p>
                    </div>
                  </div>
                  {receptionHours && (
                    <div className="flex items-start gap-2.5 rounded-[10px] bg-white px-3.5 py-3 ring-1 ring-stone-200/60">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{
                          backgroundColor: hexToRgba(brand, 0.07),
                          color: brand,
                        }}
                      >
                        <Clock size={14} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-stone-800">
                          Öppettider
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-[10px] text-stone-400">
                          {receptionHours}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <SaveBtn
            onClick={handleSave}
            isPending={isPending}
            saved={saved}
            brand={brand}
          />
        </div>
      )}

      {/* ━━━ GUEST INFO ━━━ */}
      {activeSection === "guest" && (
        <div className="space-y-5">
          <div>
            <SectionLabel label="Information till gästerna" />
            <p className="mb-5 px-1 text-[11px] text-stone-400">
              Denna info visas i gästappen under Hem- och Info-fliken.
            </p>

            <div className="space-y-3">
              <FieldGroup
                icon={<Wifi size={14} strokeWidth={2} />}
                label="Wi-Fi"
                brand={brand}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FormInput
                    label="Nätverksnamn"
                    value={wifiName}
                    onChange={setWifiName}
                    placeholder="CampingGuest"
                    brand={brand}
                  />
                  <FormInput
                    label="Lösenord"
                    value={wifiPassword}
                    onChange={setWifiPassword}
                    placeholder="sommar2025"
                    brand={brand}
                  />
                </div>
                <div className="mt-3 rounded-[10px] bg-white px-3.5 py-3 ring-1 ring-stone-200/60">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
                    Gästen ser
                  </p>
                  <div className="flex items-start gap-2.5">
                    <Wifi
                      size={14}
                      strokeWidth={2}
                      className="mt-0.5 shrink-0 text-stone-300"
                    />
                    <div className="min-w-0 flex-1 text-[11px]">
                      {wifiPreviewMode === "full" && (
                        <p className="text-stone-600">
                          <span className="font-black text-stone-800">
                            {wifiName}
                          </span>
                          {" · "}
                          <code className="font-mono font-black text-stone-800">
                            {wifiPassword}
                          </code>
                          {" + kopieringsknapp"}
                        </p>
                      )}
                      {wifiPreviewMode === "portal" && (
                        <p className="flex items-center gap-1.5 text-stone-600">
                          <Globe
                            size={11}
                            className="shrink-0 text-stone-300"
                          />
                          <span className="font-black text-stone-800">
                            {wifiName}
                          </span>
                          {' — "logga in via webbläsaren"'}
                        </p>
                      )}
                      {wifiPreviewMode === "password-only" && (
                        <p className="text-stone-600">
                          Lösenord:{" "}
                          <code className="font-mono font-black text-stone-800">
                            {wifiPassword}
                          </code>
                          {" + kopieringsknapp"}
                        </p>
                      )}
                      {wifiPreviewMode === "none" && (
                        <p className="italic text-stone-400">
                          &ldquo;Fråga i receptionen&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </FieldGroup>

              <FieldGroup
                icon={<Clock size={14} strokeWidth={2} />}
                label="Utcheckning"
                brand={brand}
              >
                <FormTextArea
                  value={checkOutInfo}
                  onChange={setCheckOutInfo}
                  placeholder="T.ex. Utcheckning senast kl 12:00..."
                  rows={3}
                  brand={brand}
                />
              </FieldGroup>

              <FieldGroup
                icon={<Trash2 size={14} strokeWidth={2} />}
                label="Sopsortering"
                brand={brand}
              >
                <FormTextArea
                  value={trashRules}
                  onChange={setTrashRules}
                  placeholder="T.ex. Matavfall → grönt kärl..."
                  rows={4}
                  brand={brand}
                />
              </FieldGroup>

              <FieldGroup
                icon={<Phone size={14} strokeWidth={2} />}
                label="Nödinformation"
                brand={brand}
              >
                <FormTextArea
                  value={emergencyInfo}
                  onChange={setEmergencyInfo}
                  placeholder="T.ex. Ring 112 vid nödfall. Närmaste sjukhus..."
                  rows={3}
                  brand={brand}
                />
              </FieldGroup>

              <FieldGroup
                icon={<Info size={14} strokeWidth={2} />}
                label="Ordningsregler"
                brand={brand}
              >
                <FormTextArea
                  value={campRules}
                  onChange={setCampRules}
                  placeholder={
                    "• Tystnad kl 23–07\n• Max 10 km/h\n• Husdjur i koppel\n• Grillning på anvisade platser"
                  }
                  rows={5}
                  brand={brand}
                />
                <p className="mt-1.5 px-1 text-[10px] text-stone-400">
                  Om du lämnar detta tomt visas standardregler i gästappen.
                </p>
              </FieldGroup>
            </div>
          </div>

          <SaveBtn
            onClick={handleSave}
            isPending={isPending}
            saved={saved}
            brand={brand}
          />
        </div>
      )}

      {/* ━━━ ANNOUNCEMENTS ━━━ */}
      {activeSection === "announcements" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel label="Anslagstavlan" />
            {!showNewForm && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setShowNewForm(true);
                }}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
                style={{
                  backgroundColor: brand,
                  boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
                Nytt anslag
              </button>
            )}
          </div>

          {showNewForm && (
            <div
              className="space-y-3 rounded-[16px] p-4"
              style={{ backgroundColor: hexToRgba(brand, 0.03) }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-black tracking-tight text-stone-900">
                  Skapa anslag
                </p>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors hover:text-stone-600"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
              <div className="flex gap-1.5">
                {ANNOUNCEMENT_TYPES.map((at) => (
                  <button
                    key={at.value}
                    onClick={() => setNewType(at.value)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
                    style={
                      newType === at.value
                        ? {
                            backgroundColor: hexToRgba(brand, 0.08),
                            color: brand,
                            boxShadow: `0 0 0 1px ${hexToRgba(brand, 0.15)}`,
                          }
                        : {
                            backgroundColor: "white",
                            color: "#a8a29e",
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                          }
                    }
                  >
                    <span className="text-xs">{at.emoji}</span>
                    {at.label}
                  </button>
                ))}
              </div>
              <FormInput
                value={newTitle}
                onChange={setNewTitle}
                placeholder="Rubrik..."
                brand={brand}
              />
              <FormTextArea
                value={newContent}
                onChange={setNewContent}
                placeholder="Meddelande till gästerna..."
                rows={3}
                brand={brand}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateAnnouncement}
                  disabled={!newTitle.trim() || !newContent.trim() || isPending}
                  className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: brand,
                    boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
                  }}
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} strokeWidth={2.5} />
                  )}
                  Publicera
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {announcements.length > 0 ? (
            <div className="space-y-1.5">
              {announcements.map((ann) => {
                const isEditing = editingId === ann.id;

                if (isEditing) {
                  return (
                    <div
                      key={ann.id}
                      className="space-y-3 rounded-[16px] p-4 ring-1 ring-stone-200"
                      style={{ backgroundColor: hexToRgba(brand, 0.03) }}
                    >
                      <div className="flex gap-1.5">
                        {ANNOUNCEMENT_TYPES.map((at) => (
                          <button
                            key={at.value}
                            onClick={() => setEditType(at.value)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
                            style={
                              editType === at.value
                                ? {
                                    backgroundColor: hexToRgba(brand, 0.08),
                                    color: brand,
                                    boxShadow: `0 0 0 1px ${hexToRgba(brand, 0.15)}`,
                                  }
                                : {
                                    backgroundColor: "white",
                                    color: "#a8a29e",
                                    boxShadow:
                                      "inset 0 0 0 1px rgba(0,0,0,0.04)",
                                  }
                            }
                          >
                            <span className="text-xs">{at.emoji}</span>
                            {at.label}
                          </button>
                        ))}
                      </div>
                      <FormInput
                        value={editTitle}
                        onChange={setEditTitle}
                        placeholder="Rubrik..."
                        brand={brand}
                      />
                      <FormTextArea
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Meddelande..."
                        rows={3}
                        brand={brand}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleUpdateAnnouncement}
                          disabled={
                            !editTitle.trim() ||
                            !editContent.trim() ||
                            isPending
                          }
                          className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
                          style={{ backgroundColor: brand }}
                        >
                          {isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Save size={13} strokeWidth={2.5} />
                          )}
                          Spara ändringar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  );
                }

                const tc =
                  ANNOUNCEMENT_TYPES.find((at) => at.value === ann.type) ||
                  ANNOUNCEMENT_TYPES[0];
                return (
                  <div
                    key={ann.id}
                    className={`flex items-start gap-3 rounded-[14px] bg-white p-3.5 ring-1 ring-stone-200/60 transition-opacity ${deletingId === ann.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-stone-50 text-sm ring-1 ring-stone-200/60">
                      {tc.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[12px] font-bold text-stone-800">
                        {ann.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-400">
                        {ann.content}
                      </p>
                      <time className="mt-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
                        {new Date(ann.created_at).toLocaleDateString("sv-SE", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => {
                          setShowNewForm(false);
                          handleStartEdit(ann);
                        }}
                        disabled={!!deletingId}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-all hover:bg-stone-50 hover:text-stone-600 active:scale-90"
                        title="Redigera"
                      >
                        <Pencil size={12} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        disabled={deletingId === ann.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90"
                        title="Ta bort"
                      >
                        {deletingId === ann.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] bg-white px-6 py-8 text-center ring-1 ring-stone-200/60">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
                <Megaphone
                  size={18}
                  strokeWidth={1.5}
                  className="text-stone-300"
                />
              </div>
              <p className="text-[13px] font-black tracking-tight text-stone-700">
                Inga anslag ännu
              </p>
              <p className="mx-auto mt-1 max-w-[200px] text-[11px] leading-relaxed text-stone-400">
                Skapa ditt första anslag — det syns direkt i gästappen!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-Components ──────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-1 px-1">
      <h3 className="text-[13px] font-black tracking-tight text-stone-900">
        {label}
      </h3>
    </div>
  );
}

function FieldGroup({
  icon,
  label,
  brand,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-stone-50/80 p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-[6px]"
          style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
        >
          {icon}
        </div>
        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-500">
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  brand,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  brand?: string;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
        style={
          {
            "--tw-ring-color": brand
              ? hexToRgba(brand, 0.25)
              : "rgba(168,162,158,0.4)",
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function FormTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  brand,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  brand?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
      style={
        {
          "--tw-ring-color": brand
            ? hexToRgba(brand, 0.25)
            : "rgba(168,162,158,0.4)",
        } as React.CSSProperties
      }
    />
  );
}

function SaveBtn({
  onClick,
  isPending,
  saved,
  brand,
}: {
  onClick: () => void;
  isPending: boolean;
  saved: boolean;
  brand: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
      style={{
        backgroundColor: saved ? "#059669" : brand,
        boxShadow: saved
          ? "0 4px 14px rgba(5,150,105,0.2)"
          : `0 4px 14px ${hexToRgba(brand, 0.18)}`,
      }}
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : saved ? (
        <Check size={14} strokeWidth={2.5} />
      ) : (
        <Save size={14} strokeWidth={2} />
      )}
      {isPending ? "Sparar..." : saved ? "Sparat!" : "Spara ändringar"}
    </button>
  );
}
