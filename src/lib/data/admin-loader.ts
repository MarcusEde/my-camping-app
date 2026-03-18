import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminDashboardData,
  CampStats,
  PlatformStats,
} from "@/types/admin";

/** Build a single CampStats record from raw DB data. */
function buildCampStats(
  camp: any,
  ownerMap: Record<
    string,
    { email: string; created_at: string; last_sign_in_at: string | null }
  >,
  places: any[],
  announcements: any[],
  partners: any[],
  now: Date,
): CampStats {
  const campPlaces = places.filter((p) => p.campground_id === camp.id);
  const campAnnounce = announcements.filter((a) => a.campground_id === camp.id);
  const campPartners = partners.filter(
    (p) => p.campground_id === camp.id && p.is_active,
  );

  const googleActive = campPlaces.filter(
    (p) => p.google_place_id && !p.is_hidden,
  ).length;
  const googleHidden = campPlaces.filter(
    (p) => p.google_place_id && p.is_hidden,
  ).length;
  const custom = campPlaces.filter((p) => !p.google_place_id).length;
  const pinned = campPlaces.filter((p) => p.is_pinned).length;

  const fetchTimes = campPlaces
    .filter((p) => p.fetched_at)
    .map((p) => new Date(p.fetched_at).getTime());
  const lastSyncedAt =
    fetchTimes.length > 0
      ? new Date(Math.max(...fetchTimes)).toISOString()
      : null;

  let trialDaysLeft: number | null = null;
  let isTrialExpired = false;
  if (camp.subscription_status === "trial" && camp.trial_ends_at) {
    const msLeft = new Date(camp.trial_ends_at).getTime() - now.getTime();
    trialDaysLeft = Math.ceil(msLeft / 86400000);
    isTrialExpired = trialDaysLeft <= 0;
  }

  const billingPlan =
    camp.subscription_status === "active"
      ? "Pro"
      : camp.subscription_status === "trial"
        ? "Trial"
        : camp.subscription_status === "inactive"
          ? "Inactive"
          : "Cancelled";

  const owner = camp.owner_id ? ownerMap[camp.owner_id] : null;

  return {
    id: camp.id,
    name: camp.name,
    slug: camp.slug,
    latitude: camp.latitude,
    longitude: camp.longitude,
    subscription_status: camp.subscription_status ?? "trial",
    trial_ends_at: camp.trial_ends_at ?? null,
    created_at: camp.created_at,
    primary_color: camp.primary_color,
    logo_url: camp.logo_url ?? null,
    hero_image_url: camp.hero_image_url ?? null,
    wifi_name: camp.wifi_name ?? null,
    wifi_password: camp.wifi_password ?? null,
    check_out_info: camp.check_out_info ?? null,
    trash_rules: camp.trash_rules ?? null,
    emergency_info: camp.emergency_info ?? null,
    supported_languages: camp.supported_languages ?? null,
    owner_id: camp.owner_id ?? null,
    phone: camp.phone ?? null,
    email: camp.email ?? null,
    website: camp.website ?? null,
    address: camp.address ?? null,
    reception_hours: camp.reception_hours ?? null,
    camp_rules: camp.camp_rules ?? null,
    ownerEmail: owner?.email ?? null,
    ownerCreatedAt: owner?.created_at ?? null,
    ownerLastSignIn: owner?.last_sign_in_at ?? null,
    googlePlacesActive: googleActive,
    googlePlacesHidden: googleHidden,
    customPlaces: custom,
    pinnedPlaces: pinned,
    lastSyncedAt,
    announcementCount: campAnnounce.length,
    partnerCount: campPartners.length,
    trialDaysLeft,
    isTrialExpired,
    billingPlan,
    mrr: camp.subscription_status === "active" ? 299 : null,
    nextBillingDate: null,
  };
}

/** Compute platform-wide aggregate stats. */
function buildPlatformStats(
  campStats: CampStats[],
  places: any[],
  announcements: any[],
  partners: any[],
): PlatformStats {
  return {
    total: campStats.length,
    active: campStats.filter((c) => c.subscription_status === "active").length,
    trial: campStats.filter(
      (c) => c.subscription_status === "trial" && !c.isTrialExpired,
    ).length,
    cancelled: campStats.filter((c) => c.subscription_status === "cancelled")
      .length,
    inactive: campStats.filter((c) => c.subscription_status === "inactive")
      .length,
    trialExpiredCount: campStats.filter((c) => c.isTrialExpired).length,
    totalPlaces: places.filter((p) => !p.is_hidden).length,
    totalAnnouncements: announcements.length,
    totalPartners: partners.filter((p) => p.is_active).length,
    neverSynced: campStats.filter((c) => c.googlePlacesActive === 0).length,
    missingWifi: campStats.filter((c) => !c.wifi_name && !c.wifi_password)
      .length,
    missingEmergency: campStats.filter((c) => !c.emergency_info).length,
    estimatedMRR: campStats.reduce((sum, c) => sum + (c.mrr ?? 0), 0),
  };
}

/** Fetch owner info from Supabase Auth admin API. */
async function fetchOwnerMap(
  adminClient: ReturnType<typeof createAdminClient>,
  ownerIds: string[],
) {
  const map: Record<
    string,
    { email: string; created_at: string; last_sign_in_at: string | null }
  > = {};

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error || !data?.users || data.users.length === 0) {
        hasMore = false;
        break;
      }

      for (const u of data.users) {
        if (ownerIds.includes(u.id)) {
          map[u.id] = {
            email: u.email ?? "—",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
          };
        }
      }

      if (data.users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  } catch (err) {
    console.error("[Admin] Error fetching owners:", err);
  }

  return map;
}

/** Load all data needed for the admin dashboard. */
export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const adminClient = createAdminClient();

  const [
    { data: rawCampgrounds },
    { data: rawPlaces },
    { data: rawAnnouncements },
    { data: rawPartners },
  ] = await Promise.all([
    adminClient
      .from("campgrounds")
      .select("*")
      .order("created_at", { ascending: false }),
    adminClient
      .from("cached_places")
      .select(
        "id, campground_id, google_place_id, is_hidden, is_pinned, fetched_at",
      ),
    adminClient.from("announcements").select("id, campground_id, created_at"),
    adminClient
      .from("promoted_partners")
      .select("id, campground_id, is_active"),
  ]);

  const campgrounds = rawCampgrounds ?? [];
  const places = rawPlaces ?? [];
  const announcements = rawAnnouncements ?? [];
  const partners = rawPartners ?? [];

  const ownerIds = [
    ...new Set(campgrounds.map((c) => c.owner_id).filter(Boolean)),
  ] as string[];
  const ownerMap = await fetchOwnerMap(adminClient, ownerIds);

  const now = new Date();

  const campStats = campgrounds.map((camp) =>
    buildCampStats(camp, ownerMap, places, announcements, partners, now),
  );

  const platform = buildPlatformStats(
    campStats,
    places,
    announcements,
    partners,
  );

  // Categorize campgrounds
  const alerts = campStats.filter(
    (c) =>
      (c.subscription_status === "active" ||
        c.subscription_status === "trial") &&
      (c.isTrialExpired || c.googlePlacesActive === 0),
  );

  const healthy = campStats.filter(
    (c) =>
      (c.subscription_status === "active" ||
        c.subscription_status === "trial") &&
      !c.isTrialExpired &&
      c.googlePlacesActive > 0,
  );

  const offline = campStats.filter(
    (c) =>
      c.subscription_status === "inactive" ||
      c.subscription_status === "cancelled",
  );

  return { platform, alerts, healthy, offline };
}
