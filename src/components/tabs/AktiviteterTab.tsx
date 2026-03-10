"use client";

import type {
  Announcement,
  Campground,
  PromotedPartner,
} from "@/types/database";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  CalendarHeart,
  Globe,
  Phone,
  Store,
  Ticket,
} from "lucide-react";
import React, { useMemo } from "react";
import type { Lang } from "../GuestAppUI";
import { trackPartnerClick } from "./actions";

/* ── Translation helpers ─────────────────────────────── */

/**
 * Hämtar översatt text för anslag (evenemang).
 */
function getAnnouncementText(
  ann: Announcement,
  lang: Lang,
): { title: string; content: string } {
  if (lang === "sv") return { title: ann.title, content: ann.content };
  const tr = ann.translations?.[lang as "en" | "de" | "da"];
  return {
    title: tr?.title || ann.title,
    content: tr?.content || ann.content,
  };
}

/**
 * Hämtar översatt text för partners.
 * FIX: Säkerställer att undefined konverteras till null för att matcha returtypen.
 */
function getPartnerText(
  partner: PromotedPartner,
  lang: Lang,
): { name: string; description: string | null } {
  if (lang === "sv")
    return {
      name: partner.business_name,
      description: partner.description ?? null,
    };
  const tr = partner.translations?.[lang as "en" | "de" | "da"];
  return {
    name: tr?.business_name || partner.business_name,
    description: tr?.description || partner.description || null,
  };
}

/* ── Physics ─────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_TAP },
};

/* ── UI Translations ─────────────────────────────────── */
const t: Record<
  Lang,
  {
    events: string;
    partners: string;
    noEvents: string;
    noEventsSub: string;
    noPartners: string;
    noPartnersSub: string;
    featured: string;
    book: string;
    call: string;
    moreInfo: string;
    originalLang: string;
  }
> = {
  sv: {
    events: "Evenemang & Händelser",
    partners: "Lokala upplevelser",
    noEvents: "Inga evenemang just nu",
    noEventsSub: "Håll utkik — det händer alltid nya saker!",
    noPartners: "Inga partners just nu",
    noPartnersSub: "Vi jobbar på att hitta upplevelser åt dig!",
    featured: "Utvald",
    book: "Boka",
    call: "Ring",
    moreInfo: "Mer info",
    originalLang: "🇸🇪 Originaltext",
  },
  en: {
    events: "Events & Happenings",
    partners: "Local experiences",
    noEvents: "No events right now",
    noEventsSub: "Stay tuned — new things happen all the time!",
    noPartners: "No partners right now",
    noPartnersSub: "We're working on finding experiences for you!",
    featured: "Featured",
    book: "Book",
    call: "Call",
    moreInfo: "More info",
    originalLang: "🇸🇪 Original text",
  },
  de: {
    events: "Events & Veranstaltungen",
    partners: "Lokale Erlebnisse",
    noEvents: "Keine Events aktuell",
    noEventsSub: "Bleiben Sie dran — es passiert immer etwas Neues!",
    noPartners: "Keine Partner aktuell",
    noPartnersSub: "Wir arbeiten daran, Erlebnisse für Sie zu finden!",
    featured: "Empfohlen",
    book: "Buchen",
    call: "Anrufen",
    moreInfo: "Mehr Info",
    originalLang: "🇸🇪 Originaltext",
  },
  da: {
    events: "Events & Begivenheder",
    partners: "Lokale oplevelser",
    noEvents: "Ingen begivenheder lige nu",
    noEventsSub: "Hold øje — der sker altid noget nyt!",
    noPartners: "Ingen partnere lige nu",
    noPartnersSub: "Vi arbejder på at finde oplevelser til dig!",
    featured: "Anbefalet",
    book: "Book",
    call: "Ring",
    moreInfo: "Mere info",
    originalLang: "🇸🇪 Originaltekst",
  },
  nl: {
    events: "Evenementen & Activiteiten",
    partners: "Lokale ervaringen",
    noEvents: "Geen evenementen op dit moment",
    noEventsSub: "Blijf op de hoogte — er gebeurt altijd iets nieuws!",
    noPartners: "Geen partners op dit moment",
    noPartnersSub: "We werken eraan om ervaringen voor je te vinden!",
    featured: "Aanbevolen",
    book: "Boek",
    call: "Bel",
    moreInfo: "Meer info",
    originalLang: "🇸🇪 Originele tekst",
  },
  no: {
    events: "Arrangementer & Hendelser",
    partners: "Lokale opplevelser",
    noEvents: "Ingen arrangementer akkurat nå",
    noEventsSub: "Følg med — det skjer alltid noe nytt!",
    noPartners: "Ingen partnere akkurat nå",
    noPartnersSub: "Vi jobber med å finne opplevelser for deg!",
    featured: "Anbefalt",
    book: "Bestill",
    call: "Ring",
    moreInfo: "Mer info",
    originalLang: "🇸🇪 Originaltekst",
  },
};

interface Props {
  campground: Campground;
  announcements: Announcement[];
  partners: PromotedPartner[];
  lang: Lang;
}

export default function AktiviteterTab({
  campground,
  announcements,
  partners,
  lang,
}: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const l = t[lang];
  const isSwedish = lang === "sv";

  const events = useMemo(
    () =>
      announcements
        .filter((a) => a.type === "event")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [announcements],
  );

  const activePartners = useMemo(
    () =>
      partners
        .filter((p) => p.is_active)
        .sort((a, b) => a.priority_rank - b.priority_rank),
    [partners],
  );

  return (
    <motion.div
      className="space-y-8 pb-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* ━━━ EVENTS ━━━ */}
      <motion.section variants={staggerItem}>
        <SectionHeader
          icon={<CalendarHeart size={13} strokeWidth={2} />}
          text={l.events}
          brand={brand}
        />
        {events.length > 0 ? (
          <div className="space-y-1.5">
            {events.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                brand={brand}
                lang={lang}
                isSwedish={isSwedish}
                originalLabel={l.originalLang}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={l.noEvents} subtitle={l.noEventsSub} />
        )}
      </motion.section>

      {/* ━━━ PARTNERS ━━━ */}
      <motion.section variants={staggerItem}>
        <SectionHeader
          icon={<Store size={13} strokeWidth={2} />}
          text={l.partners}
          brand={brand}
        />
        {activePartners.length > 0 ? (
          <div className="space-y-3">
            {activePartners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                brand={brand}
                lang={lang}
                isSwedish={isSwedish}
                labels={l}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={l.noPartners} subtitle={l.noPartnersSub} />
        )}
      </motion.section>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════ */

function SectionHeader({
  icon,
  text,
  brand,
}: {
  icon: React.ReactNode;
  text: string;
  brand: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5 px-1">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
      >
        {icon}
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {text}
      </h3>
    </div>
  );
}

function EventCard({
  event,
  brand,
  lang,
  isSwedish,
  originalLabel,
}: {
  event: Announcement;
  brand: string;
  lang: Lang;
  isSwedish: boolean;
  originalLabel: string;
}) {
  const { title, content } = getAnnouncementText(event, lang);

  const dateLocale =
    lang === "sv"
      ? "sv-SE"
      : lang === "de"
        ? "de-DE"
        : lang === "da"
          ? "da-DK"
          : "en-GB";

  return (
    <motion.div
      className="rounded-[20px] bg-white p-4 ring-1 ring-stone-200/60"
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TAP}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: hexToRgba(brand, 0.06) }}
        >
          <Ticket size={16} style={{ color: brand }} strokeWidth={2} />
        </div>
        <time className="rounded-full bg-stone-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ring-1 ring-stone-200/60">
          {new Date(event.created_at).toLocaleDateString(dateLocale, {
            day: "numeric",
            month: "long",
          })}
        </time>
      </div>

      <h4 className="text-[14px] font-black leading-tight tracking-tight text-stone-800">
        {title}
      </h4>
      <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-stone-400">
        {content}
      </p>

      {!isSwedish && (
        <span className="mt-3 inline-block rounded-full bg-stone-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
          {originalLabel}
        </span>
      )}
    </motion.div>
  );
}

function PartnerCard({
  partner,
  brand,
  lang,
  isSwedish,
  labels,
}: {
  partner: PromotedPartner;
  brand: string;
  lang: Lang;
  isSwedish: boolean;
  labels: (typeof t)["sv"];
}) {
  const isFeatured = partner.priority_rank === 1;
  const { name, description } = getPartnerText(partner, lang);

  /* ── Click handler — tracks then navigates ── */
  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackPartnerClick(partner.id);
    if (partner.website_url) {
      window.open(partner.website_url, "_blank", "noopener,noreferrer");
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackPartnerClick(partner.id);
    if (partner.phone) {
      window.location.href = `tel:${partner.phone}`;
    }
  };

  return (
    <motion.div
      className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
      style={
        isFeatured
          ? { boxShadow: `0 0 0 1.5px ${hexToRgba(brand, 0.15)}` }
          : undefined
      }
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TAP}
    >
      {/* Featured ribbon */}
      {isFeatured && (
        <div
          className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white"
          style={{ backgroundColor: brand }}
        >
          <Award size={10} strokeWidth={2.5} />
          {labels.featured}
        </div>
      )}

      <div className="p-4">
        {/* Name + icon */}
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: hexToRgba(brand, 0.05), color: brand }}
          >
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={name}
                className="h-full w-full object-cover rounded-[14px]"
              />
            ) : (
              <Store size={18} strokeWidth={2} />
            )}
          </div>
          <h4 className="text-[14px] font-black leading-tight tracking-tight text-stone-800">
            {name}
          </h4>
        </div>

        {/* Description */}
        {description && (
          <div
            className="mb-3 rounded-[14px] px-3.5 py-2.5"
            style={{ backgroundColor: hexToRgba(brand, 0.03) }}
          >
            <p className="text-[12px] font-medium italic leading-relaxed text-stone-500">
              &ldquo;{description}&rdquo;
            </p>
          </div>
        )}

        {!isSwedish && description && (
          <span className="mb-3 inline-block rounded-full bg-stone-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
            {labels.originalLang}
          </span>
        )}

        {/* CTAs */}
        <div className="flex gap-2">
          {partner.website_url ? (
            <motion.a
              href={partner.website_url}
              onClick={handleWebsiteClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white"
              style={{
                backgroundColor: brand,
                boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
              }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING_TAP}
            >
              <Globe size={13} strokeWidth={2.5} />
              {labels.book}
              <ArrowUpRight size={10} className="opacity-30" />
            </motion.a>
          ) : partner.phone ? (
            <motion.a
              href={`tel:${partner.phone}`}
              onClick={handlePhoneClick}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white"
              style={{
                backgroundColor: brand,
                boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
              }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING_TAP}
            >
              <Phone size={13} strokeWidth={2.5} />
              {labels.moreInfo}
            </motion.a>
          ) : null}

          {partner.phone && partner.website_url && (
            <motion.a
              href={`tel:${partner.phone}`}
              onClick={handlePhoneClick}
              className="flex items-center justify-center gap-2 rounded-full bg-stone-50 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-stone-600 ring-1 ring-stone-200/60"
              whileTap={{ scale: 0.96 }}
              transition={SPRING_TAP}
            >
              <Phone size={13} className="text-stone-400" />
              {labels.call}
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[32px] bg-white px-6 py-10 text-center ring-1 ring-stone-200/60">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
        <CalendarHeart size={22} strokeWidth={1.5} className="text-stone-300" />
      </div>
      <p className="text-[14px] font-black tracking-tight text-stone-700">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-stone-400">
        {subtitle}
      </p>
    </div>
  );
}
