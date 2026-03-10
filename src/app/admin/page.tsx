import { getSessionUser } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminCampgroundCard from "./AdminCampgroundCard";
import CreateOwnerForm from "./Createownerform";

export const metadata = { title: "Super Admin — Camp Concierge" };
export const dynamic = "force-dynamic";

export interface CampStats {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  primary_color: string;
  logo_url: string | null;
  hero_image_url: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  check_out_info: string | null;
  trash_rules: string | null;
  emergency_info: string | null;
  supported_languages: string[] | null;
  owner_id: string | null;
  // Contact fields
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  reception_hours: string | null;
  camp_rules: string | null;
  // Computed stats
  ownerEmail: string | null;
  ownerCreatedAt: string | null;
  ownerLastSignIn: string | null;
  googlePlacesActive: number;
  googlePlacesHidden: number;
  customPlaces: number;
  lastSyncedAt: string | null;
  pinnedPlaces: number;
  announcementCount: number;
  partnerCount: number;
  trialDaysLeft: number | null;
  isTrialExpired: boolean;
  billingPlan: string;
  mrr: number | null;
  nextBillingDate: string | null;
}

interface PlatformStats {
  total: number;
  active: number;
  trial: number;
  cancelled: number;
  inactive: number;
  trialExpiredCount: number;
  totalPlaces: number;
  totalAnnouncements: number;
  totalPartners: number;
  neverSynced: number;
  missingWifi: number;
  missingEmergency: number;
  estimatedMRR: number;
}

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "superadmin") redirect("/dashboard");

  const supabase = await createClient();

  // Use admin client to fetch ALL campgrounds regardless of RLS
  const adminClient = createAdminClient();

  const [
    { data: rawCampgrounds },
    { data: places },
    { data: announcements },
    { data: partners },
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
  let ownerMap: Record<
    string,
    { email: string; created_at: string; last_sign_in_at: string | null }
  > = {};

  try {
    const ownerIds = [
      ...new Set(campgrounds.map((c) => c.owner_id).filter(Boolean)),
    ];
    const {
      data: { users },
    } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users ?? []) {
      if (ownerIds.includes(u.id)) {
        ownerMap[u.id] = {
          email: u.email ?? "—",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        };
      }
    }
  } catch (err) {
    console.error("[Admin] Error fetching owners:", err);
  }

  const now = new Date();

  const campStats: CampStats[] = campgrounds.map((camp) => {
    const campPlaces = (places ?? []).filter(
      (p) => p.campground_id === camp.id,
    );
    const campAnnounce = (announcements ?? []).filter(
      (a) => a.campground_id === camp.id,
    );
    const campPartners = (partners ?? []).filter(
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
      ownerEmail: ownerMap[camp.owner_id!]?.email ?? null,
      ownerCreatedAt: ownerMap[camp.owner_id!]?.created_at ?? null,
      ownerLastSignIn: ownerMap[camp.owner_id!]?.last_sign_in_at ?? null,
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
  });

  const platform: PlatformStats = {
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
    totalPlaces: (places ?? []).filter((p) => !p.is_hidden).length,
    totalAnnouncements: (announcements ?? []).length,
    totalPartners: (partners ?? []).filter((p) => p.is_active).length,
    neverSynced: campStats.filter((c) => c.googlePlacesActive === 0).length,
    missingWifi: campStats.filter((c) => !c.wifi_name && !c.wifi_password)
      .length,
    missingEmergency: campStats.filter((c) => !c.emergency_info).length,
    estimatedMRR: campStats.reduce((sum, c) => sum + (c.mrr ?? 0), 0),
  };

  // 1. Alerts: Problematic active/trial
  const alerts = campStats.filter(
    (c) =>
      (c.subscription_status === "active" ||
        c.subscription_status === "trial") &&
      (c.isTrialExpired || c.googlePlacesActive === 0),
  );

  // 2. Healthy: Functioning Active/Trial
  const healthy = campStats.filter(
    (c) =>
      (c.subscription_status === "active" ||
        c.subscription_status === "trial") &&
      !c.isTrialExpired &&
      c.googlePlacesActive > 0,
  );

  // 3. Offline: Inactive and Cancelled
  const offline = campStats.filter(
    (c) =>
      c.subscription_status === "inactive" ||
      c.subscription_status === "cancelled",
  );

  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{ backgroundColor: "#F7F5F2" }}
    >
      <header
        className="sticky top-0 z-20 border-b border-white/[0.04] px-6 py-4"
        style={{ backgroundColor: "#1C2B24" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-black text-white">
              Camp Concierge Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <HeaderPill value={platform.active} label="Active" dot="#34D399" />
            <HeaderPill value={platform.trial} label="Trial" dot="#FCD34D" />
            <HeaderPill
              value={platform.inactive}
              label="Inactive"
              dot="#9ca3af"
            />
            <HeaderPill
              value={platform.cancelled}
              label="Cancelled"
              dot="#F87171"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section>
          <SectionLabel>Översikt</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard value={platform.total} label="Campingar" icon="🏕️" />
            <MetricCard
              value={platform.totalPlaces}
              label="Platser"
              icon="📍"
            />
            <MetricCard
              value={platform.estimatedMRR}
              label="MRR (SEK)"
              icon="💰"
            />
          </div>
        </section>

        <section>
          <SectionLabel>Skapa ny ägare</SectionLabel>
          <CreateOwnerForm />
        </section>

        {/* 1. Alerts */}
        {alerts.length > 0 && (
          <section>
            <SectionLabel urgent>Behöver åtgärd ({alerts.length})</SectionLabel>
            <div className="grid gap-3">
              {alerts.map((camp) => (
                <AdminCampgroundCard key={camp.id} camp={camp} />
              ))}
            </div>
          </section>
        )}

        {/* 2. Healthy */}
        <section>
          <SectionLabel>Aktiva ({healthy.length})</SectionLabel>
          <div className="grid gap-3">
            {healthy.map((camp) => (
              <AdminCampgroundCard key={camp.id} camp={camp} />
            ))}
          </div>
        </section>

        {/* 3. Offline */}
        {offline.length > 0 && (
          <section className="opacity-70">
            <SectionLabel>Inaktiva & Avslutade ({offline.length})</SectionLabel>
            <div className="grid gap-3">
              {offline.map((camp) => (
                <AdminCampgroundCard key={camp.id} camp={camp} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function HeaderPill({ value, label, dot, urgent }: any) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${urgent ? "bg-orange-500/10 ring-orange-500/20" : "bg-white/[0.05] ring-white/[0.06]"}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dot }}
      />
      <span
        className={`text-[11px] font-black ${urgent ? "text-orange-300" : "text-white/55"}`}
      >
        {value} {label}
      </span>
    </div>
  );
}

function MetricCard({ value, label, icon }: any) {
  return (
    <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
      <span className="text-xl leading-none">{icon}</span>
      <p className="mt-3 text-[22px] font-black text-stone-900">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase text-stone-400">
        {label}
      </p>
    </div>
  );
}

function SectionLabel({ children, urgent }: any) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2
        className={`text-[11px] font-black uppercase tracking-[0.2em] ${urgent ? "text-orange-600" : "text-stone-400"}`}
      >
        {children}
      </h2>
    </div>
  );
}
