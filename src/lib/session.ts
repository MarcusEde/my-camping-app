// src/lib/session.ts
import { generateId } from "@/lib/uuid";

const SESSION_KEY = "campSID";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  // Switch from sessionStorage to localStorage
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id = generateId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}
