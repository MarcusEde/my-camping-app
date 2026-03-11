"use client";

import { useSettingsForm, type SectionId } from "@/lib/hooks/useSettingsForm";
import { hexToRgba } from "@/lib/utils";
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
  Target,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import React from "react";

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

const FOCAL_POSITIONS = [
  "top left",
  "top",
  "top right",
  "left",
  "center",
  "right",
  "bottom left",
  "bottom",
  "bottom right",
];

const TABS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "branding", label: "Branding", icon: <Palette size={14} /> },
  { id: "contact", label: "Kontakt", icon: <Phone size={14} /> },
  { id: "guest", label: "Gästinfo", icon: <Info size={14} /> },
  { id: "announcements", label: "Anslag", icon: <Megaphone size={14} /> },
];

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  announcements: Announcement[];
}

/* ── Main Component ──────────────────────────────────── */
export default function SettingsForm({ campground, announcements }: Props) {
  const s = useSettingsForm({ campground, announcements });

  return (
    <div className="space-y-5">
      {/* ── TABS ── */}
      <div className="flex gap-1 rounded-full bg-stone-100/80 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => s.setActiveSection(tab.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            style={
              s.activeSection === tab.id
                ? {
                    backgroundColor: "white",
                    color: s.brand,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
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
      {s.activeSection === "branding" && (
        <BrandingSection
          brand={s.brand}
          primaryColor={s.primaryColor}
          setPrimaryColor={s.setPrimaryColor}
          heroImage={s.heroImage}
          setHeroImage={s.setHeroImage}
          logoImage={s.logoImage}
          setLogoImage={s.setLogoImage}
          heroImagePosition={s.heroImagePosition}
          setHeroImagePosition={s.setHeroImagePosition}
          onSave={s.handleSave}
          isPending={s.isPending}
          saved={s.saved}
        />
      )}

      {/* ━━━ CONTACT / RECEPTION ━━━ */}
      {s.activeSection === "contact" && (
        <ContactSection
          brand={s.brand}
          phone={s.phone}
          setPhone={s.setPhone}
          email={s.email}
          setEmail={s.setEmail}
          address={s.address}
          setAddress={s.setAddress}
          receptionHours={s.receptionHours}
          setReceptionHours={s.setReceptionHours}
          onSave={s.handleSave}
          isPending={s.isPending}
          saved={s.saved}
        />
      )}

      {/* ━━━ GUEST INFO ━━━ */}
      {s.activeSection === "guest" && (
        <GuestSection
          brand={s.brand}
          wifiName={s.wifiName}
          setWifiName={s.setWifiName}
          wifiPassword={s.wifiPassword}
          setWifiPassword={s.setWifiPassword}
          checkOutInfo={s.checkOutInfo}
          setCheckOutInfo={s.setCheckOutInfo}
          trashRules={s.trashRules}
          setTrashRules={s.setTrashRules}
          campRules={s.campRules}
          setCampRules={s.setCampRules}
          onSave={s.handleSave}
          isPending={s.isPending}
          saved={s.saved}
        />
      )}

      {/* ━━━ ANNOUNCEMENTS ━━━ */}
      {s.activeSection === "announcements" && (
        <AnnouncementsSection
          brand={s.brand}
          announcements={announcements}
          showNewForm={s.showNewForm}
          newTitle={s.newTitle}
          setNewTitle={s.setNewTitle}
          newContent={s.newContent}
          setNewContent={s.setNewContent}
          newType={s.newType}
          setNewType={s.setNewType}
          onOpenNewForm={s.openNewAnnouncementForm}
          onCloseNewForm={s.closeNewAnnouncementForm}
          onCreate={s.handleCreateAnnouncement}
          onStartEdit={s.handleStartEdit}
          onDelete={s.handleDeleteAnnouncement}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Section Components
   ══════════════════════════════════════════════════════ */

/* ── Branding Section ──────────────────────────────── */
function BrandingSection({
  brand,
  primaryColor,
  setPrimaryColor,
  heroImage,
  setHeroImage,
  logoImage,
  setLogoImage,
  heroImagePosition,
  setHeroImagePosition,
  onSave,
  isPending,
  saved,
}: {
  brand: string;
  primaryColor: string;
  setPrimaryColor: (v: string) => void;
  heroImage: string;
  setHeroImage: (v: string) => void;
  logoImage: string;
  setLogoImage: (v: string) => void;
  heroImagePosition: string;
  setHeroImagePosition: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saved: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Signature Color */}
      <div>
        <SectionLabel label="Signaturfärg" />
        <p className="mb-4 px-1 text-[11px] text-stone-400">
          Välj en färg som representerar er camping. Den används i gästvyn för
          knappar, ikoner och accenter.
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
            style={{ "--tw-ring-color": hexToRgba(primaryColor, 0.3) } as any}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            Egen hex
          </span>
        </div>
      </div>

      {/* Hero Image with Safe Zone Preview */}
      <div className="border-t border-stone-100 pt-2">
        <SectionLabel label="Bilder & Design" />
        <div className="space-y-3">
          <FieldGroup
            icon={<ImageIcon size={14} />}
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
              <div className="mt-4 space-y-4">
                <HeroPreview
                  heroImage={heroImage}
                  heroImagePosition={heroImagePosition}
                />
                <FocalPointPicker
                  heroImagePosition={heroImagePosition}
                  setHeroImagePosition={setHeroImagePosition}
                  brand={brand}
                />
              </div>
            )}
          </FieldGroup>

          <FieldGroup
            icon={<ImageIcon size={14} />}
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
        onClick={onSave}
        isPending={isPending}
        saved={saved}
        brand={primaryColor}
      />
    </div>
  );
}

/* ── Hero Preview ──────────────────────────────────── */
function HeroPreview({
  heroImage,
  heroImagePosition,
}: {
  heroImage: string;
  heroImagePosition: string;
}) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-[16px] ring-1 ring-stone-200 bg-stone-100 group">
      <img
        src={heroImage}
        alt="Hero preview"
        className="h-full w-full object-cover transition-all duration-500 ease-in-out"
        style={{ objectPosition: heroImagePosition }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 p-4 pointer-events-none">
        <div className="h-2 w-24 bg-white/30 rounded-full mb-1.5 animate-pulse" />
        <div className="h-5 w-48 bg-white/40 rounded-lg" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 bg-white/10 rounded-full border border-white/10" />
          <div className="h-6 w-16 bg-white/10 rounded-full border border-white/10" />
        </div>
      </div>
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-900/90 text-[7px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
        <Target size={8} className="text-red-400" />
        Textområde
      </div>
    </div>
  );
}

/* ── Focal Point Picker ────────────────────────────── */
function FocalPointPicker({
  heroImagePosition,
  setHeroImagePosition,
  brand,
}: {
  heroImagePosition: string;
  setHeroImagePosition: (v: string) => void;
  brand: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-stone-100 p-2 ring-1 ring-stone-200/50">
        {FOCAL_POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => setHeroImagePosition(pos)}
            className={`group relative h-8 w-8 rounded-lg transition-all ${
              heroImagePosition === pos
                ? "bg-white shadow-md scale-110"
                : "hover:bg-white/50"
            }`}
          >
            <div
              className={`absolute inset-0 m-auto h-1.5 w-1.5 rounded-full transition-all ${
                heroImagePosition === pos
                  ? ""
                  : "bg-stone-300 group-hover:bg-stone-400"
              }`}
              style={{
                backgroundColor: heroImagePosition === pos ? brand : undefined,
              }}
            />
          </button>
        ))}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
          Bildfokus
        </p>
        <p className="text-[9px] text-stone-400 leading-relaxed mt-1">
          Använd rutnätet för att flytta bilden. <br />
          Om någons ansikte täcks av texten, välj <b>&quot;top&quot;</b> för att
          flytta upp fokus.
        </p>
      </div>
    </div>
  );
}

/* ── Contact Section ───────────────────────────────── */
function ContactSection({
  brand,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
  receptionHours,
  setReceptionHours,
  onSave,
  isPending,
  saved,
}: {
  brand: string;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  receptionHours: string;
  setReceptionHours: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saved: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionLabel label="Kontakt & Reception" />
      <div className="space-y-3">
        <FieldGroup
          icon={<Phone size={14} />}
          label="Telefonnummer"
          brand={brand}
        >
          <FormInput
            value={phone}
            onChange={setPhone}
            placeholder="0123-456 78"
            brand={brand}
          />
        </FieldGroup>
        <FieldGroup icon={<Globe size={14} />} label="E-post" brand={brand}>
          <FormInput
            value={email}
            onChange={setEmail}
            placeholder="info@camping.se"
            brand={brand}
          />
        </FieldGroup>
        <FieldGroup icon={<MapPin size={14} />} label="Adress" brand={brand}>
          <FormInput
            value={address}
            onChange={setAddress}
            placeholder="Strandvägen 1..."
            brand={brand}
          />
        </FieldGroup>
        <FieldGroup icon={<Clock size={14} />} label="Öppettider" brand={brand}>
          <FormTextArea
            value={receptionHours}
            onChange={setReceptionHours}
            placeholder="Måndag-Fredag: 08:00-20:00"
            rows={3}
            brand={brand}
          />
        </FieldGroup>
      </div>
      <SaveBtn
        onClick={onSave}
        isPending={isPending}
        saved={saved}
        brand={brand}
      />
    </div>
  );
}

/* ── Guest Section ─────────────────────────────────── */
function GuestSection({
  brand,
  wifiName,
  setWifiName,
  wifiPassword,
  setWifiPassword,
  checkOutInfo,
  setCheckOutInfo,
  trashRules,
  setTrashRules,
  campRules,
  setCampRules,
  onSave,
  isPending,
  saved,
}: {
  brand: string;
  wifiName: string;
  setWifiName: (v: string) => void;
  wifiPassword: string;
  setWifiPassword: (v: string) => void;
  checkOutInfo: string;
  setCheckOutInfo: (v: string) => void;
  trashRules: string;
  setTrashRules: (v: string) => void;
  campRules: string;
  setCampRules: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saved: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionLabel label="Gästinformation" />
      <div className="space-y-3">
        <FieldGroup icon={<Wifi size={14} />} label="Wi-Fi" brand={brand}>
          <div className="grid grid-cols-2 gap-2">
            <FormInput
              label="Nätverk"
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
        </FieldGroup>
        <FieldGroup
          icon={<Clock size={14} />}
          label="Utcheckning"
          brand={brand}
        >
          <FormTextArea
            value={checkOutInfo}
            onChange={setCheckOutInfo}
            placeholder="Utcheckning senast kl 12:00..."
            rows={2}
            brand={brand}
          />
        </FieldGroup>
        <FieldGroup
          icon={<Trash2 size={14} />}
          label="Sopsortering"
          brand={brand}
        >
          <FormTextArea
            value={trashRules}
            onChange={setTrashRules}
            placeholder="Matavfall i gröna kärl..."
            rows={2}
            brand={brand}
          />
        </FieldGroup>
        <FieldGroup
          icon={<Info size={14} />}
          label="Ordningsregler"
          brand={brand}
        >
          <FormTextArea
            value={campRules}
            onChange={setCampRules}
            placeholder="Tystnad efter 23:00..."
            rows={3}
            brand={brand}
          />
        </FieldGroup>
      </div>
      <SaveBtn
        onClick={onSave}
        isPending={isPending}
        saved={saved}
        brand={brand}
      />
    </div>
  );
}

/* ── Announcements Section ─────────────────────────── */
function AnnouncementsSection({
  brand,
  announcements,
  showNewForm,
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  newType,
  setNewType,
  onOpenNewForm,
  onCloseNewForm,
  onCreate,
  onStartEdit,
  onDelete,
}: {
  brand: string;
  announcements: Announcement[];
  showNewForm: boolean;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newContent: string;
  setNewContent: (v: string) => void;
  newType: "info" | "event" | "warning";
  setNewType: (v: "info" | "event" | "warning") => void;
  onOpenNewForm: () => void;
  onCloseNewForm: () => void;
  onCreate: () => void;
  onStartEdit: (ann: Announcement) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel label="Anslagstavlan" />
        {!showNewForm && (
          <button
            onClick={onOpenNewForm}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
            style={{ backgroundColor: brand }}
          >
            <Plus size={13} strokeWidth={2.5} /> Nytt anslag
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="space-y-3 rounded-[16px] p-4 bg-stone-50">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black">Skapa anslag</p>
            <button onClick={onCloseNewForm} className="text-stone-400">
              <X size={12} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {ANNOUNCEMENT_TYPES.map((at) => (
              <button
                key={at.value}
                onClick={() => setNewType(at.value)}
                className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                style={
                  newType === at.value
                    ? {
                        backgroundColor: hexToRgba(brand, 0.1),
                        color: brand,
                      }
                    : { backgroundColor: "white", color: "#a8a29e" }
                }
              >
                {at.emoji} {at.label}
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
            placeholder="Meddelande..."
            brand={brand}
          />
          <div className="flex gap-2">
            <button
              onClick={onCreate}
              className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase text-white"
              style={{ backgroundColor: brand }}
            >
              Publicera
            </button>
            <button
              onClick={onCloseNewForm}
              className="text-[10px] font-black text-stone-400"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {announcements.map((ann) => (
        <div
          key={ann.id}
          className="flex items-center justify-between bg-white p-3 rounded-xl border border-stone-100"
        >
          <div>
            <p className="text-[12px] font-bold text-stone-800">{ann.title}</p>
            <p className="text-[10px] text-stone-400 truncate max-w-[200px]">
              {ann.content}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onStartEdit(ann)}
              className="text-stone-300 hover:text-stone-600 transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(ann.id)}
              className="text-stone-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Shared Primitives
   ══════════════════════════════════════════════════════ */

function SectionLabel({ label }: { label: string }) {
  return (
    <h3 className="text-[13px] font-black tracking-tight text-stone-900 mb-1 px-1">
      {label}
    </h3>
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
    <div className="rounded-[14px] bg-stone-50/80 p-3.5 border border-stone-200/50">
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
    <div className="w-full">
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
          } as any
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
        } as any
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
      style={{ backgroundColor: saved ? "#059669" : brand }}
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
