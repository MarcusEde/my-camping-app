// src/components/tabs/AktiviteterTab.tsx
"use client";

import { useAktiviteter } from "@/lib/hooks/useAktiviteter";
import {
  aktiviteterLabels,
  type AktiviteterLabels,
  dateLocales,
  getAnnouncementText,
  getPartnerText,
} from "@/lib/translations";
import type {
  Announcement,
  Campground,
  PromotedPartner,
} from "@/types/database";
import type { Lang } from "@/types/guest";
import { motion } from "framer-motion";
import {
  Award,
  CalendarHeart,
  Check,
  Copy,
  Globe,
  Phone,
  Store,
  Ticket,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { trackPartnerClick, trackRedemption } from "./actions";

const COUPON_LABELS: Record<Lang, { claim: string; revealed: string }> = {
  sv: { claim: "Hämta rabatt", revealed: "Din rabattkod" },
  en: { claim: "Claim Discount", revealed: "Your discount code" },
  de: { claim: "Rabatt einlösen", revealed: "Ihr Rabattcode" },
  da: { claim: "Hent rabat", revealed: "Din rabatkode" },
  nl: { claim: "Korting claimen", revealed: "Uw kortingscode" },
  no: { claim: "Hent rabatt", revealed: "Din rabattkode" },
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
  const l = aktiviteterLabels[lang];
  const isSwedish = lang === "sv";
  const { events, activePartners } = useAktiviteter(announcements, partners);

  return (
    <motion.div
      className="space-y-8 pb-10"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      initial="initial"
      animate="animate"
    >
      <motion.section
        variants={{
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
        }}
      >
        <SectionHeader icon={<CalendarHeart size={16} />} text={l.events} />
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                lang={lang}
                isSwedish={isSwedish}
                originalLabel={l.originalLang}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={l.noEvents}
            subtitle={l.noEventsSub}
            icon={CalendarHeart}
          />
        )}
      </motion.section>

      <motion.section
        variants={{
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
        }}
      >
        <SectionHeader icon={<Store size={16} />} text={l.partners} />
        {activePartners.length > 0 ? (
          <div className="space-y-4">
            {activePartners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                campgroundId={campground.id}
                lang={lang}
                isSwedish={isSwedish}
                labels={l}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={l.noPartners}
            subtitle={l.noPartnersSub}
            icon={Store}
          />
        )}
      </motion.section>
    </motion.div>
  );
}

function SectionHeader({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5 px-1">
      <div className="text-stone-400">{icon}</div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {text}
      </h3>
    </div>
  );
}

function EventCard({
  event,
  lang,
  isSwedish,
  originalLabel,
}: {
  event: Announcement;
  lang: Lang;
  isSwedish: boolean;
  originalLabel: string;
}) {
  const { title, content } = getAnnouncementText(event, lang);
  const locale = dateLocales[lang];

  return (
    <motion.div className="rounded-2xl bg-white p-5 border border-stone-200/75 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Ticket size={20} />
        </div>
        <time className="font-bold text-sm text-stone-900 capitalize">
          {new Date(event.created_at).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
          })}
        </time>
      </div>
      <h4 className="text-base font-bold text-stone-900 mb-1">{title}</h4>
      <p className="text-sm text-stone-600 leading-relaxed">{content}</p>
    </motion.div>
  );
}

function PartnerCard({
  partner,
  campgroundId,
  lang,
  isSwedish,
  labels,
}: {
  partner: PromotedPartner;
  campgroundId: string;
  lang: Lang;
  isSwedish: boolean;
  labels: AktiviteterLabels;
}) {
  const isFeatured = partner.priority_rank === 1;
  const { name, description } = getPartnerText(partner, lang);

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackPartnerClick(partner.id);
    if (partner.website_url)
      window.open(partner.website_url, "_blank", "noopener,noreferrer");
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackPartnerClick(partner.id);
    if (partner.phone) window.location.href = `tel:${partner.phone}`;
  };

  return (
    <motion.div
      className={`overflow-hidden rounded-2xl bg-white border ${isFeatured ? "border-[var(--brand)] shadow-md" : "border-stone-200/75 shadow-sm"}`}
    >
      {isFeatured && (
        <div className="bg-[var(--brand)] text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
          <Award size={12} /> {labels.featured}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-50 border border-stone-100 overflow-hidden">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store size={20} className="text-stone-400" />
            )}
          </div>
          <h4 className="text-lg font-bold text-stone-900">{name}</h4>
        </div>

        {description && (
          <p className="text-sm text-stone-600 leading-relaxed mb-4">
            {description}
          </p>
        )}

        {partner.coupon_code && (
          <CouponReveal
            couponCode={partner.coupon_code}
            partnerId={partner.id}
            campgroundId={campgroundId}
            lang={lang}
          />
        )}

        <div className="flex gap-2 mt-2">
          {partner.website_url ? (
            <a
              href={partner.website_url}
              onClick={handleWebsiteClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--brand)] text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Globe size={16} /> {labels.book}
            </a>
          ) : partner.phone ? (
            <a
              href={`tel:${partner.phone}`}
              onClick={handlePhoneClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--brand)] text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Phone size={16} /> {labels.call}
            </a>
          ) : null}

          {partner.phone && partner.website_url && (
            <a
              href={`tel:${partner.phone}`}
              onClick={handlePhoneClick}
              className="flex items-center justify-center px-5 py-3 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
            >
              <Phone size={16} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CouponReveal({
  couponCode,
  partnerId,
  campgroundId,
  lang,
}: {
  couponCode: string;
  partnerId: string;
  campgroundId: string;
  lang: Lang;
}) {
  const storageKey = `redeemed_${partnerId}`;
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = COUPON_LABELS[lang];

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") setRevealed(true);
    setMounted(true);
  }, [storageKey]);

  const handleClaim = () => {
    setRevealed(true);
    localStorage.setItem(storageKey, "true");
    trackRedemption(partnerId, campgroundId);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!mounted)
    return (
      <div className="h-12 w-full mb-4 bg-stone-100 rounded-xl animate-pulse" />
    );

  return (
    <div className="mb-4">
      {!revealed ? (
        <button
          onClick={handleClaim}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--brand)] bg-[var(--brand-10)] text-[var(--brand)] rounded-xl text-sm font-bold transition-all hover:bg-[var(--brand-20)]"
        >
          <Ticket size={18} /> {t.claim}
        </button>
      ) : (
        <div className="flex items-center justify-between py-2 px-4 bg-stone-100 rounded-xl border border-stone-200">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
              {t.revealed}
            </p>
            <p className="text-base font-mono font-bold text-stone-900">
              {couponCode}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 bg-white rounded-lg shadow-sm text-stone-600 hover:text-[var(--brand)] transition-colors"
          >
            {copied ? (
              <Check size={18} className="text-emerald-600" />
            ) : (
              <Copy size={18} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle, icon: Icon }: any) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center border border-stone-200/75 shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 border border-stone-200/50">
        <Icon size={24} className="text-stone-400" />
      </div>
      <p className="text-base font-bold text-stone-900">{title}</p>
      <p className="mx-auto mt-2 text-sm text-stone-500">{subtitle}</p>
    </div>
  );
}
