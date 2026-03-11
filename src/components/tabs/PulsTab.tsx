// src/components/tabs/PulsTab.tsx
"use client";

/**
 * PulsTab.tsx — High-Density Scannable Layout
 * With automatic translation display for announcements,
 * owner notes, AND campground info fields.
 */

import { getTodaysOpeningHours } from "@/lib/place-utils";
import type { RoadDistanceMap } from "@/lib/routing";
import { getSettingsField } from "@/lib/settings-i18n";
import { hexToRgba } from "@/lib/utils";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
} from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { motion } from "framer-motion";
import {
  CalendarHeart,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
  Megaphone,
  Phone,
  Sun,
  Trash2,
  Umbrella,
  Wifi,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

/* ── Translation helpers ─────────────────────────────── */

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

function getOwnerNote(place: CachedPlace, lang: Lang): string | null {
  if (!place.owner_note) return null;
  if (lang === "sv") return place.owner_note;
  return (
    place.note_translations?.[lang as "en" | "de" | "da"] || place.owner_note
  );
}

/* ── Physics ─────────────────────────────────────────── */
const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const SPRING_SNAP = { type: "spring" as const, stiffness: 500, damping: 30 };

const stagger = {
  animate: { transition: { staggerChildren: 0.035 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_TAP },
};

/* ── Category emoji map ──────────────────────────────── */
const EMOJI: Record<string, string> = {
  beach: "🏖️",
  cafe: "☕",
  restaurant: "🍽️",
  park: "🌲",
  shopping: "🛒",
  bowling: "🎳",
  museum: "🏛️",
  swimming: "🏊",
  cinema: "🎬",
  spa: "💆",
  activity: "🎯",
  playground: "🛝",
  sports: "🏸",
  attraction: "🎡",
  other: "📍",
};
const FACILITY_EMOJI: Record<string, string> = {
  toilet: "🚻",
  shower: "🚿",
  laundry: "👕",
  kitchen: "🍳",
  playground: "🛝",
  pool: "🏊",
  reception: "🏕️",
  shop: "🛒",
  recycling: "♻️",
  bbq: "🔥",
  electricity: "⚡",
  water: "🚰",
  wifi: "📶",
  parking: "🅿️",
  dog_area: "🐕",
  other: "📍",
};

/* ── Map link builder ────────────────────────────────── */
function getGoogleMapsLink(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
): string | null {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

/* ── UI Translations ─────────────────────────────────── */
const t: Record<
  Lang,
  {
    wifi: string;
    network: string;
    password: string;
    copy: string;
    copied: string;
    wifiPortal: string;
    noWifi: string;
    quickInfo: string;
    checkout: string;
    trash: string;
    emergency: string;
    notices: string;
    noNotices: string;
    noNoticesSub: string;
    showWay: string;
    callReception: string;
    callSub: string;
    findReception: string;
    findSub: string;
    closedToday: string;
    rainTip: string;
    sunTip: string;
    nearbyPlaces: string;
    happeningNow: string;
    contact: string;
    open: string;
    closed: string;
    onSite: string;
    facilities: string;
  }
> = {
  sv: {
    wifi: "Wi-Fi",
    network: "Nätverk",
    password: "Lösenord",
    copy: "Kopiera",
    copied: "Kopierat!",
    wifiPortal: "Logga in via webbläsaren",
    noWifi: "Fråga i receptionen",
    quickInfo: "Bra att veta",
    checkout: "Utcheckning",
    trash: "Sopor",
    emergency: "Nödläge",
    notices: "Senaste nytt",
    noNotices: "Inga anslag just nu",
    noNoticesSub: "Njut av lugnet — vi meddelar om något händer!",
    showWay: "Visa vägen",
    callReception: "Ring receptionen",
    callSub: "Vi hjälper dig gärna",
    findReception: "Hitta hit",
    findSub: "Vägbeskrivning",
    closedToday: "Stängt idag",
    rainTip: "Inomhustips",
    sunTip: "Dagens tips",
    nearbyPlaces: "I närheten",
    happeningNow: "På campingen nu",
    contact: "Behöver du hjälp?",
    open: "Öppet",
    closed: "Stängt",
    onSite: "På området",
    facilities: "Faciliteter",
  },
  en: {
    wifi: "Wi-Fi",
    network: "Network",
    password: "Password",
    copy: "Copy",
    copied: "Copied!",
    wifiPortal: "Sign in via your browser",
    noWifi: "Ask at reception",
    quickInfo: "Good to know",
    checkout: "Check-out",
    trash: "Trash",
    emergency: "Emergency",
    notices: "Latest news",
    noNotices: "No notices right now",
    noNoticesSub: "Enjoy the peace — we'll let you know if something's up!",
    showWay: "Get directions",
    callReception: "Call reception",
    callSub: "Happy to help",
    findReception: "Find us",
    findSub: "Directions",
    closedToday: "Closed today",
    rainTip: "Indoor tip",
    sunTip: "Today's tip",
    nearbyPlaces: "Nearby",
    happeningNow: "At camp right now",
    contact: "Need help?",
    open: "Open",
    closed: "Closed",
    onSite: "On site",
    facilities: "Facilities",
  },
  de: {
    wifi: "WLAN",
    network: "Netzwerk",
    password: "Passwort",
    copy: "Kopieren",
    copied: "Kopiert!",
    wifiPortal: "Im Browser anmelden",
    noWifi: "Fragen Sie an der Rezeption",
    quickInfo: "Gut zu wissen",
    checkout: "Check-out",
    trash: "Müll",
    emergency: "Notfall",
    notices: "Neuigkeiten",
    noNotices: "Keine Hinweise aktuell",
    noNoticesSub: "Genießen Sie die Ruhe — wir melden uns!",
    showWay: "Route anzeigen",
    callReception: "Rezeption anrufen",
    callSub: "Wir helfen gerne",
    findReception: "So finden Sie uns",
    findSub: "Wegbeschreibung",
    closedToday: "Heute geschlossen",
    rainTip: "Indoor-Tipp",
    sunTip: "Tipp des Tages",
    nearbyPlaces: "In der Nähe",
    happeningNow: "Gerade am Campingplatz",
    contact: "Brauchen Sie Hilfe?",
    open: "Geöffnet",
    closed: "Geschlossen",
    onSite: "Auf dem Platz",
    facilities: "Einrichtungen",
  },
  da: {
    wifi: "Wi-Fi",
    network: "Netværk",
    password: "Adgangskode",
    copy: "Kopier",
    copied: "Kopieret!",
    wifiPortal: "Log ind via browseren",
    noWifi: "Spørg i receptionen",
    quickInfo: "Godt at vide",
    checkout: "Udtjekning",
    trash: "Affald",
    emergency: "Nødsituation",
    notices: "Seneste nyt",
    noNotices: "Ingen opslag lige nu",
    noNoticesSub: "Nyd roen — vi giver besked!",
    showWay: "Find vej",
    callReception: "Ring till receptionen",
    callSub: "Vi hjælper gerne",
    findReception: "Find os",
    findSub: "Vejbeskrivelse",
    closedToday: "Lukket i dag",
    rainTip: "Indendørs tip",
    sunTip: "Dagens tip",
    nearbyPlaces: "I nærheden",
    happeningNow: "På campingpladsen nu",
    contact: "Brug for hjælp?",
    open: "Åbent",
    closed: "Lukket",
    onSite: "På pladsen",
    facilities: "Faciliteter",
  },
  nl: {
    wifi: "Wi-Fi",
    network: "Netwerk",
    password: "Wachtwoord",
    copy: "Kopiëren",
    copied: "Gekopieerd!",
    wifiPortal: "Log in via je browser",
    noWifi: "Vraag bij de receptie",
    quickInfo: "Goed om te weten",
    checkout: "Uitchecken",
    trash: "Afval",
    emergency: "Noodgeval",
    notices: "Laatste nieuws",
    noNotices: "Geen mededelingen",
    noNoticesSub: "Geniet van de rust — we laten het je weten!",
    showWay: "Route tonen",
    callReception: "Bel receptie",
    callSub: "We helpen je graag",
    findReception: "Vind ons",
    findSub: "Routebeschrijving",
    closedToday: "Vandaag gesloten",
    rainTip: "Binnentip",
    sunTip: "Tip van de dag",
    nearbyPlaces: "In de buurt",
    happeningNow: "Nu op de camping",
    contact: "Hulp nodig?",
    open: "Open",
    closed: "Gesloten",
    onSite: "Op het terrein",
    facilities: "Voorzieningen",
  },
  no: {
    wifi: "Wi-Fi",
    network: "Nettverk",
    password: "Passord",
    copy: "Kopier",
    copied: "Kopiert!",
    wifiPortal: "Logg inn via nettleseren",
    noWifi: "Spør i resepsjonen",
    quickInfo: "Greit å vite",
    checkout: "Utsjekking",
    trash: "Søppel",
    emergency: "Nødsituasjon",
    notices: "Siste nytt",
    noNotices: "Ingen oppslag akkurat nå",
    noNoticesSub: "Nyt roen — vi gir beskjed!",
    showWay: "Vis vei",
    callReception: "Ring resepsjonen",
    callSub: "Vi hjelper gjerne",
    findReception: "Finn oss",
    findSub: "Veibeskrivelse",
    closedToday: "Stengt i dag",
    rainTip: "Innendørstips",
    sunTip: "Dagens tips",
    nearbyPlaces: "I nærheten",
    happeningNow: "På campingplassen nå",
    contact: "Trenger du hjelp?",
    open: "Åpent",
    closed: "Stengt",
    onSite: "På plassen",
    facilities: "Fasiliteter",
  },
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

interface Props {
  campground: Campground;
  places: CachedPlace[];
  announcements: Announcement[];
  weather?: WeatherProp | null;
  lang: Lang;
  distanceMap: RoadDistanceMap;
  internalLocations?: InternalLocation[];
  onDirectionsClick?: (placeId: string) => void;
}

export default function PulsTab({
  campground,
  places,
  announcements,
  weather,
  lang,
  distanceMap,
  internalLocations = [],
  onDirectionsClick,
}: Props) {
  const l = t[lang];
  const brand = campground.primary_color || "#2A3C34";
  const [copied, setCopied] = useState(false);
  const [expandedQuickInfo, setExpandedQuickInfo] = useState<string | null>(
    null,
  );

  const pinnedPlaces = useMemo(
    () => places.filter((p) => !p.is_hidden && p.is_pinned).slice(0, 8),
    [places],
  );

  // ─── Tip of the Day ──────────────────────────────────
  const [advisedPlace, setAdvisedPlace] = useState<CachedPlace | null>(() => {
    if (pinnedPlaces.length === 0) return null;
    let pool = pinnedPlaces;
    const isCold = weather ? weather.temp < 15 : false;

    if (weather?.isRaining || isCold) {
      const indoor = pinnedPlaces.filter(
        (p) =>
          p.is_indoor ||
          ["cafe", "museum", "shopping", "spa", "cinema", "bowling"].includes(
            p.category,
          ),
      );
      if (indoor.length > 0) pool = indoor;
    } else {
      const outdoor = pinnedPlaces.filter((p) =>
        [
          "beach",
          "park",
          "activity",
          "playground",
          "sports",
          "attraction",
          "other",
        ].includes(p.category),
      );
      if (outdoor.length > 0) pool = outdoor;
    }
    return pool[0];
  });

  useEffect(() => {
    if (pinnedPlaces.length === 0) return;

    let pool = pinnedPlaces;
    const isCold = weather ? weather.temp < 15 : false;

    if (weather?.isRaining || isCold) {
      const indoor = pinnedPlaces.filter(
        (p) =>
          p.is_indoor ||
          ["cafe", "museum", "shopping", "spa", "cinema", "bowling"].includes(
            p.category,
          ),
      );
      if (indoor.length > 0) pool = indoor;
    } else {
      const outdoor = pinnedPlaces.filter((p) =>
        [
          "beach",
          "park",
          "activity",
          "playground",
          "sports",
          "attraction",
          "other",
        ].includes(p.category),
      );
      if (outdoor.length > 0) pool = outdoor;
    }

    const dayOfMonth = new Date().getDate();
    setAdvisedPlace(pool[dayOfMonth % pool.length]);
  }, [pinnedPlaces, weather]);

  const isAdvisedOnSite = advisedPlace?.is_on_site ?? false;
  const adviceMapLink = advisedPlace
    ? getGoogleMapsLink(
        advisedPlace.latitude,
        advisedPlace.longitude,
        advisedPlace.address,
      )
    : null;
  const canNavigateTip = !!adviceMapLink;

  const liveNotices = useMemo(
    () =>
      [...announcements]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 4),
    [announcements],
  );

  const receptionMapLink =
    getGoogleMapsLink(
      campground.latitude,
      campground.longitude,
      campground.address,
    ) ?? "#";

  const copyPassword = () => {
    if (campground.wifi_password) {
      navigator.clipboard.writeText(campground.wifi_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasWifiName = !!campground.wifi_name;
  const hasWifiPassword = !!campground.wifi_password;
  const hasCheckout = !!campground.check_out_info;
  const hasTrash = !!campground.trash_rules;
  const hasEmergency = !!campground.emergency_info;
  const isColdForTip = weather ? weather.temp < 15 : false;

  const expandedContent = expandedQuickInfo
    ? expandedQuickInfo === "checkout"
      ? getSettingsField(campground, "check_out_info", lang)
      : expandedQuickInfo === "trash"
        ? getSettingsField(campground, "trash_rules", lang)
        : getSettingsField(campground, "emergency_info", lang)
    : null;

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <motion.div
      className="space-y-4 pb-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ═══════════════════════════════════════════════
         1. ESSENTIALS CARD
         ═══════════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div
          className="rounded-[20px] bg-white ring-1 ring-stone-200/60"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          {/* Wi-Fi row */}
          <div className="flex items-start gap-3 px-4 py-3.5">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: hexToRgba(brand, 0.07) }}
            >
              <Wifi size={15} strokeWidth={2} style={{ color: brand }} />
            </div>
            <div className="min-w-0 flex-1">
              {hasWifiName && hasWifiPassword ? (
                <div className="space-y-0.5">
                  <span
                    className="block text-[13px] font-bold text-stone-800"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {campground.wifi_name}
                  </span>
                  <code
                    className="block font-mono text-[13px] font-black text-stone-800"
                    style={{
                      wordBreak: "break-all",
                      overflowWrap: "break-word",
                    }}
                  >
                    {campground.wifi_password}
                  </code>
                </div>
              ) : hasWifiName ? (
                <div className="space-y-0.5">
                  <span
                    className="block text-[13px] font-bold text-stone-800"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {campground.wifi_name}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
                    <Globe size={10} strokeWidth={2} />
                    {l.wifiPortal}
                  </span>
                </div>
              ) : hasWifiPassword ? (
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                    {l.password}
                  </span>
                  <code
                    className="block font-mono text-[13px] font-black text-stone-800"
                    style={{
                      wordBreak: "break-all",
                      overflowWrap: "break-word",
                    }}
                  >
                    {campground.wifi_password}
                  </code>
                </div>
              ) : (
                <span className="text-[12px] font-medium text-stone-400">
                  {l.noWifi}
                </span>
              )}
            </div>
            {hasWifiPassword && (
              <motion.button
                onClick={copyPassword}
                className="mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                style={{ backgroundColor: copied ? "#059669" : brand }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING_SNAP}
              >
                {copied ? (
                  <Check size={11} strokeWidth={2.5} />
                ) : (
                  <Copy size={11} strokeWidth={2} />
                )}
                {copied ? l.copied : l.copy}
              </motion.button>
            )}
          </div>

          {/* Quick info pills — ★ FIX: added flex-wrap */}
          {(hasCheckout || hasTrash || hasEmergency) && (
            <>
              <div className="mx-4 h-px bg-stone-100" />
              <div className="flex flex-wrap gap-2 px-4 py-2.5">
                {hasCheckout && (
                  <QuickPill
                    icon={<Clock size={11} strokeWidth={2} />}
                    label={l.checkout}
                    id="checkout"
                    expanded={expandedQuickInfo === "checkout"}
                    onToggle={() =>
                      setExpandedQuickInfo(
                        expandedQuickInfo === "checkout" ? null : "checkout",
                      )
                    }
                    brand={brand}
                  />
                )}
                {hasTrash && (
                  <QuickPill
                    icon={<Trash2 size={11} strokeWidth={2} />}
                    label={l.trash}
                    id="trash"
                    expanded={expandedQuickInfo === "trash"}
                    onToggle={() =>
                      setExpandedQuickInfo(
                        expandedQuickInfo === "trash" ? null : "trash",
                      )
                    }
                    brand={brand}
                  />
                )}
                {hasEmergency && (
                  <QuickPill
                    icon={<Phone size={11} strokeWidth={2} />}
                    label={l.emergency}
                    id="emergency"
                    expanded={expandedQuickInfo === "emergency"}
                    onToggle={() =>
                      setExpandedQuickInfo(
                        expandedQuickInfo === "emergency" ? null : "emergency",
                      )
                    }
                    brand={brand}
                    urgent
                  />
                )}
              </div>

              {/* Expanded content */}
              {expandedQuickInfo && expandedContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    type: "tween",
                    duration: 0.18,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-stone-100 px-4 pb-3.5 pt-3">
                    <p
                      className="text-[12px] leading-relaxed text-stone-500"
                      style={{
                        whiteSpace: "pre-line",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {expandedContent}
                    </p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.section>
      {internalLocations.filter((loc) => loc.is_active).length > 0 && (
        <motion.section variants={fadeUp}>
          <RowHeader
            icon={<MapPin size={12} strokeWidth={2} />}
            text={l.facilities}
            brand={brand}
          />
          <div
            className="overflow-hidden rounded-[18px] bg-white ring-1 ring-stone-200/60"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            {internalLocations
              .filter((loc) => loc.is_active)
              .sort((a, b) => a.walking_minutes - b.walking_minutes)
              .map((loc, idx) => (
                <React.Fragment key={loc.id}>
                  {idx > 0 && <div className="mx-4 h-px bg-stone-100/80" />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-sm"
                      style={{ backgroundColor: hexToRgba(brand, 0.05) }}
                    >
                      {FACILITY_EMOJI[loc.type] ?? "📍"}
                    </div>
                    <p className="min-w-0 flex-1 text-[13px] font-bold text-stone-800">
                      {loc.name}
                    </p>
                    <span className="shrink-0 rounded-full bg-stone-50 px-2 py-0.5 text-[10px] font-black text-stone-400 ring-1 ring-stone-200/60">
                      🚶 {loc.walking_minutes} min
                    </span>
                  </div>
                </React.Fragment>
              ))}
          </div>
        </motion.section>
      )}
      {/* ═══════════════════════════════════════════════
         2. ANNOUNCEMENTS
         ═══════════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <RowHeader
          icon={
            liveNotices.length > 0 ? (
              <CalendarHeart size={12} strokeWidth={2} />
            ) : (
              <Megaphone size={12} strokeWidth={2} />
            )
          }
          text={liveNotices.length > 0 ? l.happeningNow : l.notices}
          brand={brand}
          pulse={liveNotices.length > 0}
        />

        {liveNotices.length > 0 ? (
          <div
            className="overflow-hidden rounded-[18px] bg-white ring-1 ring-stone-200/60"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            {liveNotices.map((ann, idx) => (
              <React.Fragment key={ann.id}>
                {idx > 0 && <div className="mx-4 h-px bg-stone-100" />}
                <CompactNoticeRow ann={ann} brand={brand} lang={lang} />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <EmptyNotices title={l.noNotices} subtitle={l.noNoticesSub} />
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════
         3. TODAY'S TIP
         ═══════════════════════════════════════════════ */}
      {advisedPlace && (
        <motion.section variants={fadeUp}>
          <RowHeader
            icon={
              weather?.isRaining || isColdForTip ? (
                <Umbrella size={12} strokeWidth={2} />
              ) : (
                <Sun size={12} strokeWidth={2} />
              )
            }
            text={weather?.isRaining || isColdForTip ? l.rainTip : l.sunTip}
            brand={brand}
          />

          {canNavigateTip ? (
            <motion.a
              href={adviceMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 ring-1 ring-stone-200/60"
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_TAP}
              onClick={() =>
                advisedPlace && onDirectionsClick?.(advisedPlace.id)
              }
            >
              <TipContent
                place={advisedPlace}
                distanceMap={distanceMap}
                brand={brand}
              />
              <div
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                style={{ backgroundColor: brand }}
              >
                <ExternalLink size={10} strokeWidth={2.5} />
                {l.showWay}
              </div>
            </motion.a>
          ) : (
            <div
              className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 ring-1 ring-stone-200/60"
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <TipContent
                place={advisedPlace}
                distanceMap={distanceMap}
                brand={brand}
                isTipOnSite={isAdvisedOnSite}
              />
              {isAdvisedOnSite && (
                <div
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em]"
                  style={{
                    backgroundColor: hexToRgba(brand, 0.08),
                    color: brand,
                  }}
                >
                  <MapPin size={10} strokeWidth={2.5} />
                  {l.onSite}
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════
         4. NEARBY PLACES
         ═══════════════════════════════════════════════ */}
      {pinnedPlaces.length > 0 && (
        <motion.section variants={fadeUp}>
          <RowHeader
            icon={<Compass size={12} strokeWidth={2} />}
            text={l.nearbyPlaces}
            brand={brand}
          />
          <div
            className="overflow-hidden rounded-[18px] bg-white ring-1 ring-stone-200/60"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            {pinnedPlaces.map((place, idx) => (
              <React.Fragment key={place.id}>
                {idx > 0 && <div className="mx-4 h-px bg-stone-100/80" />}
                <DensePlaceRow
                  place={place}
                  distance={distanceMap[place.id] ?? ""}
                  brand={brand}
                  openLabel={l.open}
                  closedLabel={l.closed}
                  onSiteLabel={l.onSite}
                  lang={lang}
                  onDirectionsClick={onDirectionsClick}
                />
              </React.Fragment>
            ))}
          </div>
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════
         5. CONTACT
         ═══════════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <RowHeader
          icon={<Phone size={12} strokeWidth={2} />}
          text={l.contact}
          brand={brand}
        />
        <div
          className="overflow-hidden rounded-[18px] bg-white ring-1 ring-stone-200/60"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <ContactRow
            icon={<Phone size={15} strokeWidth={2} />}
            label={l.callReception}
            meta={l.callSub}
            brand={brand}
            href={`tel:${campground.phone ?? ""}`}
          />
          <div className="mx-4 h-px bg-stone-100/80" />
          <ContactRow
            icon={<MapPin size={15} strokeWidth={2} />}
            label={l.findReception}
            meta={l.findSub}
            brand={brand}
            href={receptionMapLink}
            external
          />
        </div>
      </motion.section>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function TipContent({
  place,
  distanceMap,
  brand,
  isTipOnSite,
}: {
  place: CachedPlace;
  distanceMap: RoadDistanceMap;
  brand: string;
  isTipOnSite?: boolean;
}) {
  return (
    <>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-lg"
        style={{ backgroundColor: hexToRgba(brand, 0.06) }}
      >
        {EMOJI[place.category] ?? "📍"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-stone-800">
          {place.name}
        </p>
        {!isTipOnSite && (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            {distanceMap[place.id] ?? ""}
          </p>
        )}
      </div>
    </>
  );
}

function RowHeader({
  icon,
  text,
  brand,
  pulse,
}: {
  icon: React.ReactNode;
  text: string;
  brand: string;
  pulse?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <div
        className="flex h-5 w-5 items-center justify-center rounded-[6px]"
        style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
      >
        {icon}
      </div>
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {pulse && (
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
              style={{ backgroundColor: brand }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: brand }}
            />
          </span>
        )}
        {text}
      </h3>
    </div>
  );
}

function QuickPill({
  icon,
  label,
  id,
  expanded,
  onToggle,
  brand,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  id: string;
  expanded: boolean;
  onToggle: () => void;
  brand: string;
  urgent?: boolean;
}) {
  return (
    <motion.button
      onClick={onToggle}
      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all"
      style={
        expanded
          ? {
              backgroundColor: urgent
                ? "rgba(239,68,68,0.08)"
                : hexToRgba(brand, 0.08),
              color: urgent ? "#EF4444" : brand,
              boxShadow: `0 0 0 1.5px ${urgent ? "rgba(239,68,68,0.2)" : hexToRgba(brand, 0.2)}`,
            }
          : {
              backgroundColor: "rgba(0,0,0,0.03)",
              color: urgent ? "#EF4444" : "#78716c",
            }
      }
      whileTap={{ scale: 0.93 }}
      transition={SPRING_SNAP}
    >
      {icon}
      {label}
      {urgent && (
        <span className="ml-0.5 rounded-full bg-red-500 px-1 py-0.5 text-[7px] font-black text-white">
          SOS
        </span>
      )}
    </motion.button>
  );
}

function CompactNoticeRow({
  ann,
  brand,
  lang,
}: {
  ann: Announcement;
  brand: string;
  lang: Lang;
}) {
  const cfg = {
    event: { emoji: "🎉", dot: brand },
    warning: { emoji: "⚠️", dot: "#EF4444" },
    info: { emoji: "📢", dot: "#a8a29e" },
  }[ann.type] ?? { emoji: "📢", dot: "#a8a29e" };

  const { title, content } = getAnnouncementText(ann, lang);

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-sm leading-none">{cfg.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="text-[13px] font-bold text-stone-800"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {title}
          </p>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: cfg.dot }}
          />
        </div>
        <p
          className="mt-0.5 text-[11px] leading-relaxed text-stone-400"
          style={{
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {content}
        </p>
      </div>
    </div>
  );
}

function DensePlaceRow({
  place,
  distance,
  brand,
  openLabel,
  closedLabel,
  onSiteLabel,
  lang,
  onDirectionsClick,
}: {
  place: CachedPlace;
  distance: string;
  brand: string;
  openLabel: string;
  closedLabel: string;
  onSiteLabel: string;
  lang: Lang;
  onDirectionsClick?: (placeId: string) => void;
}) {
  const mapLink = getGoogleMapsLink(
    place.latitude,
    place.longitude,
    place.address,
  );
  const canNavigate = !!mapLink;

  const hoursData = getTodaysOpeningHours(place.raw_data);
  const isOpen = hoursData?.isOpenNow ?? null;

  const ownerNote = getOwnerNote(place, lang);

  const innerContent = (
    <>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-sm"
        style={{ backgroundColor: hexToRgba(brand, 0.05) }}
      >
        {EMOJI[place.category] ?? "📍"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-stone-800">
          {place.name}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {place.is_on_site ? (
            <span
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: brand }}
            >
              {onSiteLabel}
            </span>
          ) : distance ? (
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-300">
              {distance}
            </span>
          ) : null}

          {place.rating !== null && place.rating > 0 && (
            <>
              <span className="text-stone-200">·</span>
              <span className="text-[10px] font-black text-amber-500">
                ★ {place.rating.toFixed(1)}
              </span>
            </>
          )}
          {ownerNote && (
            <>
              <span className="text-stone-200">·</span>
              <span
                className="max-w-[80px] truncate text-[10px] font-black uppercase tracking-[0.1em]"
                style={{ color: brand }}
              >
                {ownerNote}
              </span>
            </>
          )}
        </div>
      </div>

      {isOpen !== null && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
            isOpen
              ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60"
              : "bg-stone-50 text-stone-400 ring-1 ring-stone-200/60"
          }`}
        >
          {isOpen ? openLabel : closedLabel}
        </span>
      )}

      {canNavigate && (
        <ChevronRight
          size={13}
          strokeWidth={2}
          className="shrink-0 text-stone-300"
        />
      )}
    </>
  );

  return canNavigate ? (
    <motion.a
      href={mapLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3"
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TAP}
      onClick={() => onDirectionsClick?.(place.id)}
    >
      {innerContent}
    </motion.a>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3">{innerContent}</div>
  );
}

function ContactRow({
  icon,
  label,
  meta,
  brand,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  brand: string;
  href: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3.5 px-4 py-3.5"
      whileTap={{ scale: 0.97 }}
      transition={SPRING_TAP}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-stone-800">{label}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-300">
          {meta}
        </p>
      </div>
      <ChevronRight
        size={14}
        strokeWidth={2}
        className="shrink-0 text-stone-300"
      />
    </motion.a>
  );
}

function EmptyNotices({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[18px] bg-white px-6 py-8 text-center ring-1 ring-stone-200/60">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
        <span className="text-xl">⛺</span>
      </div>
      <p className="text-[13px] font-black tracking-tight text-stone-700">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-[200px] text-[11px] leading-relaxed text-stone-400">
        {subtitle}
      </p>
    </div>
  );
}
