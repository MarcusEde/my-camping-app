import type { Announcement, PromotedPartner } from "@/types/database";
import type { Lang, TabId } from "@/types/guest";

export const translations = {
  sv: {
    welcome: "Välkommen till",
    concierge_subtitle: "Din digitala guide för aktiviteter, mat och nöje!",
    weather_rain_title: "Det ser ut att bli regn!",
    weather_rain_desc:
      "Låt inte vädret förstöra dagen. Här är de bästa aktiviteterna inomhus.",
    sponsors_title: "Lokala Partners",
    staff_picks: "Personalens Favoriter",
    ai_planner_title: "AI Dagsplanerare",
    ai_planner_subtitle: "Klicka för att se dagens schema",
    indoor_title: "Inomhusaktiviteter",
    indoor_subtitle: "Perfekt för idag",
    outdoor_title: "Utomhusaktiviteter",
    outdoor_subtitle: "Njut av vädret",
    visit_website: "Besök Hemsida",
    call_now: "Ring Nu",
    nav_home: "Hem",
    nav_planner: "Planerare",
    nav_info: "Info",
    sponsor_badge: "Sponsor",
    staff_pick_badge: "Tips",
    owner_note_prefix: "💬",
  },
  en: {
    welcome: "Welcome to",
    concierge_subtitle: "Your personal guide for activities, food, and fun!",
    weather_rain_title: "Looks like rain!",
    weather_rain_desc:
      "Don't let the weather ruin your day. Here are the best indoor activities.",
    sponsors_title: "Featured Partners",
    staff_picks: "Staff Picks",
    ai_planner_title: "AI Day Planner",
    ai_planner_subtitle: "Tap to see today's itinerary",
    indoor_title: "Indoor Activities",
    indoor_subtitle: "Perfect for today",
    outdoor_title: "Outdoor Activities",
    outdoor_subtitle: "Enjoy the weather",
    visit_website: "Visit Website",
    call_now: "Call Now",
    nav_home: "Home",
    nav_planner: "Planner",
    nav_info: "Info",
    sponsor_badge: "Sponsor",
    staff_pick_badge: "Staff Pick",
    owner_note_prefix: "💬",
  },
};
export const navLabels: Record<Lang, Record<TabId, string>> = {
  sv: {
    utforska: "Utforska",
    planerare: "Planerare",
    puls: "Hem",
    aktiviteter: "Aktiviteter",
    info: "Info",
  },
  en: {
    utforska: "Explore",
    planerare: "Planner",
    puls: "Home",
    aktiviteter: "Activities",
    info: "Info",
  },
  de: {
    utforska: "Entdecken",
    planerare: "Planer",
    puls: "Start",
    aktiviteter: "Aktivitäten",
    info: "Info",
  },
  da: {
    utforska: "Udforsk",
    planerare: "Planlægger",
    puls: "Hjem",
    aktiviteter: "Aktiviteter",
    info: "Info",
  },
  nl: {
    utforska: "Ontdekken",
    planerare: "Planner",
    puls: "Home",
    aktiviteter: "Activiteiten",
    info: "Info",
  },
  no: {
    utforska: "Utforsk",
    planerare: "Planlegger",
    puls: "Hjem",
    aktiviteter: "Aktiviteter",
    info: "Info",
  },
};
export const weatherLabels: Record<string, Record<Lang, string>> = {
  clear: {
    sv: "Klart",
    en: "Clear",
    de: "Klar",
    da: "Klart",
    nl: "Helder",
    no: "Klart",
  },
  nearly_clear: {
    sv: "Mestadels klart",
    en: "Nearly clear",
    de: "Fast klar",
    da: "Mest klart",
    nl: "Vrijwel helder",
    no: "Stort sett klart",
  },
  partly_cloudy: {
    sv: "Halvklart",
    en: "Partly cloudy",
    de: "Teilweise bewölkt",
    da: "Delvis skyet",
    nl: "Half bewolkt",
    no: "Delvis skyet",
  },
  cloudy: {
    sv: "Molnigt",
    en: "Cloudy",
    de: "Bewölkt",
    da: "Skyet",
    nl: "Bewolkt",
    no: "Skyet",
  },
  overcast: {
    sv: "Mulet",
    en: "Overcast",
    de: "Bedeckt",
    da: "Overskyet",
    nl: "Betrokken",
    no: "Overskyet",
  },
  fog: {
    sv: "Dimma",
    en: "Fog",
    de: "Nebel",
    da: "Tåge",
    nl: "Mist",
    no: "Tåke",
  },
  rain: {
    sv: "Regn",
    en: "Rain",
    de: "Regen",
    da: "Regn",
    nl: "Regen",
    no: "Regn",
  },
  light_rain: {
    sv: "Lätt regn",
    en: "Light rain",
    de: "Leichter Regen",
    da: "Let regn",
    nl: "Lichte regen",
    no: "Lett regn",
  },
  snow: {
    sv: "Snö",
    en: "Snow",
    de: "Schnee",
    da: "Sne",
    nl: "Sneeuw",
    no: "Snø",
  },
  sleet: {
    sv: "Slask",
    en: "Sleet",
    de: "Schneeregen",
    da: "Slud",
    nl: "Natte sneeuw",
    no: "Sludd",
  },
};
export const weatherConditions: Record<Lang, { rain: string; calm: string }> = {
  sv: { rain: "Regn", calm: "Lugnt" },
  en: { rain: "Rain", calm: "Calm" },
  de: { rain: "Regen", calm: "Ruhig" },
  da: { rain: "Regn", calm: "Roligt" },
  nl: { rain: "Regen", calm: "Rustig" },
  no: { rain: "Regn", calm: "Rolig" },
};
export const feelLabels: Record<
  Lang,
  {
    hot: string;
    warm: string;
    nice: string;
    cool: string;
    chilly: string;
    cold: string;
    freezing: string;
  }
> = {
  sv: {
    hot: "Hett",
    warm: "Varmt",
    nice: "Skönt",
    cool: "Svalt",
    chilly: "Kyligt",
    cold: "Kallt",
    freezing: "Iskallt",
  },
  en: {
    hot: "Hot",
    warm: "Warm",
    nice: "Pleasant",
    cool: "Cool",
    chilly: "Chilly",
    cold: "Cold",
    freezing: "Freezing",
  },
  de: {
    hot: "Heiß",
    warm: "Warm",
    nice: "Angenehm",
    cool: "Frisch",
    chilly: "Kühl",
    cold: "Kalt",
    freezing: "Eisig",
  },
  da: {
    hot: "Hedt",
    warm: "Varmt",
    nice: "Behageligt",
    cool: "Svalt",
    chilly: "Køligt",
    cold: "Koldt",
    freezing: "Iskoldt",
  },
  nl: {
    hot: "Heet",
    warm: "Warm",
    nice: "Aangenaam",
    cool: "Koel",
    chilly: "Fris",
    cold: "Koud",
    freezing: "IJskoud",
  },
  no: {
    hot: "Hett",
    warm: "Varmt",
    nice: "Behagelig",
    cool: "Svalt",
    chilly: "Kjølig",
    cold: "Kaldt",
    freezing: "Iskaldt",
  },
};
export function getWelcomeLabel(lang: Lang, currentHour: number): string {
  const labels: Record<Lang, [string, string, string]> = {
    sv: ["God morgon på", "Välkommen till", "God kväll på"],
    en: ["Good morning at", "Welcome to", "Good evening at"],
    de: ["Guten Morgen auf", "Willkommen auf", "Guten Abend auf"],
    da: ["God morgen på", "Velkommen till", "God aften på"],
    nl: ["Goedemorgen bij", "Welkom bij", "Goedenavond bij"],
    no: ["God morgen på", "Velkommen til", "God kveld på"],
  };

  const [morning, day, evening] = labels[lang];
  if (currentHour < 10) return morning;
  if (currentHour < 17) return day;
  return evening;
}

export function getFeelLabel(lang: Lang, temp: number): string {
  if (temp >= 30) return feelLabels[lang].hot; // 30°+
  if (temp >= 24) return feelLabels[lang].warm; // 24°–29°
  if (temp >= 16) return feelLabels[lang].nice; // 16°–23°
  if (temp >= 9) return feelLabels[lang].cool; // 9°–15°   "Svalt"
  if (temp >= 3) return feelLabels[lang].chilly; // 3°–8°    "Kyligt"
  if (temp >= -5) return feelLabels[lang].cold; // -5°–2°   "Kallt"  ← 1-2°C now here
  return feelLabels[lang].freezing; // below -5° "Iskallt"
}
// src/lib/translations.ts — append at bottom

// ── Feedback widget ───────────────────────────────────────
export const feedbackLabels: Record<
  Lang,
  { ask: string; more: string; send: string; skip: string; thanks: string }
> = {
  sv: {
    ask: "Hur är din vistelse?",
    more: "Berätta mer (valfritt)",
    send: "Skicka",
    skip: "Hoppa över",
    thanks: "Tack för din feedback! 🏕️",
  },
  en: {
    ask: "How's your stay?",
    more: "Tell us more (optional)",
    send: "Submit",
    skip: "Skip",
    thanks: "Thanks for your feedback! 🏕️",
  },
  de: {
    ask: "Wie ist Ihr Aufenthalt?",
    more: "Mehr erzählen (optional)",
    send: "Senden",
    skip: "Überspringen",
    thanks: "Danke für Ihr Feedback! 🏕️",
  },
  da: {
    ask: "Hvordan er dit ophold?",
    more: "Fortæl mere (valgfrit)",
    send: "Send",
    skip: "Spring over",
    thanks: "Tak for din feedback! 🏕️",
  },
  nl: {
    ask: "Hoe is uw verblijf?",
    more: "Vertel meer (optioneel)",
    send: "Verstuur",
    skip: "Overslaan",
    thanks: "Bedankt voor uw feedback! 🏕️",
  },
  no: {
    ask: "Hvordan er oppholdet?",
    more: "Fortell mer (valgfritt)",
    send: "Send",
    skip: "Hopp over",
    thanks: "Takk for tilbakemeldingen! 🏕️",
  },
};
// src/lib/translations.ts — append at bottom

// ── Utforska tab ──────────────────────────────────────────
export interface UtforskaLabels {
  hitaHit: string;
  originalLang: string;
  staffPick: string;
  closedToday: string;
  openNow: string;
  closedNow: string;
  open24: string;
  noPlaces: string;
  noPlacesSub: string;
  onSite: string;
}

export const utforskaLabels: Record<Lang, UtforskaLabels> = {
  sv: {
    hitaHit: "Visa vägen",
    originalLang: "🇸🇪 Originaltext",
    staffPick: "Rekommenderas",
    closedToday: "Stängt idag",
    openNow: "Öppet nu",
    closedNow: "Stängt nu",
    open24: "Dygnet runt",
    noPlaces: "Inga platser ännu",
    noPlacesSub: "Vi jobbar på att lägga till platser i närheten!",
    onSite: "På området",
  },
  en: {
    hitaHit: "Get directions",
    originalLang: "🇸🇪 Original text",
    staffPick: "Staff pick",
    closedToday: "Closed today",
    openNow: "Open now",
    closedNow: "Closed now",
    open24: "Open 24/7",
    noPlaces: "No places yet",
    noPlacesSub: "We're working on adding nearby spots!",
    onSite: "On site",
  },
  de: {
    hitaHit: "Route anzeigen",
    originalLang: "🇸🇪 Originaltext",
    staffPick: "Empfehlung",
    closedToday: "Heute geschlossen",
    openNow: "Jetzt geöffnet",
    closedNow: "Jetzt geschlossen",
    open24: "24/7 geöffnet",
    noPlaces: "Noch keine Orte",
    noPlacesSub: "Wir arbeiten daran, Orte hinzuzufügen!",
    onSite: "Auf dem Platz",
  },
  da: {
    hitaHit: "Find vej",
    originalLang: "🇸🇪 Originaltekst",
    staffPick: "Anbefaling",
    closedToday: "Lukket i dag",
    openNow: "Åben nu",
    closedNow: "Lukket nu",
    open24: "Døgnåbent",
    noPlaces: "Ingen steder endnu",
    noPlacesSub: "Vi arbejder på at tilføje steder!",
    onSite: "På pladsen",
  },
  nl: {
    hitaHit: "Route tonen",
    originalLang: "🇸🇪 Originele tekst",
    staffPick: "Aanbeveling",
    closedToday: "Vandaag gesloten",
    openNow: "Nu open",
    closedNow: "Nu gesloten",
    open24: "24/7 open",
    noPlaces: "Nog geen plekken",
    noPlacesSub: "We werken eraan om plekken toe te voegen!",
    onSite: "Op het terrein",
  },
  no: {
    hitaHit: "Vis veien",
    originalLang: "🇸🇪 Originaltekst",
    staffPick: "Anbefaling",
    closedToday: "Stengt i dag",
    openNow: "Åpent nå",
    closedNow: "Stengt nå",
    open24: "Døgnåpent",
    noPlaces: "Ingen steder ennå",
    noPlacesSub: "Vi jobber med å legge til steder!",
    onSite: "På området",
  },
};
// src/lib/translations.ts — append at bottom

// ── Planner tab ───────────────────────────────────────────

export interface PlannerLabels {
  subtitle: string;
  morning: string;
  lunch: string;
  afternoon: string;
  evening: string;
  rainNote: string;
  directions: string;
  closed: string;
  openNow: string;
  aiNote: string;
  nowLabel: string;
  earlierToday: string;
  onSite: string;
}

export const plannerLabels: Record<Lang, PlannerLabels> = {
  sv: {
    subtitle: "Din dag — baserad på väder, dag & plats",
    morning: "Förmiddag",
    lunch: "Lunch",
    afternoon: "Eftermiddag",
    evening: "Kväll",
    rainNote: "Mysväder ute! Tipsen är anpassade för en skön dag inomhus 🛋️",
    directions: "Visa vägen",
    closed: "Stängt",
    openNow: "Öppet",
    aiNote: "Skapad med AI baserat på plats, väder & dag",
    nowLabel: "Nu",
    earlierToday: "Tidigare idag",
    onSite: "På området",
  },
  en: {
    subtitle: "Your day — based on weather, day & location",
    morning: "Morning",
    lunch: "Lunch",
    afternoon: "Afternoon",
    evening: "Evening",
    rainNote: "Cozy weather outside! Tips adapted for a great indoor day 🛋️",
    directions: "Directions",
    closed: "Closed",
    openNow: "Open",
    aiNote: "Created with AI based on location, weather & day",
    nowLabel: "Now",
    earlierToday: "Earlier today",
    onSite: "On site",
  },
  de: {
    subtitle: "Ihr Tag — basierend auf Wetter, Tag & Standort",
    morning: "Vormittag",
    lunch: "Mittagessen",
    afternoon: "Nachmittag",
    evening: "Abend",
    rainNote: "Gemütliches Wetter! Tipps für einen tollen Tag drinnen 🛋️",
    directions: "Route",
    closed: "Geschlossen",
    openNow: "Geöffnet",
    aiNote: "Mit KI erstellt basierend auf Standort, Wetter & Tag",
    nowLabel: "Jetzt",
    earlierToday: "Früher heute",
    onSite: "Vor Ort",
  },
  da: {
    subtitle: "Din dag — baseret på vejr, dag & placering",
    morning: "Morgen",
    lunch: "Frokost",
    afternoon: "Eftermiddag",
    evening: "Aften",
    rainNote: "Hyggevejr! Tips tilpasset en god dag indendørs 🛋️",
    directions: "Vej",
    closed: "Lukket",
    openNow: "Åben",
    aiNote: "Lavet med AI baseret på placering, vejr & dag",
    nowLabel: "Nu",
    earlierToday: "Tidligere i dag",
    onSite: "På området",
  },
  nl: {
    subtitle: "Jouw dag — gebaseerd op weer, dag & locatie",
    morning: "Ochtend",
    lunch: "Lunch",
    afternoon: "Middag",
    evening: "Avond",
    rainNote:
      "Gezellig weer buiten! Tips aangepast voor een fijne dag binnen 🛋️",
    directions: "Route",
    closed: "Gesloten",
    openNow: "Open",
    aiNote: "Gemaakt met AI op basis van locatie, weer & dag",
    nowLabel: "Nu",
    earlierToday: "Eerder vandaag",
    onSite: "Op het terrein",
  },
  no: {
    subtitle: "Dagen din — basert på vær, dag & sted",
    morning: "Formiddag",
    lunch: "Lunsj",
    afternoon: "Ettermiddag",
    evening: "Kveld",
    rainNote: "Kosevær ute! Tipsene er tilpasset en fin dag innendørs 🛋️",
    directions: "Veibeskrivelse",
    closed: "Stengt",
    openNow: "Åpent",
    aiNote: "Laget med AI basert på sted, vær & dag",
    nowLabel: "Nå",
    earlierToday: "Tidligere i dag",
    onSite: "På området",
  },
};

// ── Day & date helpers ────────────────────────────────────

const dayNames: Record<Lang, string[]> = {
  sv: ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"],
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  de: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  da: ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"],
  nl: [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ],
  no: ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"],
};

const monthNames: Record<Lang, string[]> = {
  sv: [
    "jan",
    "feb",
    "mar",
    "apr",
    "maj",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ],
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  de: [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ],
  da: [
    "jan",
    "feb",
    "mar",
    "apr",
    "maj",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ],
  nl: [
    "jan",
    "feb",
    "mrt",
    "apr",
    "mei",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ],
  no: [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ],
};

export function getDayLabel(lang: Lang): string {
  return dayNames[lang][new Date().getDay()];
}

export function getDateLabel(lang: Lang): string {
  const d = new Date();
  return `${d.getDate()} ${monthNames[lang][d.getMonth()]}`;
}

export const noPlanLabels: Record<Lang, string> = {
  sv: "Ingen plan kunde skapas",
  en: "No plan available",
  de: "Kein Plan verfügbar",
  da: "Ingen plan tilgængelig",
  nl: "Geen plan beschikbaar",
  no: "Ingen plan tilgjengelig",
};
// src/lib/translations.ts — append at bottom

// ── Info tab ──────────────────────────────────────────────

export interface InfoLabels {
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

export const infoLabels: Record<Lang, InfoLabels> = {
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
  nl: {
    wifi: "Wi-Fi",
    network: "Netwerk",
    password: "Wachtwoord",
    copy: "Kopieer",
    copied: "Gekopieerd!",
    noWifi: "Vraag bij de receptie",
    wifiPortal: "Inloggen via de browser",
    contact: "Contact & Receptie",
    callReception: "Bel de receptie",
    emailUs: "E-mail ons",
    visitWebsite: "Website",
    findUs: "Vind ons",
    receptionHours: "Openingstijden receptie",
    practicalInfo: "Praktische info",
    checkout: "Uitchecken",
    trash: "Afvalscheiding",
    emergency: "Noodinformatie",
    rules: "Campingregels",
    defaultRules:
      "• Stilte 23–07\n• Max 10 km/u\n• Huisdieren aangelijnd\n• BBQ op aangewezen plaatsen\n• Niet roken in huisjes",
    originalLang: "🇸🇪 Originele tekst",
    address: "Adres",
    phone: "Telefoon",
  },
  no: {
    wifi: "Wi-Fi",
    network: "Nettverk",
    password: "Passord",
    copy: "Kopier",
    copied: "Kopiert!",
    noWifi: "Spør i resepsjonen",
    wifiPortal: "Logg inn via nettleseren",
    contact: "Kontakt & Resepsjon",
    callReception: "Ring resepsjonen",
    emailUs: "Send e-post",
    visitWebsite: "Nettside",
    findUs: "Finn oss",
    receptionHours: "Åpningstider resepsjon",
    practicalInfo: "Praktisk info",
    checkout: "Utsjekking",
    trash: "Kildesortering",
    emergency: "Nødinformasjon",
    rules: "Campingregler",
    defaultRules:
      "• Ro kl 23–07\n• Maks 10 km/t\n• Kjæledyr i bånd\n• Grilling på anviste plasser\n• Røyking forbudt i hytter",
    originalLang: "🇸🇪 Originaltekst",
    address: "Adresse",
    phone: "Telefon",
  },
};
// src/lib/translations.ts — append at bottom

// ── Aktiviteter tab ───────────────────────────────────────

export interface AktiviteterLabels {
  events: string;
  partners: string;
  noEvents: string;
  noEventsSub: string;
  noPartners: string;
  noPartnersSub: string;
  featured: string;
  book: string;
  call: string;
  moreInfo: string;
  originalLang: string;
}

export const aktiviteterLabels: Record<Lang, AktiviteterLabels> = {
  sv: {
    events: "Evenemang & Händelser",
    partners: "Lokala upplevelser",
    noEvents: "Inga evenemang just nu",
    noEventsSub: "Håll utkik — det händer alltid nya saker!",
    noPartners: "Inga partners just nu",
    noPartnersSub: "Vi jobbar på att hitta upplevelser åt dig!",
    featured: "Utvald",
    book: "Boka",
    call: "Ring",
    moreInfo: "Mer info",
    originalLang: "🇸🇪 Originaltext",
  },
  en: {
    events: "Events & Happenings",
    partners: "Local experiences",
    noEvents: "No events right now",
    noEventsSub: "Stay tuned — new things happen all the time!",
    noPartners: "No partners right now",
    noPartnersSub: "We're working on finding experiences for you!",
    featured: "Featured",
    book: "Book",
    call: "Call",
    moreInfo: "More info",
    originalLang: "🇸🇪 Original text",
  },
  de: {
    events: "Events & Veranstaltungen",
    partners: "Lokale Erlebnisse",
    noEvents: "Keine Events aktuell",
    noEventsSub: "Bleiben Sie dran — es passiert immer etwas Neues!",
    noPartners: "Keine Partner aktuell",
    noPartnersSub: "Wir arbeiten daran, Erlebnisse für Sie zu finden!",
    featured: "Empfohlen",
    book: "Buchen",
    call: "Anrufen",
    moreInfo: "Mehr Info",
    originalLang: "🇸🇪 Originaltext",
  },
  da: {
    events: "Events & Begivenheder",
    partners: "Lokale oplevelser",
    noEvents: "Ingen begivenheder lige nu",
    noEventsSub: "Hold øje — der sker altid noget nyt!",
    noPartners: "Ingen partnere lige nu",
    noPartnersSub: "Vi arbejder på at finde oplevelser til dig!",
    featured: "Anbefalet",
    book: "Book",
    call: "Ring",
    moreInfo: "Mere info",
    originalLang: "🇸🇪 Originaltekst",
  },
  nl: {
    events: "Evenementen & Activiteiten",
    partners: "Lokale ervaringen",
    noEvents: "Geen evenementen op dit moment",
    noEventsSub: "Blijf op de hoogte — er gebeurt altijd iets nieuws!",
    noPartners: "Geen partners op dit moment",
    noPartnersSub: "We werken eraan om ervaringen voor je te vinden!",
    featured: "Aanbevolen",
    book: "Boek",
    call: "Bel",
    moreInfo: "Meer info",
    originalLang: "🇸🇪 Originele tekst",
  },
  no: {
    events: "Arrangementer & Hendelser",
    partners: "Lokale opplevelser",
    noEvents: "Ingen arrangementer akkurat nå",
    noEventsSub: "Følg med — det skjer alltid noe nytt!",
    noPartners: "Ingen partnere akkurat nå",
    noPartnersSub: "Vi jobber med å finne opplevelser for deg!",
    featured: "Anbefalt",
    book: "Bestill",
    call: "Ring",
    moreInfo: "Mer info",
    originalLang: "🇸🇪 Originaltekst",
  },
};

// ── Content translation helpers ───────────────────────────

export function getAnnouncementText(
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

export function getPartnerText(
  partner: PromotedPartner,
  lang: Lang,
): { name: string; description: string | null } {
  if (lang === "sv")
    return {
      name: partner.business_name,
      description: partner.description ?? null,
    };
  const tr = partner.translations?.[lang as "en" | "de" | "da"];
  return {
    name: tr?.business_name || partner.business_name,
    description: tr?.description || partner.description || null,
  };
}

// ── Date locale mapping ───────────────────────────────────

export const dateLocales: Record<Lang, string> = {
  sv: "sv-SE",
  en: "en-GB",
  de: "de-DE",
  da: "da-DK",
  nl: "nl-NL",
  no: "nb-NO",
};
// src/lib/translations.ts — append at bottom

// ── AI Itinerary widget ───────────────────────────────────

export interface AiItineraryLabels {
  title: string;
  subtitle: (campName: string) => string;
  button: string;
}

export const aiItineraryLabels: Record<Lang, AiItineraryLabels> = {
  sv: {
    title: "AI Reseplanerare",
    subtitle: (name) =>
      `Låt AI skapa en personlig dagsplan baserat på vädret i ${name}.`,
    button: "Skapa min dagsplan",
  },
  en: {
    title: "AI Trip Planner",
    subtitle: (name) =>
      `Let AI create a personal day plan based on the weather at ${name}.`,
    button: "Create my day plan",
  },
  de: {
    title: "KI-Reiseplaner",
    subtitle: (name) =>
      `Lassen Sie KI einen persönlichen Tagesplan basierend auf dem Wetter in ${name} erstellen.`,
    button: "Meinen Tagesplan erstellen",
  },
  da: {
    title: "AI Rejseplanlægger",
    subtitle: (name) =>
      `Lad AI lave en personlig dagsplan baseret på vejret i ${name}.`,
    button: "Lav min dagsplan",
  },
  nl: {
    title: "AI Reisplanner",
    subtitle: (name) =>
      `Laat AI een persoonlijk dagplan maken op basis van het weer bij ${name}.`,
    button: "Maak mijn dagplan",
  },
  no: {
    title: "AI Reiseplanlegger",
    subtitle: (name) =>
      `La AI lage en personlig dagsplan basert på været i ${name}.`,
    button: "Lag min dagsplan",
  },
};
// src/lib/translations.ts — append at bottom

// ── Status gate page ──────────────────────────────────────

export type GateStatus = "inactive" | "cancelled" | "trial_expired";

export interface StatusGateConfig {
  emoji: string;
  bgColor: string;
  title: Record<Lang, string>;
  message: Record<Lang, string>;
}

export const statusGateConfig: Record<GateStatus, StatusGateConfig> = {
  inactive: {
    emoji: "⏸️",
    bgColor: "#78716c",
    title: {
      sv: "Tillfälligt otillgänglig",
      en: "Temporarily Unavailable",
      de: "Vorübergehend nicht verfügbar",
      da: "Midlertidigt utilgængelig",
      nl: "Tijdelijk niet beschikbaar",
      no: "Midlertidig utilgjengelig",
    },
    message: {
      sv: "Denna camping är just nu inte aktiv i Camp Concierge. Kontakta campingen direkt för information.",
      en: "This campground is currently not active on Camp Concierge. Please contact the campground directly for information.",
      de: "Dieser Campingplatz ist derzeit nicht auf Camp Concierge aktiv. Bitte kontaktieren Sie den Campingplatz direkt.",
      da: "Denne campingplads er i øjeblikket ikke aktiv på Camp Concierge. Kontakt campingpladsen direkte for information.",
      nl: "Deze camping is momenteel niet actief op Camp Concierge. Neem rechtstreeks contact op met de camping.",
      no: "Denne campingplassen er for øyeblikket ikke aktiv på Camp Concierge. Kontakt campingplassen direkte.",
    },
  },
  cancelled: {
    emoji: "🚫",
    bgColor: "#dc2626",
    title: {
      sv: "Ej längre tillgänglig",
      en: "No Longer Available",
      de: "Nicht mehr verfügbar",
      da: "Ikke længere tilgængelig",
      nl: "Niet langer beschikbaar",
      no: "Ikke lenger tilgjengelig",
    },
    message: {
      sv: "Denna camping finns inte längre på Camp Concierge.",
      en: "This campground is no longer available on Camp Concierge.",
      de: "Dieser Campingplatz ist nicht mehr auf Camp Concierge verfügbar.",
      da: "Denne campingplads er ikke længere tilgængelig på Camp Concierge.",
      nl: "Deze camping is niet langer beschikbaar op Camp Concierge.",
      no: "Denne campingplassen er ikke lenger tilgjengelig på Camp Concierge.",
    },
  },
  trial_expired: {
    emoji: "⏰",
    bgColor: "#d97706",
    title: {
      sv: "Provperioden har löpt ut",
      en: "Trial Period Expired",
      de: "Testzeitraum abgelaufen",
      da: "Prøveperioden er udløbet",
      nl: "Proefperiode verlopen",
      no: "Prøveperioden er utløpt",
    },
    message: {
      sv: "Denna campings provperiod i Camp Concierge har löpt ut. Kontakta campingen direkt för information.",
      en: "This campground's trial period on Camp Concierge has expired. Please contact the campground directly for information.",
      de: "Die Testphase dieses Campingplatzes auf Camp Concierge ist abgelaufen. Bitte kontaktieren Sie den Campingplatz direkt.",
      da: "Denne campingplads' prøveperiode på Camp Concierge er udløbet. Kontakt campingpladsen direkte for information.",
      nl: "De proefperiode van deze camping op Camp Concierge is verlopen. Neem contact op met de camping.",
      no: "Prøveperioden for denne campingplassen på Camp Concierge er utløpt. Kontakt campingplassen direkte.",
    },
  },
};

export const statusGateCTALabels: Record<
  Lang,
  { callCampground: string; visitWebsite: string }
> = {
  sv: { callCampground: "Ring campingen", visitWebsite: "Besök webbplats" },
  en: { callCampground: "Call campground", visitWebsite: "Visit website" },
  de: {
    callCampground: "Campingplatz anrufen",
    visitWebsite: "Website besuchen",
  },
  da: {
    callCampground: "Ring campingpladsen",
    visitWebsite: "Besøg hjemmeside",
  },
  nl: { callCampground: "Bel de camping", visitWebsite: "Bezoek website" },
  no: {
    callCampground: "Ring campingplassen",
    visitWebsite: "Besøk nettside",
  },
};
