// src/components/tabs/InfoTab.tsx
"use client";

import {
  SPRING_SOFT,
  SPRING_TAP,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
} from "@/lib/constants";
import { useClipboard } from "@/lib/hooks/useClipboard";
import { useInfoTab } from "@/lib/hooks/useInfoTab";
import { trackInfoClick } from "@/lib/tracking";
import { infoLabels, type InfoLabels } from "@/lib/translations";
import { hexToRgba } from "@/lib/utils";
import type { Campground, InfoType } from "@/types/database";
import type { Lang } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import React, { useCallback, useState } from "react";

interface Props {
  campground: Campground;
  lang: Lang;
  sessionId: string; // ← NEW: passed from GuestAppUI
}

export default function InfoTab({ campground, lang, sessionId }: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const l = infoLabels[lang];
  const isSwedish = lang === "sv";

  const {
    phone,
    email,
    website,
    address,
    receptionHours,
    checkOutInfo,
    trashRules,
    emergencyInfo,
    campRules,
    receptionMapLink,
    hasContact,
  } = useInfoTab(campground, lang);

  const { copied, copy } = useClipboard();

  const copyPw = () => {
    if (campground.wifi_password) copy(campground.wifi_password);
  };

  // ── Track Quick Info accordion opens ──────────────────────
  // Only fires when OPENING (not closing). Each open = one
  // "question the guest answered themselves instead of asking
  // at reception".
  const handleInfoOpen = useCallback(
    (infoType: InfoType) => {
      trackInfoClick(campground.id, sessionId, infoType);
    },
    [campground.id, sessionId],
  );

  return (
    <motion.div
      className="space-y-5 pb-10"
      variants={STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
    >
      {hasContact && (
        <ContactSection
          phone={phone}
          email={email}
          website={website}
          address={address}
          receptionHours={receptionHours}
          receptionMapLink={receptionMapLink}
          brand={brand}
          labels={l}
        />
      )}

      <WifiSection
        wifiName={campground.wifi_name}
        wifiPassword={campground.wifi_password}
        copied={copied}
        onCopyPw={copyPw}
        brand={brand}
        labels={l}
      />

      <PracticalSection
        checkOutInfo={checkOutInfo}
        trashRules={trashRules}
        emergencyInfo={emergencyInfo}
        campRules={campRules}
        hasCampRules={!!campground.camp_rules}
        brand={brand}
        labels={l}
        isSwedish={isSwedish}
        onInfoOpen={handleInfoOpen} // ← NEW
      />

      {receptionMapLink && (
        <FindUsCTA href={receptionMapLink} label={l.findUs} brand={brand} />
      )}
    </motion.div>
  );
}

/* ── Contact Section ─────────────────────────────────── */

function ContactSection({
  phone,
  email,
  website,
  address,
  receptionHours,
  receptionMapLink,
  brand,
  labels: l,
}: {
  phone: string;
  email: string;
  website: string;
  address: string;
  receptionHours: string;
  receptionMapLink: string | null;
  brand: string;
  labels: InfoLabels;
}) {
  return (
    <motion.section variants={STAGGER_ITEM}>
      <SectionHeader
        icon={<Phone size={13} strokeWidth={2} />}
        text={l.contact}
        brand={brand}
      />
      <div
        className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {phone && (
          <ContactRow
            href={`tel:${phone}`}
            icon={<Phone size={17} strokeWidth={2} />}
            title={l.callReception}
            subtitle={phone}
            brand={brand}
            trailing={
              <div
                className="flex h-8 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                style={{ backgroundColor: brand }}
              >
                <Phone size={11} strokeWidth={2.5} />
              </div>
            }
          />
        )}

        {email && (
          <ContactRow
            href={`mailto:${email}`}
            icon={<Mail size={17} strokeWidth={2} />}
            title={l.emailUs}
            subtitle={email}
            brand={brand}
            showDivider={!!phone}
            truncateSubtitle
          />
        )}

        {website && (
          <ContactRow
            href={website.startsWith("http") ? website : `https://${website}`}
            icon={<Globe size={17} strokeWidth={2} />}
            title={l.visitWebsite}
            subtitle={website.replace(/^https?:\/\//, "")}
            brand={brand}
            showDivider
            truncateSubtitle
            external
          />
        )}

        {address && (
          <ContactRow
            href={receptionMapLink ?? "#"}
            icon={<MapPin size={17} strokeWidth={2} />}
            title={l.address}
            subtitle={address}
            brand={brand}
            showDivider
            external
          />
        )}

        {receptionHours && (
          <>
            <div className="mx-4 h-px bg-stone-100" />
            <div className="flex items-start gap-3.5 px-4 py-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                style={{
                  backgroundColor: hexToRgba(brand, 0.07),
                  color: brand,
                }}
              >
                <Clock size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-stone-800">
                  {l.receptionHours}
                </p>
                <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-stone-400">
                  {receptionHours}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}

/* ── Contact Row ─────────────────────────────────────── */

function ContactRow({
  href,
  icon,
  title,
  subtitle,
  brand,
  showDivider,
  truncateSubtitle,
  external,
  trailing,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  brand: string;
  showDivider?: boolean;
  truncateSubtitle?: boolean;
  external?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      {showDivider && <div className="mx-4 h-px bg-stone-100" />}
      <motion.a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3.5 px-4 py-3.5"
        whileTap={{ scale: 0.97 }}
        transition={SPRING_TAP}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
          style={{
            backgroundColor: hexToRgba(brand, 0.07),
            color: brand,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-stone-800">{title}</p>
          <p
            className={`text-[11px] font-medium text-stone-400 ${truncateSubtitle ? "truncate" : ""}`}
          >
            {subtitle}
          </p>
        </div>
        {trailing ?? (
          <ExternalLink size={14} className="shrink-0 text-stone-300" />
        )}
      </motion.a>
    </>
  );
}

/* ── Wi-Fi Section ───────────────────────────────────── */

function WifiSection({
  wifiName,
  wifiPassword,
  copied,
  onCopyPw,
  brand,
  labels: l,
}: {
  wifiName?: string | null;
  wifiPassword?: string | null;
  copied: boolean;
  onCopyPw: () => void;
  brand: string;
  labels: InfoLabels;
}) {
  return (
    <motion.section variants={STAGGER_ITEM}>
      <SectionHeader
        icon={<Wifi size={13} strokeWidth={2} />}
        text={l.wifi}
        brand={brand}
      />
      <div
        className="rounded-[20px] bg-white p-4 ring-1 ring-stone-200/60"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {wifiName || wifiPassword ? (
          <>
            {wifiName && (
              <div className="rounded-[14px] bg-stone-50/80 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                  {l.network}
                </p>
                <p className="mt-0.5 text-[15px] font-black tracking-tight text-stone-800">
                  {wifiName}
                </p>
                {!wifiPassword && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-stone-400">
                    <Globe size={10} /> {l.wifiPortal}
                  </p>
                )}
              </div>
            )}
            {wifiPassword && (
              <div
                className={`flex items-center justify-between gap-3 rounded-[14px] bg-stone-50/80 px-4 py-3 ${wifiName ? "mt-2" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                    {l.password}
                  </p>
                  <code className="mt-0.5 block truncate font-mono text-[14px] font-black tracking-wider text-stone-800">
                    {wifiPassword}
                  </code>
                </div>
                <motion.button
                  onClick={onCopyPw}
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.1em] text-white"
                  style={{
                    backgroundColor: copied ? "#059669" : brand,
                    boxShadow: `0 4px 12px ${hexToRgba(copied ? "#059669" : brand, 0.18)}`,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING_TAP}
                >
                  {copied ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <Copy size={14} strokeWidth={2} />
                  )}
                  {copied ? l.copied : l.copy}
                </motion.button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[14px] bg-stone-50/80 px-4 py-4 text-center">
            <Wifi size={20} className="mx-auto mb-2 text-stone-300" />
            <p className="text-[12px] font-medium text-stone-400">{l.noWifi}</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ── Practical Section ───────────────────────────────── */

function PracticalSection({
  checkOutInfo,
  trashRules,
  emergencyInfo,
  campRules,
  hasCampRules,
  brand,
  labels: l,
  isSwedish,
  onInfoOpen,
}: {
  checkOutInfo: string;
  trashRules: string;
  emergencyInfo: string;
  campRules: string;
  hasCampRules: boolean;
  brand: string;
  labels: InfoLabels;
  isSwedish: boolean;
  onInfoOpen: (infoType: InfoType) => void; // ← NEW
}) {
  return (
    <motion.section variants={STAGGER_ITEM}>
      <SectionHeader
        icon={<ShieldCheck size={13} strokeWidth={2} />}
        text={l.practicalInfo}
        brand={brand}
      />
      <div className="space-y-1.5">
        {checkOutInfo && (
          <CollapsibleInfo
            icon={<Clock size={17} strokeWidth={2} />}
            label={l.checkout}
            content={checkOutInfo}
            brand={brand}
            isOwnerContent
            originalLangLabel={l.originalLang}
            isSwedish={isSwedish}
            onOpen={() => onInfoOpen("checkout")} // ← NEW
          />
        )}
        {trashRules && (
          <CollapsibleInfo
            icon={<Trash2 size={17} strokeWidth={2} />}
            label={l.trash}
            content={trashRules}
            brand={brand}
            isOwnerContent
            originalLangLabel={l.originalLang}
            isSwedish={isSwedish}
            onOpen={() => onInfoOpen("trash")} // ← NEW
          />
        )}
        {emergencyInfo && (
          <CollapsibleInfo
            icon={<Phone size={17} strokeWidth={2} />}
            label={l.emergency}
            content={emergencyInfo}
            brand={brand}
            isOwnerContent
            originalLangLabel={l.originalLang}
            isSwedish={isSwedish}
            urgent
            onOpen={() => onInfoOpen("emergency")} // ← NEW
          />
        )}
        <CollapsibleInfo
          icon={<ShieldCheck size={17} strokeWidth={2} />}
          label={l.rules}
          content={campRules || l.defaultRules}
          brand={brand}
          isOwnerContent={hasCampRules}
          originalLangLabel={l.originalLang}
          isSwedish={isSwedish}
          // No onOpen — "Camp Rules" is not a reception question
        />
      </div>
    </motion.section>
  );
}

/* ── Find Us CTA ─────────────────────────────────────── */

function FindUsCTA({
  href,
  label,
  brand,
}: {
  href: string;
  label: string;
  brand: string;
}) {
  return (
    <motion.div variants={STAGGER_ITEM}>
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-[12px] font-black uppercase tracking-[0.1em] text-white"
        style={{
          backgroundColor: brand,
          boxShadow: `0 4px 16px ${hexToRgba(brand, 0.2)}`,
        }}
        whileTap={{ scale: 0.96 }}
        transition={SPRING_TAP}
      >
        <MapPin size={15} strokeWidth={2.5} />
        {label}
      </motion.a>
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

/* ── Collapsible Info ────────────────────────────────── */

function CollapsibleInfo({
  icon,
  label,
  content,
  brand,
  isOwnerContent,
  originalLangLabel,
  isSwedish,
  urgent,
  onOpen,
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
  brand: string;
  isOwnerContent: boolean;
  originalLangLabel: string;
  isSwedish: boolean;
  urgent?: boolean;
  onOpen?: () => void; // ← NEW: only fires on expand, not collapse
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
      layout
      transition={SPRING_SOFT}
    >
      <motion.button
        onClick={() => {
          const willOpen = !expanded;
          setExpanded(willOpen);
          // Only track when OPENING — closing is not a "question answered"
          if (willOpen) {
            onOpen?.();
          }
        }}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
        whileTap={{ scale: 0.97 }}
        transition={SPRING_TAP}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: hexToRgba(brand, expanded ? 0.1 : 0.05),
            color: brand,
          }}
        >
          {icon}
        </div>
        <span className="flex-1 text-[13px] font-bold text-stone-800">
          {label}
        </span>
        {urgent && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-red-500 ring-1 ring-red-100/80">
            SOS
          </span>
        )}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={SPRING_SOFT}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60"
        >
          <ChevronDown size={13} strokeWidth={2} className="text-stone-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_SOFT}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 rounded-[14px] bg-stone-50/80 px-4 py-3.5">
              {!isSwedish && isOwnerContent && (
                <span className="mb-2 inline-block rounded-full bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 ring-1 ring-stone-200/60">
                  {originalLangLabel}
                </span>
              )}
              <p className="whitespace-pre-line text-[12px] font-medium leading-relaxed text-stone-500">
                {content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
