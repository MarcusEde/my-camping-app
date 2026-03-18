// components/tabs/explore/EmptyState.tsx
"use client";

import { Compass } from "lucide-react";

export function RowHeader({ emoji, title, subtitle, count }: { emoji: string; title: string; subtitle: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-3 px-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg">{emoji}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">{subtitle}</p>
        <h3 className="text-sm font-bold tracking-tight text-stone-900 leading-tight">{title}</h3>
      </div>
      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-500">{count}</span>
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-12 text-center border border-stone-200/75 shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
        <Compass size={22} className="text-stone-400" />
      </div>
      <p className="text-base font-bold text-stone-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[220px] text-sm text-stone-500 leading-relaxed">{subtitle}</p>
    </div>
  );
}
