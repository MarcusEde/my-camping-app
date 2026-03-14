"use client";

/**
 * AnalyticsDashboard.tsx
 *
 * Requires: npm install recharts
 * (or: yarn add recharts / pnpm add recharts)
 */

import { useAnalyticsDashboard } from "@/lib/hooks/useAnalyticsDashboard";
import type { AnalyticsStats } from "@/types/database";
import {
  Brain,
  Globe,
  Heart,
  HelpCircle,
  MessageSquare,
  Navigation,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ── Constants ───────────────────────────────────────────── */
const TAB_LABELS: Record<string, string> = {
  puls: "Hem",
  planerare: "Planerare",
  utforska: "Utforska",
  aktiviteter: "Aktiviteter",
  info: "Info",
};

const LANG_META: Record<string, { flag: string; label: string }> = {
  sv: { flag: "🇸🇪", label: "Svenska" },
  en: { flag: "🇬🇧", label: "English" },
  de: { flag: "🇩🇪", label: "Deutsch" },
  da: { flag: "🇩🇰", label: "Dansk" },
  nl: { flag: "🇳🇱", label: "Nederlands" },
  no: { flag: "🇳🇴", label: "Norsk" },
};

const RATING_EMOJI = ["", "😞", "😐", "🙂", "😊", "🤩"];
const PERIODS = [7, 30, 90] as const;

/* ── Props ───────────────────────────────────────────────── */
interface Props {
  campgroundId: string;
  brand: string;
}

/* ── Main Component ──────────────────────────────────────── */
export default function AnalyticsDashboard({ campgroundId, brand }: Props) {
  const { stats, loading, period, setPeriod } = useAnalyticsDashboard({
    campgroundId,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* ── Header + Period Selector ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-black tracking-tight text-stone-900">
          Gästanalys
        </h2>
        <div className="flex gap-1 rounded-full bg-stone-100 p-0.5">
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                period === d
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: Primary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Users size={14} />}
          label="Gästinteraktioner"
          value={stats.totalViews}
          change={stats.weekOverWeek.viewsChange}
          color={brand}
        />
        <KpiCard
          icon={<HelpCircle size={14} />}
          label="Sparade receptionsfrågor"
          value={stats.totalInfoClicks}
          color="#059669"
          highlight
        />
        <KpiCard
          icon={<Users size={14} />}
          label="Unika gäster"
          value={stats.uniqueGuests}
          change={stats.weekOverWeek.guestsChange}
          color="#6366f1"
        />
        <KpiCard
          icon={<Star size={14} />}
          label="Snittbetyg"
          value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
          subtitle={
            stats.feedbackCount > 0
              ? `${stats.feedbackCount} omdömen`
              : "Inga omdömen"
          }
          color="#d97706"
          isString
        />
      </div>

      {/* ── Row 2: Daily views chart (full width) ── */}
      <DailyViewsCard
        dailyViews={stats.dailyViews}
        period={period}
        brand={brand}
      />

      {/* ── Row 3: Languages + Saved places ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <LanguagesPanel
          topLanguages={stats.topLanguages}
          totalViews={stats.totalViews}
          brand={brand}
        />
        <SavedPlacesPanel topSavedPlaces={stats.topSavedPlaces} />
      </div>

      {/* ── Row 4: Secondary KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Brain size={14} />}
          label="Planeraren"
          value={stats.plannerUsage}
          color="#7c3aed"
        />
        <KpiCard
          icon={<Ticket size={14} />}
          label="Inlösta erbjudanden"
          value={stats.totalRedemptions}
          change={stats.weekOverWeek.redemptionsChange}
          color="#e11d48"
        />
        <KpiCard
          icon={<Navigation size={14} />}
          label="Visa vägen-klick"
          value={stats.directionsClicks}
          color="#0ea5e9"
        />
      </div>

      {/* ── Row 5: Top tabs + Directions + Feedback ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        <TopTabsPanel topTabs={stats.topTabs} brand={brand} />
        <TopDirectionsPanel topPlaces={stats.topPlaces} />
        <RecentFeedbackPanel recentFeedback={stats.recentFeedback} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Daily Views — recharts AreaChart
   ══════════════════════════════════════════════════════════ */
function DailyViewsCard({
  dailyViews,
  period,
  brand,
}: {
  dailyViews: AnalyticsStats["dailyViews"];
  period: number;
  brand: string;
}) {
  const data = dailyViews.slice(-period);
  const hasData = data.some((d) => d.views > 0);
  const gradientId = `grad-${brand.replace("#", "")}`;

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
          Dagliga besök
        </p>
        {hasData && (
          <div className="flex items-center gap-4 text-[10px] font-bold text-stone-400">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-6 rounded-full opacity-70"
                style={{ backgroundColor: brand }}
              />
              Totalt
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-px w-6 rounded-full opacity-40"
                style={{
                  borderTop: `2px dashed ${brand}`,
                  backgroundColor: "transparent",
                }}
              />
              Unika
            </span>
          </div>
        )}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brand} stopOpacity={0.12} />
                <stop offset="95%" stopColor={brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0ede8"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fontWeight: 700, fill: "#a8a29e" }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return d.toLocaleDateString("sv-SE", {
                  month: "short",
                  day: "numeric",
                });
              }}
              tickLine={false}
              axisLine={false}
              interval={period <= 7 ? 0 : "preserveStartEnd"}
            />
            <YAxis
              tick={{ fontSize: 9, fontWeight: 700, fill: "#a8a29e" }}
              tickLine={false}
              axisLine={false}
              tickCount={4}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "none",
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                fontSize: 11,
                fontWeight: 700,
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#78716c", marginBottom: 4 }}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("sv-SE", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }
              formatter={(value, name) => [
                typeof value === "number"
                  ? value.toLocaleString("sv-SE")
                  : String(value ?? ""),
                name === "views" ? "Besök" : "Unika",
              ]}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke={brand}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: brand, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="unique"
              stroke={brand}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="none"
              dot={false}
              activeDot={{ r: 3, fill: brand, strokeWidth: 0 }}
              opacity={0.4}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart text="Ingen data ännu — besök registreras automatiskt" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Language Breakdown Panel
   ══════════════════════════════════════════════════════════ */
function LanguagesPanel({
  topLanguages,
  totalViews,
  brand,
}: {
  topLanguages: AnalyticsStats["topLanguages"];
  totalViews: number;
  brand: string;
}) {
  const nonSwedishCount = topLanguages
    .filter((l) => l.language !== "sv")
    .reduce((s, l) => s + l.count, 0);
  const nonSwedishPct =
    totalViews > 0 ? Math.round((nonSwedishCount / totalViews) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
            <Globe size={13} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
            Språk som används
          </p>
        </div>
        {nonSwedishPct > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-600">
            {nonSwedishPct}% icke-svenska
          </span>
        )}
      </div>

      {topLanguages.length > 0 ? (
        <div className="space-y-2.5">
          {topLanguages.slice(0, 6).map((entry) => {
            const meta = LANG_META[entry.language] ?? {
              flag: "🌐",
              label: entry.language,
            };
            // Use the total of all shown languages as the denominator
            // so bars are relative to each other, not to total views
            // (which includes sessions with no language set)
            const langTotal = topLanguages
              .slice(0, 6)
              .reduce((sum, l) => sum + l.count, 0);
            const barPct =
              langTotal > 0 ? Math.round((entry.count / langTotal) * 100) : 0;
            const sharePct =
              totalViews > 0 ? Math.round((entry.count / totalViews) * 100) : 0;
            return (
              <div key={entry.language} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{meta.flag}</span>
                    <span className="text-[12px] font-bold text-stone-700">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tabular-nums text-stone-400">
                      {sharePct}%
                    </span>
                    <span className="min-w-[36px] text-right text-[12px] font-black tabular-nums text-stone-900">
                      {entry.count.toLocaleString("sv-SE")}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.max(barPct, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyChart text="Inte tillräckligt med data ännu" />
      )}

      {nonSwedishCount > 0 && (
        <div className="mt-4 rounded-xl bg-emerald-50/60 px-3.5 py-3 ring-1 ring-emerald-100">
          <p className="text-[11px] leading-relaxed text-emerald-700">
            <span className="font-black">
              {nonSwedishCount.toLocaleString("sv-SE")} interaktioner
            </span>{" "}
            skedde på ett annat språk. Utan automatisk översättning hade dessa
            gäster behövt hjälp i receptionen.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Saved Places Panel
   ══════════════════════════════════════════════════════════ */
function SavedPlacesPanel({
  topSavedPlaces,
}: {
  topSavedPlaces: AnalyticsStats["topSavedPlaces"];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
          <Heart size={13} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
          Populäraste lokala tipsen
        </p>
      </div>

      {topSavedPlaces.length > 0 ? (
        <div className="space-y-1.5">
          {topSavedPlaces.slice(0, 7).map((place, i) => (
            <div
              key={place.placeId}
              className="flex items-center justify-between rounded-xl bg-stone-50/80 px-3.5 py-2.5 transition-colors hover:bg-stone-100/80"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-stone-200/60 text-[9px] font-black text-stone-400">
                  {i + 1}
                </span>
                <span className="truncate text-[12px] font-bold text-stone-700">
                  {place.placeName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <Heart size={10} className="fill-rose-400 text-rose-400" />
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-rose-600">
                  {place.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart text="Inte tillräckligt med data ännu" />
      )}

      {topSavedPlaces.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50/60 px-3.5 py-3 ring-1 ring-amber-100">
          <p className="text-[11px] leading-relaxed text-amber-700">
            Gästerna sparar aktivt lokala tips — detta visar att din gästguide
            driver <span className="font-black">verkligt intresse</span> för
            närområdet.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Top Tabs Panel
   ══════════════════════════════════════════════════════════ */
function TopTabsPanel({
  topTabs,
  brand,
}: {
  topTabs: AnalyticsStats["topTabs"];
  brand: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
        Populäraste sektioner
      </p>
      {topTabs.length > 0 ? (
        <div className="space-y-2.5">
          {topTabs.slice(0, 5).map((tab) => {
            const pct = Math.round(
              (tab.count / (topTabs[0]?.count ?? 1)) * 100,
            );
            return (
              <div key={tab.tab} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-stone-600">
                    {TAB_LABELS[tab.tab] ?? tab.tab}
                  </span>
                  <span className="font-black tabular-nums text-stone-400">
                    {tab.count.toLocaleString("sv-SE")}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: brand }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyChart text="Ingen data ännu" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Top Directions Panel
   ══════════════════════════════════════════════════════════ */
function TopDirectionsPanel({
  topPlaces,
}: {
  topPlaces: AnalyticsStats["topPlaces"];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
          <Navigation size={13} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
          Mest klickade &quot;Visa vägen&quot;
        </p>
      </div>
      {topPlaces.length > 0 ? (
        <div className="space-y-1.5">
          {topPlaces.slice(0, 5).map((p, i) => (
            <div
              key={p.placeId}
              className="flex items-center justify-between rounded-xl bg-stone-50/80 px-3.5 py-2.5"
            >
              <span className="truncate text-[12px] font-bold text-stone-600">
                <span className="mr-2 text-stone-300">{i + 1}.</span>
                {p.placeName}
              </span>
              <span className="ml-2 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-emerald-600">
                {p.clicks}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart text="Inga klick ännu" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Recent Feedback Panel
   ══════════════════════════════════════════════════════════ */
function RecentFeedbackPanel({
  recentFeedback,
}: {
  recentFeedback: AnalyticsStats["recentFeedback"];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
          <MessageSquare size={13} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
          Senaste omdömen
        </p>
      </div>
      {recentFeedback.length > 0 ? (
        <div className="space-y-1.5">
          {recentFeedback.slice(0, 5).map((fb, i) => (
            <div key={i} className="rounded-xl bg-stone-50/80 px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-base">{RATING_EMOJI[fb.rating]}</span>
                <span className="text-[9px] font-semibold text-stone-300">
                  {new Date(fb.created_at).toLocaleDateString("sv-SE")}
                </span>
              </div>
              {fb.comment && (
                <p className="mt-1 text-[11px] italic leading-relaxed text-stone-500">
                  &ldquo;{fb.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart text="Inga omdömen ännu" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   KPI Card
   ══════════════════════════════════════════════════════════ */
function KpiCard({
  icon,
  label,
  value,
  subtitle,
  change,
  color,
  isString,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  color: string;
  isString?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        highlight
          ? "bg-emerald-50/50 ring-emerald-200/60"
          : "bg-white ring-stone-200/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: color + "14", color }}
        >
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[9px] font-black ${
              change > 0 ? "text-emerald-500" : "text-red-400"
            }`}
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
      <p
        className={`text-[10px] font-black uppercase tracking-[0.18em] leading-tight mt-0.5 ${
          highlight ? "text-emerald-500" : "text-stone-300"
        }`}
      >
        {subtitle ?? label}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Empty Chart State
   ══════════════════════════════════════════════════════════ */
function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p className="text-[11px] font-semibold text-stone-400">{text}</p>
    </div>
  );
}
