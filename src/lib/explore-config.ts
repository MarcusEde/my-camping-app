// src/lib/explore-config.ts

import type { CachedPlace } from "@/types/database";
import type { Lang } from "@/types/guest";

export interface RowDef {
  id: string;
  emoji: string;
  title: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  filter: (p: CachedPlace) => boolean;
}

export const ROW_DEFS: readonly RowDef[] = [
  {
    id: "bad-fika",
    emoji: "🍦",
    title: {
      sv: "Bad & Fika",
      en: "Swim & Cafe",
      de: "Baden & Café",
      da: "Bad & Café",
      nl: "Zwemmen & Café",
      no: "Bad & Kafé",
    },
    subtitle: {
      sv: "Stränder, glass & caféer",
      en: "Beaches, ice cream & cafes",
      de: "Strände, Eis & Cafés",
      da: "Strande, is & caféer",
      nl: "Stranden, ijs & cafés",
      no: "Strender, is & kaféer",
    },
    filter: (p) => ["beach", "cafe", "swimming", "spa"].includes(p.category),
  },
  {
    id: "mat",
    emoji: "🍽️",
    title: {
      sv: "Mat & Dryck",
      en: "Food & Drink",
      de: "Essen & Trinken",
      da: "Mad & Drikke",
      nl: "Eten & Drinken",
      no: "Mat & Drikke",
    },
    subtitle: {
      sv: "Restauranger i närområdet",
      en: "Nearby restaurants",
      de: "Restaurants in der Nähe",
      da: "Restauranter i nærheden",
      nl: "Restaurants in de buurt",
      no: "Restauranter i nærheten",
    },
    filter: (p) => p.category === "restaurant",
  },
  {
    id: "aktiviteter",
    emoji: "🎯",
    title: {
      sv: "Aktiviteter & Nöje",
      en: "Activities & Fun",
      de: "Aktivitäten & Spaß",
      da: "Aktiviteter & Sjov",
      nl: "Activiteiten & Plezier",
      no: "Aktiviteter & Moro",
    },
    subtitle: {
      sv: "Sport, lek & äventyr",
      en: "Sports, play & adventure",
      de: "Sport, Spiel & Abenteuer",
      da: "Sport, leg & eventyr",
      nl: "Sport, spel & avontuur",
      no: "Sport, lek & eventyr",
    },
    filter: (p) =>
      [
        "bowling",
        "cinema",
        "activity",
        "playground",
        "sports",
        "attraction",
      ].includes(p.category),
  },
  {
    id: "upplevelser",
    emoji: "🧭",
    title: {
      sv: "Natur & Kultur",
      en: "Nature & Culture",
      de: "Natur & Kultur",
      da: "Natur & Kultur",
      nl: "Natuur & Cultuur",
      no: "Natur & Kultur",
    },
    subtitle: {
      sv: "Parker, museer & utflykter",
      en: "Parks, museums & excursions",
      de: "Parks, Museen & Ausflüge",
      da: "Parker, museer & udflugter",
      nl: "Parken, musea & uitstapjes",
      no: "Parker, museer & utflukter",
    },
    filter: (p) => ["park", "museum", "other"].includes(p.category),
  },
  {
    id: "vardagsbehov",
    emoji: "🛒",
    title: {
      sv: "Vardagsbehov",
      en: "Essentials",
      de: "Bedarf",
      da: "Hverdagsbehov",
      nl: "Dagelijkse behoeften",
      no: "Daglige behov",
    },
    subtitle: {
      sv: "Mataffärer & service",
      en: "Groceries & services",
      de: "Lebensmittel & Service",
      da: "Supermarkeder & service",
      nl: "Supermarkten & service",
      no: "Dagligvare & service",
    },
    filter: (p) => p.category === "shopping",
  },
];
