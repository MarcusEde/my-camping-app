import type { Lang } from "@/types/guest";
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// src/lib/utils.ts — append at bottom

/**
 * Detect browser language and map to supported Lang.
 * Falls back to "en" if unsupported.
 */
export function detectBrowserLang(
  supportedLangs: readonly string[] = ["sv", "en", "de", "da", "nl", "no"],
): Lang {
  if (typeof navigator === "undefined") return "en" as Lang;
  const raw = navigator.language?.slice(0, 2) ?? "en";
  return (supportedLangs.includes(raw) ? raw : "en") as Lang;
}
/** Format an ISO date string to Swedish locale (e.g. "3 jun 2025"). */
export function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format an ISO date string as relative time (e.g. "3h sedan"). */
export function fmtRelative(d: string | null): string {
  if (!d) return "Aldrig";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just nu";
  if (mins < 60) return `${mins}m sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d sedan`;
  return fmtDate(d);
}
export function repairJSON(raw: string): string {
  let s = raw.trim();

  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  // Handle arrays
  if (s.includes('"time"')) {
    const start = s.indexOf("[");
    if (start > 0) s = s.slice(start);
    if (!s.startsWith("[")) s = "[" + s;

    const end = s.lastIndexOf("]");
    if (end > 0) {
      s = s.slice(0, end + 1);
    } else {
      const lb = s.lastIndexOf("}");
      if (lb > 0) s = s.slice(0, lb + 1) + "]";
      else return "[]";
    }
  } else {
    // Handle standard objects (for translations)
    const start = s.indexOf("{");
    if (start > 0) s = s.slice(start);
    const end = s.lastIndexOf("}");
    if (end > 0) s = s.slice(0, end + 1);
  }

  s = s.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
  return s;
}
