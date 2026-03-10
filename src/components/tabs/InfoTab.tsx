// src/app/camp/[slug]/tabs/InfoTab.tsx
"use client";

import { getSettingsField } from "@/lib/settings-i18n";
import type { Campground } from "@/types/database";
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
import React, { useState } from "react";
import type { Lang } from "../GuestAppUI";

/* ── Utility ─────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildMapLink(
  lat?: number | null,
  lng?: number | null,
  name?: string,
): string | null {
  if (lat && lng)
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (name)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  return null;
}

const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const SPRING_SOFT = { type: "spring" as const, stiffness: 280, damping: 26 };

const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_TAP },
};

/* ── Translations ────────────────────────────────────── */
const t: Record<
  Lang,
  {
    wifi: string;
    network: string;
    password: string;
    copy: string;
    copied: string;
    noWifi: string;
    wifiPortal: string;
    contact: string;
    callReception: string;
    emailUs: string;
    visitWebsite: string;
    findUs: string;
    receptionHours: string;
    practicalInfo: string;
    checkout: string;
    trash: string;
    emergency: string;
    rules: string;
    defaultRules: string;
    originalLang: string;
    address: string;
    phone: string;
  }
> = {
  sv: {
    wifi: "Wi-Fi",
    network: "Nätverk",
    password: "Lösenord",
    copy: "Kopiera",
    copied: "Kopierat!",
    noWifi: "Fråga i receptionen",
    wifiPortal: "Logga in via webbläsaren",
    contact: "Kontakt & Reception",
    callReception: "Ring receptionen",
    emailUs: "Maila oss",
    visitWebsite: "Webbplats",
    findUs: "Hitta hit",
    receptionHours: "Receptionens öppettider",
    practicalInfo: "Praktisk info",
    checkout: "Utcheckning",
    trash: "Sopsortering",
    emergency: "Nödinformation",
    rules: "Ordningsregler",
    defaultRules:
      "• Tystnad kl 23–07\n• Max 10 km/h\n• Husdjur i koppel\n• Grillning på anvisade platser\n• Rökning ej i stugor",
    originalLang: "🇸🇪 Originaltext",
    address: "Adress",
    phone: "Telefon",
  },
  en: {
    wifi: "Wi-Fi",
    network: "Network",
    password: "Password",
    copy: "Copy",
    copied: "Copied!",
    noWifi: "Ask at reception",
    wifiPortal: "Sign in via your browser",
    contact: "Contact & Reception",
    callReception: "Call reception",
    emailUs: "Email us",
    visitWebsite: "Website",
    findUs: "Find us",
    receptionHours: "Reception hours",
    practicalInfo: "Practical info",
    checkout: "Check-out",
    trash: "Trash & Recycling",
    emergency: "Emergency info",
    rules: "Campground rules",
    defaultRules:
      "• Quiet hours 23–07\n• Max 10 km/h\n• Pets leashed\n• BBQ in designated areas\n• No smoking in cabins",
    originalLang: "🇸🇪 Original text",
    address: "Address",
    phone: "Phone",
  },
  de: {
    wifi: "WLAN",
    network: "Netzwerk",
    password: "Passwort",
    copy: "Kopieren",
    copied: "Kopiert!",
    noWifi: "Fragen Sie an der Rezeption",
    wifiPortal: "Im Browser anmelden",
    contact: "Kontakt & Rezeption",
    callReception: "Rezeption anrufen",
    emailUs: "E-Mail senden",
    visitWebsite: "Webseite",
    findUs: "So finden Sie uns",
    receptionHours: "Rezeptionszeiten",
    practicalInfo: "Praktische Infos",
    checkout: "Check-out",
    trash: "Mülltrennung",
    emergency: "Notfallinfo",
    rules: "Platzordnung",
    defaultRules:
      "• Nachtruhe 23–07\n• Max 10 km/h\n• Haustiere angeleint\n• Grillen an Plätzen\n• Rauchen in Hütten verboten",
    originalLang: "🇸🇪 Originaltext",
    address: "Adresse",
    phone: "Telefon",
  },
  da: {
    wifi: "Wi-Fi",
    network: "Netværk",
    password: "Adgangskode",
    copy: "Kopier",
    copied: "Kopieret!",
    noWifi: "Spørg i receptionen",
    wifiPortal: "Log ind via browseren",
    contact: "Kontakt & Reception",
    callReception: "Ring receptionen",
    emailUs: "Send e-mail",
    visitWebsite: "Hjemmeside",
    findUs: "Find os",
    receptionHours: "Receptionens åbningstider",
    practicalInfo: "Praktisk info",
    checkout: "Udtjekning",
    trash: "Affaldssortering",
    emergency: "Nødinformation",
    rules: "Ordensregler",
    defaultRules:
      "• Ro kl 23–07\n• Max 10 km/t\n• Kæledyr i snor\n• Grill på anviste steder\n• Rygning forbudt i hytter",
    originalLang: "🇸🇪 Originaltekst",
    address: "Adresse",
    phone: "Telefon",
  },
};

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  lang: Lang;
}

export default function InfoTab({ campground, lang }: Props) {
  const [copied, setCopied] = useState(false);
  const brand = campground.primary_color || "#2A3C34";
  const l = t[lang];
  const isSwedish = lang === "sv";

  const phone = campground.phone || "";
  const email = campground.email || "";
  const website = campground.website || "";
  const address = campground.address || "";

  // ✅ All five translatable fields resolved via getSettingsField
  const receptionHours =
    getSettingsField(campground, "reception_hours", lang) || "";
  const checkOutInfo =
    getSettingsField(campground, "check_out_info", lang) || "";
  const trashRules = getSettingsField(campground, "trash_rules", lang) || "";
  const emergencyInfo =
    getSettingsField(campground, "emergency_info", lang) || "";
  const campRules = getSettingsField(campground, "camp_rules", lang) || "";

  const copyPw = () => {
    if (campground.wifi_password) {
      navigator.clipboard.writeText(campground.wifi_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const receptionMapLink = buildMapLink(
    campground.latitude,
    campground.longitude,
    campground.name,
  );
  const hasContact = phone || email || website || address || receptionHours;

  return (
    <motion.div
      className="space-y-5 pb-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ━━━ CONTACT & RECEPTION ━━━ */}
      {hasContact && (
        <motion.section variants={fadeUp}>
          <SectionHeader
            icon={<Phone size={13} strokeWidth={2} />}
            text={l.contact}
            brand={brand}
          />

          <div
            className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Phone */}
            {phone && (
              <motion.a
                href={`tel:${phone}`}
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
                  <Phone size={17} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-stone-800">
                    {l.callReception}
                  </p>
                  <p className="text-[11px] font-medium text-stone-400">
                    {phone}
                  </p>
                </div>
                <div
                  className="flex h-8 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                  style={{ backgroundColor: brand }}
                >
                  <Phone size={11} strokeWidth={2.5} />
                </div>
              </motion.a>
            )}

            {/* Email */}
            {email && (
              <>
                {phone && <div className="mx-4 h-px bg-stone-100" />}
                <motion.a
                  href={`mailto:${email}`}
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
                    <Mail size={17} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-stone-800">
                      {l.emailUs}
                    </p>
                    <p className="truncate text-[11px] font-medium text-stone-400">
                      {email}
                    </p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-stone-300" />
                </motion.a>
              </>
            )}

            {/* Website */}
            {website && (
              <>
                <div className="mx-4 h-px bg-stone-100" />
                <motion.a
                  href={
                    website.startsWith("http") ? website : `https://${website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
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
                    <Globe size={17} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-stone-800">
                      {l.visitWebsite}
                    </p>
                    <p className="truncate text-[11px] font-medium text-stone-400">
                      {website.replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-stone-300" />
                </motion.a>
              </>
            )}

            {/* Address */}
            {address && (
              <>
                <div className="mx-4 h-px bg-stone-100" />
                <motion.a
                  href={receptionMapLink ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    <MapPin size={17} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-stone-800">
                      {l.address}
                    </p>
                    <p className="text-[11px] font-medium text-stone-400">
                      {address}
                    </p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-stone-300" />
                </motion.a>
              </>
            )}

            {/* Reception hours — ✅ now translated */}
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
      )}

      {/* ━━━ WI-FI ━━━ */}
      <motion.section variants={fadeUp}>
        <SectionHeader
          icon={<Wifi size={13} strokeWidth={2} />}
          text={l.wifi}
          brand={brand}
        />

        <div
          className="rounded-[20px] bg-white p-4 ring-1 ring-stone-200/60"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          {campground.wifi_name || campground.wifi_password ? (
            <>
              {campground.wifi_name && (
                <div className="rounded-[14px] bg-stone-50/80 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                    {l.network}
                  </p>
                  <p className="mt-0.5 text-[15px] font-black tracking-tight text-stone-800">
                    {campground.wifi_name}
                  </p>
                  {!campground.wifi_password && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-stone-400">
                      <Globe size={10} /> {l.wifiPortal}
                    </p>
                  )}
                </div>
              )}

              {campground.wifi_password && (
                <div
                  className={`flex items-center justify-between gap-3 rounded-[14px] bg-stone-50/80 px-4 py-3 ${campground.wifi_name ? "mt-2" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                      {l.password}
                    </p>
                    <code className="mt-0.5 block truncate font-mono text-[14px] font-black tracking-wider text-stone-800">
                      {campground.wifi_password}
                    </code>
                  </div>
                  <motion.button
                    onClick={copyPw}
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
              <p className="text-[12px] font-medium text-stone-400">
                {l.noWifi}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ━━━ PRACTICAL INFO ━━━ — ✅ all content now translated */}
      <motion.section variants={fadeUp}>
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
            />
          )}

          <CollapsibleInfo
            icon={<ShieldCheck size={17} strokeWidth={2} />}
            label={l.rules}
            content={campRules || l.defaultRules}
            brand={brand}
            isOwnerContent={!!campground.camp_rules}
            originalLangLabel={l.originalLang}
            isSwedish={isSwedish}
          />
        </div>
      </motion.section>

      {/* ━━━ FIND US CTA ━━━ */}
      {receptionMapLink && (
        <motion.div variants={fadeUp}>
          <motion.a
            href={receptionMapLink}
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
            {l.findUs}
          </motion.a>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Sub-Components ──────────────────────────────────── */

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

function CollapsibleInfo({
  icon,
  label,
  content,
  brand,
  isOwnerContent,
  originalLangLabel,
  isSwedish,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
  brand: string;
  isOwnerContent: boolean;
  originalLangLabel: string;
  isSwedish: boolean;
  urgent?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
      layout
      transition={SPRING_SOFT}
    >
      <motion.button
        onClick={() => setExpanded(!expanded)}
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
