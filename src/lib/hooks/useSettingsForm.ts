import { updateCampgroundSettings } from "@/app/dashboard/actions";
import type { Campground } from "@/types/database";
import { useState, useTransition } from "react";

export type SectionId = "branding" | "contact" | "guest" | "announcements";

interface UseSettingsFormProps {
  campground: Campground;
}

export function useSettingsForm({ campground }: UseSettingsFormProps) {
  /* ── Separate transitions so operations don't block each other ── */
  const [isSaving, startSaveTransition] = useTransition();

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



  // ── Derived ──
  const brand = primaryColor;

  // ── Handlers ──
  const handleSave = () => {
    if (isSaving) return;
    startSaveTransition(async () => {
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



  return {
    // UI state
    isPending: isSaving,
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

    // Handlers
    handleSave,
  };
}
