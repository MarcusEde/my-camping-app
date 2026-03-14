"use client";

import { hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import { ExternalLink, Eye, LogOut, QrCode } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

/* ── Nav items ───────────────────────────────────────────── */
const NAV = [
  {
    href: "/dashboard",
    label: "Översikt",
    emoji: "📊",
    sub: "Analys & statistik",
    exact: true,
  },
  {
    href: "/dashboard/places",
    label: "Platser",
    emoji: "📍",
    sub: "Pinna, dölj & tipsa",
    exact: false,
  },
  {
    href: "/dashboard/partners",
    label: "Partners",
    emoji: "🤝",
    sub: "Erbjudanden & klick",
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Inställningar",
    emoji: "⚙️",
    sub: "Utseende & anslag",
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
  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `/camp/${campground.slug}`;

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const isLocked =
    campground.subscription_status === "inactive" ||
    campground.subscription_status === "cancelled";

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFCFB]">
      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR
          ═══════════════════════════════════════ */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col bg-white border-r border-stone-100">
        {/* Campground identity */}
        <div className="px-4 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm text-white shadow-sm"
              style={{ backgroundColor: brand }}
            >
              🏕️
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black tracking-tight text-stone-900 leading-tight">
                {campground.name}
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400 mt-0.5">
                Ägarportal
              </p>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                  active
                    ? "text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
                style={active ? { backgroundColor: brand } : undefined}
              >
                <span className="text-base leading-none shrink-0">
                  {item.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[12px] font-bold leading-tight ${
                      active ? "text-white" : "text-stone-700"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p
                    className={`text-[9px] truncate leading-tight mt-0.5 ${
                      active ? "text-white/55" : "text-stone-400"
                    }`}
                  >
                    {item.sub}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 border-t border-stone-100" />

        {/* Utility links */}
        <div className="px-2 py-3 space-y-0.5">
          <Link
            href="/dashboard/qr"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all hover:bg-stone-50"
            style={{ color: brand }}
          >
            <QrCode size={13} />
            QR-kod
          </Link>
          <a
            href={guestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all hover:bg-stone-50"
            style={{ color: brand }}
          >
            <Eye size={13} />
            Gästvy
            <ExternalLink size={10} className="ml-auto opacity-40" />
          </a>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-bold text-stone-400 transition-all hover:bg-red-50 hover:text-red-500">
              <LogOut size={13} />
              Logga ut
            </button>
          </form>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-stone-100 shrink-0">
          {/* Active page title */}
          {(() => {
            const active = NAV.find((n) => isActive(n.href, n.exact ?? false));
            return active ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">{active.emoji}</span>
                <div>
                  <h1 className="text-[15px] font-black tracking-tight text-stone-900 leading-tight">
                    {active.label}
                  </h1>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
                    {active.sub}
                  </p>
                </div>
              </div>
            ) : (
              <div />
            );
          })()}

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/qr"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
              style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
            >
              <QrCode size={12} />
              QR-kod
            </Link>
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95"
              style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
            >
              <Eye size={12} />
              Gästvy
              <ExternalLink size={8} className="opacity-40" />
            </a>
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="flex lg:hidden items-center justify-between px-4 py-3 bg-white border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs text-white"
              style={{ backgroundColor: brand }}
            >
              🏕️
            </div>
            <span className="text-[13px] font-black text-stone-900 truncate max-w-[180px]">
              {campground.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: brand }}
            >
              <Eye size={16} />
            </a>
            <form action={logoutAction}>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isLocked ? "pointer-events-none select-none blur-sm opacity-50" : ""
          }`}
        >
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="flex lg:hidden items-stretch border-t border-stone-200/50 bg-white shrink-0">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all active:scale-95"
              >
                <span className="text-lg leading-none">{item.emoji}</span>
                <span
                  className={`text-[8px] font-black uppercase tracking-[0.05em] leading-tight ${
                    active ? "text-stone-900" : "text-stone-400"
                  }`}
                >
                  {item.label}
                </span>
                <div
                  className="h-[2px] w-4 rounded-full transition-all duration-200"
                  style={{ backgroundColor: active ? brand : "transparent" }}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
