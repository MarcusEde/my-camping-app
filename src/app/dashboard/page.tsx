import { createClient } from "@/lib/supabase/server";
import type {
  Announcement,
  CachedPlace,
  Campground,
  InternalLocation,
  PromotedPartner,
  PromotedPartnerWithClicks,
} from "@/types/database";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Handshake,
  LogOut,
  MapPin,
  QrCode,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "./actions";
import AnalyticsDashboard from "./AnalyticsDashboard";
import FacilityManager from "./FacilityManager";
import PartnerManager from "./PartnerManager";
import PlacesManager from "./places/PlacesManager";
import SettingsForm from "./settings/SettingsForm";

export const metadata = { title: "Camp Concierge – Dashboard" };

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Campground
  const { data: campgroundRaw, error: campError } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (campError || !campgroundRaw) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB] p-8">
        <div className="max-w-sm rounded-[24px] bg-white p-8 text-center ring-1 ring-stone-200/60">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-200/60">
            <span className="text-xl">⛺</span>
          </div>
          <p className="text-[15px] font-black tracking-tight text-stone-900">
            Ingen camping hittades
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-400">
            Det finns ingen camping kopplad till ditt konto ({user.email}).
          </p>
          <form action={logout} className="mt-6">
            <button className="rounded-full bg-red-500 px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    );
  }

  const campground = campgroundRaw as Campground;

  // ─── SUBSCRIPTION STATUS LOGIC ───
  const isInactive = campground.subscription_status === "inactive";
  const isCancelled = campground.subscription_status === "cancelled";
  const isLocked = isInactive || isCancelled;

  // 3. Places
  const { data: placesRaw } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false })
    .order("name", { ascending: true });
  const places: CachedPlace[] = (placesRaw || []) as CachedPlace[];

  // 4. Announcements
  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("*")
    .eq("campground_id", campground.id)
    .order("created_at", { ascending: false });
  const announcements: Announcement[] = (announcementsRaw ||
    []) as Announcement[];

  // 5. Promoted Partners + Click counts
  const { data: partnersRaw } = await supabase
    .from("promoted_partners")
    .select("*")
    .eq("campground_id", campground.id)
    .order("priority_rank", { ascending: true })
    .order("created_at", { ascending: false });

  const partnersBase: PromotedPartner[] = (partnersRaw ||
    []) as PromotedPartner[];

  const clickCounts: Record<string, number> = {};
  const partnerIds = partnersBase.map((p) => p.id);

  if (partnerIds.length > 0) {
    const { data: clicksRaw } = await supabase
      .from("partner_clicks")
      .select("partner_id")
      .in("partner_id", partnerIds);

    if (clicksRaw) {
      for (const click of clicksRaw) {
        clickCounts[click.partner_id] =
          (clickCounts[click.partner_id] || 0) + 1;
      }
    }
  }
  // 6. Facilities
  const { data: facilitiesRaw } = await supabase
    .from("internal_locations")
    .select("*")
    .eq("campground_id", campground.id)
    .order("walking_minutes", { ascending: true });
  const facilities: InternalLocation[] = (facilitiesRaw ||
    []) as InternalLocation[];
  const placeNameMap: Record<string, string> = {};
  for (const p of places) {
    placeNameMap[p.id] = p.name;
  }

  const partners: PromotedPartnerWithClicks[] = partnersBase.map((p) => ({
    ...p,
    click_count: clickCounts[p.id] || 0,
    linked_place_name: p.cached_place_id
      ? placeNameMap[p.cached_place_id] || null
      : null,
  }));

  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `/camp/${campground.slug}`;
  const totalPlaces = places.filter((p) => !p.is_hidden).length;
  const pinnedPlaces = places.filter((p) => p.is_pinned).length;
  const hiddenPlaces = places.filter((p) => p.is_hidden).length;
  const totalPartnerClicks = partners.reduce((s, p) => s + p.click_count, 0);

  const activePartners = partners.filter((p) => {
    if (!p.is_active) return false;
    const now = new Date();
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
  }).length;

  const heroImage =
    campground.hero_image_url ||
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1400&q=80";

  return (
    <div className="relative min-h-screen bg-[#FDFCFB]">
      {/* 🚫 INACTIVE / CANCELLED OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[24px] bg-white ring-1 ring-stone-200/60 shadow-2xl">
            <div className="bg-red-50 py-6 text-center text-red-500">
              <AlertCircle size={40} className="mx-auto" strokeWidth={1.5} />
            </div>
            <div className="px-6 py-8 text-center">
              <h2 className="mb-2 text-xl font-black tracking-tight text-stone-900">
                {isCancelled ? "Abonnemang avslutat" : "Abonnemang inaktivt"}
              </h2>
              <p className="mb-6 text-[13px] font-medium leading-relaxed text-stone-500">
                {isCancelled ? (
                  <>
                    Ditt abonnemang för <strong>{campground.name}</strong> har
                    avslutats. Gästportalen är stängd och du kan inte göra
                    ändringar.
                  </>
                ) : (
                  <>
                    Ditt abonnemang för <strong>{campground.name}</strong> har
                    pausats. Gästportalen är för närvarande dold och du kan inte
                    göra ändringar.
                  </>
                )}
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href="mailto:support@campconcierge.se"
                  className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Kontakta Support
                </a>
                <form action={logout}>
                  <button className="w-full rounded-full px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-stone-400 hover:text-stone-600 transition-colors">
                    Logga ut
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ DASHBOARD WRAPPER (BLURS IF LOCKED) ━━━━━━ */}
      <div
        className={
          isLocked
            ? "pointer-events-none select-none blur-[4px] opacity-60 transition-all duration-500"
            : ""
        }
      >
        {/* NAV */}
        <nav className="sticky top-0 z-50 border-b border-stone-200/40 bg-[#FDFCFB]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-xs text-white"
                style={{ backgroundColor: brand }}
              >
                🏕️
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-black uppercase tracking-[0.1em] text-stone-900 sm:text-sm">
                  Camp Concierge
                </span>
                <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 sm:inline">
                  Ägarportal
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/qr"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
                style={{
                  backgroundColor: hexToRgba(brand, 0.06),
                  color: brand,
                }}
              >
                <QrCode size={13} strokeWidth={2} />
                <span className="hidden sm:inline">QR-kod</span>
              </Link>
              <a
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
                style={{
                  backgroundColor: hexToRgba(brand, 0.06),
                  color: brand,
                }}
              >
                <Eye size={13} strokeWidth={2} />
                <span className="hidden sm:inline">Gästvy</span>
                <ExternalLink size={9} className="opacity-40" />
              </a>
              <form action={logout}>
                <button className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-stone-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95">
                  <LogOut size={13} strokeWidth={2} />
                  <span className="hidden sm:inline">Logga ut</span>
                </button>
              </form>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="relative mx-4 mt-4 overflow-hidden rounded-[20px] ring-1 ring-stone-200/60 sm:mx-6 lg:mx-auto lg:max-w-7xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div
            className="absolute inset-0 mix-blend-multiply opacity-25"
            style={{ backgroundColor: brand }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-amber-900/5 to-black/20" />
          <div className="relative flex min-h-[140px] flex-col justify-end px-6 py-5 sm:min-h-[180px] sm:px-8 sm:py-7">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Du hanterar
            </p>
            <h1 className="mt-1 text-[22px] font-black tracking-tight text-white sm:text-[26px]">
              {campground.name}
            </h1>
            <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.15em] text-white/30">
              /{campground.slug}
            </p>
          </div>
        </section>

        {/* STATS */}
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <StatCard
              icon="📍"
              label="Synliga platser"
              value={totalPlaces}
              brand={brand}
            />
            <StatCard
              icon="⭐"
              label="Rekommenderade"
              value={pinnedPlaces}
              brand={brand}
            />
            <StatCard
              icon="👁️"
              label="Dolda platser"
              value={hiddenPlaces}
              brand={brand}
            />
            <StatCard
              icon="🤝"
              label="Aktiva partners"
              value={activePartners}
              brand={brand}
            />
            <StatCard
              icon="🖱️"
              label="Partner-klick"
              value={totalPartnerClicks}
              brand={brand}
            />
          </div>

          <Link
            href="/dashboard/qr"
            className="mt-3 flex items-center gap-3 rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60 transition-all hover:shadow-sm active:scale-[0.995]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
            >
              <QrCode size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black tracking-tight text-stone-800">
                Ladda ner QR-kod
              </p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.15em] text-stone-300">
                Designa & skriv ut — gäster skannar för att nå appen
              </p>
            </div>
            <div
              className="shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white"
              style={{
                backgroundColor: brand,
                boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
              }}
            >
              Designa →
            </div>
          </Link>
        </section>
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <AnalyticsDashboard campgroundId={campground.id} brand={brand} />
        </section>
        {/* MAIN */}
        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="space-y-3 lg:col-span-5">
              <SectionHead
                icon={<SettingsIcon size={14} strokeWidth={2} />}
                title="Inställningar & Anslag"
                subtitle="Utseende, gästinfo och meddelanden"
                brand={brand}
              />
              <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200/60 sm:p-6">
                <SettingsForm
                  campground={campground}
                  announcements={announcements}
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-4">
              <SectionHead
                icon={<MapPin size={14} strokeWidth={2} />}
                title="Hantera Platser"
                subtitle="Pinna, dölj och tipsa"
                brand={brand}
              />
              <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200/60 sm:p-6">
                <PlacesManager campground={campground} places={places} />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-3">
              <SectionHead
                icon={<Handshake size={14} strokeWidth={2} />}
                title="Sponsrade Partners"
                subtitle="CTA-spårning & lokala samarbeten"
                brand={brand}
              />
              <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200/60 sm:p-6">
                <PartnerManager
                  campground={campground}
                  partners={partners}
                  places={places}
                />
              </div>
            </div>
          </div>
          {/* FACILITIES */}
          <div className="mt-4 space-y-3">
            <SectionHead
              icon={<MapPin size={14} strokeWidth={2} />}
              title="Faciliteter"
              subtitle="Toaletter, duschar & service på campingen"
              brand={brand}
            />
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-stone-200/60 sm:p-6">
              <FacilityManager
                campgroundId={campground.id}
                facilities={facilities}
                brand={brand}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
    Sub-Components
    ═══════════════════════════════════════════ */

function StatCard({
  icon,
  label,
  value,
  brand,
}: {
  icon: string;
  label: string;
  value: number;
  brand: string;
}) {
  return (
    <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-stone-50 text-sm ring-1 ring-stone-200/60">
          {icon}
        </div>
        <p className="text-[24px] font-black tabular-nums tracking-tight text-stone-900">
          {value}
        </p>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
        {label}
      </p>
    </div>
  );
}

function SectionHead({
  icon,
  title,
  subtitle,
  brand,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  brand: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-black tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
