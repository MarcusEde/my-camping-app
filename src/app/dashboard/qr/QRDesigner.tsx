"use client";

import {
  TEMPLATES,
  useQRDesigner,
  type PaperSize,
  type QRSize,
} from "@/lib/hooks/useQRDesigner";
import { hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import { Download, Eye, Palette, QrCode, Type } from "lucide-react";
import React from "react";

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  baseUrl: string;
}

/* ── Component ───────────────────────────────────────── */
export default function QRDesigner({ campground, baseUrl }: Props) {
  const s = useQRDesigner({ campground, baseUrl });

  return (
    <div className="space-y-4">
      {/* ── URL Info ── */}
      <UrlInfoPanel
        brand={s.brand}
        guestUrl={s.guestUrl}
        onCopy={s.handleCopyUrl}
      />

      {/* ── Templates ── */}
      <div>
        <SectionLabel label="Mall" />
        <div className="flex gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => s.applyTemplate(t.id)}
              className="flex-1 rounded-[10px] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              style={
                s.template === t.id
                  ? {
                      backgroundColor: s.brand,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${hexToRgba(s.brand, 0.18)}`,
                    }
                  : {
                      backgroundColor: "white",
                      color: "#78716c",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Customize ── */}
      <div className="space-y-3">
        <SectionLabel label="Anpassa" />

        {/* Colors */}
        <div className="rounded-[14px] bg-stone-50/80 p-3.5">
          <div className="flex gap-4">
            <ColorPicker
              label="Bakgrund"
              icon={<Palette size={9} />}
              value={s.bgColor}
              onChange={s.setBgColor}
              brand={s.brand}
            />
            <ColorPicker
              label="Text & QR"
              icon={<Type size={9} />}
              value={s.textColor}
              onChange={s.setTextColor}
              brand={s.brand}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-2">
          <ToggleBtn
            label="Namn"
            active={s.showName}
            onClick={s.toggleShowName}
            brand={s.brand}
          />
          <ToggleBtn
            label="Slogan"
            active={s.showSlogan}
            onClick={s.toggleShowSlogan}
            brand={s.brand}
          />
        </div>

        {s.showSlogan && (
          <input
            type="text"
            value={s.slogan}
            onChange={(e) => s.setSlogan(e.target.value)}
            placeholder="Skanna för att utforska!"
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(s.brand, 0.25),
              } as React.CSSProperties
            }
          />
        )}

        {/* Sizes */}
        <div className="flex gap-3">
          <SizeSelector
            label="QR-storlek"
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
            value={s.qrSize}
            onChange={(v) => s.setQrSize(v as QRSize)}
            brand={s.brand}
          />
          <SizeSelector
            label="Papper"
            options={[
              { value: "a4", label: "A4" },
              { value: "a5", label: "A5" },
              { value: "card", label: "Kort" },
            ]}
            value={s.paperSize}
            onChange={(v) => s.setPaperSize(v as PaperSize)}
            brand={s.brand}
          />
        </div>
      </div>

      {/* ── Preview ── */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Eye size={12} className="text-stone-300" />
          <span className="text-[13px] font-black tracking-tight text-stone-900">
            Förhandsvisning
          </span>
        </div>
        <div className="flex justify-center rounded-[16px] bg-stone-100/60 p-6 ring-1 ring-stone-200/60">
          <canvas
            ref={s.canvasRef}
            className="rounded-[12px] shadow-lg"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* ── Download ── */}
      <button
        onClick={s.handleDownload}
        disabled={!s.ready}
        className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
        style={{
          backgroundColor: s.brand,
          boxShadow: `0 4px 14px ${hexToRgba(s.brand, 0.18)}`,
        }}
      >
        <Download size={14} strokeWidth={2} />
        Ladda ner QR-kod ({s.paperLabel})
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════ */

function UrlInfoPanel({
  brand,
  guestUrl,
  onCopy,
}: {
  brand: string;
  guestUrl: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-[14px] bg-stone-50/80 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-[6px]"
          style={{ backgroundColor: hexToRgba(brand, 0.07), color: brand }}
        >
          <QrCode size={12} strokeWidth={2} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">
          Gästlänk (permanent)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p className="flex-1 rounded-[8px] bg-white px-3 py-2 font-mono text-[11px] text-stone-600 ring-1 ring-stone-200/60">
          {guestUrl}
        </p>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-[8px] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-500 ring-1 ring-stone-200/60 transition-all hover:bg-stone-50 active:scale-95"
        >
          Kopiera
        </button>
      </div>
      <p className="mt-2 px-1 text-[9px] text-stone-400">
        QR-koden pekar alltid hit — oavsett design ändras länken aldrig.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared Primitives
   ═══════════════════════════════════════════════════════ */

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-1 px-1">
      <h3 className="text-[13px] font-black tracking-tight text-stone-900">
        {label}
      </h3>
    </div>
  );
}

function ColorPicker({
  label,
  icon,
  value,
  onChange,
  brand,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  brand: string;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
        {icon} {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-[6px] border-0 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[8px] bg-white px-2.5 py-1.5 font-mono text-[10px] text-stone-600 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
          style={
            {
              "--tw-ring-color": hexToRgba(brand, 0.25),
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

function ToggleBtn({
  label,
  active,
  onClick,
  brand,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  brand: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 transition-all active:scale-95"
      style={
        active
          ? {
              backgroundColor: hexToRgba(brand, 0.06),
              color: brand,
              boxShadow: `0 0 0 1px ${hexToRgba(brand, 0.15)}`,
            }
          : {
              backgroundColor: "white",
              color: "#a8a29e",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            }
      }
    >
      <div
        className={`h-4 w-7 rounded-full p-0.5 transition-colors ${active ? "" : "bg-stone-200"}`}
        style={active ? { backgroundColor: brand } : undefined}
      >
        <div
          className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-3" : "translate-x-0"}`}
        />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
        {label}
      </span>
    </button>
  );
}

function SizeSelector({
  label,
  options,
  value,
  onChange,
  brand,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  brand: string;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
        {label}
      </label>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 rounded-[8px] py-2 text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
            style={
              value === o.value
                ? {
                    backgroundColor: brand,
                    color: "#fff",
                    boxShadow: `0 2px 6px ${hexToRgba(brand, 0.15)}`,
                  }
                : {
                    backgroundColor: "white",
                    color: "#a8a29e",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
