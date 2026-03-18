// src/components/tabs/HereTab.tsx
// Replaces PulsTab.tsx — ia-spec v2.0 tab_1 "Here"
// Content order: Wi-Fi → Quick Actions → Notices → Facilities → Contact
"use client";

import type { RoadDistanceMap } from "@/lib/routing";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
} from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  CloudRain,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  MapPin,
  Megaphone,
  Phone,
  Snowflake,
  Thermometer,
  Wifi,
  Wind,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { trackInfoClick } from "@/lib/tracking";
import { getOrCreateSessionId } from "@/lib/session";

import { getAnnouncementText, getCampgroundText } from "@/lib/translations";

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

/* ── Weather-relevance keywords (preserved from PulsTab) ─────────────── */
const RAIN_KEYWORDS = ["regn", "regnig", "inomhus", "mys", "mysig", "inne", "inneaktivitet", "tak", "under tak", "rain", "rainy", "indoor", "indoors", "inside", "cozy", "shelter", "covered", "wet weather", "regen", "drinnen", "innen", "gemütlich", "überdacht", "regenwetter", "indendørs", "inde", "hygge", "hyggelig", "binnen", "gezellig", "overdekt", "innendørs", "koselig"];
const HEAT_KEYWORDS = ["bad", "bada", "strand", "glass", "sol", "solskydd", "vatten", "simma", "sval", "svalkande", "pool", "swim", "swimming", "beach", "ice cream", "sun", "sunscreen", "cool", "cooling", "water", "shade", "baden", "eis", "sonne", "sonnenschutz", "schwimmen", "abkühlung", "bade", "is", "svømme", "zwemmen", "ijs", "zon", "zwembad", "verkoeling", "basseng"];
const COLD_KEYWORDS = ["kallt", "varmt", "värme", "varm", "bastu", "sauna", "inne", "inomhus", "fika", "cold", "warm", "warmth", "heating", "hot chocolate", "fireplace", "fire", "kalt", "wärme", "heiss", "kamin", "feuer", "koldt", "varm", "varme", "ild", "pejs", "koud", "warmte", "vuur", "haard", "kaldt", "bål", "peis"];
const WIND_KEYWORDS = ["vind", "blåsigt", "lä", "vindskydd", "skyddat", "wind", "windy", "sheltered", "windbreak", "gust", "windig", "windschutz", "geschützt", "blæsende", "læ", "vindskærm", "winderig", "beschut", "vindfullt", "le", "vindskjerm"];

type WeatherCondition = "rain" | "heat" | "cold" | "wind" | null;

function getActiveWeatherConditions(weather: WeatherProp | null | undefined): WeatherCondition[] {
  if (!weather) return [];
  const conds: WeatherCondition[] = [];
  if (weather.isRaining) conds.push("rain");
  if (weather.temp > 25) conds.push("heat");
  if (weather.temp < 10) conds.push("cold");
  if (weather.windSpeed >= 10) conds.push("wind");
  return conds;
}

function getWeatherRelevanceScore(ann: Announcement, activeConditions: WeatherCondition[]) {
  if (activeConditions.length === 0) return { score: 0, matchedCondition: null as WeatherCondition };
  if ((ann as any).weather_category) {
    if (activeConditions.includes((ann as any).weather_category)) return { score: 2, matchedCondition: (ann as any).weather_category as WeatherCondition };
    return { score: 0, matchedCondition: null as WeatherCondition };
  }
  const allText = getAllAnnouncementText(ann);
  const keywordMap: Record<string, string[]> = { rain: RAIN_KEYWORDS, heat: HEAT_KEYWORDS, cold: COLD_KEYWORDS, wind: WIND_KEYWORDS };
  for (const condition of activeConditions) {
    if (!condition) continue;
    const keywords = keywordMap[condition];
    if (!keywords) continue;
    const hasMatch = keywords.some((kw) => kw.length <= 3 ? new RegExp(`\\b${kw}\\b`, "i").test(allText) : allText.includes(kw));
    if (hasMatch) return { score: 1, matchedCondition: condition };
  }
  return { score: 0, matchedCondition: null as WeatherCondition };
}

/* ── Physics ─────────────────────────────────────────────────────────── */
const SPRING_TAP = { type: "spring" as const, stiffness: 440, damping: 24 };
const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

/* ── Facility emoji ───────────────────────────────────────────────────── */
const FACILITY_EMOJI: Record<string, string> = {
  toilet: "🚻", shower: "🚿", laundry: "👕", kitchen: "🍳",
  playground: "🛝", pool: "🏊", reception: "🏕️", shop: "🛒",
  recycling: "♻️", bbq: "🔥", electricity: "⚡", water: "🚰",
  wifi: "📶", parking: "🅿️", dog_area: "🐕", other: "📍",
};

function getGoogleMapsLink(lat?: number | null, lng?: number | null, address?: string | null): string | null {
  if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/* ── Translations ─────────────────────────────────────────────────────── */
type T = {
  wifi: string; network: string; password: string; copy: string; copied: string;
  wifiPortal: string; noWifi: string; quickInfo: string; checkout: string;
  trash: string; rules: string; emergency: string; notices: string;
  noNotices: string; noNoticesSub: string; callReception: string; callSub: string;
  findReception: string; findSub: string; closedToday: string; closedNow: string;
  openNow: string; contact: string; facilities: string; weatherTip: string;
  openingHours: string;
};

const t: Record<Lang, T> = {
  sv: { wifi: "Wi-Fi", network: "Nätverk", password: "Lösenord", copy: "Kopiera", copied: "Kopierat!", wifiPortal: "Logga in via webbläsaren", noWifi: "Fråga i receptionen", quickInfo: "Bra att veta", checkout: "Utcheckning", trash: "Sopor", rules: "Regler", emergency: "Nödläge", notices: "Senaste nytt", noNotices: "Inga anslag just nu", noNoticesSub: "Njut av lugnet!", callReception: "Ring receptionen", callSub: "Vi hjälper gärna", findReception: "Hitta hit", findSub: "Vägbeskrivning", closedToday: "Stängt idag", closedNow: "Stängt nu", openNow: "Öppet", contact: "Behöver du hjälp?", facilities: "Faciliteter", weatherTip: "Vädertips", openingHours: "Öppettider" },
  en: { wifi: "Wi-Fi", network: "Network", password: "Password", copy: "Copy", copied: "Copied!", wifiPortal: "Sign in via browser", noWifi: "Ask at reception", quickInfo: "Good to know", checkout: "Check-out", trash: "Trash", rules: "Rules", emergency: "Emergency", notices: "Latest news", noNotices: "No notices right now", noNoticesSub: "Enjoy the peace!", callReception: "Call reception", callSub: "Happy to help", findReception: "Find us", findSub: "Directions", closedToday: "Closed today", closedNow: "Closed now", openNow: "Open", contact: "Need help?", facilities: "Facilities", weatherTip: "Weather tip", openingHours: "Opening hours" },
  de: { wifi: "WLAN", network: "Netzwerk", password: "Passwort", copy: "Kopieren", copied: "Kopiert!", wifiPortal: "Im Browser anmelden", noWifi: "An der Rezeption fragen", quickInfo: "Gut zu wissen", checkout: "Check-out", trash: "Müll", rules: "Regeln", emergency: "Notfall", notices: "Neuigkeiten", noNotices: "Keine Hinweise aktuell", noNoticesSub: "Genießen Sie die Ruhe!", callReception: "Rezeption anrufen", callSub: "Wir helfen gerne", findReception: "So finden Sie uns", findSub: "Wegbeschreibung", closedToday: "Heute geschlossen", closedNow: "Jetzt geschlossen", openNow: "Geöffnet", contact: "Brauchen Sie Hilfe?", facilities: "Einrichtungen", weatherTip: "Wettertipp", openingHours: "Öffnungszeiten" },
  da: { wifi: "Wi-Fi", network: "Netværk", password: "Adgangskode", copy: "Kopier", copied: "Kopieret!", wifiPortal: "Log ind via browseren", noWifi: "Spørg i receptionen", quickInfo: "Godt at vide", checkout: "Udtjekning", trash: "Affald", rules: "Regler", emergency: "Nødsituation", notices: "Seneste nyt", noNotices: "Ingen opslag lige nu", noNoticesSub: "Nyd roen!", callReception: "Ring receptionen", callSub: "Vi hjælper gerne", findReception: "Find os", findSub: "Vejbeskrivelse", closedToday: "Lukket i dag", closedNow: "Lukket nu", openNow: "Åben", contact: "Brug for hjælp?", facilities: "Faciliteter", weatherTip: "Vejrtip", openingHours: "Åbningstider" },
  nl: { wifi: "Wi-Fi", network: "Netwerk", password: "Wachtwoord", copy: "Kopiëren", copied: "Gekopieerd!", wifiPortal: "Inloggen via browser", noWifi: "Vraag bij de receptie", quickInfo: "Goed om te weten", checkout: "Uitchecken", trash: "Afval", rules: "Regels", emergency: "Noodgeval", notices: "Laatste nieuws", noNotices: "Geen mededelingen", noNoticesSub: "Geniet van de rust!", callReception: "Bel receptie", callSub: "We helpen je graag", findReception: "Vind ons", findSub: "Routebeschrijving", closedToday: "Gesloten", closedNow: "Nu gesloten", openNow: "Open", contact: "Hulp nodig?", facilities: "Voorzieningen", weatherTip: "Weertip", openingHours: "Openingstijden" },
  no: { wifi: "Wi-Fi", network: "Nettverk", password: "Passord", copy: "Kopier", copied: "Kopiert!", wifiPortal: "Logg inn via nettleser", noWifi: "Spør i resepsjonen", quickInfo: "Greit å vite", checkout: "Utsjekk", trash: "Søppel", rules: "Regler", emergency: "Nød", notices: "Siste nytt", noNotices: "Ingen oppslag akkurat nå", noNoticesSub: "Nyt roen!", callReception: "Ring resepsjonen", callSub: "Vi hjelper gjerne", findReception: "Finn oss", findSub: "Veibeskrivelse", closedToday: "Stengt i dag", closedNow: "Stengt nå", openNow: "Åpent", contact: "Trenger hjelp?", facilities: "Fasiliteter", weatherTip: "Værtips", openingHours: "Åpningstider" },
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
  checkoutText: string;
  trashText: string;
  campRulesText: string;
  emergencyInfo: string;
  receptionHours: string;
}

export default function HereTab({
  campground,
  announcements,
  weather,
  lang,
  distanceMap: _distanceMap,
  internalLocations = [],
  onDirectionsClick,
  checkoutText,
  trashText,
  campRulesText,
  emergencyInfo,
  receptionHours,
}: Props) {
  const l = t[lang];
  const [copied, setCopied] = useState(false);
  const [expandedQuickInfo, setExpandedQuickInfo] = useState<string | null>(null);
  const sessionId = getOrCreateSessionId();

  useEffect(() => {
    console.log('[HereTab] GuestInfo text props:', { checkoutText, trashText, campRulesText, emergencyInfo });
  }, [checkoutText, trashText, campRulesText, emergencyInfo]);

  const hasWifiName = !!campground.wifi_name;
  const hasWifiPassword = !!campground.wifi_password;
  const hasCheckout = !!checkoutText;
  const hasTrash = !!trashText;
  const hasRules = !!campRulesText;

  // Always enforce emergency text fallback
  const safeEmergencyInfo = emergencyInfo || "Ring 112 vid akuta nödsituationer.";

  const receptionMapLink =
    getGoogleMapsLink(campground.latitude, campground.longitude, campground.address) ?? "#";

  const copyPassword = () => {
    if (campground.wifi_password) {
      navigator.clipboard.writeText(campground.wifi_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const expandedContent = expandedQuickInfo
    ? expandedQuickInfo === "checkout"
      ? getCampgroundText(campground, 'check_out_info', lang)
      : expandedQuickInfo === "trash"
        ? getCampgroundText(campground, 'trash_rules', lang)
        : expandedQuickInfo === "rules"
          ? getCampgroundText(campground, 'camp_rules', lang)
          : getCampgroundText(campground, 'emergency_info', lang) || "Ring 112 vid akuta nödsituationer."
    : null;

  // ── Scored notices — filter OUT type="event" (those belong in ExploreTab) ──
  const activeConditions = useMemo(() => getActiveWeatherConditions(weather), [weather]);

  type ScoredAnn = { announcement: Announcement; weatherScore: number; matchedCondition: WeatherCondition };
  const liveNotices: ScoredAnn[] = useMemo(() => {
    const nonEvents = announcements.filter((a) => a.type !== "event");
    const scored = nonEvents.map((ann) => {
      const { score, matchedCondition } = getWeatherRelevanceScore(ann, activeConditions);
      return { announcement: ann, weatherScore: score, matchedCondition };
    });
    scored.sort((a, b) => {
      const warnA = a.announcement.type === "warning" ? 1 : 0;
      const warnB = b.announcement.type === "warning" ? 1 : 0;
      if (warnA !== warnB) return warnB - warnA;
      const priA = a.announcement.priority === "high" ? 1 : 0;
      const priB = b.announcement.priority === "high" ? 1 : 0;
      if (priA !== priB) return priB - priA;
      if (a.weatherScore !== b.weatherScore) return b.weatherScore - a.weatherScore;
      return new Date(b.announcement.created_at).getTime() - new Date(a.announcement.created_at).getTime();
    });
    return scored.slice(0, 3);
  }, [announcements, activeConditions]);

  const weatherPromotionMap = useMemo(() => {
    const map = new Map<string, { score: number; condition: WeatherCondition }>();
    for (const s of liveNotices) {
      if (s.weatherScore > 0) map.set(s.announcement.id, { score: s.weatherScore, condition: s.matchedCondition });
    }
    return map;
  }, [liveNotices]);

  // Active facilities only, sorted by walking time
  const activeFacilities = useMemo(
    () => internalLocations.filter((loc) => loc.is_active).sort((a, b) => a.walking_minutes - b.walking_minutes),
    [internalLocations],
  );

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ── 1. WI-FI (single authoritative source — DF1) ─────────────────── */}
      <motion.section variants={fadeUp}>
        <SectionTitle title={l.wifi} icon={Wifi} />
        <div className="bg-white border border-stone-200 rounded-2xl shadow-md overflow-hidden">
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
                    <code className="mt-1 block font-mono text-sm text-stone-600 bg-stone-100 px-2.5 py-1 rounded w-fit tracking-wider truncate">
                      {campground.wifi_password}
                    </code>
                  ) : (
                    <p className="text-xs text-stone-500 mt-1">{l.wifiPortal}</p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-stone-500 pt-1">{l.noWifi}</p>
              )}
            </div>
            {hasWifiPassword && (
              <button
                onClick={copyPassword}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-[var(--brand)]" /> : <Copy size={16} />}
                {copied ? l.copied : l.copy}
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── 2. QUICK ACTIONS (accordion, UP3 pattern) ────────────────────── */}
      <motion.section variants={fadeUp}>
        <SectionTitle title={l.quickInfo} icon={FileText} />
        <div className="border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden bg-stone-50 p-3">
          {(hasCheckout || hasTrash || hasRules) && (
            <div className="grid grid-cols-2 gap-2">
              {hasCheckout && (
                <QuickActionBtn
                  label={l.checkout}
                  icon={Clock}
                  expanded={expandedQuickInfo === "checkout"}
                  onToggle={() => setExpandedQuickInfo(expandedQuickInfo === "checkout" ? null : "checkout")}
                />
              )}
              {hasTrash && (
                <QuickActionBtn
                  label={l.trash}
                  icon={Wind}
                  expanded={expandedQuickInfo === "trash"}
                  onToggle={() => setExpandedQuickInfo(expandedQuickInfo === "trash" ? null : "trash")}
                />
              )}
              {hasRules && (
                <QuickActionBtn
                  label={l.rules}
                  icon={FileText}
                  expanded={expandedQuickInfo === "rules"}
                  onToggle={() => setExpandedQuickInfo(expandedQuickInfo === "rules" ? null : "rules")}
                  className={(!hasCheckout || !hasTrash) && ((hasCheckout ? 1 : 0) + (hasTrash ? 1 : 0) + 1) === 2 ? "col-span-2" : ""}
                />
              )}
            </div>
          )}

          <>
            {(hasCheckout || hasTrash || hasRules) && (
              <div className="h-px bg-stone-200 my-3" />
            )}
            <div className="grid grid-cols-1">
              <QuickActionBtn
                label={l.emergency}
                icon={AlertTriangle}
                urgent
                expanded={expandedQuickInfo === "emergency"}
                onToggle={() => setExpandedQuickInfo(expandedQuickInfo === "emergency" ? null : "emergency")}
              />
            </div>
          </>
        </div>

        <AnimatePresence>
          {expandedQuickInfo && expandedContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className="mt-1 px-4 py-4 border border-stone-200/75 rounded-2xl bg-white text-sm text-stone-700 leading-relaxed whitespace-pre-line shadow-sm"
                style={
                  expandedQuickInfo === "emergency"
                    ? { borderColor: "var(--danger)", background: "var(--danger-10)", color: "var(--danger)" }
                    : {}
                }
              >
                {expandedQuickInfo === "emergency" ? (
                  <EmergencyText text={expandedContent} />
                ) : (
                  expandedContent
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ── 3. NOTICES (info + warning only — events go to ExploreTab per DF2) */}
      {liveNotices.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="bg-white border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 p-4 border-b border-stone-100 bg-stone-50/50">
            <Megaphone size={16} className="text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-900">{l.notices}</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {liveNotices.map(({ announcement: ann }) => {
              const promotion = weatherPromotionMap.get(ann.id);
              return (
                <CompactNoticeRow
                  key={ann.id}
                  ann={ann}
                  lang={lang}
                  condition={promotion ? promotion.condition : null}
                  weatherTipLabel={l.weatherTip}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── 4. FACILITIES ────────────────────────────────────────────────── */}
      {activeFacilities.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title={l.facilities} icon={MapPin} />
          <div className="bg-stone-50/80 border border-stone-200/75 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-100">
            {activeFacilities.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg bg-stone-50 border border-stone-100">
                    {FACILITY_EMOJI[loc.type] ?? "📍"}
                  </div>
                  <p className="truncate text-sm font-semibold text-stone-900">{loc.name}</p>
                </div>
                <span className="shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                  🚶 {loc.walking_minutes} min
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── 5. CONTACT ───────────────────────────────────────────────────── */}
      <motion.section variants={fadeUp}>
        <SectionTitle title={l.contact} icon={Phone} />
        <div className="bg-stone-50/80 border border-stone-200/75 rounded-2xl shadow-sm divide-y divide-stone-200/75">
          {getCampgroundText(campground, 'reception_hours', lang) && (
            <div className="p-4 flex gap-4">
              <div className="text-stone-400 mt-0.5"><Clock size={18} /></div>
              <div>
                <p className="text-sm font-bold text-stone-900 leading-none mb-1">{l.openingHours}</p>
                <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {getCampgroundText(campground, 'reception_hours', lang)}
                </div>
              </div>
            </div>
          )}
          {campground.phone && (
            <ContactRow
              icon={<Phone size={18} />}
              label={l.callReception}
              meta={l.callSub}
              href={`tel:${campground.phone}`}
              onClick={() => trackInfoClick(campground.id, sessionId, "phone")}
            />
          )}
          {campground.latitude && campground.longitude && (
            <ContactRow
              icon={<MapPin size={18} />}
              label={l.findReception}
              meta={l.findSub}
              href={`https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`}
              external
            />
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function SectionTitle({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon size={16} className="text-stone-400" />
      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function EmergencyText({ text }: { text: string }) {
  // Simple regex to extract common Swedish phone formats (+46... or 07... or 112)
  const phoneMatch = text.match(/(112|\+?\d[\d\s-]{4,14}\d)/);
  if (!phoneMatch) return <>{text}</>;

  const phoneString = phoneMatch[0];
  const parts = text.split(phoneString);

  return (
    <>
      {parts[0]}
      <a
        href={`tel:${phoneString.replace(/\s+/g, '')}`}
        className="inline-flex items-center gap-1.5 font-bold underline decoration-2 underline-offset-4 decoration-red-300 hover:decoration-red-500 py-1"
        style={{ color: "var(--danger)" }}
      >
        <Phone size={14} /> {phoneString}
      </a>
      {parts[1]}
    </>
  );
}

function QuickActionBtn({
  label,
  icon: Icon,
  expanded,
  onToggle,
  urgent,
  className = "",
}: {
  label: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  urgent?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between min-h-[48px] px-3 py-3 rounded-xl border transition-all ${className} ${urgent
        ? "bg-[var(--danger)] text-white border-[var(--danger)] shadow-sm"
        : expanded
          ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm"
          : "bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
        }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={urgent ? "text-white" : expanded ? "text-white/80" : "text-stone-400"} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {urgent && (
        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-white text-[var(--danger)]">
          SOS
        </span>
      )}
    </button>
  );
}

function CompactNoticeRow({
  ann,
  lang,
  condition,
  weatherTipLabel,
}: {
  ann: Announcement;
  lang: Lang;
  condition: WeatherCondition;
  weatherTipLabel: string;
}) {
  const isWarning = ann.type === "warning";
  const title = getAnnouncementText(ann, 'title', lang);
  const content = getAnnouncementText(ann, 'content', lang);

  return (
    <div className={`p-4 flex gap-3 ${isWarning ? "bg-red-50 border-l-4 border-red-500" : ""}`}>
      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isWarning ? "bg-red-500 hidden" : "bg-[var(--brand)]"}`} />
      <div className="min-w-0 flex-1">
        {condition && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md mb-2 uppercase tracking-wide">
            <WeatherIcon condition={condition} size={10} /> {weatherTipLabel}
          </span>
        )}
        <h4 className={`text-base font-bold mb-1 tracking-tight ${isWarning ? "text-red-700" : "text-stone-900"}`}>
          {title}
        </h4>
        <p className="text-sm text-stone-600 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function WeatherIcon({ condition, size = 12 }: { condition: WeatherCondition; size?: number }) {
  switch (condition) {
    case "rain": return <CloudRain size={size} strokeWidth={2.5} />;
    case "heat": return <Flame size={size} strokeWidth={2.5} />;
    case "cold": return <Snowflake size={size} strokeWidth={2.5} />;
    case "wind": return <Wind size={size} strokeWidth={2.5} />;
    default: return <Thermometer size={size} strokeWidth={2.5} />;
  }
}

function ContactRow({
  icon,
  label,
  meta,
  href,
  external,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  href: string;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TAP}
      onClick={onClick}
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
