"use client";

import {
  TEMPLATES,
  useQRDesigner,
  type PaperSize,
  type QRSize,
} from "@/lib/hooks/useQRDesigner";
import { hexToRgba } from "@/lib/utils";
import type { Campground } from "@/types/database";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Layers,
  Palette,
  Type,
} from "lucide-react";
import React, { useState } from "react";

/* ─────────────────────────────────────────────────────────
   Contrast helpers

   QR codes are always rendered with a WHITE module background
   internally (the squares live on white). If the QR dot color
   is also light, the result is invisible and unscannable.

   Fix in useQRDesigner hook: when calling the QR library, use
   `safeQrColor` (exported below) instead of `textColor` directly
   for the QR dot foreground.
   ───────────────────────────────────────────────────────── */

function luminance(hex: string): number {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const l = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
}

/** Contrast ratio of `hex` against white (1.0 = white, 21 = black) */
function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** True if the color is dark enough to be scanned on a white background */
function isScannable(hex: string): boolean {
  return contrastOnWhite(hex) >= 3.0;
}

/**
 * Returns a QR-safe dot color.
 * If the chosen textColor is too light, falls back to #1a1a1a (near-black).
 * Pass this to your QR canvas renderer in useQRDesigner instead of textColor.
 */
export function safeQrColor(textColor: string): string {
  return isScannable(textColor) ? textColor : "#1a1a1a";
}

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  baseUrl: string;
}

/* ── Component ───────────────────────────────────────── */
export default function QRDesigner({ campground, baseUrl }: Props) {
  const s = useQRDesigner({ campground, baseUrl });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    s.handleCopyUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrColorUnsafe = !isScannable(s.textColor);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {/* ══════════════════════════════════════
          LEFT COLUMN — Controls
          ══════════════════════════════════════ */}
      <div className="space-y-5">
        {/* ── Step 1: Template ── */}
        <Step
          number={1}
          title="Välj en mall"
          subtitle="Du kan anpassa allt efteråt"
        >
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => s.applyTemplate(t.id)}
                className={`group relative overflow-hidden rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition-all active:scale-[0.97] ${
                  s.template === t.id
                    ? "text-white shadow-md"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                style={
                  s.template === t.id
                    ? {
                        backgroundColor: s.brand,
                        boxShadow: `0 4px 12px ${hexToRgba(s.brand, 0.25)}`,
                      }
                    : {
                        backgroundColor: "white",
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
                      }
                }
              >
                {s.template === t.id && (
                  <span className="absolute right-2 top-2">
                    <Check
                      size={10}
                      strokeWidth={3}
                      className="text-white/70"
                    />
                  </span>
                )}
                {t.label}
              </button>
            ))}
          </div>
        </Step>

        {/* ── Step 2: Colors ── */}
        <Step number={2} title="Färger" subtitle="Matcha er campings profil">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Bakgrundsfärg"
                icon={<Palette size={11} />}
                value={s.bgColor}
                onChange={s.setBgColor}
                brand={s.brand}
              />
              <ColorField
                label="Text & QR-färg"
                icon={<Type size={11} />}
                value={s.textColor}
                onChange={s.setTextColor}
                brand={s.brand}
                warning={qrColorUnsafe}
              />
            </div>

            {/* ── Scanability warning ── */}
            {qrColorUnsafe && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-amber-200">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0 text-amber-500"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-[11px] font-black text-amber-800">
                    QR-koden går inte att skanna
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-amber-700">
                    Text & QR-färgen ({s.textColor}) är för ljus — QR-koden
                    ritas alltid mot vit bakgrund och syns inte. Välj en mörkare
                    färg, t.ex.{" "}
                    <button
                      onClick={() =>
                        s.setTextColor(
                          s.bgColor && luminance(s.bgColor) < 0.5
                            ? "#FFFFFF"
                            : "#1a1a1a",
                        )
                      }
                      className="font-black underline underline-offset-2 hover:text-amber-900"
                    >
                      svart (#1a1a1a)
                    </button>{" "}
                    eller en mörk variant av er profilfärg.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Step>

        {/* ── Step 3: Content ── */}
        <Step number={3} title="Innehåll" subtitle="Vad ska visas på koden?">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Toggle
                label="Campingnamn"
                active={s.showName}
                onClick={s.toggleShowName}
                brand={s.brand}
              />
              <Toggle
                label="Slogan"
                active={s.showSlogan}
                onClick={s.toggleShowSlogan}
                brand={s.brand}
              />
            </div>

            {s.showSlogan && (
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                  Slogantext
                </label>
                <input
                  type="text"
                  value={s.slogan}
                  onChange={(e) => s.setSlogan(e.target.value)}
                  placeholder="Skanna för att utforska!"
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-[13px] text-stone-800 ring-1 ring-stone-200 placeholder:text-stone-300 focus:outline-none focus:ring-2"
                  style={
                    {
                      "--tw-ring-color": hexToRgba(s.brand, 0.3),
                    } as React.CSSProperties
                  }
                />
              </div>
            )}
          </div>
        </Step>

        {/* ── Step 4: Size ── */}
        <Step number={4} title="Storlek" subtitle="Välj format för utskrift">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                <Layers size={10} />
                QR-storlek
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "small", label: "Liten" },
                    { value: "medium", label: "Mellan" },
                    { value: "large", label: "Stor" },
                  ] as { value: QRSize; label: string }[]
                ).map((o) => (
                  <SizeChip
                    key={o.value}
                    label={o.label}
                    active={s.qrSize === o.value}
                    onClick={() => s.setQrSize(o.value)}
                    brand={s.brand}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                Pappersformat
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "a4", label: "A4" },
                    { value: "a5", label: "A5" },
                    { value: "card", label: "Kort" },
                  ] as { value: PaperSize; label: string }[]
                ).map((o) => (
                  <SizeChip
                    key={o.value}
                    label={o.label}
                    active={s.paperSize === o.value}
                    onClick={() => s.setPaperSize(o.value)}
                    brand={s.brand}
                  />
                ))}
              </div>
            </div>
          </div>
        </Step>

        {/* ── Guest URL ── */}
        <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-100">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
            Gästlänk — QR-koden pekar alltid hit
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-[11px] font-mono text-stone-600 ring-1 ring-stone-200">
              {s.guestUrl}
            </code>
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ring-stone-200 transition-all active:scale-95"
              style={{ color: copied ? "#059669" : "#78716c" }}
            >
              {copied ? (
                <Check size={11} strokeWidth={2.5} />
              ) : (
                <Copy size={11} />
              )}
              {copied ? "Kopierat!" : "Kopiera"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT COLUMN — Sticky preview
          ══════════════════════════════════════ */}
      <div className="lg:sticky lg:top-6 lg:self-start space-y-3">
        {/* Preview card */}
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          <div className="border-b border-stone-100 px-4 py-3 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
              Förhandsvisning
            </p>
            {qrColorUnsafe && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-600">
                <AlertTriangle size={9} />
                Ej skanningsbar
              </span>
            )}
          </div>
          <div className="flex items-center justify-center bg-stone-50/80 p-6">
            <canvas
              ref={s.canvasRef}
              className="rounded-xl shadow-lg"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
          <div className="border-t border-stone-100 px-4 py-2">
            <p className="text-[10px] text-stone-400 text-center">
              Format: {s.paperLabel}
            </p>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={s.handleDownload}
          disabled={!s.ready || qrColorUnsafe}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-[12px] font-black uppercase tracking-[0.1em] text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: s.brand,
            boxShadow: `0 4px 16px ${hexToRgba(s.brand, 0.22)}`,
          }}
          title={
            qrColorUnsafe
              ? "Åtgärda färgvarningen innan du laddar ner"
              : undefined
          }
        >
          <Download size={15} strokeWidth={2} />
          Ladda ner PNG
        </button>

        {qrColorUnsafe ? (
          <p className="text-center text-[10px] leading-relaxed text-amber-600 px-2 font-semibold">
            Åtgärda färgvarningen ovan för att kunna ladda ner.
          </p>
        ) : (
          <p className="text-center text-[10px] leading-relaxed text-stone-400 px-2">
            Skriv ut och sätt upp på receptionen, välkomststolpen eller vid ditt
            servicehus — gäster skannar med sin mobil.
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Step wrapper
   ═══════════════════════════════════════════════════ */
function Step({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/60">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-black text-white">
          {number}
        </div>
        <div>
          <h3 className="text-[13px] font-black tracking-tight text-stone-900 leading-tight">
            {title}
          </h3>
          <p className="text-[10px] text-stone-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Color field
   ═══════════════════════════════════════════════════ */
function ColorField({
  label,
  icon,
  value,
  onChange,
  brand,
  warning,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  brand: string;
  warning?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
        {icon}
        {label}
        {warning && (
          <AlertTriangle size={10} className="ml-auto text-amber-500" />
        )}
      </label>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 w-10 cursor-pointer rounded-xl border-0 p-1 ring-1 ${
            warning ? "ring-amber-300" : "ring-stone-200"
          }`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 rounded-xl bg-stone-50 px-3 py-2 font-mono text-[12px] text-stone-700 ring-1 focus:outline-none focus:ring-2 focus:bg-white ${
            warning ? "ring-amber-200" : "ring-stone-100"
          }`}
          style={
            { "--tw-ring-color": hexToRgba(brand, 0.25) } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Toggle
   ═══════════════════════════════════════════════════ */
function Toggle({
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
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
      style={
        active
          ? {
              backgroundColor: hexToRgba(brand, 0.06),
              boxShadow: `inset 0 0 0 1px ${hexToRgba(brand, 0.2)}`,
            }
          : {
              backgroundColor: "white",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
            }
      }
    >
      <span
        className="text-[11px] font-bold"
        style={{ color: active ? brand : "#78716c" }}
      >
        {label}
      </span>
      <div
        className="flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors"
        style={{ backgroundColor: active ? brand : "#d6d3d1" }}
      >
        <div
          className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: active ? "translateX(16px)" : "translateX(0)" }}
        />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   Size chip
   ═══════════════════════════════════════════════════ */
function SizeChip({
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
      className="flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all active:scale-95"
      style={
        active
          ? {
              backgroundColor: brand,
              color: "white",
              boxShadow: `0 2px 8px ${hexToRgba(brand, 0.2)}`,
            }
          : {
              backgroundColor: "white",
              color: "#a8a29e",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
            }
      }
    >
      {label}
    </button>
  );
}
