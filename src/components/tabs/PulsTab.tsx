// src/components/tabs/PulsTab.tsx
"use client";

import type { RoadDistanceMap } from "@/lib/routing";
import { getSettingsField } from "@/lib/settings-i18n";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
} from "@/types/database";
import type { Lang, TabId, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  Info,
  MapPin,
  Megaphone,
  Phone,
  Snowflake,
  Thermometer,
  Trash2,
  Wifi,
  Wind,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

/* ── PRESERVED LOGIC & TRANSLATION HELPERS ─────────────────────────────── */
function getAnnouncementText(
  ann: Announcement,
  lang: Lang,
): { title: string; content: string } {
  if (lang === "sv") return { title: ann.title, content: ann.content };
  const tr = ann.translations?.[lang as "en" | "de" | "da"];
  return { title: tr?.title || ann.title, content: tr?.content || ann.content };
}

function getAllAnnouncementText(ann: Announcement): string {
  const parts: string[] = [ann.title, ann.content];
  if (ann.translations) {
    for (const tr of Object.values(ann.translations)) {
      if (tr) {
        if (tr.title) parts.push(tr.title);
        if (tr.content) parts.push(tr.content);
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

function getOwnerNote(place: CachedPlace, lang: Lang): string | null {
  if (!place.owner_note) return null;
  if (lang === "sv") return place.owner_note;
  return (
    place.note_translations?.[lang as "en" | "de" | "da"] || place.owner_note
  );
}

const RAIN_KEYWORDS = [
  "regn",
  "regnig",
  "inomhus",
  "mys",
  "mysig",
  "inne",
  "inneaktivitet",
  "tak",
  "under tak",
  "rain",
  "rainy",
  "indoor",
  "indoors",
  "inside",
  "cozy",
  "shelter",
  "covered",
  "wet weather",
  "regen",
  "drinnen",
  "innen",
  "gemütlich",
  "überdacht",
  "regenwetter",
  "regn",
  "indendørs",
  "inde",
  "hygge",
  "hyggelig",
  "regen",
  "binnen",
  "gezellig",
  "overdekt",
  "regn",
  "innendørs",
  "inne",
  "koselig",
];
const HEAT_KEYWORDS = [
  "bad",
  "bada",
  "strand",
  "glass",
  "sol",
  "solskydd",
  "vatten",
  "simma",
  "sval",
  "svalkande",
  "pool",
  "swim",
  "swimming",
  "beach",
  "ice cream",
  "sun",
  "sunscreen",
  "cool",
  "cooling",
  "water",
  "pool",
  "shade",
  "baden",
  "strand",
  "eis",
  "sonne",
  "sonnenschutz",
  "schwimmen",
  "abkühlung",
  "wasser",
  "bad",
  "bade",
  "strand",
  "is",
  "sol",
  "svømme",
  "pool",
  "zwemmen",
  "strand",
  "ijs",
  "zon",
  "water",
  "zwembad",
  "verkoeling",
  "bad",
  "bade",
  "strand",
  "is",
  "sol",
  "svømme",
  "basseng",
];
const COLD_KEYWORDS = [
  "kallt",
  "varmt",
  "värme",
  "varm",
  "bastu",
  "sauna",
  "inne",
  "inomhus",
  "fika",
  "cold",
  "warm",
  "warmth",
  "heating",
  "sauna",
  "hot chocolate",
  "fireplace",
  "fire",
  "kalt",
  "warm",
  "wärme",
  "sauna",
  "heiss",
  "kamin",
  "feuer",
  "koldt",
  "varm",
  "varme",
  "sauna",
  "ild",
  "pejs",
  "koud",
  "warm",
  "warmte",
  "sauna",
  "vuur",
  "haard",
  "kaldt",
  "varmt",
  "varme",
  "sauna",
  "bål",
  "peis",
];
const WIND_KEYWORDS = [
  "vind",
  "blåsigt",
  "lä",
  "vindskydd",
  "skyddat",
  "wind",
  "windy",
  "sheltered",
  "windbreak",
  "gust",
  "wind",
  "windig",
  "windschutz",
  "geschützt",
  "vind",
  "blæsende",
  "læ",
  "vindskærm",
  "wind",
  "winderig",
  "beschut",
  "windscherm",
  "vind",
  "vindfullt",
  "le",
  "vindskjerm",
];

type WeatherCondition = "rain" | "heat" | "cold" | "wind" | null;

function getActiveWeatherConditions(
  weather: WeatherProp | null | undefined,
): WeatherCondition[] {
  if (!weather) return [];
  const conditions: WeatherCondition[] = [];
  if (weather.isRaining) conditions.push("rain");
  if (weather.temp > 25) conditions.push("heat");
  if (weather.temp < 10) conditions.push("cold");
  if (weather.windSpeed >= 10) conditions.push("wind");
  return conditions;
}

function getWeatherRelevanceScore(
  ann: Announcement,
  activeConditions: WeatherCondition[],
): { score: number; matchedCondition: WeatherCondition } {
  if (activeConditions.length === 0)
    return { score: 0, matchedCondition: null };

  if ((ann as any).weather_category) {
    if (activeConditions.includes((ann as any).weather_category)) {
      return { score: 2, matchedCondition: (ann as any).weather_category };
    }
    return { score: 0, matchedCondition: null };
  }

  const allText = getAllAnnouncementText(ann);
  const keywordMap: Record<string, string[]> = {
    rain: RAIN_KEYWORDS,
    heat: HEAT_KEYWORDS,
    cold: COLD_KEYWORDS,
    wind: WIND_KEYWORDS,
  };

  for (const condition of activeConditions) {
    if (!condition) continue;
    const keywords = keywordMap[condition];
    if (!keywords) continue;
    const hasMatch = keywords.some((kw) =>
      kw.length <= 3
        ? new RegExp(`\\b${kw}\\b`, "i").test(allText)
        : allText.includes(kw),
    );
    if (hasMatch) return { score: 1, matchedCondition: condition };
  }
  return { score: 0, matchedCondition: null };
}

type ScoredAnnouncement = {
  announcement: Announcement;
  weatherScore: number;
  matchedCondition: WeatherCondition;
};

/* ── Physics ─────────────────────────────────────────── */
const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
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

function getGoogleMapsLink(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
): string | null {
  if (lat && lng)
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/* ── UI Translations ─────────────────────────────────── */
type TranslationsShape = {
  digitalReception: string;
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
  rules: string;
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
  closedNow: string;
  openNow: string;
  rainTip: string;
  sunTip: string;
  nearbyPlaces: string;
  happeningNow: string;
  contact: string;
  open: string;
  closed: string;
  onSite: string;
  facilities: string;
  weatherTip: string;
  myStay: string;
  myStaySub: string;
  allInfo: string;
};

const t: Record<Lang, TranslationsShape> = {
  sv: {
    digitalReception: "Digital Reception",
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
    rules: "Regler",
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
    closedNow: "Stängt nu",
    openNow: "Öppet",
    rainTip: "Inomhustips",
    sunTip: "Dagens tips",
    nearbyPlaces: "I närheten",
    happeningNow: "På campingen nu",
    contact: "Behöver du hjälp?",
    open: "Öppet",
    closed: "Stängt",
    onSite: "På området",
    facilities: "Faciliteter",
    weatherTip: "Vädertips",
    myStay: "Sparat",
    myStaySub: "Dina sparade platser",
    allInfo: "Se all info",
  },
  en: {
    digitalReception: "Digital Reception",
    wifi: "Wi-Fi",
    network: "Network",
    password: "Password",
    copy: "Copy",
    copied: "Copied!",
    wifiPortal: "Sign in via browser",
    noWifi: "Ask at reception",
    quickInfo: "Good to know",
    checkout: "Check-out",
    trash: "Trash",
    rules: "Rules",
    emergency: "Emergency",
    notices: "Latest news",
    noNotices: "No notices right now",
    noNoticesSub: "Enjoy the peace!",
    showWay: "Directions",
    callReception: "Call reception",
    callSub: "Happy to help",
    findReception: "Find us",
    findSub: "Directions",
    closedToday: "Closed today",
    closedNow: "Closed now",
    openNow: "Open",
    rainTip: "Indoor tip",
    sunTip: "Today's tip",
    nearbyPlaces: "Nearby",
    happeningNow: "At camp right now",
    contact: "Need help?",
    open: "Open",
    closed: "Closed",
    onSite: "On site",
    facilities: "Facilities",
    weatherTip: "Weather tip",
    myStay: "Saved",
    myStaySub: "Your saved places",
    allInfo: "See all info",
  },
  de: {
    digitalReception: "Digitale Rezeption",
    wifi: "WLAN",
    network: "Netzwerk",
    password: "Passwort",
    copy: "Kopieren",
    copied: "Kopiert!",
    wifiPortal: "Im Browser anmelden",
    noWifi: "An der Rezeption fragen",
    quickInfo: "Gut zu wissen",
    checkout: "Check-out",
    trash: "Müll",
    rules: "Regeln",
    emergency: "Notfall",
    notices: "Neuigkeiten",
    noNotices: "Keine Hinweise aktuell",
    noNoticesSub: "Genießen Sie die Ruhe!",
    showWay: "Route anzeigen",
    callReception: "Rezeption anrufen",
    callSub: "Wir helfen gerne",
    findReception: "So finden Sie uns",
    findSub: "Wegbeschreibung",
    closedToday: "Heute geschlossen",
    closedNow: "Jetzt geschlossen",
    openNow: "Geöffnet",
    rainTip: "Indoor-Tipp",
    sunTip: "Tipp des Tages",
    nearbyPlaces: "In der Nähe",
    happeningNow: "Am Campingplatz",
    contact: "Brauchen Sie Hilfe?",
    open: "Geöffnet",
    closed: "Geschlossen",
    onSite: "Auf dem Platz",
    facilities: "Einrichtungen",
    weatherTip: "Wettertipp",
    myStay: "Gespeichert",
    myStaySub: "Gespeicherte Orte",
    allInfo: "Alle Infos",
  },
  da: {
    digitalReception: "Digital Reception",
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
    rules: "Regler",
    emergency: "Nødsituation",
    notices: "Seneste nyt",
    noNotices: "Ingen opslag lige nu",
    noNoticesSub: "Nyd roen!",
    showWay: "Find vej",
    callReception: "Ring receptionen",
    callSub: "Vi hjælper gerne",
    findReception: "Find os",
    findSub: "Vejbeskrivelse",
    closedToday: "Lukket i dag",
    closedNow: "Lukket nu",
    openNow: "Åben",
    rainTip: "Indendørs tip",
    sunTip: "Dagens tip",
    nearbyPlaces: "I nærheden",
    happeningNow: "På pladsen nu",
    contact: "Brug for hjælp?",
    open: "Åbent",
    closed: "Lukket",
    onSite: "På pladsen",
    facilities: "Faciliteter",
    weatherTip: "Vejrtip",
    myStay: "Gemt",
    myStaySub: "Dine gemte steder",
    allInfo: "Se al info",
  },
  nl: {
    digitalReception: "Digitale Receptie",
    wifi: "Wi-Fi",
    network: "Netwerk",
    password: "Wachtwoord",
    copy: "Kopiëren",
    copied: "Gekopieerd!",
    wifiPortal: "Inloggen via browser",
    noWifi: "Vraag bij de receptie",
    quickInfo: "Goed om te weten",
    checkout: "Uitchecken",
    trash: "Afval",
    rules: "Regels",
    emergency: "Noodgeval",
    notices: "Laatste nieuws",
    noNotices: "Geen mededelingen",
    noNoticesSub: "Geniet van de rust!",
    showWay: "Route tonen",
    callReception: "Bel receptie",
    callSub: "We helpen je graag",
    findReception: "Vind ons",
    findSub: "Routebeschrijving",
    closedToday: "Gesloten",
    closedNow: "Nu gesloten",
    openNow: "Open",
    rainTip: "Binnentip",
    sunTip: "Tip van de dag",
    nearbyPlaces: "In de buurt",
    happeningNow: "Nu op de camping",
    contact: "Hulp nodig?",
    open: "Open",
    closed: "Gesloten",
    onSite: "Op terrein",
    facilities: "Voorzieningen",
    weatherTip: "Weertip",
    myStay: "Opgeslagen",
    myStaySub: "Je opgeslagen plekken",
    allInfo: "Alle info",
  },
  no: {
    digitalReception: "Digital Resepsjon",
    wifi: "Wi-Fi",
    network: "Nettverk",
    password: "Passord",
    copy: "Kopier",
    copied: "Kopiert!",
    wifiPortal: "Logg inn via nettleser",
    noWifi: "Spør i resepsjonen",
    quickInfo: "Greit å vite",
    checkout: "Utsjekk",
    trash: "Søppel",
    rules: "Regler",
    emergency: "Nød",
    notices: "Siste nytt",
    noNotices: "Ingen oppslag akkurat nå",
    noNoticesSub: "Nyt roen!",
    showWay: "Vis vei",
    callReception: "Ring resepsjonen",
    callSub: "Vi hjelper gjerne",
    findReception: "Finn oss",
    findSub: "Veibeskrivelse",
    closedToday: "Stengt i dag",
    closedNow: "Stengt nå",
    openNow: "Åpent",
    rainTip: "Innendørstips",
    sunTip: "Dagens tips",
    nearbyPlaces: "I nærheten",
    happeningNow: "På plassen nå",
    contact: "Trenger hjelp?",
    open: "Åpent",
    closed: "Stengt",
    onSite: "På plassen",
    facilities: "Fasiliteter",
    weatherTip: "Værtips",
    myStay: "Lagret",
    myStaySub: "Lagrede steder",
    allInfo: "All info",
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
  savedIds?: string[];
  removeSaved?: (id: string) => void;
  switchTab: (id: TabId) => void;
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
  savedIds = [],
  removeSaved,
  switchTab,
}: Props) {
  const l = t[lang];
  const brand = campground.primary_color || "#059669";
  const [copied, setCopied] = useState(false);
  const [expandedQuickInfo, setExpandedQuickInfo] = useState<string | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const savedPlaces = useMemo(() => {
    if (!mounted) return [];
    return savedIds
      .map((id) => places.find((p) => p.id === id))
      .filter((p): p is CachedPlace => p != null && !p.is_hidden);
  }, [mounted, savedIds, places]);

  const pinnedPlaces = useMemo(
    () => places.filter((p) => !p.is_hidden && p.is_pinned).slice(0, 8),
    [places],
  );

  const [advisedPlace, setAdvisedPlace] = useState<CachedPlace | null>(null);
  useEffect(() => {
    if (pinnedPlaces.length === 0) {
      setAdvisedPlace(null);
      return;
    }
    const isCold = weather ? weather.temp < 15 : false;
    let pool: CachedPlace[] = [];
    if (weather?.isRaining || isCold) {
      pool = pinnedPlaces.filter(
        (p) =>
          p.is_indoor ||
          ["cafe", "museum", "shopping", "spa", "cinema", "bowling"].includes(
            p.category,
          ),
      );
    } else {
      pool = pinnedPlaces.filter((p) =>
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
    }
    if (pool.length === 0) setAdvisedPlace(null);
    else setAdvisedPlace(pool[new Date().getDate() % pool.length]);
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

  const activeConditions = useMemo(
    () => getActiveWeatherConditions(weather),
    [weather],
  );
  const scoredNotices: ScoredAnnouncement[] = useMemo(() => {
    const scored = announcements.map((ann) => {
      const { score, matchedCondition } = getWeatherRelevanceScore(
        ann,
        activeConditions,
      );
      return { announcement: ann, weatherScore: score, matchedCondition };
    });
    scored.sort((a, b) => {
      const annA = a.announcement,
        annB = b.announcement;
      const warnA = annA.type === "warning" ? 1 : 0,
        warnB = annB.type === "warning" ? 1 : 0;
      if (warnA !== warnB) return warnB - warnA;
      const priA = annA.priority === "high" ? 1 : 0,
        priB = annB.priority === "high" ? 1 : 0;
      if (priA !== priB) return priB - priA;
      if (a.weatherScore !== b.weatherScore)
        return b.weatherScore - a.weatherScore;
      return (
        new Date(annB.created_at).getTime() -
        new Date(annA.created_at).getTime()
      );
    });
    return scored.slice(0, 3);
  }, [announcements, activeConditions]);

  const liveNotices = useMemo(
    () => scoredNotices.map((s) => s.announcement),
    [scoredNotices],
  );
  const weatherPromotionMap = useMemo(() => {
    const map = new Map<
      string,
      { score: number; condition: WeatherCondition }
    >();
    for (const s of scoredNotices) {
      if (s.weatherScore > 0)
        map.set(s.announcement.id, {
          score: s.weatherScore,
          condition: s.matchedCondition,
        });
    }
    return map;
  }, [scoredNotices]);

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
  const hasRules = !!campground.camp_rules;
  const hasEmergency = !!campground.emergency_info;
  const isColdForTip = weather ? weather.temp < 15 : false;

  const expandedContent = expandedQuickInfo
    ? expandedQuickInfo === "checkout"
      ? getSettingsField(campground, "check_out_info", lang)
      : expandedQuickInfo === "trash"
        ? getSettingsField(campground, "trash_rules", lang)
        : expandedQuickInfo === "rules"
          ? getSettingsField(campground, "camp_rules", lang)
          : getSettingsField(campground, "emergency_info", lang)
    : null;

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* 1. ESSENTIALS CARD (Digital Reception) */}
      <motion.section variants={fadeUp}>
        <SectionTitle title={l.digitalReception} icon={Info} />
        <div className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 flex items-start gap-4">
            <div className="bg-[var(--brand-10)] text-[var(--brand)] p-2.5 rounded-xl shrink-0">
              <Wifi size={22} />
            </div>
            <div className="flex-1 min-w-0">
              {hasWifiName ? (
                <>
                  <p className="text-base font-bold text-stone-900 tracking-tight">
                    {campground.wifi_name}
                  </p>
                  {hasWifiPassword ? (
                    <p className="text-sm font-mono text-stone-600 mt-1 bg-stone-100 px-2.5 py-1 rounded w-fit tracking-wider">
                      {campground.wifi_password}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 mt-1">
                      {l.wifiPortal}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-stone-500 pt-1">
                  {l.noWifi}
                </p>
              )}
            </div>
            {hasWifiPassword && (
              <button
                onClick={copyPassword}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-[var(--brand)]" />
                ) : (
                  <Copy size={16} />
                )}
                {copied ? l.copied : l.copy}
              </button>
            )}
          </div>

          {(hasCheckout || hasTrash || hasRules || hasEmergency) && (
            <div className="border-t border-stone-100 bg-stone-50 p-3 grid grid-cols-2 gap-2">
              {hasCheckout && (
                <OperationButton
                  label={l.checkout}
                  icon={Clock}
                  expanded={expandedQuickInfo === "checkout"}
                  onToggle={() =>
                    setExpandedQuickInfo(
                      expandedQuickInfo === "checkout" ? null : "checkout",
                    )
                  }
                />
              )}
              {hasTrash && (
                <OperationButton
                  label={l.trash}
                  icon={Trash2}
                  expanded={expandedQuickInfo === "trash"}
                  onToggle={() =>
                    setExpandedQuickInfo(
                      expandedQuickInfo === "trash" ? null : "trash",
                    )
                  }
                />
              )}
              {hasRules && (
                <OperationButton
                  label={l.rules}
                  icon={FileText}
                  expanded={expandedQuickInfo === "rules"}
                  onToggle={() =>
                    setExpandedQuickInfo(
                      expandedQuickInfo === "rules" ? null : "rules",
                    )
                  }
                />
              )}
              {hasEmergency && (
                <OperationButton
                  label={l.emergency}
                  icon={Phone}
                  urgent
                  expanded={expandedQuickInfo === "emergency"}
                  onToggle={() =>
                    setExpandedQuickInfo(
                      expandedQuickInfo === "emergency" ? null : "emergency",
                    )
                  }
                />
              )}
            </div>
          )}

          <AnimatePresence>
            {expandedQuickInfo && expandedContent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-t border-stone-200 bg-white text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {expandedContent}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* 2. TODAY'S CONTEXT: Announcements & Tip */}
      <motion.div variants={stagger} className="space-y-4">
        {liveNotices.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-2">
                <Megaphone size={16} className="text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-900">
                  {l.notices}
                </h3>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {liveNotices.map((ann) => {
                const promotion = weatherPromotionMap.get(ann.id);
                return (
                  <CompactNoticeRow
                    key={ann.id}
                    ann={ann}
                    lang={lang}
                    condition={promotion ? promotion.condition : null}
                    labels={l as any}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── ADVISED PLACE TIP ──────────────────────────────────────────────
            Only rendered as a link/button when canNavigateTip is true.
            When the place has no coordinates and no address, it renders as
            a plain non-interactive card with no cursor-pointer or onClick.
        ──────────────────────────────────────────────────────────────────── */}
        {advisedPlace && (
          <motion.div variants={fadeUp}>
            {canNavigateTip ? (
              /* Has a Google Maps link → render as a tappable anchor */
              <a
                href={adviceMapLink!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDirectionsClick?.(advisedPlace.id)}
                className="bg-white border border-stone-200/75 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 shrink-0 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center text-2xl">
                    {EMOJI[advisedPlace.category] ?? "📍"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                      {weather?.isRaining || (weather && weather.temp < 15)
                        ? l.rainTip
                        : l.sunTip}
                    </p>
                    <p className="text-base font-bold text-stone-900 truncate">
                      {advisedPlace.name}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="shrink-0 text-stone-300" />
              </a>
            ) : (
              /* No navigable link → plain non-interactive card */
              <div className="bg-white border border-stone-200/75 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center text-2xl">
                  {EMOJI[advisedPlace.category] ?? "📍"}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                    {weather?.isRaining || (weather && weather.temp < 15)
                      ? l.rainTip
                      : l.sunTip}
                  </p>
                  <p className="text-base font-bold text-stone-900 truncate">
                    {advisedPlace.name}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* 3. SAVED PLACES (Horizontal Scroll) */}
      <AnimatePresence mode="popLayout">
        {savedPlaces.length > 0 && (
          <motion.section
            key="my-stay"
            variants={fadeUp}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
          >
            <SectionTitle title={l.myStay} icon={Heart} />
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 scrollbar-hide">
              {savedPlaces.map((place) => (
                <SavedPlaceCard
                  key={place.id}
                  place={place}
                  distance={distanceMap[place.id] ?? ""}
                  labels={l as any}
                  lang={lang}
                  onRemove={() => removeSaved?.(place.id)}
                  onDirectionsClick={onDirectionsClick}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 4. FACILITIES */}
      {internalLocations.filter((loc) => loc.is_active).length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title={l.facilities} icon={MapPin} />
          <div className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-100">
            {internalLocations
              .filter((loc) => loc.is_active)
              .sort((a, b) => a.walking_minutes - b.walking_minutes)
              .map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg bg-stone-50 border border-stone-100">
                      {FACILITY_EMOJI[loc.type] ?? "📍"}
                    </div>
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {loc.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                    🚶 {loc.walking_minutes} min
                  </span>
                </div>
              ))}
          </div>
        </motion.section>
      )}

      {/* 5. NEARBY PLACES */}
      {pinnedPlaces.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title={l.nearbyPlaces} icon={Compass} />
          <div className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-100">
            {pinnedPlaces.map((place) => (
              <DensePlaceRow
                key={place.id}
                place={place}
                distance={distanceMap[place.id] ?? ""}
                labels={l as any}
                lang={lang}
                onDirectionsClick={onDirectionsClick}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* 6. CONTACT */}
      <motion.section variants={fadeUp}>
        <SectionTitle title={l.contact} icon={Phone} />
        <div className="bg-white border border-stone-200/75 rounded-2xl shadow-sm divide-y divide-stone-100">
          <ContactRow
            icon={<Phone size={18} />}
            label={l.callReception}
            meta={l.callSub}
            href={`tel:${campground.phone ?? ""}`}
          />
          <ContactRow
            icon={<MapPin size={18} />}
            label={l.findReception}
            meta={l.findSub}
            href={receptionMapLink}
            external
          />
        </div>
      </motion.section>

      {/* Footer Link to Info Tab */}
      <motion.button
        variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        onClick={() => switchTab("info")}
        className="w-full py-4 flex items-center justify-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors"
      >
        <Info size={16} />
        {l.allInfo}
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS (B2B Styling)
   ═══════════════════════════════════════════════════════ */

function SectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon size={16} className="text-stone-400" />
      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

function OperationButton({
  label,
  icon: Icon,
  expanded,
  onToggle,
  urgent,
}: {
  label: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        expanded
          ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm"
          : urgent
            ? "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
            : "bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          size={16}
          className={
            expanded
              ? "text-white/80"
              : urgent
                ? "text-red-500"
                : "text-stone-400"
          }
        />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {urgent && !expanded && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
          SOS
        </span>
      )}
    </button>
  );
}

function WeatherConditionIcon({
  condition,
  size = 12,
}: {
  condition: WeatherCondition;
  size?: number;
}) {
  switch (condition) {
    case "rain":
      return <CloudRain size={size} strokeWidth={2.5} />;
    case "heat":
      return <Flame size={size} strokeWidth={2.5} />;
    case "cold":
      return <Snowflake size={size} strokeWidth={2.5} />;
    case "wind":
      return <Wind size={size} strokeWidth={2.5} />;
    default:
      return <Thermometer size={size} strokeWidth={2.5} />;
  }
}

function CompactNoticeRow({
  ann,
  lang,
  condition,
  labels,
}: {
  ann: Announcement;
  lang: Lang;
  condition: WeatherCondition;
  labels: TranslationsShape;
}) {
  const isWarning = ann.type === "warning";
  const { title, content } = getAnnouncementText(ann, lang);

  return (
    <div className="p-4 flex gap-3">
      <div
        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isWarning ? "bg-red-500" : "bg-[var(--brand)]"}`}
      />
      <div className="min-w-0 flex-1">
        {condition && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md mb-2 uppercase tracking-wide">
            <WeatherConditionIcon condition={condition} size={10} />{" "}
            {labels.weatherTip}
          </span>
        )}
        <h4
          className={`text-base font-bold mb-1 tracking-tight ${isWarning ? "text-red-700" : "text-stone-900"}`}
        >
          {title}
        </h4>
        <p className="text-sm text-stone-600 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  meta,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  href: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TAP}
    >
      <div className="flex items-center gap-4">
        <div className="text-stone-400">{icon}</div>
        <div>
          <p className="text-sm font-bold text-stone-900">{label}</p>
          <p className="text-xs font-medium text-stone-500">{meta}</p>
        </div>
      </div>
      {external ? (
        <ExternalLink size={18} className="text-stone-300" />
      ) : (
        <ChevronRight size={20} className="text-stone-300" />
      )}
    </motion.a>
  );
}

function SavedPlaceCard({
  place,
  distance,
  labels: l,
  lang,
  onRemove,
  onDirectionsClick,
}: {
  place: CachedPlace;
  distance: string;
  labels: TranslationsShape;
  lang: Lang;
  onRemove: () => void;
  onDirectionsClick?: (id: string) => void;
}) {
  const mapLink = getGoogleMapsLink(
    place.latitude,
    place.longitude,
    place.address,
  );

  let timeStr = "";
  let isOpen = false;
  if (place.raw_data) {
    const periods =
      (place.raw_data as any).currentOpeningHours?.weekdayDescriptions ||
      (place.raw_data as any).regularOpeningHours?.weekdayDescriptions;
    const googleOpenNow =
      (place.raw_data as any).currentOpeningHours?.openNow ??
      (place.raw_data as any).regularOpeningHours?.openNow;
    if (periods) {
      const todayString =
        periods[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
      if (todayString) {
        const colonIndex = todayString.indexOf(":");
        if (colonIndex !== -1) {
          timeStr = todayString.substring(colonIndex + 1).trim();
          isOpen = googleOpenNow ?? false;
          if (/closed|stängt|geschlossen|lukket/i.test(timeStr)) {
            timeStr = l.closedToday;
          }
        }
      }
    }
  }

  return (
    <div className="w-[240px] shrink-0 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm snap-start relative flex flex-col">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 text-stone-300 hover:text-red-500 bg-stone-50 hover:bg-red-50 p-1.5 rounded-full transition-colors z-10"
      >
        <Trash2 size={16} />
      </button>

      <div className="text-4xl mb-3 mt-1 opacity-90">
        {EMOJI[place.category] ?? "📍"}
      </div>
      <h4 className="text-base font-bold text-stone-900 truncate pr-6 mb-2">
        {place.name}
      </h4>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
          {place.is_on_site ? l.onSite : distance}
        </span>
        {timeStr && (
          <>
            <span className="text-stone-300">·</span>
            <span
              className={`text-xs font-bold ${isOpen ? "text-emerald-600" : "text-stone-500"}`}
            >
              {timeStr}
            </span>
          </>
        )}
      </div>

      <div className="mt-auto">
        {mapLink && (
          <a
            href={mapLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => onDirectionsClick?.(place.id)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--brand-10)] hover:bg-[var(--brand-20)] text-[var(--brand)] text-xs font-bold rounded-xl transition-colors"
          >
            <ExternalLink size={16} />
            {l.showWay}
          </a>
        )}
      </div>
    </div>
  );
}

function DensePlaceRow({
  place,
  distance,
  labels: l,
  lang,
  onDirectionsClick,
}: {
  place: CachedPlace;
  distance: string;
  labels: TranslationsShape;
  lang: Lang;
  onDirectionsClick?: (id: string) => void;
}) {
  const mapLink = getGoogleMapsLink(
    place.latitude,
    place.longitude,
    place.address,
  );

  let statusText = l.closedToday;
  let isOpen = false;
  let timeStr = "";

  if (place.custom_hours) {
    statusText = "Info";
    timeStr = place.custom_hours;
  } else if (place.raw_data) {
    const periods =
      (place.raw_data as any).currentOpeningHours?.weekdayDescriptions ||
      (place.raw_data as any).regularOpeningHours?.weekdayDescriptions;
    const googleOpenNow =
      (place.raw_data as any).currentOpeningHours?.openNow ??
      (place.raw_data as any).regularOpeningHours?.openNow;
    if (periods) {
      const todayString =
        periods[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
      if (todayString) {
        const colonIndex = todayString.indexOf(":");
        if (colonIndex !== -1) {
          timeStr = todayString.substring(colonIndex + 1).trim();
          if (/closed|stängt|geschlossen|lukket/i.test(timeStr)) {
            statusText = l.closedToday;
            timeStr = "";
            isOpen = false;
          } else {
            statusText = googleOpenNow ? l.openNow : l.closedNow;
            isOpen = googleOpenNow ?? false;
          }
        }
      }
    }
  }

  const innerContent = (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl bg-stone-50 border border-stone-100">
        {EMOJI[place.category] ?? "📍"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-stone-900 mb-1">
          {place.name}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {place.is_on_site ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] bg-[var(--brand-10)] px-2 py-0.5 rounded">
              {l.onSite}
            </span>
          ) : distance ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/50">
              {distance}
            </span>
          ) : null}

          {timeStr ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-50 text-stone-500 border-stone-200"}`}
            >
              {statusText === l.openNow && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
              {statusText === l.closedNow && (
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
              )}
              {timeStr}
            </span>
          ) : statusText === l.closedToday ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-stone-50 text-stone-500 border-stone-200">
              {l.closedToday}
            </span>
          ) : null}
        </div>
      </div>
      {mapLink && (
        <ChevronRight size={20} className="shrink-0 text-stone-300" />
      )}
    </>
  );

  return mapLink ? (
    <a
      href={mapLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 px-4 py-4 hover:bg-stone-50"
      onClick={() => onDirectionsClick?.(place.id)}
    >
      {innerContent}
    </a>
  ) : (
    <div className="flex items-center gap-4 px-4 py-4">{innerContent}</div>
  );
}
