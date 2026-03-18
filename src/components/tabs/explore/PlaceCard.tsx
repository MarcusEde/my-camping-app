// components/tabs/explore/PlaceCard.tsx
"use client";

import { getMapLink, getOpeningHoursDisplay } from "@/lib/place-utils";
import type { UtforskaLabels } from "@/lib/translations";
import type { CachedPlace, PromotedPartner } from "@/types/database";
import { ExternalLink, Heart, MapPin, Navigation, Star } from "lucide-react";
import { PartnerBadge } from "./PartnerCard";
import { CardProps, getCat, STAFF_PICK } from "./types";

const ACTIVITY_LABEL: Record<string, string> = {
  sv: "Aktivitet", en: "Activity", de: "Aktivität",
  da: "Aktivitet", nl: "Activiteit", no: "Aktivitet",
};

const ON_SITE_LABEL: Record<string, string> = {
  sv: "På området", en: "On site", de: "Vor Ort",
  da: "På stedet", nl: "Op het terrein", no: "På området",
};

export function SaveButton({ saved, onToggleSave }: { saved: boolean; onToggleSave: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSave(); }}
      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white/90 hover:bg-white shadow-sm transition-all"
    >
      <Heart size={14} fill={saved ? "#ef4444" : "none"} className={saved ? "text-red-500" : "text-stone-400"} />
    </button>
  );
}

export function HoursBlock({ place, labels: l }: { place: CachedPlace; labels: UtforskaLabels }) {
  if (place.custom_hours) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
        <span className="text-[12px] font-semibold text-stone-600">Info <span className="font-normal text-stone-400">{place.custom_hours}</span></span>
      </div>
    );
  }
  const hours = getOpeningHoursDisplay(place.raw_data, l);
  if (!hours) return null;
  const isOpen = hours.dotColor === "bg-emerald-500";
  const isClosedToday = hours.dotColor === "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${hours.dotColor}`} />
      <span className={`text-[12px] font-bold ${isOpen ? "text-emerald-700" : isClosedToday ? "text-red-500" : "text-stone-500"}`}>{hours.statusText}</span>
      {hours.text !== hours.statusText && <span className="text-[11px] text-stone-400">{hours.text}</span>}
    </div>
  );
}

export function PlaceCardRouter(props: CardProps) {
  const { place } = props;
  if (["beach", "park", "swimming"].includes(place.category)) return <NatureCard {...props} />;
  if (["restaurant", "cafe"].includes(place.category)) return <FoodCard {...props} />;
  return <ActivityCard {...props} />;
}

export function ListViewRow({
  place,
  distance,
  lang,
  activePartner,
  onDirectionsClick,
  isWeatherTip,
}: Omit<CardProps, "saved" | "onToggleSave" | "emoji" | "labels" | "isSwedish" | "weatherBadge"> & { activePartner?: PromotedPartner | null; onDirectionsClick?: (id: string) => void; isWeatherTip?: boolean }) {
  const cfg = getCat(place.category);
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const l = {} as UtforskaLabels; // Placeholder since we don't use labels in list view for hours

  let dotColor = "bg-stone-300";
  if (place.custom_hours) {
    dotColor = "bg-sky-400";
  } else {
    const hours = getOpeningHoursDisplay(place.raw_data, l);
    if (hours) dotColor = hours.dotColor;
  }

  return (
    <div
      className="flex items-center gap-3 py-[12px] h-[56px] border-b border-stone-100 last:border-0 cursor-pointer transition-colors hover:bg-stone-50/50 active:bg-stone-100"
      onClick={() => {
        if (canNavigate) {
          onDirectionsClick?.(place.id);
          window.open(mapLink, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <div className="w-8 h-8 shrink-0 flex items-center justify-center text-[24px]">
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-[14px] font-medium text-stone-900 truncate flex items-center gap-1">
          {isWeatherTip && <span className="text-[12px] leading-none">✨</span>}
          {place.is_pinned && <Star size={11} className="text-amber-500 shrink-0" fill="currentColor" />}
          <span className="truncate">{place.name}</span>
        </h4>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {activePartner && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        <span className="text-[12px] text-stone-500">{distance || "–"}</span>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      </div>
    </div>
  );
}

export function NatureCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[96px]`}>
        <span className="absolute -right-2 -bottom-4 text-[90px] opacity-[0.15] select-none pointer-events-none leading-none rotate-6">{cfg.emoji}</span>
        <span className="absolute left-3 top-2 text-[28px] opacity-[0.12] select-none pointer-events-none">{cfg.emoji}</span>
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 items-start">
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
            {!place.is_on_site && distance && <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80"><Navigation size={9} />{distance}</span>}
            {place.is_on_site && <span className="inline-flex items-center gap-1 bg-emerald-100/90 backdrop-blur-sm text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">📍 {ON_SITE_LABEL[lang]}</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">{place.name}</h4>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">"{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}"</p>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge lang={lang} coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && (
          <div className="mt-auto pt-1">
            <a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}>
              <Navigation size={13} /> {l.hitaHit}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function FoodCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden h-[80px]`}>
        <span className="absolute -right-2 -bottom-4 text-[80px] opacity-[0.15] select-none pointer-events-none leading-none">{cfg.emoji}</span>
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 items-start">
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {place.rating != null && <span className="inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80"><Star size={9} className="text-amber-500" fill="currentColor" /> {place.rating.toFixed(1)}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        <h4 className="text-[14.5px] font-bold leading-snug tracking-tight text-stone-900">{place.name}</h4>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">"{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}"</p>}
        {place.is_on_site ? <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">📍 {ON_SITE_LABEL[lang]}</span> : <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700"><Navigation size={9} className="text-stone-400" />{distance || "–"}</span>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge lang={lang} coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && <div className="mt-auto pt-1"><a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}><ExternalLink size={13} /> {l.hitaHit}</a></div>}
      </div>
    </div>
  );
}

export function ActivityCard({ place, labels: l, distance, onDirectionsClick, saved, onToggleSave, activePartner, lang, weatherBadge }: CardProps) {
  const { canNavigate, mapLink } = getMapLink(place.latitude, place.longitude, place.address);
  const cfg = getCat(place.category);
  return (
    <div className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <div className={`relative bg-gradient-to-br ${cfg.gradient} overflow-hidden px-4 pt-3.5 pb-8`}>
        <span className="absolute -right-2 top-0 text-[72px] opacity-[0.15] select-none pointer-events-none leading-none">{cfg.emoji}</span>
        <div className="relative flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col gap-1.5 items-start">
            <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm text-stone-600 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20 shadow-sm">{cfg.emoji} {ACTIVITY_LABEL[lang]}</span>
            {place.is_pinned && <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm"><Star size={8} className="text-amber-500" fill="currentColor" /> {STAFF_PICK[lang]}</span>}
            {weatherBadge && <span className="inline-flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm text-purple-800 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-200/50 shadow-sm">{weatherBadge}</span>}
            {activePartner && <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">🤝 Partner</span>}
          </div>
          <SaveButton saved={saved} onToggleSave={onToggleSave} />
        </div>
        <h4 className="relative text-[15px] font-bold leading-snug text-stone-900 max-w-[200px]">{place.name}</h4>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white" style={{ borderRadius: "55% 55% 0 0 / 100% 100% 0 0" }} />
        <div className="absolute bottom-[-9px] left-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
        <div className="absolute bottom-[-9px] right-[-9px] h-[18px] w-[18px] rounded-full bg-[#F5F5F4] border border-stone-200 z-10" />
      </div>
      <div className={`flex flex-1 flex-col px-4 pt-3 pb-4 gap-2.5 ${cfg.bodyTint}`}>
        {(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note) && <p className="text-[12.5px] text-stone-500 italic leading-snug">"{(place.note_translations?.[lang as keyof typeof place.note_translations] || place.owner_note)}"</p>}
        {place.is_on_site ? <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">📍 {ON_SITE_LABEL[lang]}</span> : <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700"><Navigation size={9} className="text-stone-400" />{distance || "–"}</span>}
        <HoursBlock place={place} labels={l} />
        {activePartner && <PartnerBadge lang={lang} coupon={activePartner.coupon_code ?? undefined} />}
        {canNavigate && !place.is_on_site && <div className="mt-auto pt-1"><a href={mapLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); onDirectionsClick?.(place.id); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r ${cfg.ctaGradient} text-white text-[12px] font-bold shadow-sm hover:brightness-110 transition-all`}><MapPin size={13} /> {l.hitaHit}</a></div>}
      </div>
    </div>
  );
}
