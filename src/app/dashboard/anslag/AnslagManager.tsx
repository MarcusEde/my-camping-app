"use client";

import React, { useState, useTransition } from "react";
import type { Announcement, Campground } from "@/types/database";
import { Plus, X, Pencil, Trash2, Loader2 } from "lucide-react";
import { hexToRgba } from "@/lib/utils";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/app/dashboard/actions";

const ANNOUNCEMENT_TYPES = [
  { value: "info" as const, label: "Information", emoji: "📢" },
  { value: "event" as const, label: "Evenemang", emoji: "🎉" },
  { value: "warning" as const, label: "Varning", emoji: "⚠️" },
];

interface Props {
  campground: Campground;
  announcements: Announcement[];
  brand: string;
}

export default function AnslagManager({ campground, announcements, brand }: Props) {
  const [isCreating, startCreateTransition] = useTransition();
  const [, startUpdateTransition] = useTransition();
  const [, startDeleteTransition] = useTransition();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"info" | "event" | "warning">("info");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"info" | "event" | "warning">("info");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validateNew = () => {
    const errs: Record<string, string> = {};
    if (!newTitle.trim()) errs.title = "Rubrik är obligatorisk.";
    else if (newTitle.length > 100) errs.title = "Max 100 tecken.";

    if (!newContent.trim()) errs.content = "Innehåll är obligatoriskt.";
    else if (newContent.length > 500) errs.content = "Max 500 tecken.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEdit = () => {
    const errs: Record<string, string> = {};
    if (!editTitle.trim()) errs.title = "Rubrik är obligatorisk.";
    else if (editTitle.length > 100) errs.title = "Max 100 tecken.";

    if (!editContent.trim()) errs.content = "Innehåll är obligatoriskt.";
    else if (editContent.length > 500) errs.content = "Max 500 tecken.";

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = () => {
    if (isCreating || !validateNew()) return;
    startCreateTransition(async () => {
      try {
        await createAnnouncement(campground.id, newTitle.trim(), newContent.trim(), newType);
        setNewTitle("");
        setNewContent("");
        setNewType("info");
        setErrors({});
        setShowNewForm(false);
      } catch (e: unknown) {
        alert(`Fel: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    });
  };

  const handleStartEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditType(ann.type as "info" | "event" | "warning");
  };

  const handleUpdate = () => {
    if (!editingId || !validateEdit()) return;
    startUpdateTransition(async () => {
      try {
        await updateAnnouncement(editingId, editTitle.trim(), editContent.trim(), editType);
        setEditingId(null);
        setEditErrors({});
      } catch (e: unknown) {
        alert(`Fel: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    startDeleteTransition(async () => {
      try {
        await deleteAnnouncement(id);
      } catch (e: unknown) {
        alert(`Fel: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-black tracking-tight text-stone-900 px-1">Alla anslag</h3>
        {!showNewForm && (
          <button
            onClick={() => { setEditingId(null); setShowNewForm(true); }}
            disabled={isCreating}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: brand }}
          >
            <Plus size={13} strokeWidth={2.5} /> Nytt anslag
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="space-y-3 rounded-[16px] p-5 bg-white shadow-sm ring-1 ring-stone-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-black text-stone-800">Skapa anslag</p>
            <button onClick={() => setShowNewForm(false)} disabled={isCreating} className="text-stone-400 disabled:opacity-30">
              <X size={16} />
            </button>
          </div>
          
          <div className="flex gap-1.5 mb-4">
            {ANNOUNCEMENT_TYPES.map((at) => (
              <button
                key={at.value}
                onClick={() => setNewType(at.value)}
                disabled={isCreating}
                className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={
                  newType === at.value
                    ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
                    : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
                }
              >
                {at.emoji} {at.label}
              </button>
            ))}
          </div>

          <fieldset disabled={isCreating} className="space-y-3">
            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={validateNew}
                placeholder="Rubrik..."
                className={`w-full rounded-[10px] bg-stone-50 px-3.5 py-2.5 text-[13px] font-medium text-stone-800 ring-1 outline-none ${errors.title ? 'ring-red-500 placeholder:text-red-300' : 'ring-stone-200/60 placeholder:text-stone-400'}`}
                style={!errors.title ? { "--tw-ring-color": hexToRgba(brand, 0.25) } as any : {}}
              />
              {errors.title && <p className="mt-1 px-1 text-[10px] font-bold text-red-500">{errors.title}</p>}
            </div>
            <div>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onBlur={validateNew}
                placeholder="Meddelande..."
                rows={4}
                className={`w-full resize-none rounded-[10px] bg-stone-50 px-3.5 py-2.5 text-[13px] font-medium text-stone-800 ring-1 outline-none ${errors.content ? 'ring-red-500 placeholder:text-red-300' : 'ring-stone-200/60 placeholder:text-stone-400'}`}
                style={!errors.content ? { "--tw-ring-color": hexToRgba(brand, 0.25) } as any : {}}
              />
              {errors.content && <p className="mt-1 px-1 text-[10px] font-bold text-red-500">{errors.content}</p>}
            </div>
          </fieldset>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black uppercase text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: brand }}
            >
              {isCreating && <Loader2 size={12} className="animate-spin" />}
              {isCreating ? "Publicerar..." : "Publicera"}
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              disabled={isCreating}
              className="px-4 py-2.5 text-[11px] font-black text-stone-400 hover:text-stone-600 disabled:opacity-30"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Editing Form (similar style) could be implemented inside the map below or in a modal */}
      
      <div className="space-y-3 mt-6">
        {announcements.length === 0 && !showNewForm && (
          <div className="text-center py-10 px-4 rounded-[16px] bg-stone-50/50 border border-dashed border-stone-200">
            <p className="text-[13px] font-semibold text-stone-500 mb-1">Inga anslag ännu</p>
            <p className="text-[11px] text-stone-400">Skapa ett nytt anslag för att informera dina gäster.</p>
          </div>
        )}
        {announcements.map((ann) => {
          const isDeleting = deletingId === ann.id;
          const isEditing = editingId === ann.id;

          if (isEditing) {
            return (
              <div key={ann.id} className="space-y-3 rounded-[16px] p-5 bg-white shadow-sm ring-1 ring-stone-200/50">
                <div className="flex gap-1.5 mb-2">
                  {ANNOUNCEMENT_TYPES.map((at) => (
                    <button
                      key={at.value}
                      onClick={() => setEditType(at.value)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={
                        editType === at.value
                          ? { backgroundColor: hexToRgba(brand, 0.1), color: brand }
                          : { backgroundColor: "#f5f5f4", color: "#a8a29e" }
                      }
                    >
                      {at.emoji} {at.label}
                    </button>
                  ))}
                </div>
                <div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={validateEdit}
                    className={`w-full rounded-[10px] bg-stone-50 px-3.5 py-2.5 text-[13px] font-medium text-stone-800 ring-1 outline-none ${editErrors.title ? 'ring-red-500' : 'ring-stone-200/60'}`}
                    style={!editErrors.title ? { "--tw-ring-color": hexToRgba(brand, 0.25) } as any : {}}
                  />
                  {editErrors.title && <p className="mt-1 px-1 text-[10px] font-bold text-red-500">{editErrors.title}</p>}
                </div>
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={validateEdit}
                    rows={3}
                    className={`w-full resize-none rounded-[10px] bg-stone-50 px-3.5 py-2.5 text-[13px] font-medium text-stone-800 ring-1 outline-none ${editErrors.content ? 'ring-red-500' : 'ring-stone-200/60'}`}
                    style={!editErrors.content ? { "--tw-ring-color": hexToRgba(brand, 0.25) } as any : {}}
                  />
                  {editErrors.content && <p className="mt-1 px-1 text-[10px] font-bold text-red-500">{editErrors.content}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="px-4 py-2 rounded-full text-[11px] font-black uppercase text-white transition-all active:scale-95" style={{ backgroundColor: brand }}>
                    Spara
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 text-[11px] font-black text-stone-400">Avbryt</button>
                </div>
              </div>
            );
          }

          const currentType = ANNOUNCEMENT_TYPES.find(t => t.value === ann.type) || ANNOUNCEMENT_TYPES[0];

          return (
            <div
              key={ann.id}
              className={`flex items-start gap-3 bg-white p-4 rounded-[16px] border border-stone-200/60 shadow-sm transition-opacity ${
                isDeleting ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <div className="text-xl pt-0.5">{currentType.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-stone-800 tracking-tight leading-snug truncate">
                  {ann.title}
                </p>
                <p className="text-[12.5px] text-stone-500 mt-1 leading-relaxed">
                  {ann.content}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4 pt-1">
                <button
                  onClick={() => handleStartEdit(ann)}
                  disabled={isDeleting}
                  className="p-2 text-stone-300 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  disabled={!!deletingId}
                  className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
