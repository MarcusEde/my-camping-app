// app/dashboard/FacilityManager.tsx
"use client";

import type { InternalLocation } from "@/types/database";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteFacility, saveFacility } from "./actions";

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

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

interface Props {
  campgroundId: string;
  facilities: InternalLocation[];
  brand: string;
}

export default function FacilityManager({
  campgroundId,
  facilities: initial,
  brand,
}: Props) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("toilet");
  const [newMinutes, setNewMinutes] = useState(1);

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const result = await saveFacility(campgroundId, {
          name: newName.trim(),
          type: newType,
          walking_minutes: newMinutes,
          is_active: true,
        });
        if (result.id) {
          setItems((prev) => [
            ...prev,
            {
              id: result.id,
              campground_id: campgroundId,
              name: newName.trim(),
              type: newType,
              walking_minutes: newMinutes,
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setNewName("");
        setNewType("toilet");
        setNewMinutes(1);
        setShowAdd(false);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fel");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteFacility(id);
        setItems((prev) => prev.filter((f) => f.id !== id));
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fel");
      }
    });
  };

  const typeEmoji = (type: string) =>
    TYPES.find((t) => t.value === type)?.emoji ?? "📍";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-black tracking-tight text-stone-900">
          Faciliteter på campingen
        </p>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white"
            style={{ backgroundColor: brand }}
          >
            <Plus size={11} /> Lägg till
          </button>
        )}
      </div>

      {items.length === 0 && !showAdd && (
        <div className="rounded-[14px] bg-stone-50 py-6 text-center">
          <p className="text-[11px] text-stone-400">
            Inga faciliteter tillagda. Lägg till toaletter, duschar, etc. så ser
            gästerna dem direkt i appen.
          </p>
        </div>
      )}

      {/* Existing facilities */}
      {items.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded-[14px] bg-stone-50 px-3 py-2.5"
        >
          <span className="text-base">{typeEmoji(f.type)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-stone-700">{f.name}</p>
            <p className="text-[10px] text-stone-400">
              🚶 {f.walking_minutes} min
            </p>
          </div>
          <button
            onClick={() => handleDelete(f.id)}
            disabled={isPending}
            className="text-stone-300 transition-colors hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {/* Add form */}
      {showAdd && (
        <div className="space-y-2 rounded-[14px] border border-stone-200/50 bg-white p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Namn (t.ex. Servicehus A)"
            className="w-full rounded-[10px] bg-stone-50 px-3 py-2 text-[12px] ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": hexToRgba(brand, 0.3) } as any}
          />
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="flex-1 rounded-[10px] bg-stone-50 px-2 py-2 text-[11px] ring-1 ring-stone-200/60"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">🚶</span>
              <input
                type="number"
                min={0}
                max={30}
                value={newMinutes}
                onChange={(e) => setNewMinutes(parseInt(e.target.value) || 0)}
                className="w-14 rounded-[10px] bg-stone-50 px-2 py-2 text-center text-[11px] ring-1 ring-stone-200/60"
              />
              <span className="text-[9px] text-stone-400">min</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-full bg-stone-100 py-2 text-[10px] font-black text-stone-400"
            >
              Avbryt
            </button>
            <button
              onClick={handleAdd}
              disabled={isPending || !newName.trim()}
              className="flex-1 rounded-full py-2 text-[10px] font-black text-white disabled:opacity-50"
              style={{ backgroundColor: brand }}
            >
              {isPending ? (
                <Loader2 size={12} className="mx-auto animate-spin" />
              ) : (
                "Spara"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
