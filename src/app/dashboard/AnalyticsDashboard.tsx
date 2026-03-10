// app/dashboard/AnalyticsDashboard.tsx
"use client";

import { getAnalyticsStats } from "@/lib/analytics";
import type { AnalyticsStats } from "@/types/database";
import {
  Brain,
  Eye,
  MessageSquare,
  Navigation,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const TAB_LABELS: Record<string, string> = {
  puls: "Hem",
  planerare: "Planerare",
  utforska: "Utforska",
  aktiviteter: "Aktiviteter",
  info: "Info",
};

const RATING_EMOJI = ["", "😞", "😐", "🙂", "😊", "🤩"];

interface Props {
  campgroundId: string;
  brand: string;
}

export default function AnalyticsDashboard({ campgroundId, brand }: Props) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(7);

  useEffect(() => {
    setLoading(true);
    getAnalyticsStats(campgroundId, period)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campgroundId, period]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[16px] bg-stone-100"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black tracking-tight text-stone-900">
          📊 Gästanalys
        </h2>
        <div className="flex gap-1 rounded-full bg-stone-100 p-0.5">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                period === d
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-400"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KPI
          icon={<Eye size={15} />}
          label="Besök"
          value={stats.totalViews}
          change={stats.weekOverWeek.viewsChange}
          color={brand}
        />
        <KPI
          icon={<Users size={15} />}
          label="Unika gäster"
          value={stats.uniqueGuests}
          change={stats.weekOverWeek.guestsChange}
          color="#059669"
        />
        <KPI
          icon={<Brain size={15} />}
          label="Planeraren"
          value={stats.plannerUsage}
          color="#7c3aed"
        />
        <KPI
          icon={<Star size={15} />}
          label="Snittbetyg"
          value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
          subtitle={
            stats.feedbackCount > 0
              ? `${stats.feedbackCount} omdömen`
              : undefined
          }
          color="#d97706"
          isString
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Daily Views */}
        <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            Dagliga besök
          </p>
          {stats.dailyViews.length > 0 ? (
            <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
              {stats.dailyViews.slice(-period).map((day) => {
                const max = Math.max(
                  ...stats.dailyViews.map((d) => d.views),
                  1,
                );
                const h = Math.max((day.views / max) * 100, 4);
                return (
                  <div
                    key={day.date}
                    className="group relative flex-1"
                    title={`${day.date}: ${day.views} (${day.unique} unika)`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-colors group-hover:opacity-80"
                      style={{ height: `${h}%`, backgroundColor: brand }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-[11px] text-stone-400">
              Ingen data ännu — besök registreras automatiskt
            </p>
          )}
        </div>

        {/* Top Tabs */}
        <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            Populäraste sektioner
          </p>
          <div className="space-y-2">
            {stats.topTabs.slice(0, 5).map((tab) => {
              const pct = Math.round(
                (tab.count / (stats.topTabs[0]?.count ?? 1)) * 100,
              );
              return (
                <div key={tab.tab} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-stone-600">
                      {TAB_LABELS[tab.tab] ?? tab.tab}
                    </span>
                    <span className="font-black text-stone-400">
                      {tab.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: brand }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Top Directions */}
        <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
          <div className="mb-3 flex items-center gap-1.5">
            <Navigation size={11} className="text-stone-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
              Mest klickade &quot;Visa vägen&quot;
            </p>
          </div>
          {stats.topPlaces.length > 0 ? (
            <div className="space-y-1.5">
              {stats.topPlaces.slice(0, 5).map((p, i) => (
                <div
                  key={p.placeId}
                  className="flex items-center justify-between rounded-[10px] bg-stone-50 px-3 py-2"
                >
                  <span className="text-[11px] font-bold text-stone-600">
                    <span className="mr-2 text-stone-300">{i + 1}.</span>
                    {p.placeName}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600">
                    {p.clicks}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-[11px] text-stone-400">
              Inga klick ännu
            </p>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
          <div className="mb-3 flex items-center gap-1.5">
            <MessageSquare size={11} className="text-stone-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
              Senaste omdömen
            </p>
          </div>
          {stats.recentFeedback.length > 0 ? (
            <div className="space-y-1.5">
              {stats.recentFeedback.slice(0, 5).map((fb, i) => (
                <div key={i} className="rounded-[10px] bg-stone-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base">{RATING_EMOJI[fb.rating]}</span>
                    <span className="text-[9px] text-stone-300">
                      {new Date(fb.created_at).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
                  {fb.comment && (
                    <p className="mt-1 text-[11px] italic text-stone-500">
                      &ldquo;{fb.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-[11px] text-stone-400">
              Inga omdömen ännu
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  subtitle,
  change,
  color,
  isString,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  color: string;
  isString?: boolean;
}) {
  return (
    <div className="rounded-[16px] bg-white p-4 ring-1 ring-stone-200/60">
      <div className="flex items-center justify-between">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: color + "12", color }}
        >
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[9px] font-black ${change > 0 ? "text-emerald-500" : "text-red-400"}`}
          >
            {change > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
      <p className="mt-2 text-[22px] font-black tabular-nums tracking-tight text-stone-900">
        {isString ? value : (value as number).toLocaleString("sv-SE")}
      </p>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
        {subtitle ?? label}
      </p>
    </div>
  );
}
