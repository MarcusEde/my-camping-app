// src/app/camp/[slug]/StatusGatePage.tsx
"use client";

import type { Campground } from "@/types/database";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props {
  campground: Campground;
  status: "inactive" | "cancelled" | "trial_expired";
}

const STATUS_CONFIG = {
  inactive: {
    icon: Clock,
    emoji: "⏸️",
    title: {
      sv: "Tillfälligt otillgänglig",
      en: "Temporarily Unavailable",
      de: "Vorübergehend nicht verfügbar",
      da: "Midlertidigt utilgængelig",
    },
    message: {
      sv: "Denna camping är just nu inte aktiv i Camp Concierge. Kontakta campingen direkt för information.",
      en: "This campground is currently not active on Camp Concierge. Please contact the campground directly for information.",
      de: "Dieser Campingplatz ist derzeit nicht auf Camp Concierge aktiv. Bitte kontaktieren Sie den Campingplatz direkt.",
      da: "Denne campingplads er i øjeblikket ikke aktiv på Camp Concierge. Kontakt campingpladsen direkte for information.",
    },
    bgColor: "#78716c",
  },
  cancelled: {
    icon: XCircle,
    emoji: "🚫",
    title: {
      sv: "Ej längre tillgänglig",
      en: "No Longer Available",
      de: "Nicht mehr verfügbar",
      da: "Ikke længere tilgængelig",
    },
    message: {
      sv: "Denna camping finns inte längre på Camp Concierge.",
      en: "This campground is no longer available on Camp Concierge.",
      de: "Dieser Campingplatz ist nicht mehr auf Camp Concierge verfügbar.",
      da: "Denne campingplads er ikke længere tilgængelig på Camp Concierge.",
    },
    bgColor: "#dc2626",
  },
  trial_expired: {
    icon: AlertTriangle,
    emoji: "⏰",
    title: {
      sv: "Provperioden har löpt ut",
      en: "Trial Period Expired",
      de: "Testzeitraum abgelaufen",
      da: "Prøveperioden er udløbet",
    },
    message: {
      sv: "Denna campings provperiod i Camp Concierge har löpt ut. Kontakta campingen direkt för information.",
      en: "This campground's trial period on Camp Concierge has expired. Please contact the campground directly for information.",
      de: "Die Testphase dieses Campingplatzes auf Camp Concierge ist abgelaufen. Bitte kontaktieren Sie den Campingplatz direkt.",
      da: "Denne campingplads' prøveperiode på Camp Concierge er udløbet. Kontakt campingpladsen direkte for information.",
    },
    bgColor: "#d97706",
  },
};

type LangKey = "sv" | "en" | "de" | "da";

export default function StatusGatePage({ campground, status }: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Try to detect browser language
  const browserLang =
    typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en";

  const lang: LangKey = (["sv", "en", "de", "da"] as LangKey[]).includes(
    browserLang as LangKey,
  )
    ? (browserLang as LangKey)
    : "en";

  const title = config.title[lang];
  const message = config.message[lang];

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: "#FDFCFB" }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Logo / Campground identity */}
        {campground.logo_url ? (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] ring-1 ring-stone-200/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campground.logo_url}
              alt={campground.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] text-2xl text-white shadow-lg"
            style={{
              backgroundColor: brand,
              boxShadow: `0 4px 20px ${hexToRgba(brand, 0.2)}`,
            }}
          >
            🏕️
          </div>
        )}

        <h1 className="text-[18px] font-black tracking-tight text-stone-800">
          {campground.name}
        </h1>

        {/* Status icon */}
        <div
          className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: hexToRgba(config.bgColor, 0.08),
          }}
        >
          <Icon size={24} strokeWidth={2} style={{ color: config.bgColor }} />
        </div>

        {/* Title */}
        <h2
          className="mt-4 text-[15px] font-black tracking-tight"
          style={{ color: config.bgColor }}
        >
          {title}
        </h2>

        {/* Message */}
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-stone-400">
          {message}
        </p>

        {/* Contact info if available */}
        {(campground.phone || campground.website) && (
          <div className="mt-6 space-y-2">
            {campground.phone && (
              <a
                href={`tel:${campground.phone}`}
                className="flex items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
                style={{
                  backgroundColor: brand,
                  boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
                }}
              >
                📞{" "}
                {lang === "sv"
                  ? "Ring campingen"
                  : lang === "de"
                    ? "Campingplatz anrufen"
                    : lang === "da"
                      ? "Ring campingpladsen"
                      : "Call campground"}
              </a>
            )}
            {campground.website && (
              <a
                href={
                  campground.website.startsWith("http")
                    ? campground.website
                    : `https://${campground.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
                style={{
                  color: brand,
                  backgroundColor: hexToRgba(brand, 0.06),
                }}
              >
                🌐{" "}
                {lang === "sv"
                  ? "Besök webbplats"
                  : lang === "de"
                    ? "Website besuchen"
                    : lang === "da"
                      ? "Besøg hjemmeside"
                      : "Visit website"}
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="mt-10 text-[9px] font-black uppercase tracking-[0.25em] text-stone-300">
          Camp Concierge
        </p>
      </div>
    </div>
  );
}
