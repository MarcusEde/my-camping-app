import { generateId } from "@/lib/uuid";
const SESSION_KEY = "campSID";
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id = generateId();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}
