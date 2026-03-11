import {
  addCustomPlace,
  deletePlace,
  saveNote,
  toggleHide,
  togglePin,
  updatePlaceDetails,
} from "@/app/dashboard/actions";
import type { CachedPlace, Campground, PlaceCategory } from "@/types/database";
import { useMemo, useState, useTransition } from "react";

interface UsePlacesManagerProps {
  campground: Campground;
  places: CachedPlace[];
}

export function usePlacesManager({
  campground,
  places,
}: UsePlacesManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<PlaceCategory | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const brand = campground.primary_color || "#2A3C34";

  // ── Add form state ──
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<PlaceCategory>("other");
  const [newAddress, setNewAddress] = useState("");
  const [newIsOnSite, setNewIsOnSite] = useState(false);
  const [newIsIndoor, setNewIsIndoor] = useState(false);
  const [newCustomHours, setNewCustomHours] = useState("");

  // ── Note editing ──
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // ── Details editing ──
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editIsOnSite, setEditIsOnSite] = useState(false);
  const [editIsIndoor, setEditIsIndoor] = useState(false);
  const [editCustomHours, setEditCustomHours] = useState("");

  // ── Computed ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const p of places) {
      if (!showHidden && p.is_hidden) continue;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        continue;
      counts.all = (counts.all || 0) + 1;
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [places, showHidden, search]);

  const filtered = useMemo(() => {
    return places
      .filter((p) => {
        if (!showHidden && p.is_hidden) return false;
        if (filterCat !== "all" && p.category !== filterCat) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return a.name.localeCompare(b.name, "sv");
      });
  }, [places, search, filterCat, showHidden]);

  const availableCats = useMemo(() => {
    const cats = new Set(places.map((p) => p.category));
    return ["all" as const, ...Array.from(cats)] as (PlaceCategory | "all")[];
  }, [places]);

  const isAddFormValid =
    newName.trim() !== "" && (newAddress.trim() !== "" || newIsOnSite);

  const getIsEditDetailsValid = (place: CachedPlace): boolean => {
    const hasCoordinates = Boolean(place.latitude && place.longitude);
    const hasAddress = Boolean(place.address);
    return hasAddress || hasCoordinates || editIsOnSite;
  };

  // ── Internal helper ──
  const withAction = (placeId: string, action: () => Promise<void>) => {
    setActioningId(placeId);
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

  // ── Handlers ──
  const handleAddPlace = () => {
    if (!isAddFormValid) return;
    startTransition(async () => {
      try {
        await addCustomPlace(
          campground.id,
          newName.trim(),
          newCategory,
          newAddress.trim() || undefined,
          newIsOnSite,
          newIsIndoor,
          newCustomHours.trim() || undefined,
        );
        setNewName("");
        setNewAddress("");
        setNewCategory("other");
        setNewIsOnSite(false);
        setNewIsIndoor(false);
        setNewCustomHours("");
        setShowAddForm(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleSaveNote = (placeId: string) => {
    withAction(placeId, async () => {
      await saveNote(placeId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText("");
    });
  };

  const handleSaveDetails = (placeId: string) => {
    withAction(placeId, async () => {
      await updatePlaceDetails(placeId, {
        is_on_site: editIsOnSite,
        is_indoor: editIsIndoor,
        custom_hours: editCustomHours.trim() || null,
      });
      setEditingDetailsId(null);
    });
  };

  const handleDelete = (placeId: string, name: string) => {
    if (!confirm(`Ta bort "${name}"? Kan inte ångras.`)) return;
    withAction(placeId, () => deletePlace(placeId));
  };

  const handleTogglePin = (placeId: string, isPinned: boolean) => {
    withAction(placeId, () => togglePin(placeId, isPinned));
  };

  const handleToggleHide = (placeId: string, isHidden: boolean) => {
    withAction(placeId, () => toggleHide(placeId, isHidden));
  };

  const handleToggleNoteEdit = (place: CachedPlace) => {
    if (editingNoteId === place.id) {
      setEditingNoteId(null);
    } else {
      setEditingNoteId(place.id);
      setEditingNoteText(place.owner_note || "");
      setEditingDetailsId(null);
    }
  };

  const handleToggleDetailsEdit = (place: CachedPlace) => {
    if (editingDetailsId === place.id) {
      setEditingDetailsId(null);
    } else {
      setEditingDetailsId(place.id);
      setEditIsOnSite(place.is_on_site ?? false);
      setEditIsIndoor(place.is_indoor ?? false);
      setEditCustomHours(place.custom_hours ?? "");
      setEditingNoteId(null);
    }
  };

  const handleCancelNoteEdit = () => setEditingNoteId(null);
  const handleCancelDetailsEdit = () => setEditingDetailsId(null);

  const toggleShowHidden = () => setShowHidden((v) => !v);
  const toggleShowAddForm = () => setShowAddForm((v) => !v);
  const closeAddForm = () => setShowAddForm(false);
  const clearFilter = () => setFilterCat("all");

  const toggleNewIsOnSite = () => setNewIsOnSite((v) => !v);
  const toggleNewIsIndoor = () => setNewIsIndoor((v) => !v);
  const toggleEditIsOnSite = () => setEditIsOnSite((v) => !v);
  const toggleEditIsIndoor = () => setEditIsIndoor((v) => !v);

  return {
    // UI state
    isPending,
    brand,
    search,
    setSearch,
    filterCat,
    setFilterCat,
    showHidden,
    toggleShowHidden,
    showAddForm,
    toggleShowAddForm,
    closeAddForm,
    actioningId,
    clearFilter,

    // Add form
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    newAddress,
    setNewAddress,
    newIsOnSite,
    toggleNewIsOnSite,
    newIsIndoor,
    toggleNewIsIndoor,
    newCustomHours,
    setNewCustomHours,
    isAddFormValid,

    // Note editing
    editingNoteId,
    editingNoteText,
    setEditingNoteText,

    // Details editing
    editingDetailsId,
    editIsOnSite,
    toggleEditIsOnSite,
    editIsIndoor,
    toggleEditIsIndoor,
    editCustomHours,
    setEditCustomHours,

    // Computed
    categoryCounts,
    filtered,
    availableCats,
    getIsEditDetailsValid,

    // Handlers
    handleAddPlace,
    handleSaveNote,
    handleSaveDetails,
    handleDelete,
    handleTogglePin,
    handleToggleHide,
    handleToggleNoteEdit,
    handleToggleDetailsEdit,
    handleCancelNoteEdit,
    handleCancelDetailsEdit,
  };
}
