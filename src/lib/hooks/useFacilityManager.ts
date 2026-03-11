import { deleteFacility, saveFacility } from "@/app/dashboard/actions";
import type { InternalLocation } from "@/types/database";
import { useState, useTransition } from "react";

interface UseFacilityManagerProps {
  campgroundId: string;
  facilities: InternalLocation[];
}

export function useFacilityManager({
  campgroundId,
  facilities: initial,
}: UseFacilityManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("toilet");
  const [newMinutes, setNewMinutes] = useState(1);

  const openAddForm = () => setShowAdd(true);
  const closeAddForm = () => setShowAdd(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const result = await saveFacility(campgroundId, {
          name: newName.trim(),
          type: newType,
          walking_minutes: newMinutes,
          is_active: true,
        });
        if (result.id) {
          setItems((prev) => [
            ...prev,
            {
              id: result.id,
              campground_id: campgroundId,
              name: newName.trim(),
              type: newType,
              walking_minutes: newMinutes,
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setNewName("");
        setNewType("toilet");
        setNewMinutes(1);
        setShowAdd(false);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fel");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteFacility(id);
        setItems((prev) => prev.filter((f) => f.id !== id));
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fel");
      }
    });
  };

  return {
    isPending,
    items,
    showAdd,
    openAddForm,
    closeAddForm,

    // Add form
    newName,
    setNewName,
    newType,
    setNewType,
    newMinutes,
    setNewMinutes,

    // Handlers
    handleAdd,
    handleDelete,
  };
}
