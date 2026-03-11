import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  updateCampgroundSettings,
} from "@/app/dashboard/actions";
import type { Announcement, Campground } from "@/types/database";
import { useState, useTransition } from "react";

export type SectionId = "branding" | "contact" | "guest" | "announcements";

interface UseSettingsFormProps {
  campground: Campground;
  announcements: Announcement[];
}

export function useSettingsForm({ campground }: UseSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("branding");

  // ── Branding ──
  const [primaryColor, setPrimaryColor] = useState(
    campground.primary_color || "#2A3C34",
  );
  const [heroImage, setHeroImage] = useState(campground.hero_image_url || "");
  const [logoImage, setLogoImage] = useState(campground.logo_url || "");
  const [heroImagePosition, setHeroImagePosition] = useState(
    (campground as any).hero_image_position || "center",
  );

  // ── Contact / Reception ──
  const [phone, setPhone] = useState(campground.phone || "");
  const [email, setEmail] = useState(campground.email || "");
  const [website, setWebsite] = useState(campground.website || "");
  const [address, setAddress] = useState(campground.address || "");
  const [receptionHours, setReceptionHours] = useState(
    campground.reception_hours || "",
  );

  // ── Guest info ──
  const [wifiName, setWifiName] = useState(campground.wifi_name || "");
  const [wifiPassword, setWifiPassword] = useState(
    campground.wifi_password || "",
  );
  const [trashRules, setTrashRules] = useState(campground.trash_rules || "");
  const [checkOutInfo, setCheckOutInfo] = useState(
    campground.check_out_info || "",
  );
  const [emergencyInfo, setEmergencyInfo] = useState(
    campground.emergency_info || "",
  );
  const [campRules, setCampRules] = useState(campground.camp_rules || "");

  // ── Announcement form ──
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"info" | "event" | "warning">("info");
  const [showNewForm, setShowNewForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"info" | "event" | "warning">(
    "info",
  );

  // ── Derived ──
  const brand = primaryColor;

  // ── Handlers ──
  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCampgroundSettings(campground.id, {
          primary_color: primaryColor,
          hero_image_url: heroImage.trim() || null,
          hero_image_position: heroImagePosition || null,
          logo_url: logoImage.trim() || null,
          wifi_name: wifiName.trim() || null,
          wifi_password: wifiPassword.trim() || null,
          trash_rules: trashRules.trim() || null,
          check_out_info: checkOutInfo.trim() || null,
          emergency_info: emergencyInfo.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          reception_hours: receptionHours.trim() || null,
          camp_rules: campRules.trim() || null,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleCreateAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    startTransition(async () => {
      try {
        await createAnnouncement(campground.id, newTitle, newContent, newType);
        setNewTitle("");
        setNewContent("");
        setNewType("info");
        setShowNewForm(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleStartEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditType(ann.type as "info" | "event" | "warning");
  };

  const handleUpdateAnnouncement = () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    startTransition(async () => {
      try {
        await updateAnnouncement(editingId, editTitle, editContent, editType);
        setEditingId(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      }
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        alert(`Fel: ${msg}`);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const openNewAnnouncementForm = () => {
    setEditingId(null);
    setShowNewForm(true);
  };

  const closeNewAnnouncementForm = () => {
    setShowNewForm(false);
  };

  return {
    // UI state
    isPending,
    saved,
    activeSection,
    setActiveSection,
    brand,

    // Branding
    primaryColor,
    setPrimaryColor,
    heroImage,
    setHeroImage,
    logoImage,
    setLogoImage,
    heroImagePosition,
    setHeroImagePosition,

    // Contact
    phone,
    setPhone,
    email,
    setEmail,
    website,
    setWebsite,
    address,
    setAddress,
    receptionHours,
    setReceptionHours,

    // Guest info
    wifiName,
    setWifiName,
    wifiPassword,
    setWifiPassword,
    trashRules,
    setTrashRules,
    checkOutInfo,
    setCheckOutInfo,
    emergencyInfo,
    setEmergencyInfo,
    campRules,
    setCampRules,

    // Announcement form
    newTitle,
    setNewTitle,
    newContent,
    setNewContent,
    newType,
    setNewType,
    showNewForm,
    deletingId,
    editingId,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editType,
    setEditType,

    // Handlers
    handleSave,
    handleCreateAnnouncement,
    handleStartEdit,
    handleUpdateAnnouncement,
    handleDeleteAnnouncement,
    openNewAnnouncementForm,
    closeNewAnnouncementForm,
  };
}
