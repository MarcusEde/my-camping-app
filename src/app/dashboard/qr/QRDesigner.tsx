// src/app/dashboard/qr/QRDesigner.tsx
"use client";

import type { Campground } from "@/types/database";
import { Download, Eye, Palette, QrCode, Type } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

/* ── Utility ─────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ── Presets ──────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: "minimal",
    label: "Minimal",
    bgColor: "#FFFFFF",
    textColor: "#1c1917",
    showName: true,
    showSlogan: false,
  },
  {
    id: "branded",
    label: "Branded",
    bgColor: "brand",
    textColor: "#FFFFFF",
    showName: true,
    showSlogan: true,
  },
  {
    id: "nature",
    label: "Natur",
    bgColor: "#F5F0E8",
    textColor: "#3d3929",
    showName: true,
    showSlogan: true,
  },
  {
    id: "dark",
    label: "Mörk",
    bgColor: "#1c1917",
    textColor: "#FFFFFF",
    showName: true,
    showSlogan: false,
  },
] as const;

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campground: Campground;
  baseUrl: string; // passed from server to avoid hydration mismatch
}

/* ── Component ───────────────────────────────────────── */
export default function QRDesigner({ campground, baseUrl }: Props) {
  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `${baseUrl}/camp/${campground.slug}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // Design state
  const [template, setTemplate] = useState<string>("branded");
  const [bgColor, setBgColor] = useState(brand);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showName, setShowName] = useState(true);
  const [showSlogan, setShowSlogan] = useState(true);
  const [slogan, setSlogan] = useState("Skanna för att utforska!");
  const [qrSize, setQrSize] = useState<"small" | "medium" | "large">("medium");
  const [paperSize, setPaperSize] = useState<"a4" | "a5" | "card">("a5");

  const QR_SIZES = { small: 180, medium: 260, large: 340 };
  const PAPER_SIZES = {
    a4: { w: 595, h: 842, label: "A4" },
    a5: { w: 420, h: 595, label: "A5" },
    card: { w: 340, h: 480, label: "Kort" },
  };

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((t) => t.id === id);
    if (!t) return;
    setTemplate(id);
    setBgColor(t.bgColor === "brand" ? brand : t.bgColor);
    setTextColor(t.textColor);
    setShowName(t.showName);
    setShowSlogan(t.showSlogan);
  };

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dynamically import qrcode only on client
    const QRCode = (await import("qrcode")).default;

    const paper = PAPER_SIZES[paperSize];
    const scale = 2;
    canvas.width = paper.w * scale;
    canvas.height = paper.h * scale;
    canvas.style.width = `${paper.w}px`;
    canvas.style.height = `${paper.h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, paper.w, paper.h);

    // QR Code
    const qrPx = QR_SIZES[qrSize];
    const qrX = (paper.w - qrPx) / 2;
    const qrY = showName ? paper.h * 0.28 : paper.h * 0.2;

    try {
      const qrDataUrl = await QRCode.toDataURL(guestUrl, {
        width: qrPx * 2,
        margin: 2,
        color: {
          dark: textColor,
          light: "#00000000",
        },
        errorCorrectionLevel: "M",
      });

      const img = new Image();
      img.src = qrDataUrl;
      await new Promise<void>((res) => {
        img.onload = () => res();
      });

      // White background behind QR
      const pad = 16;
      ctx.fillStyle =
        bgColor === "#FFFFFF" || bgColor === "#F5F0E8"
          ? "#FFFFFF"
          : "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.roundRect(qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, 16);
      ctx.fill();

      ctx.drawImage(img, qrX, qrY, qrPx, qrPx);
    } catch {
      // QR generation failed silently
    }

    // Campground name
    if (showName) {
      ctx.fillStyle = textColor;
      ctx.font = `800 ${Math.min(28, paper.w * 0.06)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(campground.name, paper.w / 2, qrY - 30);
    }

    // Slogan
    if (showSlogan && slogan) {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.6;
      ctx.font = `500 ${Math.min(14, paper.w * 0.033)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(slogan, paper.w / 2, qrY + qrPx + 50);
      ctx.globalAlpha = 1;
    }

    // URL at bottom
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.3;
    ctx.font = `600 ${Math.min(10, paper.w * 0.024)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(guestUrl, paper.w / 2, paper.h - 30);
    ctx.globalAlpha = 1;

    setReady(true);
  }, [
    bgColor,
    textColor,
    showName,
    showSlogan,
    slogan,
    qrSize,
    paperSize,
    campground.name,
    guestUrl,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${campground.slug}-${paperSize}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* ── URL Info ── */}
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
            onClick={handleCopyUrl}
            className="shrink-0 rounded-[8px] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-500 ring-1 ring-stone-200/60 transition-all hover:bg-stone-50 active:scale-95"
          >
            Kopiera
          </button>
        </div>
        <p className="mt-2 px-1 text-[9px] text-stone-400">
          QR-koden pekar alltid hit — oavsett design ändras länken aldrig.
        </p>
      </div>

      {/* ── Templates ── */}
      <div>
        <SectionLabel label="Mall" />
        <div className="flex gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className="flex-1 rounded-[10px] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              style={
                template === t.id
                  ? {
                      backgroundColor: brand,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${hexToRgba(brand, 0.18)}`,
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
              value={bgColor}
              onChange={setBgColor}
              brand={brand}
            />
            <ColorPicker
              label="Text & QR"
              icon={<Type size={9} />}
              value={textColor}
              onChange={setTextColor}
              brand={brand}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-2">
          <ToggleBtn
            label="Namn"
            active={showName}
            onClick={() => setShowName(!showName)}
            brand={brand}
          />
          <ToggleBtn
            label="Slogan"
            active={showSlogan}
            onClick={() => setShowSlogan(!showSlogan)}
            brand={brand}
          />
        </div>

        {showSlogan && (
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Skanna för att utforska!"
            className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2"
            style={
              {
                "--tw-ring-color": hexToRgba(brand, 0.25),
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
            value={qrSize}
            onChange={(v) => setQrSize(v as "small" | "medium" | "large")}
            brand={brand}
          />
          <SizeSelector
            label="Papper"
            options={[
              { value: "a4", label: "A4" },
              { value: "a5", label: "A5" },
              { value: "card", label: "Kort" },
            ]}
            value={paperSize}
            onChange={(v) => setPaperSize(v as "a4" | "a5" | "card")}
            brand={brand}
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
            ref={canvasRef}
            className="rounded-[12px] shadow-lg"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* ── Download ── */}
      <button
        onClick={handleDownload}
        disabled={!ready}
        className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
        style={{
          backgroundColor: brand,
          boxShadow: `0 4px 14px ${hexToRgba(brand, 0.18)}`,
        }}
      >
        <Download size={14} strokeWidth={2} />
        Ladda ner QR-kod ({PAPER_SIZES[paperSize].label})
      </button>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

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
