import type { Campground } from "@/types/database";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── Types ───────────────────────────────────────────── */
export type QRSize = "small" | "medium" | "large";
export type PaperSize = "a4" | "a5" | "card";

export interface Template {
  id: string;
  label: string;
  bgColor: string;
  textColor: string;
  showName: boolean;
  showSlogan: boolean;
}

/* ── Constants ───────────────────────────────────────── */
export const TEMPLATES: readonly Template[] = [
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

export const QR_SIZES: Record<QRSize, number> = {
  small: 180,
  medium: 260,
  large: 340,
};

export const PAPER_SIZES: Record<
  PaperSize,
  { w: number; h: number; label: string }
> = {
  a4: { w: 595, h: 842, label: "A4" },
  a5: { w: 420, h: 595, label: "A5" },
  card: { w: 340, h: 480, label: "Kort" },
};

/* ── Hook ────────────────────────────────────────────── */
interface UseQRDesignerProps {
  campground: Campground;
  baseUrl: string;
}

export function useQRDesigner({ campground, baseUrl }: UseQRDesignerProps) {
  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `${baseUrl}/camp/${campground.slug}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // ── Design state ──
  const [template, setTemplate] = useState("branded");
  const [bgColor, setBgColor] = useState(brand);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showName, setShowName] = useState(true);
  const [showSlogan, setShowSlogan] = useState(true);
  const [slogan, setSlogan] = useState("Skanna för att utforska!");
  const [qrSize, setQrSize] = useState<QRSize>("medium");
  const [paperSize, setPaperSize] = useState<PaperSize>("a5");

  // ── Apply a template preset ──
  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((tpl) => tpl.id === id);
    if (!t) return;
    setTemplate(id);
    setBgColor(t.bgColor === "brand" ? brand : t.bgColor);
    setTextColor(t.textColor);
    setShowName(t.showName);
    setShowSlogan(t.showSlogan);
  };

  // ── Canvas rendering ──
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        color: { dark: textColor, light: "#00000000" },
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

  // ── Download ──
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${campground.slug}-${paperSize}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ── Copy URL ──
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
    } catch {
      // fallback silently
    }
  };

  // ── Toggle helpers ──
  const toggleShowName = () => setShowName((v) => !v);
  const toggleShowSlogan = () => setShowSlogan((v) => !v);

  return {
    // Refs
    canvasRef,

    // Derived
    brand,
    guestUrl,
    ready,
    paperLabel: PAPER_SIZES[paperSize].label,

    // Design state
    template,
    bgColor,
    setBgColor,
    textColor,
    setTextColor,
    showName,
    toggleShowName,
    showSlogan,
    toggleShowSlogan,
    slogan,
    setSlogan,
    qrSize,
    setQrSize,
    paperSize,
    setPaperSize,

    // Handlers
    applyTemplate,
    handleDownload,
    handleCopyUrl,
  };
}
