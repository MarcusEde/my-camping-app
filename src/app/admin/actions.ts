"use server";

/**
 * admin/actions.ts
 * ─────────────────────────────────────────────────────────
 * Version 11.1
 *
 * Changes from v11.0:
 *  • Switched from manual password creation to inviteUserByEmail
 */

import { requireSuperAdmin } from "@/lib/auth-guard";
import {
  fetchPlacesByText,
  fetchPlacesNearby,
  GooglePlaceResult,
} from "@/lib/google-places";
import { getOSRMTableMetrics } from "@/lib/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlaceCategory } from "@/types/database";
import { revalidatePath } from "next/cache";

/* ═══════════════════════════════════════════════════════════
   1. NOISE & QUALITY FILTERS
   ═══════════════════════════════════════════════════════════ */

const NOISE_KEYWORDS = [
  "AtmosFear",
  "Balder",
  "Helix",
  "Loke",
  "Flume Ride",
  "Flume-Ride",
  "Uppswinget",
  "Lisebergbanan",
  "Hissningen",
  "Spelhuset",
  "Slänggungan",
  "Flygis",
  "Hoppalång",
  "Kaffekoppen",
  "Mechanica",
  "AeroSpin",
  "Hanghai",
  "Turbo",
  "Rabalder",
  "Kaninlandet",
  "Stampbanan",
  "Drakbåtarna",
  "Barnens paradis",
  "Plikta",
  "Azaleadalen",
  "Barnens Miljöark",
  "Fästningens rum",
  "Parkering",
  "P-hus",
  "P-plats",
  "Laddstation",
  "Återvinning",
  "Busshållplats",
  "Hållplats",
  "Tågstation",
  "Turbeskrivning",
  "TEST",
  "PinnadEgen",
];

const NOISE_PATTERNS = [/^lekplats\s+\d/i, /^p[\s-]?(plats|hus)\b/i];

const SWEDISH_TOWN_NAMES = new Set([
  "ullared",
  "fjärås",
  "åsa",
  "frillesås",
  "kungsbacka",
  "varberg",
  "göteborg",
  "mölndal",
  "onsala",
  "vallda",
  "särö",
  "lindome",
  "mölnlycke",
  "veddige",
  "tvååker",
  "väröbacka",
  "hanhals",
  "ölmanäs",
  "torpa",
  "idala",
  "grimeton",
  "hunnestad",
]);

function isTownNameOnly(name: string): boolean {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-zåäö\s]/g, "")
    .trim();
  return SWEDISH_TOWN_NAMES.has(cleaned);
}

function isBusinessNoise(name: string): boolean {
  const l = name.toLowerCase();
  const INDUSTRY = [
    "teknik",
    "process",
    "konsult",
    "industri",
    "montage",
    "installation",
    "bygg",
    "service",
    "logistik",
    "transport",
    "catering",
    "konferens",
    "bemanning",
    "redovisning",
    "poolteknik",
    "ventilation",
    "el-",
    "rör",
  ];
  const LEGAL = ["ab", "hb", "kb", "ek. för.", "ekonomisk förening"];
  const hasIndustry = INDUSTRY.some((w) => l.includes(w));
  const hasLegal = LEGAL.some((w) => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(l);
  });
  if (hasIndustry && hasLegal) return true;
  if (l.includes("huvudkontor") || l.includes("head office")) return true;
  if (l.match(/\b(grossist|import|export|lager)\b/) && hasLegal) return true;
  return false;
}

function isCompetingCampground(name: string): boolean {
  const l = name.toLowerCase();
  return (
    (l.includes("camping") ||
      l.includes("campingplats") ||
      l.includes("campsite")) &&
    !l.includes("butik") &&
    !l.includes("shop") &&
    !l.includes("café")
  );
}

function isGenericName(name: string): boolean {
  const GENERIC = [
    "äventyrsgolf",
    "minigolf",
    "parkering",
    "lekplats",
    "badplats",
    "rastplats",
    "utsiktsplats",
  ];
  return GENERIC.includes(name.toLowerCase().trim());
}

function isLowQuality(place: GooglePlaceResult): boolean {
  if (place.name.length < 3) return true;

  if (place.address) {
    if (/^[A-Z0-9]{4}\+[A-Z0-9]{2,}/.test(place.address)) return true;
    if (/^\d{3}\s?\d{2}\s+[^,]+(?:,\s*Sverige)?$/.test(place.address.trim())) {
      const isNature = ["park", "beach"].includes(place.category);
      if (!isNature) return true;
    }
  }

  if (isTownNameOnly(place.name)) return true;

  const COMMERCIAL = [
    "shopping",
    "restaurant",
    "cafe",
    "cinema",
    "bowling",
    "swimming",
    "spa",
  ];
  if (COMMERCIAL.includes(place.category)) {
    const hasHours = !!(
      place.raw_data?.currentOpeningHours || place.raw_data?.regularOpeningHours
    );
    if (!place.rating && !hasHours) return true;
  }

  return false;
}

function isNoise(name: string): boolean {
  const lower = name.toLowerCase();
  if (NOISE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())))
    return true;
  if (NOISE_PATTERNS.some((rx) => rx.test(name))) return true;
  if (isBusinessNoise(name)) return true;
  if (isCompetingCampground(name)) return true;
  if (isGenericName(name)) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════
   2. NEAR-DUPLICATE DETECTION
   ═══════════════════════════════════════════════════════════ */

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNameRoot(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(naturreservat|naturområde|badplats|havsbad|strand|beach|bad|brygga|camping|bio|biograf|museum|slott|fästning|gård|trädgård|kyrka|nature reserve|bathing|swimming)\b/g,
      "",
    )
    .replace(/[^a-zåäö0-9]/g, "")
    .trim();
}

function deduplicateNearby(places: GooglePlaceResult[]): GooglePlaceResult[] {
  const kept: GooglePlaceResult[] = [];

  for (const place of places) {
    const root = getNameRoot(place.name);

    const isDupe = kept.some((existing) => {
      if (existing.category !== place.category) return false;
      const existingRoot = getNameRoot(existing.name);
      if (!root || !existingRoot || root.length < 3 || existingRoot.length < 3)
        return false;
      const similar =
        root === existingRoot ||
        root.includes(existingRoot) ||
        existingRoot.includes(root);
      if (!similar) return false;
      return (
        haversineKm(
          existing.latitude,
          existing.longitude,
          place.latitude,
          place.longitude,
        ) < 1.5
      );
    });

    if (!isDupe) kept.push(place);
  }

  return kept;
}

/* ═══════════════════════════════════════════════════════════
   3. PER-CATEGORY LIMITS
   ═══════════════════════════════════════════════════════════ */

const MAX_ROAD_KM: Record<PlaceCategory, number> = {
  shopping: 25,
  restaurant: 20,
  cafe: 20,
  beach: 30,
  park: 45,
  museum: 50,
  cinema: 25,
  spa: 35,
  bowling: 25,
  swimming: 25,
  activity: 30, // ← added
  playground: 15, // ← added
  sports: 25, // ← added
  attraction: 50,
  other: 50,
};

const MAX_PER_CATEGORY: Record<PlaceCategory, number> = {
  park: 15,
  beach: 10,
  shopping: 12,
  restaurant: 10,
  cafe: 8,
  museum: 8,
  other: 10,
  cinema: 3,
  spa: 3,
  bowling: 3,
  swimming: 4,
  activity: 8, // ← added
  playground: 6, // ← added
  sports: 6, // ← added
  attraction: 6,
};

/* ═══════════════════════════════════════════════════════════
   4. DISCOVERY STRATEGY
   ═══════════════════════════════════════════════════════════ */

type SearchTask =
  | {
      mode: "nearby";
      types: string[];
      category: PlaceCategory;
      radius: number;
      rankBy: "DISTANCE" | "POPULARITY";
      maxResults: number;
    }
  | {
      mode: "text";
      query: string;
      category: PlaceCategory;
      radius: number;
      rankBy: "DISTANCE" | "RELEVANCE";
      maxResults: number;
    };

const DISCOVERY_STRATEGY: SearchTask[] = [
  {
    mode: "nearby",
    types: ["grocery_store", "supermarket"],
    category: "shopping",
    radius: 15_000,
    rankBy: "DISTANCE",
    maxResults: 8,
  },
  {
    mode: "nearby",
    types: ["pharmacy"],
    category: "shopping",
    radius: 15_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "nearby",
    types: ["liquor_store"],
    category: "shopping",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 2,
  },
  {
    mode: "nearby",
    types: ["restaurant"],
    category: "restaurant",
    radius: 15_000,
    rankBy: "DISTANCE",
    maxResults: 12,
  },
  {
    mode: "nearby",
    types: ["cafe", "bakery", "ice_cream_shop"],
    category: "cafe",
    radius: 15_000,
    rankBy: "DISTANCE",
    maxResults: 10,
  },
  {
    mode: "nearby",
    types: ["park"],
    category: "park",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 8,
  },
  {
    mode: "nearby",
    types: ["hiking_area", "national_park"],
    category: "park",
    radius: 35_000,
    rankBy: "DISTANCE",
    maxResults: 10,
  },
  {
    mode: "nearby",
    types: ["museum", "art_gallery"],
    category: "museum",
    radius: 40_000,
    rankBy: "POPULARITY",
    maxResults: 8,
  },
  {
    mode: "nearby",
    types: ["amusement_park", "zoo", "aquarium"],
    category: "other",
    radius: 50_000,
    rankBy: "POPULARITY",
    maxResults: 5,
  },
  {
    mode: "nearby",
    types: ["movie_theater"],
    category: "cinema",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "nearby",
    types: ["bowling_alley"],
    category: "bowling",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "nearby",
    types: ["swimming_pool"],
    category: "swimming",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 6,
  },
  {
    mode: "nearby",
    types: ["spa"],
    category: "spa",
    radius: 30_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "nearby",
    types: ["shopping_mall"],
    category: "shopping",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "text",
    query: "badplats havsbad sjöbad sandstrand klippbad",
    category: "beach",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 12,
  },
  {
    mode: "text",
    query: "gårdsbutik gårdscafé lokalproducerat",
    category: "shopping",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 8,
  },
  {
    mode: "text",
    query: "naturreservat strövområde friluftsområde naturområde",
    category: "park",
    radius: 40_000,
    rankBy: "DISTANCE",
    maxResults: 12,
  },
  {
    mode: "text",
    query: "vandringsled vandring hiking trail",
    category: "park",
    radius: 30_000,
    rankBy: "DISTANCE",
    maxResults: 8,
  },
  {
    mode: "text",
    query: "utsiktsplats utsiktstorn utsikt",
    category: "park",
    radius: 30_000,
    rankBy: "DISTANCE",
    maxResults: 6,
  },
  {
    mode: "text",
    query: "vindskydd raststuga grillplats eldplats",
    category: "park",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 6,
  },
  {
    mode: "text",
    query: "botanisk trädgård slottsträdgård",
    category: "park",
    radius: 35_000,
    rankBy: "RELEVANCE",
    maxResults: 4,
  },
  {
    mode: "text",
    query: "kajakuthyrning kanot paddling SUP surfing",
    category: "other",
    radius: 25_000,
    rankBy: "DISTANCE",
    maxResults: 4,
  },
  {
    mode: "text",
    query: "cykeluthyrning hyrcykel cykelled",
    category: "other",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 3,
  },
  {
    mode: "text",
    query: "minigolf äventyrsgolf bangolf",
    category: "other",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 4,
  },
  {
    mode: "text",
    query: "ridning ridskola hästgård islandshästar",
    category: "other",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 4,
  },
  {
    mode: "text",
    query: "fiske sportfiske fiskesjö put and take",
    category: "other",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 4,
  },
  {
    mode: "text",
    query: "slott herrgård fästning",
    category: "museum",
    radius: 35_000,
    rankBy: "RELEVANCE",
    maxResults: 6,
  },
  {
    mode: "text",
    query: "kustpromenad kustled strandpromenad",
    category: "park",
    radius: 20_000,
    rankBy: "DISTANCE",
    maxResults: 4,
  },
];

/* ═══════════════════════════════════════════════════════════
   5. ADMIN ACTIONS
   ═══════════════════════════════════════════════════════════ */

export async function adminCreateOwnerAndCampground(params: {
  email: string;
  campName: string;
  slug: string;
  latitude: number;
  longitude: number;
  primaryColor: string;
  subscriptionStatus: "trial" | "active";
}) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  // 1. Send invite instead of manually creating password
  const { data: authData, error: authError } =
    await adminClient.auth.admin.inviteUserByEmail(params.email, {
      data: { role: "owner" }, // Stores role in user_metadata
    });

  if (authError || !authData.user)
    throw new Error(authError?.message || "User invitation failed");

  // 2. Create the Campground row
  const { error: dbError } = await adminClient.from("campgrounds").insert({
    owner_id: authData.user.id,
    name: params.campName,
    slug: params.slug,
    latitude: params.latitude,
    longitude: params.longitude,
    primary_color: params.primaryColor,
    subscription_status: params.subscriptionStatus,
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 3. Rollback User if Campground insert fails
  if (dbError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    throw new Error(dbError.message);
  }

  revalidatePath("/admin");
  return {
    success: true,
    ownerEmail: authData.user.email,
    campName: params.campName,
    slug: params.slug,
  };
}

export async function adminSyncCampground(campgroundId: string) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { data: camp, error: campError } = await adminClient
    .from("campgrounds")
    .select("id, name, latitude, longitude")
    .eq("id", campgroundId)
    .single();
  if (campError || !camp) throw new Error("Camping hittades inte.");

  const { data: existing } = await adminClient
    .from("cached_places")
    .select("google_place_id")
    .eq("campground_id", campgroundId);
  const existingSet = new Set(existing?.map((e) => e.google_place_id) || []);

  const searchPromises = DISCOVERY_STRATEGY.map((task) => {
    if (task.mode === "nearby") {
      return fetchPlacesNearby(
        camp.latitude,
        camp.longitude,
        task.types,
        task.category,
        task.radius,
        task.rankBy,
        task.maxResults,
      );
    } else {
      return fetchPlacesByText(
        camp.latitude,
        camp.longitude,
        task.query,
        task.category,
        task.radius,
        task.rankBy,
        task.maxResults,
      );
    }
  });

  const settled = await Promise.allSettled(searchPromises);
  let apiErrors = 0;
  const allResults: GooglePlaceResult[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      apiErrors++;
      console.error("[Discovery] Task failed:", result.reason);
    }
  }

  const seenIds = new Set<string>();
  const uniquePlaces = allResults.filter((p) => {
    if (!p.google_place_id || seenIds.has(p.google_place_id)) return false;
    if (isNoise(p.name)) return false;
    if (isLowQuality(p)) return false;
    seenIds.add(p.google_place_id);
    return true;
  });

  const deduped = deduplicateNearby(uniquePlaces);

  const metrics = await getOSRMTableMetrics(
    { lat: camp.latitude, lon: camp.longitude },
    deduped.map((p) => ({ lat: p.latitude, lon: p.longitude })),
  );

  const indexed = deduped.map((p, i) => ({ place: p, metric: metrics[i] }));
  indexed.sort(
    (a, b) => (a.metric.distance_km ?? 999) - (b.metric.distance_km ?? 999),
  );

  const catCounters: Partial<Record<PlaceCategory, number>> = {};
  const kept: typeof indexed = [];

  for (const item of indexed) {
    const cat = item.place.category;
    const km = item.metric.distance_km;
    if (km !== null && km > (MAX_ROAD_KM[cat] ?? 50)) continue;
    const count = catCounters[cat] ?? 0;
    if (count >= (MAX_PER_CATEGORY[cat] ?? 10)) continue;
    catCounters[cat] = count + 1;
    kept.push(item);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const { place: p, metric: m } of kept) {
    if (existingSet.has(p.google_place_id)) {
      updatedCount++;
    } else {
      addedCount++;
    }

    await adminClient.from("cached_places").upsert(
      {
        campground_id: campgroundId,
        google_place_id: p.google_place_id,
        name: p.name,
        address: p.address,
        category: p.category,
        rating: p.rating,
        is_indoor: p.is_indoor,
        latitude: p.latitude,
        longitude: p.longitude,
        distance_km: m.distance_km,
        travel_time_mins: m.duration_mins,
        raw_data: p.raw_data,
        fetched_at: new Date().toISOString(),
        is_hidden: false,
      } as any,
      { onConflict: "campground_id, google_place_id" },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/camp/[slug]", "page");

  return {
    success: true,
    addedCount,
    updatedCount,
    filteredOut: uniquePlaces.length - kept.length,
    nearDupesRemoved: uniquePlaces.length - deduped.length,
    totalFetched: allResults.length,
    totalUnique: uniquePlaces.length,
    totalSaved: kept.length,
    apiErrors,
    categorySummary: catCounters,
  };
}

export async function adminClearGooglePlaces(campgroundId: string) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();
  await adminClient
    .from("cached_places")
    .delete()
    .eq("campground_id", campgroundId)
    .not("google_place_id", "is", null);
  revalidatePath("/admin");
  revalidatePath("/camp/[slug]", "page");
  return { success: true };
}

export async function adminUpdateCampground(
  campgroundId: string,
  params: Record<string, any>,
) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const ALLOWED = [
    "name",
    "slug",
    "latitude",
    "longitude",
    "primary_color",
    "logo_url",
    "hero_image_url",
    "subscription_status",
    "trial_ends_at",
    "wifi_name",
    "wifi_password",
    "check_out_info",
    "trash_rules",
    "emergency_info",
    "phone",
    "email",
    "website",
    "address",
    "reception_hours",
    "camp_rules",
    "supported_languages",
  ];

  const safeParams: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (key in params) safeParams[key] = params[key];
  }

  if (Object.keys(safeParams).length === 0) {
    throw new Error("No valid fields to update.");
  }

  const { data: camp } = await adminClient
    .from("campgrounds")
    .select("slug")
    .eq("id", campgroundId)
    .single();

  const { error } = await adminClient
    .from("campgrounds")
    .update(safeParams)
    .eq("id", campgroundId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  if (camp?.slug) {
    revalidatePath(`/camp/${camp.slug}`);
  }
  if (safeParams.slug && safeParams.slug !== camp?.slug) {
    revalidatePath(`/camp/${safeParams.slug}`);
  }
  revalidatePath("/camp/[slug]", "page");

  return { success: true };
}

export async function adminDeleteCampground(
  campgroundId: string,
  ownerId: string | null,
) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { data: camp } = await adminClient
    .from("campgrounds")
    .select("slug")
    .eq("id", campgroundId)
    .single();

  const { error } = await adminClient
    .from("campgrounds")
    .delete()
    .eq("id", campgroundId);
  if (error) throw new Error(error.message);
  if (ownerId) await adminClient.auth.admin.deleteUser(ownerId);

  revalidatePath("/admin");
  if (camp?.slug) revalidatePath(`/camp/${camp.slug}`);
  return { success: true };
}
