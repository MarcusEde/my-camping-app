'use client';

import React, { useState } from 'react';
import type { Campground } from '@/types/database';
import type { Lang } from '../GuestAppUI';
import {
  Wifi,
  Copy,
  Check,
  Trash2,
  Clock,
  Phone,
  ShieldCheck,
  MapPin,
  ChevronDown,
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

const t: Record<Lang, {
  sectionLabel: string; wifi: string; network: string; password: string;
  copy: string; copied: string; trash: string; checkout: string;
  emergency: string; rules: string; reception: string;
  rulesContent: string; originalLang: string; goodToKnow: string;
}> = {
  sv: {
    sectionLabel: 'Bra att veta', wifi: 'Wi-Fi', network: 'Nätverk', password: 'Lösenord',
    copy: 'Kopiera', copied: 'Kopierat!', trash: 'Sopsortering', checkout: 'Utcheckning',
    emergency: 'Nödinformation', rules: 'Ordningsregler', reception: 'Hitta receptionen',
    rulesContent: '• Tystnad kl 23–07\n• Max 10 km/h\n• Husdjur kopplade\n• Grillning på anvisade platser\n• Rökning ej i stugor',
    originalLang: '🇸🇪 Originaltext', goodToKnow: 'Campinginfo',
  },
  en: {
    sectionLabel: 'Good to know', wifi: 'Wi-Fi', network: 'Network', password: 'Password',
    copy: 'Copy', copied: 'Copied!', trash: 'Trash & Recycling', checkout: 'Check-out',
    emergency: 'Emergency info', rules: 'Campground rules', reception: 'Find reception',
    rulesContent: '• Quiet hours 23–07\n• Max 10 km/h\n• Pets leashed\n• BBQ in designated areas\n• No smoking in cabins',
    originalLang: '🇸🇪 Original text', goodToKnow: 'Camp info',
  },
  de: {
    sectionLabel: 'Gut zu wissen', wifi: 'WLAN', network: 'Netzwerk', password: 'Passwort',
    copy: 'Kopieren', copied: 'Kopiert!', trash: 'Mülltrennung', checkout: 'Check-out',
    emergency: 'Notfallinfo', rules: 'Platzordnung', reception: 'Rezeption finden',
    rulesContent: '• Nachtruhe 23–07\n• Max 10 km/h\n• Haustiere angeleint\n• Grillen nur an Plätzen\n• Rauchen in Hütten verboten',
    originalLang: '🇸🇪 Originaltext', goodToKnow: 'Campinginfo',
  },
  da: {
    sectionLabel: 'Godt at vide', wifi: 'Wi-Fi', network: 'Netværk', password: 'Adgangskode',
    copy: 'Kopier', copied: 'Kopieret!', trash: 'Affaldssortering', checkout: 'Udtjekning',
    emergency: 'Nødinformation', rules: 'Ordensregler', reception: 'Find receptionen',
    rulesContent: '• Ro kl 23–07\n• Max 10 km/t\n• Kæledyr i snor\n• Grill på anviste steder\n• Rygning forbudt i hytter',
    originalLang: '🇸🇪 Originaltekst', goodToKnow: 'Campinginfo',
  },
};

interface Props {
  campground: Campground;
  lang: Lang;
}

export default function InfoTab({ campground, lang }: Props) {
  const [copied, setCopied] = useState(false);
  const brand = campground.primary_color || '#2A3C34';
  const l = t[lang];
  const isSwedish = lang === 'sv';

  const copyPw = () => {
    if (campground.wifi_password) {
      navigator.clipboard.writeText(campground.wifi_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const infoSections = [
    { emoji: '🕐', icon: <Clock size={20} strokeWidth={2.5} />, label: l.checkout, content: campground.check_out_info || '—', isOwner: true },
    { emoji: '♻️', icon: <Trash2 size={20} strokeWidth={2.5} />, label: l.trash, content: campground.trash_rules || '—', isOwner: true },
    { emoji: '🆘', icon: <Phone size={20} strokeWidth={2.5} />, label: l.emergency, content: campground.emergency_info || 'Ring 112', isOwner: true },
    { emoji: '📋', icon: <ShieldCheck size={20} strokeWidth={2.5} />, label: l.rules, content: l.rulesContent, isOwner: false },
  ];

  const receptionMapLink = `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`;

  return (
    <div className="space-y-10 pb-10">
      
      {/* ━━━ WI-FI CARD ━━━ */}
      <section>
        <SectionHeader icon={<Wifi size={14} />} text={l.wifi} emoji="📶" brand={brand} />
        <div className="overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <div className="space-y-4">
            <div className="rounded-2xl bg-stone-50/80 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{l.network}</p>
              <p className="mt-1 text-[17px] font-black tracking-tight text-stone-800">{campground.wifi_name || '—'}</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-stone-50/80 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{l.password}</p>
                <code className="mt-1 block truncate font-mono text-[16px] font-black tracking-wider text-stone-800">
                  {campground.wifi_password || '—'}
                </code>
              </div>

              {campground.wifi_password && (
                <button
                  onClick={copyPw}
                  className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[12px] font-black text-white transition-all duration-200 active:scale-95"
                  style={{ 
                    backgroundColor: copied ? '#059669' : brand,
                    boxShadow: `0 4px 12px ${hexToRgba(copied ? '#059669' : brand, 0.2)}` 
                  }}
                >
                  {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
                  {copied ? l.copied : l.copy}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ INFO SECTIONS ━━━ */}
      <section>
        <SectionHeader icon={<ShieldCheck size={14} />} text={l.goodToKnow} emoji="⛺" brand={brand} />
        <div className="space-y-3">
          {infoSections.map((section, i) => (
            <CollapsibleInfo
              key={i}
              emoji={section.emoji}
              icon={section.icon}
              label={section.label}
              content={section.content}
              brand={brand}
              isOwnerContent={section.isOwner}
              originalLangLabel={l.originalLang}
              isSwedish={isSwedish}
            />
          ))}
        </div>
      </section>

      {/* ━━━ RECEPTION CTA ━━━ */}
      <a
        href={receptionMapLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-3 rounded-full py-5 text-[14px] font-black text-white transition-all active:scale-95"
        style={{ 
          backgroundColor: brand,
          boxShadow: `0 10px 25px ${hexToRgba(brand, 0.3)}` 
        }}
      >
        <MapPin size={18} strokeWidth={2.5} />
        {l.reception}
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════ */

function SectionHeader({ icon, text, emoji, brand }: { icon: React.ReactNode, text: string, emoji: string, brand: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 px-1">
      <div 
        className="flex h-7 w-7 items-center justify-center rounded-xl"
        style={{ backgroundColor: hexToRgba(brand, 0.1), color: brand }}
      >
        {icon}
      </div>
      <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-stone-400">
        {text}
      </h3>
      <span className="text-base opacity-40">{emoji}</span>
    </div>
  );
}

function CollapsibleInfo({ emoji, icon, label, content, brand, isOwnerContent, originalLangLabel, isSwedish }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`overflow-hidden rounded-[32px] bg-white transition-all duration-300 ring-1 ring-stone-100 ${
        expanded ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors active:bg-stone-50/50"
      >
        <div 
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300"
          style={{ 
            backgroundColor: hexToRgba(brand, expanded ? 0.12 : 0.06), 
            color: brand 
          }}
        >
          {icon}
        </div>

        <div className="flex flex-1 items-center gap-2">
          <span className="text-[15px] font-black tracking-tight text-stone-800">{label}</span>
          <span className="text-lg opacity-40">{emoji}</span>
        </div>

        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 ${expanded ? 'rotate-180 bg-stone-100 text-stone-600' : 'bg-stone-50 text-stone-300'}`}>
          <ChevronDown size={16} strokeWidth={3} />
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="mx-6 mb-6 rounded-2xl bg-stone-50/80 px-5 py-5">
            {!isSwedish && isOwnerContent && (
              <span className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider text-stone-400 shadow-sm">
                {originalLangLabel}
              </span>
            )}
            <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-stone-500/90">
              {content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}