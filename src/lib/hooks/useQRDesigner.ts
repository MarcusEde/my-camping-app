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
  small: 170,
  medium: 230,
  large: 295,
};

export const PAPER_SIZES: Record<
  PaperSize,
  { w: number; h: number; label: string }
> = {
  a4: { w: 595, h: 842, label: "A4" },
  a5: { w: 420, h: 595, label: "A5" },
  card: { w: 340, h: 480, label: "Kort" },
};

/* ─────────────────────────────────────────────────────
   Contrast helpers
───────────────────────────────────────────────────── */
function hexLuminance(hex: string): number {
  const c = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isQRScannable(hex: string): boolean {
  return 1.05 / (hexLuminance(hex) + 0.05) >= 3.0;
}

function safeQrColor(color: string): string {
  return isQRScannable(color) ? color : "#1a1a1a";
}

/* ─────────────────────────────────────────────────────
   Color utilities
───────────────────────────────────────────────────── */
function hexToRgb(hex: string) {
  const c = hex.replace("#", "").padEnd(6, "0");
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function darken(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amt)));
  return `#${d(r).toString(16).padStart(2, "0")}${d(g).toString(16).padStart(2, "0")}${d(b).toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  const l = (v: number) => Math.min(255, Math.round(v + (255 - v) * amt));
  return `#${l(r).toString(16).padStart(2, "0")}${l(g).toString(16).padStart(2, "0")}${l(b).toString(16).padStart(2, "0")}`;
}

function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─────────────────────────────────────────────────────
   Canvas drawing utilities
───────────────────────────────────────────────────── */

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function trackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: CanvasTextAlign = "left",
) {
  const chars = text.split("");
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((s, w) => s + w, 0) +
    tracking * Math.max(0, chars.length - 1);
  let cx = x;
  if (align === "center") cx = x - total / 2;
  else if (align === "right") cx = x - total;
  const saved = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, y);
    cx += widths[i] + tracking;
  }
  ctx.textAlign = saved;
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baselineY: number,
  maxWidth: number,
  lineHeight: number,
  opts?: { align?: CanvasTextAlign; maxLines?: number },
): { consumed: number; lineCount: number } {
  const align = opts?.align ?? ctx.textAlign;
  const maxLines = opts?.maxLines ?? 4;
  const allLines = wrapText(ctx, text, maxWidth);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines) lines[lines.length - 1] += "…";

  const saved = ctx.textAlign;
  ctx.textAlign = align;
  let ax = x;
  if (align === "center") ax = x + maxWidth / 2;
  else if (align === "right") ax = x + maxWidth;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], ax, baselineY + i * lineHeight);
  }
  ctx.textAlign = saved;
  return {
    consumed: Math.max(0, lines.length - 1) * lineHeight,
    lineCount: lines.length,
  };
}

function drawNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha = 0.015,
  density = 0.1,
) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const oc = off.getContext("2d");
  if (!oc) return;
  const img = oc.createImageData(w, h);
  const d = img.data;
  const a = Math.round(alpha * 255);
  for (let i = 0; i < d.length; i += 4) {
    if (Math.random() < density) {
      const v = Math.random() > 0.5 ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = a;
    }
  }
  oc.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0, w, h, 0, 0, w, h);
}

function resetShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/* ─────────────────────────────────────────────────────
   DrawCtx — shared data for template renderers
───────────────────────────────────────────────────── */
interface DC {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  qrImg: HTMLImageElement;
  qrPx: number;
  name: string;
  slogan: string;
  showName: boolean;
  showSlogan: boolean;
  url: string;
  bg: string;
  fg: string;
  brand: string;
}

/* ═══════════════════════════════════════════════════════
   MINIMAL
   ───────────────────────────────────────────────────
   Swiss international poster style.
   Thick left accent bar, oversized bold name anchored
   top, single hairline rule, QR centred, strict grid.
   Visual interest from extreme scale contrast between
   the massive headline and the small supporting text.
═══════════════════════════════════════════════════════ */
function drawMinimal(d: DC) {
  const {
    ctx,
    W,
    H,
    qrImg,
    qrPx,
    name,
    slogan,
    showName,
    showSlogan,
    url,
    fg,
  } = d;

  const m = Math.round(Math.min(W, H) * 0.07);
  const bar = Math.max(5, Math.round(W * 0.016));

  /* ── background ── */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  /* ── left accent bar ── */
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, bar, H);

  const left = bar + m;
  const contentW = W - left - m;
  let y = m;

  /* ── camp name — aggressively large ── */
  if (showName) {
    const fs = Math.min(54, W * 0.125, H * 0.07);
    ctx.fillStyle = fg;
    ctx.font = `800 ${fs}px system-ui, -apple-system, sans-serif`;
    const { consumed } = drawWrapped(
      ctx,
      name,
      left,
      y + fs,
      contentW,
      fs * 1.08,
      { align: "left", maxLines: 3 },
    );
    y += fs + consumed + Math.round(m * 0.6);
  } else {
    y += m;
  }

  /* ── hairline rule ── */
  ctx.strokeStyle = rgba(fg, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(W - m, y);
  ctx.stroke();
  y += Math.round(m * 0.5);

  /* ── QR centred in remaining space ── */
  const footerH = m * 2 + (showSlogan && slogan ? 48 : 28);
  const qrY = y + (H - footerH - y - qrPx) / 2;
  const qrX = (W - qrPx) / 2;

  /* faint outline to separate QR from paper */
  ctx.strokeStyle = rgba(fg, 0.045);
  ctx.lineWidth = 1;
  rr(ctx, qrX - 14, qrY - 14, qrPx + 28, qrPx + 28, 4);
  ctx.stroke();

  ctx.drawImage(qrImg, qrX, qrY, qrPx, qrPx);

  /* ── CTA ── */
  ctx.fillStyle = rgba(fg, 0.32);
  ctx.font = `500 ${Math.min(12, W * 0.028)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Skanna med din mobil", W / 2, qrY + qrPx + 26);

  /* ── slogan ── */
  if (showSlogan && slogan) {
    ctx.fillStyle = rgba(fg, 0.18);
    ctx.font = `400 italic ${Math.min(11, W * 0.025)}px Georgia, serif`;
    ctx.fillText(slogan, W / 2, qrY + qrPx + 48);
  }

  /* ── URL ── */
  ctx.fillStyle = rgba(fg, 0.14);
  ctx.font = `400 ${Math.min(8, W * 0.019)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(url, W / 2, H - m);
}

/* ═══════════════════════════════════════════════════════
   BRANDED
   ───────────────────────────────────────────────────
   Confident colour-block header (top 42 %) with subtle
   gradient + one large soft circle for depth.
   Clean transition to white. QR on a floating card
   with real shadow. Professional marketing piece feel.
═══════════════════════════════════════════════════════ */
function drawBranded(d: DC) {
  const {
    ctx,
    W,
    H,
    qrImg,
    qrPx,
    name,
    slogan,
    showName,
    showSlogan,
    url,
    bg,
    brand,
  } = d;

  const m = Math.round(Math.min(W, H) * 0.07);
  const splitY = Math.round(H * 0.42);

  /* ── colour block — slight gradient for richness ── */
  const grad = ctx.createLinearGradient(0, 0, 0, splitY);
  grad.addColorStop(0, darken(bg, 0.18));
  grad.addColorStop(0.6, bg);
  grad.addColorStop(1, lighten(bg, 0.06));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, splitY);

  /* ── white lower zone ── */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, splitY, W, H - splitY);

  /* ── single decorative circle — soft, large, anchored top-right ── */
  ctx.fillStyle = rgba(lighten(bg, 0.18), 0.18);
  ctx.beginPath();
  ctx.arc(W * 0.84, splitY * 0.08, W * 0.38, 0, Math.PI * 2);
  ctx.fill();

  /* ── camp name on colour block ── */
  if (showName) {
    const fs = Math.min(42, W * 0.095, splitY * 0.24);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
    ctx.shadowColor = rgba("#000", 0.18);
    ctx.shadowBlur = 14;
    drawWrapped(ctx, name, m, splitY * 0.32, W - m * 2, fs * 1.12, {
      align: "left",
      maxLines: 2,
    });
    resetShadow(ctx);
  }

  /* ── tagline on colour block ── */
  ctx.fillStyle = rgba("#FFFFFF", 0.55);
  ctx.font = `500 ${Math.min(11, W * 0.025)}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("Skanna för att utforska", m, splitY - Math.round(m * 0.55));

  /* ── thin white line under name ── */
  ctx.strokeStyle = rgba("#FFFFFF", 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m, splitY - Math.round(m * 1));
  ctx.lineTo(m + W * 0.35, splitY - Math.round(m * 1));
  ctx.stroke();

  /* ── QR card — centred in white zone ── */
  const qrX = (W - qrPx) / 2;
  const whiteTop = splitY;
  const whiteBot = H - m - 24;
  const cardPad = 20;
  const sloganOff = showSlogan && slogan ? 18 : 0;
  const qrY =
    whiteTop +
    (whiteBot - whiteTop - qrPx - cardPad * 2) / 2 +
    cardPad -
    sloganOff;

  /* shadow */
  ctx.shadowColor = rgba(bg, 0.14);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#FFFFFF";
  rr(
    ctx,
    qrX - cardPad,
    qrY - cardPad,
    qrPx + cardPad * 2,
    qrPx + cardPad * 2,
    14,
  );
  ctx.fill();
  resetShadow(ctx);

  /* card border */
  ctx.strokeStyle = rgba(bg, 0.1);
  ctx.lineWidth = 1;
  rr(
    ctx,
    qrX - cardPad,
    qrY - cardPad,
    qrPx + cardPad * 2,
    qrPx + cardPad * 2,
    14,
  );
  ctx.stroke();

  ctx.drawImage(qrImg, qrX, qrY, qrPx, qrPx);

  /* ── CTA / slogan below QR ── */
  if (showSlogan && slogan) {
    ctx.fillStyle = rgba(bg, 0.5);
    ctx.font = `500 ${Math.min(12, W * 0.027)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(slogan, W / 2, qrY + qrPx + cardPad + 22);
  } else {
    ctx.fillStyle = rgba(brand, 0.38);
    ctx.font = `600 ${Math.min(10, W * 0.023)}px system-ui, sans-serif`;
    trackedText(
      ctx,
      "SKANNA MED MOBILEN",
      W / 2,
      qrY + qrPx + cardPad + 22,
      2,
      "center",
    );
  }

  /* ── brand accent line ── */
  const accentW = Math.round(W * 0.12);
  ctx.strokeStyle = rgba(bg, 0.18);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo((W - accentW) / 2, H - m - 12);
  ctx.lineTo((W + accentW) / 2, H - m - 12);
  ctx.stroke();
  ctx.lineCap = "butt";

  /* ── URL ── */
  ctx.fillStyle = rgba(bg, 0.2);
  ctx.font = `400 ${Math.min(8, W * 0.019)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(url, W / 2, H - m + 4);
}

/* ═══════════════════════════════════════════════════════
   NATURE
   ───────────────────────────────────────────────────
   Warm cream paper, elegant double-line border,
   centred serif typography, ornamental rule with
   diamond, soft card for QR, and a barely-visible
   mountain silhouette at the foot for atmosphere.
   Lodge / national park poster feel via palette
   and type — no janky bezier illustrations.
═══════════════════════════════════════════════════════ */
function drawNature(d: DC) {
  const { ctx, W, H, qrImg, qrPx, name, slogan, showName, showSlogan, url } = d;

  const paper = "#FAF7F0";
  const cream = "#F0EADB";
  const earth = "#3B3426";
  const moss = "#506740";
  const rust = "#905A3C";
  const warm = "#C4A97D";

  const m = Math.round(Math.min(W, H) * 0.07);

  /* ── paper background ── */
  const bgG = ctx.createLinearGradient(0, 0, 0, H);
  bgG.addColorStop(0, paper);
  bgG.addColorStop(1, cream);
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, W, H);

  /* ── outer border ── */
  ctx.strokeStyle = rgba(warm, 0.45);
  ctx.lineWidth = 1.5;
  const b1 = Math.round(m * 0.55);
  ctx.strokeRect(b1, b1, W - b1 * 2, H - b1 * 2);

  /* ── inner border (double-line) ── */
  ctx.strokeStyle = rgba(warm, 0.18);
  ctx.lineWidth = 0.6;
  const b2 = b1 + 6;
  ctx.strokeRect(b2, b2, W - b2 * 2, H - b2 * 2);

  /* ── three dots ornament at top ── */
  const dotY = b2 + 16;
  const dotR = 2;
  const dotGap = 12;
  ctx.fillStyle = rgba(moss, 0.4);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 + i * dotGap, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── "GÄSTGUIDE" label ── */
  const lblFs = Math.min(9, W * 0.021);
  ctx.fillStyle = rgba(moss, 0.55);
  ctx.font = `600 ${lblFs}px Georgia, serif`;
  trackedText(ctx, "GÄSTGUIDE", W / 2, dotY + 20, 3, "center");

  let y = dotY + 36;

  /* ── camp name — centred serif ── */
  if (showName) {
    const fs = Math.min(36, W * 0.082, H * 0.052);
    ctx.fillStyle = earth;
    ctx.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";

    const lines = wrapText(ctx, name, W - m * 3);
    const maxLines = Math.min(lines.length, 2);
    for (let i = 0; i < maxLines; i++) {
      ctx.fillText(lines[i], W / 2, y + fs + i * fs * 1.18);
    }
    y += fs + (maxLines - 1) * fs * 1.18 + Math.round(fs * 0.45);

    /* ── decorative rule + centre diamond ── */
    const ruleW = Math.min(ctx.measureText(lines[0]).width * 0.65, W * 0.42);
    ctx.strokeStyle = rgba(rust, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - ruleW / 2, y);
    ctx.lineTo(W / 2 + ruleW / 2, y);
    ctx.stroke();

    /* diamond */
    const ds = 3.5;
    ctx.fillStyle = rgba(rust, 0.45);
    ctx.beginPath();
    ctx.moveTo(W / 2, y - ds);
    ctx.lineTo(W / 2 + ds, y);
    ctx.lineTo(W / 2, y + ds);
    ctx.lineTo(W / 2 - ds, y);
    ctx.closePath();
    ctx.fill();

    y += Math.round(m * 0.7);
  }

  /* ── QR on soft card ── */
  const qrX = (W - qrPx) / 2;
  const footerH = m * 2 + (showSlogan && slogan ? 56 : 34);
  const qrY = y + (H - footerH - y - qrPx) / 2;
  const cardPad = 16;

  /* card fill */
  ctx.fillStyle = rgba("#FFFFFF", 0.55);
  rr(
    ctx,
    qrX - cardPad,
    qrY - cardPad,
    qrPx + cardPad * 2,
    qrPx + cardPad * 2,
    5,
  );
  ctx.fill();
  /* card border */
  ctx.strokeStyle = rgba(warm, 0.3);
  ctx.lineWidth = 1;
  rr(
    ctx,
    qrX - cardPad,
    qrY - cardPad,
    qrPx + cardPad * 2,
    qrPx + cardPad * 2,
    5,
  );
  ctx.stroke();

  ctx.drawImage(qrImg, qrX, qrY, qrPx, qrPx);

  /* ── CTA ── */
  ctx.fillStyle = rust;
  ctx.font = `600 italic ${Math.min(13, W * 0.03)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("Skanna med mobilen", W / 2, qrY + qrPx + cardPad + 24);

  /* ── slogan ── */
  if (showSlogan && slogan) {
    ctx.fillStyle = rgba(earth, 0.3);
    ctx.font = `400 italic ${Math.min(11, W * 0.025)}px Georgia, serif`;
    ctx.fillText(`"${slogan}"`, W / 2, qrY + qrPx + cardPad + 46);
  }

  /* ── mountain silhouette — barely visible atmosphere ── */
  const mtBase = H - b1 - 2;
  const mtH = H * 0.035;
  ctx.fillStyle = rgba(moss, 0.045);
  ctx.beginPath();
  ctx.moveTo(b1, mtBase);
  ctx.lineTo(W * 0.14, mtBase - mtH * 0.4);
  ctx.lineTo(W * 0.24, mtBase - mtH * 0.12);
  ctx.lineTo(W * 0.36, mtBase - mtH * 0.85);
  ctx.lineTo(W * 0.46, mtBase - mtH * 0.35);
  ctx.lineTo(W * 0.58, mtBase - mtH);
  ctx.lineTo(W * 0.7, mtBase - mtH * 0.3);
  ctx.lineTo(W * 0.8, mtBase - mtH * 0.65);
  ctx.lineTo(W * 0.9, mtBase - mtH * 0.2);
  ctx.lineTo(W - b1, mtBase);
  ctx.closePath();
  ctx.fill();

  /* ── URL ── */
  ctx.fillStyle = rgba(earth, 0.16);
  ctx.font = `400 ${Math.min(8, W * 0.019)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(url, W / 2, H - m);
}

/* ═══════════════════════════════════════════════════════
   DARK
   ───────────────────────────────────────────────────
   Deep charcoal field, film grain, precise gold
   accents. Inset gold border, centred name in warm
   white, QR on a floating white card with gold-
   tinted ring. Cinema title-card / luxury hotel feel.
   Drama from negative space, not decoration.
═══════════════════════════════════════════════════════ */
function drawDark(d: DC) {
  const { ctx, W, H, qrImg, qrPx, name, slogan, showName, showSlogan, url } = d;

  const bg = "#141210";
  const gold = "#C9A84C";
  const warmWhite = "#EDE8DA";

  const m = Math.round(Math.min(W, H) * 0.07);

  /* ── deep background ── */
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── film grain ── */
  drawNoise(ctx, W, H, 0.014, 0.09);

  /* ── inset gold border ── */
  ctx.strokeStyle = rgba(gold, 0.25);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);

  /* ── top gold rule (short, centred) ── */
  const ruleW = Math.round(W * 0.22);
  const drawGoldRule = (y: number, opacity = 0.45) => {
    ctx.strokeStyle = rgba(gold, opacity);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((W - ruleW) / 2, y);
    ctx.lineTo((W + ruleW) / 2, y);
    ctx.stroke();
  };
  drawGoldRule(m + Math.round(m * 0.6));

  let y = m + Math.round(m * 1.2);

  /* ── camp name ── */
  if (showName) {
    const fs = Math.min(36, W * 0.082, H * 0.05);
    ctx.fillStyle = warmWhite;
    ctx.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
    const { consumed } = drawWrapped(
      ctx,
      name,
      m + 16,
      y + fs,
      W - m * 2 - 32,
      fs * 1.14,
      { align: "center", maxLines: 2 },
    );
    y += fs + consumed + Math.round(m * 0.5);

    /* shorter gold rule below name */
    const nameRuleW = Math.round(ruleW * 0.55);
    ctx.strokeStyle = rgba(gold, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((W - nameRuleW) / 2, y);
    ctx.lineTo((W + nameRuleW) / 2, y);
    ctx.stroke();
    y += Math.round(m * 0.6);
  }

  /* ── QR card — centred ── */
  const qrX = (W - qrPx) / 2;
  const footerH = m * 2 + (showSlogan && slogan ? 60 : 38);
  const qrY = y + (H - footerH - y - qrPx) / 2;
  const ringPad = 22;
  const cardPad = 8;

  /* dark surround card */
  ctx.fillStyle = "#1C1A14";
  rr(
    ctx,
    qrX - ringPad,
    qrY - ringPad,
    qrPx + ringPad * 2,
    qrPx + ringPad * 2,
    6,
  );
  ctx.fill();

  /* gold ring */
  ctx.strokeStyle = rgba(gold, 0.2);
  ctx.lineWidth = 1;
  rr(
    ctx,
    qrX - ringPad,
    qrY - ringPad,
    qrPx + ringPad * 2,
    qrPx + ringPad * 2,
    6,
  );
  ctx.stroke();

  /* white QR backing */
  ctx.fillStyle = "#FFFFFF";
  rr(
    ctx,
    qrX - cardPad,
    qrY - cardPad,
    qrPx + cardPad * 2,
    qrPx + cardPad * 2,
    3,
  );
  ctx.fill();

  ctx.drawImage(qrImg, qrX, qrY, qrPx, qrPx);

  /* ── "SKANNA HÄR" in gold ── */
  ctx.fillStyle = gold;
  ctx.font = `600 ${Math.min(11, W * 0.024)}px system-ui, sans-serif`;
  trackedText(ctx, "SKANNA HÄR", W / 2, qrY + qrPx + ringPad + 18, 4, "center");

  /* ── slogan ── */
  if (showSlogan && slogan) {
    ctx.fillStyle = rgba(warmWhite, 0.28);
    ctx.font = `300 italic ${Math.min(11, W * 0.025)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillText(slogan, W / 2, qrY + qrPx + ringPad + 42);
  }

  /* ── bottom gold rule ── */
  drawGoldRule(H - m - Math.round(m * 0.55), 0.2);

  /* ── URL ── */
  ctx.fillStyle = rgba(warmWhite, 0.13);
  ctx.font = `400 ${Math.min(8, W * 0.019)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(url, W / 2, H - m);
}

/* ─────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────── */
interface UseQRDesignerProps {
  campground: Campground;
  baseUrl: string;
}

export function useQRDesigner({ campground, baseUrl }: UseQRDesignerProps) {
  const brand = campground.primary_color || "#2A3C34";
  const guestUrl = `${baseUrl}/camp/${campground.slug}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [template, setTemplate] = useState("branded");
  const [bgColor, setBgColor] = useState(brand);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showName, setShowName] = useState(true);
  const [showSlogan, setShowSlogan] = useState(true);
  const [slogan, setSlogan] = useState("Skanna för att utforska!");
  const [qrSize, setQrSize] = useState<QRSize>("medium");
  const [paperSize, setPaperSize] = useState<PaperSize>("a5");

  const applyTemplate = useCallback(
    (id: string) => {
      const t = TEMPLATES.find((tpl) => tpl.id === id);
      if (!t) return;
      setTemplate(id);
      setBgColor(t.bgColor === "brand" ? brand : t.bgColor);
      setTextColor(t.textColor);
      setShowName(t.showName);
      setShowSlogan(t.showSlogan);
    },
    [brand],
  );

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRendering(true);
    setError(null);

    try {
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

      const W = paper.w;
      const H = paper.h;
      const qrPx = Math.min(QR_SIZES[qrSize], Math.min(W, H) * 0.7);
      const qrDotColor = safeQrColor(textColor);

      const qrDataUrl = await QRCode.toDataURL(guestUrl, {
        width: Math.round(qrPx * scale * 2),
        margin: 1,
        color: { dark: qrDotColor, light: "#00000000" },
        errorCorrectionLevel: "M",
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((res, rej) => {
        qrImg.onload = () => res();
        qrImg.onerror = () => rej(new Error("QR image failed to load"));
      });

      const dc: DC = {
        ctx,
        W,
        H,
        qrImg,
        qrPx,
        name: campground.name,
        slogan,
        showName,
        showSlogan,
        url: guestUrl,
        bg: bgColor,
        fg: textColor,
        brand,
      };

      switch (template) {
        case "minimal":
          drawMinimal(dc);
          break;
        case "branded":
          drawBranded(dc);
          break;
        case "nature":
          drawNature(dc);
          break;
        case "dark":
          drawDark(dc);
          break;
        default:
          drawBranded(dc);
          break;
      }

      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render");
      setReady(true);
    } finally {
      setIsRendering(false);
    }
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
    template,
    brand,
  ]);

  useEffect(() => {
    let cancelled = false;
    renderCanvas().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [renderCanvas]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${campground.slug}-${paperSize}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [campground.slug, paperSize]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
    } catch {}
  }, [guestUrl]);

  const handlePrint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>QR – ${campground.name}</title>` +
        `<style>@page{size:${PAPER_SIZES[paperSize].label};margin:0}` +
        `body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}` +
        `img{max-width:100%;max-height:100vh}</style></head>` +
        `<body><img src="${dataUrl}" onload="window.print();window.close()"/></body></html>`,
    );
    win.document.close();
  }, [campground.name, paperSize]);

  return {
    canvasRef,
    brand,
    guestUrl,
    ready,
    isRendering,
    error,
    paperLabel: PAPER_SIZES[paperSize].label,
    template,
    bgColor,
    setBgColor,
    textColor,
    setTextColor,
    showName,
    toggleShowName: () => setShowName((v) => !v),
    showSlogan,
    toggleShowSlogan: () => setShowSlogan((v) => !v),
    slogan,
    setSlogan,
    qrSize,
    setQrSize,
    paperSize,
    setPaperSize,
    applyTemplate,
    handleDownload,
    handleCopyUrl,
    handlePrint,
  };
}
