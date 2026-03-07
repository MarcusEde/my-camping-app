'use client';

import React, { useMemo } from 'react';
import type { Campground, Announcement, PromotedPartner } from '@/types/database';
import type { Lang } from '../GuestAppUI';
import {
  Globe,
  Phone,
  Award,
  Store,
  ArrowUpRight,
  CalendarHeart,
  Ticket,
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
  events: string; partners: string; noEvents: string;
  noEventsSub: string; noPartners: string; noPartnersSub: string;
  featured: string; book: string; call: string; moreInfo: string;
  originalLang: string;
}> = {
  sv: {
    events: 'Evenemang & Händelser', partners: 'Lokala upplevelser',
    noEvents: 'Inga evenemang just nu', noEventsSub: 'Håll utkik — det händer alltid nya saker!',
    noPartners: 'Inga partners just nu', noPartnersSub: 'Vi jobbar på att hitta upplevelser åt dig!',
    featured: 'Utvald', book: 'Boka', call: 'Ring', moreInfo: 'Mer info', originalLang: '🇸🇪 Originaltext',
  },
  en: {
    events: 'Events & Happenings', partners: 'Local experiences',
    noEvents: 'No events right now', noEventsSub: 'Stay tuned — new things happen all the time!',
    noPartners: 'No partners right now', noPartnersSub: "We're working on finding experiences for you!",
    featured: 'Featured', book: 'Book', call: 'Call', moreInfo: 'More info', originalLang: '🇸🇪 Original text',
  },
  de: {
    events: 'Events & Veranstaltungen', partners: 'Lokale Erlebnisse',
    noEvents: 'Keine Events aktuell', noEventsSub: 'Bleiben Sie dran — es passiert immer etwas Neues!',
    noPartners: 'Keine Partner aktuell', noPartnersSub: 'Wir arbeiten daran, Erlebnisse für Sie zu finden!',
    featured: 'Empfohlen', book: 'Buchen', call: 'Anrufen', moreInfo: 'Mehr Info', originalLang: '🇸🇪 Originaltext',
  },
  da: {
    events: 'Events & Begivenheder', partners: 'Lokale oplevelser',
    noEvents: 'Ingen begivenheder lige nu', noEventsSub: 'Hold øje — der sker altid noget nyt!',
    noPartners: 'Ingen partnere lige nu', noPartnersSub: 'Vi arbejder på at finde oplevelser til dig!',
    featured: 'Anbefalet', book: 'Book', call: 'Ring', moreInfo: 'Mere info', originalLang: '🇸🇪 Originaltekst',
  },
};

interface Props {
  campground: Campground;
  announcements: Announcement[];
  partners: PromotedPartner[];
  lang: Lang;
}

export default function AktiviteterTab({ campground, announcements, partners, lang }: Props) {
  const brand = campground.primary_color || '#2A3C34';
  const l = t[lang];
  const isSwedish = lang === 'sv';

  const events = useMemo(() =>
      announcements
        .filter((a) => a.type === 'event')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [announcements]
  );

  const activePartners = useMemo(() => 
      partners.filter((p) => p.is_active).sort((a, b) => a.priority_rank - b.priority_rank),
    [partners]
  );

  return (
    <div className="space-y-10 pb-10">
      {/* ━━━ EVENTS ━━━ */}
      <section>
        <SectionHeader icon={<CalendarHeart size={14} />} text={l.events} emoji="🎪" brand={brand} />
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((evt) => (
              <EventCard key={evt.id} event={evt} brand={brand} lang={lang} isSwedish={isSwedish} originalLabel={l.originalLang} />
            ))}
          </div>
        ) : (
          <EmptyState emoji="🏕️" title={l.noEvents} subtitle={l.noEventsSub} />
        )}
      </section>

      {/* ━━━ PARTNERS ━━━ */}
      <section>
        <SectionHeader icon={<Store size={14} />} text={l.partners} emoji="🤝" brand={brand} />
        {activePartners.length > 0 ? (
          <div className="space-y-4">
            {activePartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} brand={brand} lang={lang} isSwedish={isSwedish} labels={l} />
            ))}
          </div>
        ) : (
          <EmptyState emoji="🌲" title={l.noPartners} subtitle={l.noPartnersSub} />
        )}
      </section>
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

function EventCard({ event, brand, lang, isSwedish, originalLabel }: any) {
  const dateLocale = lang === 'sv' ? 'sv-SE' : lang === 'de' ? 'de-DE' : lang === 'da' ? 'da-DK' : 'en-GB';

  return (
    <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-100 transition-all active:scale-[0.98]">
      <div 
        className="absolute left-0 top-0 h-full w-1.5" 
        style={{ backgroundColor: brand, opacity: 0.6 }} 
      />
      
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: hexToRgba(brand, 0.08) }}>
          <Ticket size={20} style={{ color: brand }} strokeWidth={2.5} />
        </div>
        <time className="rounded-full bg-stone-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-stone-500 ring-1 ring-stone-100">
          {new Date(event.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}
        </time>
      </div>

      <div className="pl-2">
        <h4 className="text-[17px] font-black tracking-tight text-stone-800 leading-tight">{event.title}</h4>
        <p className="mt-2 text-[13px] font-medium leading-relaxed text-stone-500/90">{event.content}</p>
        
        {!isSwedish && (
          <span className="mt-4 inline-block rounded-full bg-stone-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-stone-400">
            {originalLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function PartnerCard({ partner, brand, isSwedish, labels }: any) {
  const isFeatured = partner.priority_rank === 1;

  return (
    <div 
      className="relative overflow-hidden rounded-[32px] bg-white p-6 shadow-sm transition-all active:scale-[0.98]"
      style={isFeatured ? { boxShadow: `0 0 0 2px ${hexToRgba(brand, 0.2)}` } : { boxShadow: '0 0 0 1px rgb(231, 229, 228)' }}
    >
      {isFeatured && (
        <div className="absolute right-0 top-0">
          <div 
            className="flex items-center gap-1.5 rounded-bl-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
            style={{ backgroundColor: brand }}
          >
            <Award size={12} strokeWidth={3} />
            {labels.featured}
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: hexToRgba(brand, 0.06), color: brand }}>
          <Store size={26} strokeWidth={2} />
        </div>
        <h4 className={`text-[18px] font-black tracking-tight text-stone-800 leading-tight ${isFeatured ? 'pr-20' : ''}`}>
          {partner.business_name}
        </h4>
      </div>

      {partner.description && (
        <p className="mb-6 text-[13px] font-medium leading-relaxed text-stone-500/90 italic">
          ”{partner.description}”
        </p>
      )}

      {!isSwedish && partner.description && (
        <span className="mb-6 inline-block rounded-full bg-stone-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-stone-400">
          {labels.originalLang}
        </span>
      )}

      <div className="flex flex-wrap gap-3">
        {partner.website_url ? (
          <a
            href={partner.website_url} target="_blank" rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[12px] font-black text-white transition-all active:scale-95 shadow-md"
            style={{ backgroundColor: brand, boxShadow: `0 8px 16px ${hexToRgba(brand, 0.2)}` }}
          >
            <Globe size={16} strokeWidth={2.5} />
            {labels.book}
            <ArrowUpRight size={12} className="opacity-40" />
          </a>
        ) : partner.phone ? (
          <a
            href={`tel:${partner.phone}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[12px] font-black text-white transition-all active:scale-95 shadow-md"
            style={{ backgroundColor: brand, boxShadow: `0 8px 16px ${hexToRgba(brand, 0.2)}` }}
          >
            <Phone size={16} strokeWidth={2.5} />
            {labels.moreInfo}
          </a>
        ) : null}

        {partner.phone && partner.website_url && (
          <a
            href={`tel:${partner.phone}`}
            className="flex items-center justify-center gap-2 rounded-full border border-stone-100 bg-stone-50 px-6 py-4 text-[12px] font-bold text-stone-700 transition-all active:scale-95"
          >
            <Phone size={16} className="text-stone-400" />
            {labels.call}
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }: any) {
  return (
    <div className="rounded-[32px] bg-white p-12 text-center shadow-sm ring-1 ring-stone-100">
      <span className="mb-4 block text-5xl">{emoji}</span>
      <h3 className="text-[16px] font-black tracking-tight text-stone-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-[220px] text-[12px] font-medium leading-relaxed text-stone-400">{subtitle}</p>
    </div>
  );
}