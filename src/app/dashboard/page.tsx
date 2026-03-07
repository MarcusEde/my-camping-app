import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  LogOut,
  Settings as SettingsIcon,
  MapPin,
  Eye,
  ExternalLink,
  MapPinned,
  Star,
  EyeOff,
  Megaphone,
} from "lucide-react";
import { logout } from "./actions";
import SettingsForm from "./settings/SettingsForm";
import PlacesManager from "./places/PlacesManager";
import type { Campground, CachedPlace, Announcement } from "@/types/database";

export const metadata = { title: "Camp Concierge – Dashboard" };

/* ═══════════════════════════════════════════════════════
   Utility
   ═══════════════════════════════════════════════════════ */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ═══════════════════════════════════════════════════════
   Main Dashboard Page
   ═══════════════════════════════════════════════════════ */
export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Fetch campground
  const { data: campgroundRaw, error: campError } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (campError || !campgroundRaw) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB] p-8">
        <div className="max-w-sm rounded-[24px] bg-white p-8 text-center shadow-[0_2px_16px_rgba(120,80,30,0.08)]">
          <span className="mb-4 block text-4xl">⛺</span>
          <p className="text-lg font-black tracking-tight text-stone-900">
            Ingen camping hittades
          </p>
          <p className="mt-2 text-sm font-medium text-stone-500">
            Det finns ingen camping kopplad till ditt konto ({user.email}).
          </p>
          <form action={logout} className="mt-6">
            <button className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.97]">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    );
  }

  const campground = campgroundRaw as Campground;

  // 3. Fetch places
  const { data: placesRaw } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false })
    .order("name", { ascending: true });
  const places: CachedPlace[] = (placesRaw || []) as CachedPlace[];

  // 4. Fetch announcements
  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("*")
    .eq("campground_id", campground.id)
    .order("created_at", { ascending: false });
  const announcements: Announcement[] = (announcementsRaw || []) as Announcement[];

  // Derived values
  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `/camp/${campground.slug}`;
  const totalPlaces = places.filter((p) => !p.is_hidden).length;
  const pinnedPlaces = places.filter((p) => p.is_pinned).length;
  const hiddenPlaces = places.filter((p) => p.is_hidden).length;
  const heroImage =
    (campground as any).hero_image ||
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1400&q=80";

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* ━━━━━━ NAV ━━━━━━ */}
      <nav className="sticky top-0 z-50 border-b border-stone-200/40 bg-[#FDFCFB]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm shadow-sm"
              style={{ backgroundColor: brand }}
            >
              🏕️
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black tracking-tight text-stone-900 sm:text-lg">
                CAMP CONCIERGE
              </span>
              <span className="hidden text-sm font-medium text-stone-400 sm:inline">
                | Ägarportal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97]"
              style={{ backgroundColor: hexToRgba(brand, 0.08), color: brand }}
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Gästvy</span>
              <ExternalLink size={10} />
            </a>
            <form action={logout}>
              <button className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-[0.97]">
                <LogOut size={14} />
                <span className="hidden sm:inline">Logga ut</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* ━━━━━━ HERO BANNER ━━━━━━ */}
      <section className="relative mx-4 mt-4 overflow-hidden rounded-[24px] sm:mx-6 lg:mx-auto lg:max-w-7xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-amber-900/10 to-black/20" />

        <div className="relative flex min-h-[160px] flex-col justify-end px-6 py-6 sm:min-h-[200px] sm:px-10 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
            Du hanterar
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white drop-shadow-lg sm:text-3xl">
            {campground.name}
          </h1>
          <p className="mt-1 text-[12px] font-medium text-white/50">
            /{campground.slug}
          </p>
        </div>
      </section>

      {/* ━━━━━━ STATS ━━━━━━ */}
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            emoji="📍"
            label="Synliga platser"
            value={totalPlaces}
            brand={brand}
          />
          <StatCard
            emoji="⭐"
            label="Rekommenderade"
            value={pinnedPlaces}
            brand={brand}
          />
          <StatCard
            emoji="👁️"
            label="Dolda platser"
            value={hiddenPlaces}
            brand={brand}
          />
          <StatCard
            emoji="📢"
            label="Aktiva anslag"
            value={announcements.length}
            brand={brand}
          />
        </div>
      </section>

      {/* ━━━━━━ MAIN CONTENT ━━━━━━ */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Left column — Settings & Announcements */}
          <div className="space-y-4 lg:col-span-7">
            <SectionHead
              emoji="⚙️"
              icon={<SettingsIcon size={16} />}
              title="Inställningar & Anslag"
              subtitle="Hantera utseende, gästinfo och meddelanden"
              brand={brand}
            />
            <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_16px_rgba(120,80,30,0.06)] sm:p-7">
              <SettingsForm campground={campground} announcements={announcements} />
            </div>
          </div>

          {/* Right column — Places */}
          <div className="space-y-4 lg:col-span-5">
            <SectionHead
              emoji="🗺️"
              icon={<MapPin size={16} />}
              title="Hantera Platser"
              subtitle="Pinna, dölj och tipsa om platser i närheten"
              brand={brand}
            />
            <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_16px_rgba(120,80,30,0.06)] sm:p-7">
              <PlacesManager campground={campground} places={places} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Internal Sub‑Components
   ═══════════════════════════════════════════════════════ */

/** Stat card with emoji and warm shadow */
function StatCard({
  emoji,
  label,
  value,
  brand,
}: {
  emoji: string;
  label: string;
  value: number;
  brand: string;
}) {
  return (
    <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(120,80,30,0.05)] sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <p className="text-[28px] font-black tabular-nums tracking-tight text-stone-900">
          {value}
        </p>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </p>
    </div>
  );
}

/** Section heading with emoji trail marker + branded icon */
function SectionHead({
  emoji,
  icon,
  title,
  subtitle,
  brand,
}: {
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  brand: string;
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: hexToRgba(brand, 0.08), color: brand }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-stone-900">
          {title}
          <span className="text-base opacity-30">{emoji}</span>
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}