import {
  createPromotedPartner,
  deletePromotedPartner,
  togglePromotedPartnerActive,
  updatePromotedPartner,
} from "@/app/dashboard/actions";
import type {
  CachedPlace,
  Campground,
  PromotedPartnerWithClicks,
} from "@/types/database";
import { useMemo, useState, useTransition } from "react";

/* ── Helpers (domain logic) ──────────────────────────── */
export function isCurrentlyActive(partner: PromotedPartnerWithClicks): boolean {
  if (!partner.is_active) return false;
  const now = new Date();
  if (partner.starts_at && new Date(partner.starts_at) > now) return false;
  if (partner.ends_at && new Date(partner.ends_at) < now) return false;
  return true;
}

/* ── Hook ────────────────────────────────────────────── */
interface UsePartnerManagerProps {
  campground: Campground;
  partners: PromotedPartnerWithClicks[];
  places: CachedPlace[];
}

export function usePartnerManager({
  campground,
  partners,
  places,
}: UsePartnerManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const brand = campground.primary_color || "#2A3C34";

  // ── Add form state ──
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newPlaceId, setNewPlaceId] = useState("");
  const [newRank, setNewRank] = useState(0);
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newCouponCode, setNewCouponCode] = useState("");

  // ── Edit state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editPlaceId, setEditPlaceId] = useState("");
  const [editRank, setEditRank] = useState(0);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editCouponCode, setEditCouponCode] = useState("");

  // ── Computed ──
  const linkablePlaces = useMemo(
    () =>
      places
        .filter((p) => !p.is_hidden)
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [places],
  );

  const filtered = useMemo(() => {
    return partners
      .filter((p) => {
        const live = isCurrentlyActive(p);
        if (!showInactive && !live) return false;
        if (
          search &&
          !p.business_name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.priority_rank !== b.priority_rank)
          return a.priority_rank - b.priority_rank;
        return b.click_count - a.click_count;
      });
  }, [partners, search, showInactive]);

  const totalClicks = useMemo(
    () => partners.reduce((s, p) => s + p.click_count, 0),
    [partners],
  );

  const activeCount = useMemo(
    () => partners.filter(isCurrentlyActive).length,
    [partners],
  );

  // ── Internal helper ──
  const withAction = (id: string, action: () => Promise<void>) => {
    setActioningId(id);
    startTransition(async () => {
      try {
        await action();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
      setActioningId(null);
    });
  };

  // ── Add form ──
  const resetAddForm = () => {
    setNewName("");
    setNewDescription("");
    setNewWebsite("");
    setNewPhone("");
    setNewLogoUrl("");
    setNewPlaceId("");
    setNewRank(0);
    setNewStartsAt("");
    setNewEndsAt("");
    setNewCouponCode("");
    setShowAddForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setShowAddForm(true);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        await createPromotedPartner(campground.id, {
          business_name: newName.trim(),
          description: newDescription.trim() || undefined,
          website_url: newWebsite.trim() || undefined,
          phone: newPhone.trim() || undefined,
          logo_url: newLogoUrl.trim() || undefined,
          cached_place_id: newPlaceId || undefined,
          priority_rank: newRank,
          starts_at: newStartsAt
            ? new Date(newStartsAt).toISOString()
            : undefined,
          ends_at: newEndsAt ? new Date(newEndsAt).toISOString() : undefined,
          coupon_code: newCouponCode.trim() || undefined,
        });
        resetAddForm();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  // ── Edit ──
  const handleStartEdit = (p: PromotedPartnerWithClicks) => {
    setShowAddForm(false);
    setEditingId(p.id);
    setEditName(p.business_name);
    setEditDescription(p.description || "");
    setEditWebsite(p.website_url || "");
    setEditPhone(p.phone || "");
    setEditLogoUrl(p.logo_url || "");
    setEditPlaceId(p.cached_place_id || "");
    setEditRank(p.priority_rank);
    setEditStartsAt(p.starts_at ? p.starts_at.slice(0, 16) : "");
    setEditEndsAt(p.ends_at ? p.ends_at.slice(0, 16) : "");
    setEditCouponCode(p.coupon_code || "");
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    startTransition(async () => {
      try {
        await updatePromotedPartner(editingId, {
          business_name: editName.trim(),
          description: editDescription.trim() || undefined,
          website_url: editWebsite.trim() || undefined,
          phone: editPhone.trim() || undefined,
          logo_url: editLogoUrl.trim() || undefined,
          cached_place_id: editPlaceId || null,
          priority_rank: editRank,
          starts_at: editStartsAt
            ? new Date(editStartsAt).toISOString()
            : undefined,
          ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : null,
          coupon_code: editCouponCode.trim() || null,
        });
        setEditingId(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  // ── Delete & Toggle ──
  const handleDelete = (id: string, name: string) => {
    if (
      !confirm(`Ta bort "${name}"? All klick-data försvinner. Kan ej ångras.`)
    )
      return;
    withAction(id, () => deletePromotedPartner(id));
  };

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    withAction(id, () => togglePromotedPartnerActive(id, currentlyActive));
  };

  const toggleShowInactive = () => setShowInactive((v) => !v);

  return {
    // UI state
    isPending,
    brand,
    search,
    setSearch,
    showInactive,
    toggleShowInactive,
    showAddForm,
    openAddForm,
    actioningId,

    // Add form
    newName,
    setNewName,
    newDescription,
    setNewDescription,
    newWebsite,
    setNewWebsite,
    newPhone,
    setNewPhone,
    newLogoUrl,
    setNewLogoUrl,
    newPlaceId,
    setNewPlaceId,
    newRank,
    setNewRank,
    newStartsAt,
    setNewStartsAt,
    newEndsAt,
    setNewEndsAt,
    newCouponCode,
    setNewCouponCode,
    resetAddForm,

    // Edit
    editingId,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editWebsite,
    setEditWebsite,
    editPhone,
    setEditPhone,
    editLogoUrl,
    setEditLogoUrl,
    editPlaceId,
    setEditPlaceId,
    editRank,
    setEditRank,
    editStartsAt,
    setEditStartsAt,
    editEndsAt,
    setEditEndsAt,
    editCouponCode,
    setEditCouponCode,

    // Computed
    linkablePlaces,
    filtered,
    totalClicks,
    activeCount,

    // Handlers
    handleAdd,
    handleStartEdit,
    handleCancelEdit,
    handleUpdate,
    handleDelete,
    handleToggleActive,
  };
}
