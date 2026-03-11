// src/components/StatusGatePage.tsx
"use client";

import {
  statusGateConfig,
  statusGateCTALabels,
  type GateStatus,
} from "@/lib/translations";
import { detectBrowserLang, hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

const STATUS_ICONS = {
  inactive: Clock,
  cancelled: XCircle,
  trial_expired: AlertTriangle,
} as const;

interface Props {
  campground: Campground;
  status: GateStatus;
}

export default function StatusGatePage({ campground, status }: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const lang = detectBrowserLang();
  const config = statusGateConfig[status];
  const Icon = STATUS_ICONS[status];
  const cta = statusGateCTALabels[lang];

  const title = config.title[lang];
  const message = config.message[lang];

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: "#FDFCFB" }}
    >
      <div className="w-full max-w-sm text-center">
        <CampIdentity
          logoUrl={campground.logo_url}
          name={campground.name}
          brand={brand}
        />

        <StatusIcon icon={Icon} bgColor={config.bgColor} />

        <h2
          className="mt-4 text-[15px] font-black tracking-tight"
          style={{ color: config.bgColor }}
        >
          {title}
        </h2>

        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-stone-400">
          {message}
        </p>

        <ContactCTAs
          phone={campground.phone}
          website={campground.website}
          brand={brand}
          labels={cta}
        />

        <p className="mt-10 text-[9px] font-black uppercase tracking-[0.25em] text-stone-300">
          Camp Concierge
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function CampIdentity({
  logoUrl,
  name,
  brand,
}: {
  logoUrl?: string | null;
  name: string;
  brand: string;
}) {
  return (
    <>
      {logoUrl ? (
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] ring-1 ring-stone-200/60">
          <img
            src={logoUrl}
            alt={name}
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
        {name}
      </h1>
    </>
  );
}

function StatusIcon({
  icon: Icon,
  bgColor,
}: {
  icon: typeof Clock;
  bgColor: string;
}) {
  return (
    <div
      className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full"
      style={{ backgroundColor: hexToRgba(bgColor, 0.08) }}
    >
      <Icon size={24} strokeWidth={2} style={{ color: bgColor }} />
    </div>
  );
}

function ContactCTAs({
  phone,
  website,
  brand,
  labels,
}: {
  phone?: string | null;
  website?: string | null;
  brand: string;
  labels: { callCampground: string; visitWebsite: string };
}) {
  if (!phone && !website) return null;

  return (
    <div className="mt-6 space-y-2">
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95"
          style={{
            backgroundColor: brand,
            boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
          }}
        >
          📞 {labels.callCampground}
        </a>
      )}
      {website && (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full py-3 text-[12px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
          style={{
            color: brand,
            backgroundColor: hexToRgba(brand, 0.06),
          }}
        >
          🌐 {labels.visitWebsite}
        </a>
      )}
    </div>
  );
}
