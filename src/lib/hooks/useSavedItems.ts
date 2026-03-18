// src/lib/hooks/useSavedItems.ts
"use client";

import { useCallback, useEffect, useState } from "react";

const SAVED_ITEMS_KEY = "campSavedItems";

/**
 * Reads saved item IDs from localStorage.
 * Returns an empty array if nothing is stored or if running on the server.
 */
function readSavedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Writes the saved item IDs array to localStorage.
 */
function writeSavedItems(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(ids));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/**
 * Optional callback fired when a NEW item is saved.
 * NOT fired on unsave/remove — we only care about positive intent.
 */
export interface UseSavedItemsOptions {
  onSave?: (id: string) => void;
}

/**
 * Custom hook for managing "Save to My Stay" bookmarked place IDs.
 *
 * Persists to localStorage using the same pattern as session.ts.
 * Items persist across browser refreshes but are device-specific.
 *
 * @param options.onSave — Optional callback fired when a new item is
 *   added (not when removed). Used by useGuestApp to fire analytics.
 */
export function useSavedItems(options?: UseSavedItemsOptions) {
  const [savedIds, setSavedIds] = useState<string[]>(() => readSavedItems());

  // Sync state → localStorage whenever savedIds changes
  useEffect(() => {
    writeSavedItems(savedIds);
  }, [savedIds]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SAVED_ITEMS_KEY) {
        setSavedIds(readSavedItems());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleSaved = useCallback(
    (id: string) => {
      setSavedIds((prev) => {
        if (prev.includes(id)) {
          // Unsaving — no analytics event
          return prev.filter((x) => x !== id);
        }
        // Saving — fire the callback for analytics
        options?.onSave?.(id);
        return [...prev, id];
      });
    },
    [options?.onSave],
  );

  const isSaved = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds],
  );

  const removeSaved = useCallback((id: string) => {
    setSavedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSavedIds([]);
  }, []);

  return {
    savedIds,
    toggleSaved,
    isSaved,
    removeSaved,
    clearAll,
  };
}
