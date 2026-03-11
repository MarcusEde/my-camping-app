// src/components/tabs/AktiviteterTab.tsx
"use client";

import { SPRING_TAP, STAGGER_CONTAINER, STAGGER_ITEM } from "@/lib/constants";
import { useAktiviteter } from "@/lib/hooks/useAktiviteter";
import {
  aktiviteterLabels,
  type AktiviteterLabels,
  dateLocales,
  getAnnouncementText,
  getPartnerText,
} from "@/lib/translations";
import { hexToRgba } from "@/lib/utils";
import type {
  Announcement,
  Campground,
  PromotedPartner,
} from "@/types/database";
import type { Lang } from "@/types/guest";
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
import React from "react";
import { trackPartnerClick } from "./actions";

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
  const l = aktiviteterLabels[lang];
  const isSwedish = lang === "sv";

  const { events, activePartners } = useAktiviteter(announcements, partners);

  return (
    <motion.div
      className="space-y-8 pb-10"
      variants={STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
    >
      {/* ━━━ EVENTS ━━━ */}
      <motion.section variants={STAGGER_ITEM}>
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
      <motion.section variants={STAGGER_ITEM}>
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

/* ── Section Header ──────────────────────────────────── */

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

/* ── Event Card ──────────────────────────────────────── */

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
  const locale = dateLocales[lang];

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
          {new Date(event.created_at).toLocaleDateString(locale, {
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

/* ── Partner Card ────────────────────────────────────── */

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
  labels: AktiviteterLabels;
}) {
  const isFeatured = partner.priority_rank === 1;
  const { name, description } = getPartnerText(partner, lang);

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
      {isFeatured && <FeaturedRibbon label={labels.featured} brand={brand} />}

      <div className="p-4">
        <PartnerHeader name={name} logoUrl={partner.logo_url} brand={brand} />

        {description && (
          <PartnerDescription
            text={description}
            brand={brand}
            isSwedish={isSwedish}
            originalLabel={labels.originalLang}
          />
        )}

        <PartnerCTAs
          websiteUrl={partner.website_url}
          phone={partner.phone}
          brand={brand}
          labels={labels}
          onWebsiteClick={handleWebsiteClick}
          onPhoneClick={handlePhoneClick}
        />
      </div>
    </motion.div>
  );
}

/* ── Featured Ribbon ─────────────────────────────────── */

function FeaturedRibbon({ label, brand }: { label: string; brand: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white"
      style={{ backgroundColor: brand }}
    >
      <Award size={10} strokeWidth={2.5} />
      {label}
    </div>
  );
}

/* ── Partner Header ──────────────────────────────────── */

function PartnerHeader({
  name,
  logoUrl,
  brand,
}: {
  name: string;
  logoUrl?: string | null;
  brand: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: hexToRgba(brand, 0.05), color: brand }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-full w-full rounded-[14px] object-cover"
          />
        ) : (
          <Store size={18} strokeWidth={2} />
        )}
      </div>
      <h4 className="text-[14px] font-black leading-tight tracking-tight text-stone-800">
        {name}
      </h4>
    </div>
  );
}

/* ── Partner Description ─────────────────────────────── */

function PartnerDescription({
  text,
  brand,
  isSwedish,
  originalLabel,
}: {
  text: string;
  brand: string;
  isSwedish: boolean;
  originalLabel: string;
}) {
  return (
    <>
      <div
        className="mb-3 rounded-[14px] px-3.5 py-2.5"
        style={{ backgroundColor: hexToRgba(brand, 0.03) }}
      >
        <p className="text-[12px] font-medium italic leading-relaxed text-stone-500">
          &ldquo;{text}&rdquo;
        </p>
      </div>
      {!isSwedish && (
        <span className="mb-3 inline-block rounded-full bg-stone-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
          {originalLabel}
        </span>
      )}
    </>
  );
}

/* ── Partner CTAs ────────────────────────────────────── */

function PartnerCTAs({
  websiteUrl,
  phone,
  brand,
  labels,
  onWebsiteClick,
  onPhoneClick,
}: {
  websiteUrl?: string | null;
  phone?: string | null;
  brand: string;
  labels: AktiviteterLabels;
  onWebsiteClick: (e: React.MouseEvent) => void;
  onPhoneClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex gap-2">
      {websiteUrl ? (
        <motion.a
          href={websiteUrl}
          onClick={onWebsiteClick}
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
      ) : phone ? (
        <motion.a
          href={`tel:${phone}`}
          onClick={onPhoneClick}
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

      {phone && websiteUrl && (
        <motion.a
          href={`tel:${phone}`}
          onClick={onPhoneClick}
          className="flex items-center justify-center gap-2 rounded-full bg-stone-50 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-stone-600 ring-1 ring-stone-200/60"
          whileTap={{ scale: 0.96 }}
          transition={SPRING_TAP}
        >
          <Phone size={13} className="text-stone-400" />
          {labels.call}
        </motion.a>
      )}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────── */

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
