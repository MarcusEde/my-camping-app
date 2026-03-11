import { getSessionUser } from "@/lib/auth-guard";
import { loadAdminDashboard } from "@/lib/data/admin-loader";
import type { PlatformStats } from "@/types/admin";
import { redirect } from "next/navigation";
import React from "react";
import AdminCampgroundCard from "./AdminCampgroundCard";
import CreateOwnerForm from "./Createownerform";

export const metadata = { title: "Super Admin — Camp Concierge" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "superadmin") redirect("/dashboard");

  const { platform, alerts, healthy, offline } = await loadAdminDashboard();

  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{ backgroundColor: "#F7F5F2" }}
    >
      <Header platform={platform} />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <OverviewSection platform={platform} />

        <section>
          <SectionLabel>Skapa ny ägare</SectionLabel>
          <CreateOwnerForm />
        </section>

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

        <section>
          <SectionLabel>Aktiva ({healthy.length})</SectionLabel>
          <div className="grid gap-3">
            {healthy.map((camp) => (
              <AdminCampgroundCard key={camp.id} camp={camp} />
            ))}
          </div>
        </section>

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

/* ═══════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════ */

function Header({ platform }: { platform: PlatformStats }) {
  return (
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
  );
}

function OverviewSection({ platform }: { platform: PlatformStats }) {
  return (
    <section>
      <SectionLabel>Översikt</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard value={platform.total} label="Campingar" icon="🏕️" />
        <MetricCard value={platform.totalPlaces} label="Platser" icon="📍" />
        <MetricCard value={platform.estimatedMRR} label="MRR (SEK)" icon="💰" />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared Primitives
   ═══════════════════════════════════════════════════════ */

function HeaderPill({
  value,
  label,
  dot,
  urgent,
}: {
  value: number;
  label: string;
  dot: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
        urgent
          ? "bg-orange-500/10 ring-orange-500/20"
          : "bg-white/[0.05] ring-white/[0.06]"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dot }}
      />
      <span
        className={`text-[11px] font-black ${
          urgent ? "text-orange-300" : "text-white/55"
        }`}
      >
        {value} {label}
      </span>
    </div>
  );
}

function MetricCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
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

function SectionLabel({
  children,
  urgent,
}: {
  children: React.ReactNode;
  urgent?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2
        className={`text-[11px] font-black uppercase tracking-[0.2em] ${
          urgent ? "text-orange-600" : "text-stone-400"
        }`}
      >
        {children}
      </h2>
    </div>
  );
}
