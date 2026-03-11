import {
  adminClearGooglePlaces,
  adminDeleteCampground,
  adminSyncCampground,
  adminUpdateCampground,
} from "@/app/admin/actions";
import type { CampStats } from "@/types/admin";
import { useState, useTransition } from "react";

const CATEGORY_EMOJI: Record<string, string> = {
  park: "🌲",
  beach: "🏖️",
  shopping: "🛒",
  restaurant: "🍽️",
  cafe: "☕",
  museum: "🏛️",
  other: "📍",
  cinema: "🎬",
  spa: "💆",
  bowling: "🎳",
  swimming: "🏊",
};

export interface EditFormState {
  name: string;
  slug: string;
  subscription_status: string;
  trial_ends_at: string;
  primary_color: string;
  latitude: string;
  longitude: string;
  wifi_name: string;
  wifi_password: string;
  check_out_info: string;
  trash_rules: string;
  emergency_info: string;
  logo_url: string;
  hero_image_url: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  reception_hours: string;
  camp_rules: string;
}

interface UseAdminCampgroundCardProps {
  camp: CampStats;
}

export function useAdminCampgroundCard({ camp }: UseAdminCampgroundCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [editForm, setEditForm] = useState<EditFormState>({
    name: camp.name,
    slug: camp.slug,
    subscription_status: camp.subscription_status,
    trial_ends_at: camp.trial_ends_at?.slice(0, 10) ?? "",
    primary_color: camp.primary_color,
    latitude: String(camp.latitude),
    longitude: String(camp.longitude),
    wifi_name: camp.wifi_name ?? "",
    wifi_password: camp.wifi_password ?? "",
    check_out_info: camp.check_out_info ?? "",
    trash_rules: camp.trash_rules ?? "",
    emergency_info: camp.emergency_info ?? "",
    logo_url: camp.logo_url ?? "",
    hero_image_url: camp.hero_image_url ?? "",
    phone: camp.phone ?? "",
    email: camp.email ?? "",
    website: camp.website ?? "",
    address: camp.address ?? "",
    reception_hours: camp.reception_hours ?? "",
    camp_rules: camp.camp_rules ?? "",
  });

  const totalPlaces = camp.googlePlacesActive + camp.customPlaces;

  // ── Field setter ──
  const setField = (key: keyof EditFormState, value: string) =>
    setEditForm((f) => ({ ...f, [key]: value }));

  // ── Toggle helpers ──
  const toggleExpanded = () => setIsExpanded((v) => !v);
  const toggleEditing = () => setIsEditing((v) => !v);

  // ── Handlers ──
  const handleSave = () => {
    startTransition(async () => {
      try {
        await adminUpdateCampground(camp.id, {
          ...editForm,
          latitude: parseFloat(editForm.latitude),
          longitude: parseFloat(editForm.longitude),
          trial_ends_at: editForm.trial_ends_at
            ? new Date(editForm.trial_ends_at).toISOString()
            : null,
        });
        setIsEditing(false);
        alert("✅ Uppdaterat!");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`❌ ${msg}`);
      }
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      try {
        const res = await adminSyncCampground(camp.id);
        const summary = res.categorySummary
          ? Object.entries(res.categorySummary)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(
                ([cat, count]) =>
                  `  ${CATEGORY_EMOJI[cat] ?? "·"} ${cat}: ${count}`,
              )
              .join("\n")
          : "";
        alert(
          `✅ Synk klar!\n\nTillagda: ${res.addedCount}\nUppdaterade: ${res.updatedCount}\nNära-dubbletter: ${res.nearDupesRemoved}\nFiltrerade: ${res.filteredOut}\nAPI-fel: ${res.apiErrors}\nTotalt sparade: ${res.totalSaved}\n\nPer kategori:\n${summary}`,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`❌ ${msg}`);
      }
    });
  };

  const handleClear = () => {
    if (!confirm(`Rensa alla Google-platser för "${camp.name}"?`)) return;
    startTransition(async () => {
      try {
        await adminClearGooglePlaces(camp.id);
        alert("🗑️ Rensat.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`❌ ${msg}`);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`🚨 RADERA "${camp.name}" och ägarkonto?\nKan INTE ångras!`))
      return;
    startTransition(async () => {
      try {
        await adminDeleteCampground(camp.id, camp.owner_id);
        alert("✅ Raderat.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`❌ ${msg}`);
      }
    });
  };

  return {
    // UI state
    isExpanded,
    isEditing,
    isPending,
    totalPlaces,

    // Edit form
    editForm,
    setField,

    // Toggle
    toggleExpanded,
    toggleEditing,

    // Handlers
    handleSave,
    handleSync,
    handleClear,
    handleDelete,
  };
}
