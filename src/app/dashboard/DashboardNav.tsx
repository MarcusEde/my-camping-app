// src/app/dashboard/DashboardNav.tsx
"use client";

import { hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import {
  BarChart2,
  ExternalLink,
  Handshake,
  Info,
  LogOut,
  MapPin,
  Megaphone,
  Palette,
  Phone,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  tab: string | null;
};

/* ── Nav groups ──────────────────────────────────────────── */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Daglig drift",
    items: [
      { href: "/dashboard", label: "Analys", icon: BarChart2, exact: true, tab: null },
      { href: "/dashboard/places", label: "Platser", icon: MapPin, exact: false, tab: null },
      { href: "/dashboard/anslag", label: "Anslag", icon: Megaphone, exact: false, tab: null },
    ],
  },
  {
    label: "Inställningar",
    items: [
      { href: "/dashboard/settings", label: "Varumärke", icon: Palette, exact: false, tab: "branding" },
      { href: "/dashboard/settings", label: "Kontakt och tider", icon: Phone, exact: false, tab: "kontakt" },
      { href: "/dashboard/settings", label: "Gästinfo", icon: Info, exact: false, tab: "gastinfo" },
    ],
  },
  {
    label: "Växt",
    items: [
      { href: "/dashboard/partners", label: "Partners", icon: Handshake, exact: false, tab: null },
      { href: "/dashboard/qr", label: "QR och Dela", icon: QrCode, exact: false, tab: null },
    ],
  },
];

/* ── Props ───────────────────────────────────────────────── */
interface Props {
  campground: Campground;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

/* ── Active-item logic needs search params — wrap in Suspense */
function NavInner({ campground, logoutAction, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brand = campground.primary_color || "#059669";
  const guestUrl = `/camp/${campground.slug}`;

  const isActive = (href: string, exact: boolean, tab: string | null) => {
    if (exact) return pathname === href && !tab;
    if (!pathname.startsWith(href)) return false;
    if (tab) return searchParams.get("tab") === tab;
    // For non-settings items: active if path matches and no conflicting tab check needed
    if (href === "/dashboard/settings") return false; // only tab-specific items activate
    return true;
  };

  const isLocked =
    campground.subscription_status === "inactive" ||
    campground.subscription_status === "cancelled";

  const cssVars = {
    "--theme-brand": brand,
    "--theme-brand-light": hexToRgba(brand, 0.08),
  } as React.CSSProperties;

  // Flat list for mobile bottom bar (max 5)
  const flatItems = NAV_GROUPS.flatMap((g) => g.items).slice(0, 5);

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
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <p className="px-3 pt-2 pb-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact, item.tab);
                  const Icon = item.icon;
                  const href = item.tab
                    ? `${item.href}?tab=${item.tab}`
                    : item.href;
                  return (
                    <Link
                      key={`${item.href}-${item.tab ?? "no-tab"}`}
                      href={href}
                      className={`group flex items-center gap-3 rounded-md pl-5 pr-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand)] ${active
                        ? "bg-[var(--theme-brand-light)] text-[var(--theme-brand)] border-l-2 border-[var(--theme-brand)] -ml-px pl-[18px]"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                        }`}
                    >
                      <Icon
                        size={16}
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
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: logout only */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/50">
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut size={18} className="text-stone-400" />
              Logga ut
            </button>
          </form>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 relative bg-stone-50">
        {/* Desktop topbar — Guest View button */}
        <div className="hidden lg:flex items-center justify-end px-8 h-12 bg-white border-b border-stone-200 shrink-0 shadow-sm z-10 w-full mb-4">
          <a
            href={guestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{ backgroundColor: brand }}
          >
            <ExternalLink size={14} />
            Öppna Gästvy
          </a>
        </div>

        {/* Mobile topbar */}
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
        <main
          className={`flex-1 overflow-y-auto px-4 pb-8 lg:px-8 animate-fade-in ${isLocked
            ? "pointer-events-none select-none grayscale opacity-60"
            : ""
            }`}
        >
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Mobile bottom tab bar — first 5 flattened items */}
        <nav className="flex lg:hidden items-stretch h-16 border-t border-stone-200 bg-white shrink-0 z-20 pb-safe">
          {flatItems.map((item) => {
            const active = isActive(item.href, item.exact, item.tab);
            const Icon = item.icon;
            const href = item.tab ? `${item.href}?tab=${item.tab}` : item.href;
            return (
              <Link
                key={`${item.href}-${item.tab ?? "no-tab"}`}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2 px-1 relative"
              >
                <Icon
                  size={20}
                  className={active ? "text-[var(--theme-brand)]" : "text-stone-400"}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={`text-[9px] font-bold tracking-tight truncate w-full text-center px-0.5 ${active ? "text-[var(--theme-brand)]" : "text-stone-500"
                    }`}
                >
                  {item.label}
                </span>
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

/* ── Exported wrapper — Suspense needed for useSearchParams ── */
export default function DashboardNav(props: Props) {
  return (
    <Suspense fallback={null}>
      <NavInner {...props} />
    </Suspense>
  );
}
