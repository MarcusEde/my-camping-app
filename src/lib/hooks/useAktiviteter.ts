// src/lib/hooks/useAktiviteter.ts
"use client";

import { useMemo } from "react";

import type { Announcement, PromotedPartner } from "@/types/database";

export function useAktiviteter(
  announcements: Announcement[],
  partners: PromotedPartner[],
) {
  const events = useMemo(
    () =>
      announcements
        .filter((a) => a.type === "event")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [announcements],
  );

  const activePartners = useMemo(
    () =>
      partners
        .filter((p) => p.is_active)
        .sort((a, b) => a.priority_rank - b.priority_rank),
    [partners],
  );

  return { events, activePartners };
}
