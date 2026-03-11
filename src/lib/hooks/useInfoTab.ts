// src/lib/hooks/useInfoTab.ts
"use client";

import { buildDirectionsMapLink } from "@/lib/place-utils";
import { getSettingsField } from "@/lib/settings-i18n";
import type { Campground } from "@/types/database";
import type { Lang } from "@/types/guest";

export function useInfoTab(campground: Campground, lang: Lang) {
  const phone = campground.phone || "";
  const email = campground.email || "";
  const website = campground.website || "";
  const address = campground.address || "";

  const receptionHours =
    getSettingsField(campground, "reception_hours", lang) || "";
  const checkOutInfo =
    getSettingsField(campground, "check_out_info", lang) || "";
  const trashRules = getSettingsField(campground, "trash_rules", lang) || "";
  const emergencyInfo =
    getSettingsField(campground, "emergency_info", lang) || "";
  const campRules = getSettingsField(campground, "camp_rules", lang) || "";

  const receptionMapLink = buildDirectionsMapLink(
    campground.latitude,
    campground.longitude,
    campground.name,
  );

  const hasContact = !!(phone || email || website || address || receptionHours);

  return {
    phone,
    email,
    website,
    address,
    receptionHours,
    checkOutInfo,
    trashRules,
    emergencyInfo,
    campRules,
    receptionMapLink,
    hasContact,
  };
}
