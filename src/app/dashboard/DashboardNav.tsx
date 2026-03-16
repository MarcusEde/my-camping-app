// src/app/dashboard/DashboardNav.tsx
"use client";

import { hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import {
  BarChart3,
  ExternalLink,
  LogOut,
  MapPin,
  QrCode,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

/* ── Nav items ───────────────────────────────────────────── */
// UI REDESIGN: Replaced emojis and descriptive sub-labels with crisp, B2B-standard Lucide icons.
const NAV = [
  { href: "/dashboard", label: "Översikt", icon: BarChart3, exact: true },
  { href: "/dashboard/places", label: "Platser", icon: MapPin, exact: false },
  { href: "/dashboard/partners", label: "Partners", icon: Users, exact: false },
  {
    href: "/dashboard/settings",
    label: "Inställningar",
    icon: Settings,
    exact: false,
  },
];

/* ── Props ───────────────────────────────────────────────── */
interface Props {
  campground: Campground;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

/* ── Component ───────────────────────────────────────────── */
export default function DashboardNav({
  campground,
  logoutAction,
  children,
}: Props) {
  const pathname = usePathname();
  const brand = campground.primary_color || "#059669";
  const guestUrl = `/camp/${campground.slug}`;

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const isLocked =
    campground.subscription_status === "inactive" ||
    campground.subscription_status === "cancelled";

  // UI REDESIGN: Injected brand color as CSS variables at the root to allow clean Tailwind integration
  // without relying on messy inline style objects on every single element.
  const cssVars = {
    "--theme-brand": brand,
    "--theme-brand-light": hexToRgba(brand, 0.08),
  } as React.CSSProperties;

  return (
    <div
      style={cssVars}
      className="flex h-screen overflow-hidden bg-stone-50 font-sans text-stone-900 selection:bg-[var(--theme-brand-light)] selection:text-[var(--theme-brand)]"
    >
      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR
          ═══════════════════════════════════════ */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-stone-200 z-20">
        {/* Campground identity */}
        <div className="h-16 flex items-center px-6 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {/* UI REDESIGN: Removed the pastel emoji circle. Replaced with a sharp, professional brand block or real logo. */}
            {campground.logo_url ? (
              <img
                src={campground.logo_url}
                alt={campground.name}
                className="h-7 w-7 object-contain rounded"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--theme-brand)] text-white font-bold text-xs tracking-wider">
                {campground.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900 tracking-tight leading-tight">
                {campground.name}
              </p>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <p className="px-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
            Meny
          </p>
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand)] ${
                  active
                    ? "bg-[var(--theme-brand-light)] text-[var(--theme-brand)]"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    active
                      ? "text-[var(--theme-brand)]"
                      : "text-stone-400 group-hover:text-stone-600"
                  }
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Utility links Footer */}
        <div className="p-4 border-t border-stone-200 space-y-1 bg-stone-50/50">
          <Link
            href="/dashboard/qr"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <QrCode size={18} className="text-stone-400" />
            Skriv ut QR-kod
          </Link>
          <a
            href={guestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[var(--theme-brand)] hover:bg-[var(--theme-brand-light)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink size={18} />
              Öppna Gästvy
            </div>
          </a>
          <form
            action={logoutAction}
            className="pt-2 mt-2 border-t border-stone-200"
          >
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut
                size={18}
                className="text-stone-400 group-hover:text-red-500"
              />
              Logga ut
            </button>
          </form>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 relative">
        {/* Mobile top bar */}
        <header className="flex lg:hidden items-center justify-between px-4 h-14 bg-white border-b border-stone-200 shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            {campground.logo_url ? (
              <img
                src={campground.logo_url}
                alt=""
                className="h-6 w-6 object-contain rounded"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--theme-brand)] text-white font-bold text-[10px]">
                {campground.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-stone-900 truncate max-w-[180px]">
              {campground.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[var(--theme-brand)] rounded-md hover:bg-[var(--theme-brand-light)]"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </header>

        {/* Page content */}
        {/* UI REDESIGN: Added a subtle fade-in transition and removed the overarching lock blur logic from wrapping the exact DOM nodes to prevent jank, relying on CSS instead. */}
        <main
          className={`flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in ${
            isLocked
              ? "pointer-events-none select-none grayscale opacity-60"
              : ""
          }`}
        >
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="flex lg:hidden items-stretch h-16 border-t border-stone-200 bg-white shrink-0 z-20 pb-safe">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2 px-1 relative"
              >
                <Icon
                  size={20}
                  className={
                    active ? "text-[var(--theme-brand)]" : "text-stone-400"
                  }
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    active ? "text-[var(--theme-brand)]" : "text-stone-500"
                  }`}
                >
                  {item.label}
                </span>
                {/* Active Indicator */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[var(--theme-brand)] rounded-b-md" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
