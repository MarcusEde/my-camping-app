'use client';

import React, { useState, useTransition } from 'react';
import type { Campground, Announcement } from '@/types/database';
import {
  updateCampgroundSettings,
  createAnnouncement,
  deleteAnnouncement,
} from '../actions';
import {
  Palette, Wifi, Trash2, Clock, Phone, Save, Loader2, Check,
  Plus, X, Megaphone, Info,
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
   Constants
   ═══════════════════════════════════════════════════════ */
const ANNOUNCEMENT_TYPES = [
  { value: 'info' as const, label: 'Information', emoji: '📢', warmBg: 'rgba(120, 100, 80, 0.05)', warmBorder: 'rgba(120, 100, 80, 0.1)', warmText: 'text-stone-700' },
  { value: 'event' as const, label: 'Evenemang', emoji: '🎉', warmBg: 'rgba(180, 120, 60, 0.06)', warmBorder: 'rgba(180, 120, 60, 0.12)', warmText: 'text-amber-800' },
  { value: 'warning' as const, label: 'Varning', emoji: '⚠️', warmBg: 'rgba(200, 140, 40, 0.07)', warmBorder: 'rgba(200, 140, 40, 0.15)', warmText: 'text-amber-900' },
];

const COLOR_PRESETS = [
  { color: '#2A3C34', label: 'Skog', emoji: '🌲' },
  { color: '#1B4D3E', label: 'Gran', emoji: '🌿' },
  { color: '#2563EB', label: 'Sjö', emoji: '💧' },
  { color: '#7C3AED', label: 'Lavendel', emoji: '💜' },
  { color: '#DC2626', label: 'Stuga', emoji: '🏠' },
  { color: '#D97706', label: 'Sand', emoji: '🏖️' },
  { color: '#059669', label: 'Äng', emoji: '🌾' },
  { color: '#334155', label: 'Granit', emoji: '🪨' },
];

/* ═══════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════ */
interface Props {
  campground: Campground;
  announcements: Announcement[];
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function SettingsForm({ campground, announcements }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'branding' | 'guest' | 'announcements'>('branding');

  const brand = campground.primary_color || '#2A3C34';

  // Form state
  const [primaryColor, setPrimaryColor] = useState(brand);
  const [wifiName, setWifiName] = useState(campground.wifi_name || '');
  const [wifiPassword, setWifiPassword] = useState(campground.wifi_password || '');
  const [trashRules, setTrashRules] = useState(campground.trash_rules || '');
  const [checkOutInfo, setCheckOutInfo] = useState(campground.check_out_info || '');
  const [emergencyInfo, setEmergencyInfo] = useState(campground.emergency_info || '');

  // Announcement form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'info' | 'event' | 'warning'>('info');
  const [showNewForm, setShowNewForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCampgroundSettings(campground.id, {
          primary_color: primaryColor,
          wifi_name: wifiName || undefined,
          wifi_password: wifiPassword || undefined,
          trash_rules: trashRules || undefined,
          check_out_info: checkOutInfo || undefined,
          emergency_info: emergencyInfo || undefined,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
    });
  };

  const handleCreateAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    startTransition(async () => {
      try {
        await createAnnouncement(campground.id, newTitle, newContent, newType);
        setNewTitle('');
        setNewContent('');
        setNewType('info');
        setShowNewForm(false);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const tabs = [
    { id: 'branding' as const, label: 'Branding', emoji: '🎨', icon: <Palette size={15} /> },
    { id: 'guest' as const, label: 'Gästinfo', emoji: '📋', icon: <Info size={15} /> },
    { id: 'announcements' as const, label: 'Anslag', emoji: '📢', icon: <Megaphone size={15} /> },
  ];

  return (
    <div className="space-y-5">
      {/* ━━━ TABS — warm pill style ━━━ */}
      <div className="flex gap-1 rounded-2xl bg-stone-100/80 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold transition-all active:scale-[0.97]"
            style={
              activeSection === tab.id
                ? {
                    backgroundColor: 'white',
                    color: brand,
                    boxShadow: '0 1px 4px rgba(120,80,30,0.08)',
                  }
                : { color: '#a8a29e' }
            }
          >
            <span className="text-sm">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ━━━ BRANDING ━━━ */}
      {activeSection === 'branding' && (
        <div className="space-y-5">
          <div>
            <SectionLabel emoji="🎨" label="Campingens signaturfärg" />
            <p className="mb-4 px-1 text-[11px] font-medium text-stone-400">
              Välj en färg som representerar er camping. Den används i gästvyn för knappar, ikoner och accenter.
            </p>

            {/* Color presets — nature-themed */}
            <div className="mb-5 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setPrimaryColor(p.color)}
                  className="group flex items-center gap-2 rounded-2xl px-3.5 py-2.5 transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: primaryColor === p.color ? hexToRgba(p.color, 0.1) : '#f5f5f0',
                    boxShadow: primaryColor === p.color ? `0 0 0 2px ${p.color}` : 'none',
                  }}
                >
                  <span className="text-sm">{p.emoji}</span>
                  <div
                    className="h-5 w-5 rounded-full shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[10px] font-bold text-stone-600">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Custom color picker */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-stone-50/80 p-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 rounded-xl border-0 bg-white px-3.5 py-2.5 font-mono text-sm font-bold text-stone-700 shadow-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': hexToRgba(primaryColor, 0.3) } as React.CSSProperties}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Egen hex</span>
            </div>

            {/* Live preview — camping-style */}
            <div className="overflow-hidden rounded-[20px] shadow-[0_2px_12px_rgba(120,80,30,0.06)]">
              <div className="p-5 text-white" style={{ backgroundColor: primaryColor }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50">
                  Förhandsvisning
                </p>
                <p className="mt-1 text-lg font-black tracking-tight">{campground.name}</p>
              </div>
              <div className="flex items-center gap-2.5 bg-[#FDFCFB] p-4">
                <span
                  className="rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.03]"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 2px 10px ${hexToRgba(primaryColor, 0.2)}`,
                  }}
                >
                  Primär knapp
                </span>
                <span
                  className="rounded-xl px-5 py-2.5 text-xs font-bold transition-transform hover:scale-[1.03]"
                  style={{
                    color: primaryColor,
                    backgroundColor: hexToRgba(primaryColor, 0.08),
                  }}
                >
                  Sekundär
                </span>
              </div>
            </div>
          </div>

          <SaveBtn onClick={handleSave} isPending={isPending} saved={saved} brand={primaryColor} />
        </div>
      )}

      {/* ━━━ GUEST INFO ━━━ */}
      {activeSection === 'guest' && (
        <div className="space-y-5">
          <div>
            <SectionLabel emoji="📋" label="Information till gästerna" />
            <p className="mb-5 px-1 text-[11px] font-medium text-stone-400">
              Denna info visas i gästappen under Info-fliken. Skriv på det språk era gäster förstår.
            </p>

            <div className="space-y-4">
              <FieldGroup emoji="📶" label="Wi-Fi">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <WarmInput label="Nätverksnamn" value={wifiName} onChange={setWifiName} placeholder="CampingGuest" brand={brand} />
                  <WarmInput label="Lösenord" value={wifiPassword} onChange={setWifiPassword} placeholder="sommar2025" brand={brand} />
                </div>
              </FieldGroup>

              <FieldGroup emoji="🕐" label="Utcheckning">
                <WarmTextArea value={checkOutInfo} onChange={setCheckOutInfo} placeholder="T.ex. Utcheckning senast kl 12:00. Lämna stugan städad..." rows={3} brand={brand} />
              </FieldGroup>

              <FieldGroup emoji="♻️" label="Sopsortering">
                <WarmTextArea value={trashRules} onChange={setTrashRules} placeholder="T.ex. Matavfall → grönt kärl, plast → gult kärl..." rows={4} brand={brand} />
              </FieldGroup>

              <FieldGroup emoji="🆘" label="Nödinformation">
                <WarmTextArea value={emergencyInfo} onChange={setEmergencyInfo} placeholder="T.ex. Ring 112 vid nödfall. Reception nås på 0340-65 21 00..." rows={3} brand={brand} />
              </FieldGroup>
            </div>
          </div>

          <SaveBtn onClick={handleSave} isPending={isPending} saved={saved} brand={brand} />
        </div>
      )}

      {/* ━━━ ANNOUNCEMENTS ━━━ */}
      {activeSection === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel emoji="📢" label="Anslagstavlan" />
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-black text-white shadow-sm transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: brand,
                  boxShadow: `0 2px 10px ${hexToRgba(brand, 0.2)}`,
                }}
              >
                <Plus size={14} />
                Nytt anslag
              </button>
            )}
          </div>

          {/* New announcement form */}
          {showNewForm && (
            <div
              className="space-y-3.5 rounded-[20px] p-5"
              style={{ backgroundColor: hexToRgba(brand, 0.04) }}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-black tracking-tight text-stone-900">
                  <span>✏️</span> Skapa anslag
                </p>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="rounded-xl p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Type selector */}
              <div className="flex gap-2">
                {ANNOUNCEMENT_TYPES.map((at) => (
                  <button
                    key={at.value}
                    onClick={() => setNewType(at.value)}
                    className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-bold transition-all active:scale-[0.97]"
                    style={
                      newType === at.value
                        ? {
                            backgroundColor: at.warmBg,
                            borderColor: at.warmBorder,
                            color: 'inherit',
                          }
                        : {
                            backgroundColor: 'white',
                            borderColor: 'rgba(0,0,0,0.04)',
                            color: '#a8a29e',
                          }
                    }
                  >
                    <span>{at.emoji}</span>
                    {at.label}
                  </button>
                ))}
              </div>

              <WarmInput value={newTitle} onChange={setNewTitle} placeholder="Rubrik..." brand={brand} />
              <WarmTextArea value={newContent} onChange={setNewContent} placeholder="Meddelande till gästerna..." rows={3} brand={brand} />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateAnnouncement}
                  disabled={!newTitle.trim() || !newContent.trim() || isPending}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[11px] font-black text-white shadow-sm transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    backgroundColor: brand,
                    boxShadow: `0 2px 10px ${hexToRgba(brand, 0.2)}`,
                  }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Publicera
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="rounded-xl px-5 py-2.5 text-[11px] font-bold text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {/* Announcement list */}
          {announcements.length > 0 ? (
            <div className="space-y-2.5">
              {announcements.map((ann) => {
                const tc = ANNOUNCEMENT_TYPES.find((at) => at.value === ann.type) || ANNOUNCEMENT_TYPES[0];
                return (
                  <div
                    key={ann.id}
                    className={`flex items-start gap-3.5 rounded-[20px] p-4 transition-opacity ${
                      deletingId === ann.id ? 'opacity-40' : ''
                    }`}
                    style={{
                      backgroundColor: tc.warmBg,
                      border: `1px solid ${tc.warmBorder}`,
                    }}
                  >
                    <span className="mt-0.5 text-xl leading-none">{tc.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-extrabold tracking-tight text-stone-900">
                        {ann.title}
                      </h4>
                      <p className="mt-1 text-[12px] font-medium leading-relaxed text-stone-500 line-clamp-2">
                        {ann.content}
                      </p>
                      <time className="mt-1.5 block text-[9px] font-bold uppercase tracking-widest text-stone-400">
                        {new Date(ann.created_at).toLocaleDateString('sv-SE', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      disabled={deletingId === ann.id}
                      className="shrink-0 rounded-xl p-2 text-stone-400 transition-all hover:bg-white hover:text-red-500 hover:shadow-sm active:scale-90"
                      title="Ta bort"
                    >
                      {deletingId === ann.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] bg-stone-50/80 p-10 text-center">
              <span className="mb-3 block text-4xl">🏕️</span>
              <p className="text-[13px] font-extrabold tracking-tight text-stone-900">
                Inga anslag ännu
              </p>
              <p className="mx-auto mt-1.5 max-w-[220px] text-[10px] font-medium text-stone-400">
                Skapa ditt första anslag — det syns direkt i gästappen!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Internal Sub-Components
   ═══════════════════════════════════════════════════════ */

/** Section label with nature emoji */
function SectionLabel({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 px-1">
      <span className="text-lg">{emoji}</span>
      <h3 className="text-[14px] font-black tracking-tight text-stone-900">{label}</h3>
    </div>
  );
}

/** Grouped field with emoji icon — warm background */
function FieldGroup({
  emoji,
  label,
  children,
}: {
  emoji: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-stone-50/80 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <label className="text-[12px] font-extrabold tracking-tight text-stone-700">{label}</label>
      </div>
      {children}
    </div>
  );
}

/** Warm-styled text input */
function WarmInput({
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
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-stone-400">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-800 shadow-[0_1px_3px_rgba(120,80,30,0.04)] placeholder:text-stone-300 focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': brand ? hexToRgba(brand, 0.3) : 'rgba(168,162,158,0.4)' } as React.CSSProperties}
      />
    </div>
  );
}

/** Warm-styled textarea */
function WarmTextArea({
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
      className="w-full resize-none rounded-xl border-0 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-800 shadow-[0_1px_3px_rgba(120,80,30,0.04)] placeholder:text-stone-300 focus:outline-none focus:ring-2"
      style={{ '--tw-ring-color': brand ? hexToRgba(brand, 0.3) : 'rgba(168,162,158,0.4)' } as React.CSSProperties}
    />
  );
}

/** Save button with campfire success state */
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
      className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-[13px] font-black text-white transition-all active:scale-[0.97] disabled:opacity-50"
      style={{
        backgroundColor: saved ? '#059669' : brand,
        boxShadow: saved
          ? '0 4px 14px rgba(5, 150, 105, 0.25)'
          : `0 4px 14px ${hexToRgba(brand, 0.25)}`,
      }}
    >
      {isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : saved ? (
        <Check size={16} />
      ) : (
        <Save size={16} />
      )}
      {isPending ? 'Sparar...' : saved ? '✅ Sparat!' : 'Spara ändringar'}
    </button>
  );
}