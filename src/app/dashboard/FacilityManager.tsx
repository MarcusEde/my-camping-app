"use client";

import { useFacilityManager } from "@/lib/hooks/useFacilityManager";
import type { InternalLocation } from "@/types/database";
import {
  Building2,
  Footprints,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";

/* ── Constants (UI-only) ─────────────────────────────── */
const TYPES = [
  { value: "reception", label: "Reception", emoji: "🏕️" },
  { value: "toilet", label: "Toalett", emoji: "🚻" },
  { value: "shower", label: "Dusch", emoji: "🚿" },
  { value: "laundry", label: "Tvätt", emoji: "👕" },
  { value: "kitchen", label: "Kök", emoji: "🍳" },
  { value: "playground", label: "Lekplats", emoji: "🛝" },
  { value: "pool", label: "Pool", emoji: "🏊" },
  { value: "shop", label: "Butik", emoji: "🛒" },
  { value: "recycling", label: "Återvinning", emoji: "♻️" },
  { value: "bbq", label: "Grillplats", emoji: "🔥" },
  { value: "electricity", label: "Eluttag", emoji: "⚡" },
  { value: "water", label: "Vatten", emoji: "🚰" },
  { value: "wifi", label: "WiFi-punkt", emoji: "📶" },
  { value: "parking", label: "Parkering", emoji: "🅿️" },
  { value: "dog_area", label: "Hundrastgård", emoji: "🐕" },
  { value: "other", label: "Övrigt", emoji: "📍" },
];

const typeEmoji = (type: string) =>
  TYPES.find((t) => t.value === type)?.emoji ?? "📍";

const typeLabel = (type: string) =>
  TYPES.find((t) => t.value === type)?.label ?? type;

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campgroundId: string;
  facilities: InternalLocation[];
  brand: string;
}

/* ── Main Component ──────────────────────────────────── */
export default function FacilityManager({
  campgroundId,
  facilities,
  brand,
}: Props) {
  const s = useFacilityManager({ campgroundId, facilities });

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Building2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800">
              Faciliteter på campingen
            </h3>
            <p className="text-xs text-stone-500">
              {s.items.length > 0
                ? `${s.items.length} ${s.items.length === 1 ? "facilitet" : "faciliteter"} tillagda`
                : "Inga faciliteter tillagda ännu"}
            </p>
          </div>
        </div>
        {!s.showAdd && (
          <button
            onClick={s.openAddForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={14} />
            Lägg till
          </button>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className="p-5">
        {/* Empty State */}
        {s.items.length === 0 && !s.showAdd && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <MapPin size={20} className="text-stone-400" />
            </div>
            <p className="text-sm font-semibold text-stone-700">
              Inga faciliteter tillagda
            </p>
            <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-stone-500">
              Lägg till toaletter, duschar, lekplatser och annat så ser gästerna
              dem direkt i appen med gångavstånd.
            </p>
            <button
              onClick={s.openAddForm}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
            >
              <Plus size={14} />
              Lägg till din första facilitet
            </button>
          </div>
        )}

        {/* Facility List */}
        {s.items.length > 0 && (
          <div className="space-y-2">
            {s.items.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-3.5 rounded-xl bg-stone-50/80 px-4 py-3 ring-1 ring-stone-100 transition-all hover:bg-stone-50 hover:ring-stone-200"
              >
                {/* Emoji Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm ring-1 ring-stone-100">
                  {typeEmoji(f.type)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800">
                    {f.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-stone-500">
                      {typeLabel(f.type)}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                      <Footprints size={10} className="text-stone-400" />
                      {f.walking_minutes} min
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => s.handleDelete(f.id)}
                  disabled={s.isPending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  title="Ta bort"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Add Form ── */}
        {s.showAdd && (
          <div
            className={`${s.items.length > 0 ? "mt-4 " : ""}rounded-xl border border-emerald-100 bg-emerald-50/30 p-4`}
          >
            {/* Form Header */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700">
                Lägg till ny facilitet
              </p>
              <button
                onClick={s.closeAddForm}
                className="flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Name Input */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Namn
                </label>
                <input
                  type="text"
                  value={s.newName}
                  onChange={(e) => s.setNewName(e.target.value)}
                  placeholder="T.ex. Servicehus A"
                  className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Type + Minutes Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Typ
                  </label>
                  <select
                    value={s.newType}
                    onChange={(e) => s.setNewType(e.target.value)}
                    className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Gångavstånd
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={s.newMinutes}
                      onChange={(e) =>
                        s.setNewMinutes(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 pr-12 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                      min
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={s.closeAddForm}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-600 shadow-sm transition-all hover:bg-stone-50 hover:shadow-md active:scale-[0.98]"
                >
                  Avbryt
                </button>
                <button
                  onClick={s.handleAdd}
                  disabled={s.isPending || !s.newName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      Spara facilitet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
