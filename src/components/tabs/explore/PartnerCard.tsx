// components/tabs/explore/PartnerCard.tsx
"use client";

import type { PromotedPartner } from "@/types/database";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const REVEAL_LABEL: Record<string, string> = {
  sv: "Avslöja rabatt", en: "Reveal discount", de: "Rabatt anzeigen",
  da: "Vis rabat", nl: "Toon korting", no: "Vis rabatt",
};
const PARTNER_LABEL: Record<string, string> = {
  sv: "Partnererbjudande — Avslöja rabatt", en: "Partner offer — Reveal discount",
  de: "Partnerangebot — Rabatt anzeigen", da: "Partnertilbud — Vis rabat",
  nl: "Partneraanbieding — Toon korting", no: "Partnertilbud — Vis rabatt",
};
const COUPON_LABEL: Record<string, string> = {
  sv: "Rabattkod", en: "Coupon code", de: "Rabattcode",
  da: "Rabatkode", nl: "Kortingscode", no: "Rabattkode",
};
const NO_CODE_LABEL: Record<string, string> = {
  sv: "INGEN KOD", en: "NO CODE", de: "KEIN CODE",
  da: "INGEN KODE", nl: "GEEN CODE", no: "INGEN KODE",
};

export function UnlinkedPartnerCard({ partner, lang }: { partner: PromotedPartner; lang: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = partner.business_name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");

  const handleCopy = () => {
    if (partner.coupon_code) {
      navigator.clipboard.writeText(partner.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardInner = (
    <div className="flex w-[200px] shrink-0 snap-start flex-col rounded-2xl bg-white border border-stone-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover border border-stone-100"
          />
        ) : (
          <div
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: "var(--brand, #059669)" }}
          >
            {initials}
          </div>
        )}
        <p className="flex-1 min-w-0 text-[13px] font-semibold text-stone-900 leading-tight truncate">
          {partner.business_name}
        </p>
      </div>

      {/* Description */}
      {partner.description && (
        <p className="px-3 pb-2 text-[11.5px] text-stone-500 leading-snug line-clamp-1">
          {partner.description}
        </p>
      )}

      {/* Coupon */}
      {partner.coupon_code && (
        <div className="px-3 pb-3">
          {!revealed ? (
            <button
              onClick={e => { e.stopPropagation(); setRevealed(true); }}
              className="w-full rounded-xl border border-dashed border-amber-500 py-1.5 text-[11px] font-bold text-amber-600 hover:bg-amber-50 transition-colors"
            >
              🤝 {REVEAL_LABEL[lang] ?? REVEAL_LABEL.en}
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 pl-3 pr-1.5 py-1.5">
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest leading-none mb-0.5">{COUPON_LABEL[lang] ?? COUPON_LABEL.en}</span>
                <code className="text-[12px] font-black tracking-widest text-amber-700 leading-none">{partner.coupon_code}</code>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleCopy(); }}
                className="h-7 w-7 flex items-center justify-center bg-white border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors shadow-sm"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spacer when no coupon to keep card height consistent */}
      {!partner.coupon_code && <div className="pb-3" />}
    </div>
  );

  if (partner.website_url) {
    return (
      <a
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-transform active:scale-[0.98]"
      >
        {cardInner}
      </a>
    );
  }
  return <div>{cardInner}</div>;
}

export function PartnerBadge({ coupon, lang }: { coupon?: string; lang: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (coupon) {
      navigator.clipboard.writeText(coupon);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-2">
      {!revealed ? (
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
          className="w-full rounded-xl border border-dashed border-amber-500 py-2 text-[11px] font-bold text-amber-600 hover:bg-amber-50 transition-colors"
        >
          🤝 {PARTNER_LABEL[lang] ?? PARTNER_LABEL.en}
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 pl-3 pr-1.5 py-1.5">
          <div className="flex flex-col items-start pt-0.5">
            <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest leading-none mb-0.5">{COUPON_LABEL[lang] ?? COUPON_LABEL.en}</span>
            <code className="text-sm font-black tracking-widest text-amber-700 leading-none">{coupon ?? (NO_CODE_LABEL[lang] ?? NO_CODE_LABEL.en)}</code>
          </div>
          {coupon && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="h-8 w-8 flex items-center justify-center bg-white border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors shadow-sm"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
