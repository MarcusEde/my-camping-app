import { deleteFacility, saveFacility } from "@/app/dashboard/actions";
import type { InternalLocation } from "@/types/database";
import { useState, useTransition } from "react";

const ERROR_FALLBACK: Record<string, string> = {
  sv: "Fel", en: "Error", de: "Fehler",
  da: "Fejl", nl: "Fout", no: "Feil",
};

interface UseFacilityManagerProps {
  campgroundId: string;
  facilities: InternalLocation[];
  lang: string;
}

export function useFacilityManager({
  campgroundId,
  facilities: initial,
  lang,
}: UseFacilityManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("toilet");
  const [newMinutes, setNewMinutes] = useState(1);

  const openAddForm = () => setShowAdd(true);
  const closeAddForm = () => setShowAdd(false);

  const errorMsg = (e: unknown) =>
    e instanceof Error ? e.message : (ERROR_FALLBACK[lang] ?? ERROR_FALLBACK.en);

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
        alert(errorMsg(e));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteFacility(id);
        setItems((prev) => prev.filter((f) => f.id !== id));
      } catch (e: unknown) {
        alert(errorMsg(e));
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
