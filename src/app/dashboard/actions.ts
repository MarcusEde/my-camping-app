"use server";

import { requireCampground } from "@/lib/auth-guard";
import {
  translateAnnouncement,
  translateNote,
  translatePartner,
  translateSettings,
} from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// 📏 VALIDATION SCHEMAS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════

const CampgroundSettingsSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Ogiltig hex-kod")
    .optional(),
  hero_image_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  phone: z.string().max(20, "Telefonnumret är för långt").nullable().optional(),
  email: z.string().email("Ogiltig e-post").max(255).nullable().optional(),
  website: z.string().url("Ogiltig webbadress").max(255).nullable().optional(),
  wifi_name: z.string().max(50, "Max 50 tecken").nullable().optional(),
  wifi_password: z.string().max(50, "Max 50 tecken").nullable().optional(),
  check_out_info: z.string().max(1000, "Max 1000 tecken").nullable().optional(),
  trash_rules: z.string().max(1000, "Max 1000 tecken").nullable().optional(),
  reception_hours: z
    .string()
    .max(1000, "Max 1000 tecken")
    .nullable()
    .optional(),
  emergency_info: z.string().max(1000, "Max 1000 tecken").nullable().optional(),
  camp_rules: z.string().max(1000, "Max 1000 tecken").nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  hero_image_position: z.string().max(50).nullable().optional(),
});

const AnnouncementSchema = z.object({
  title: z.string().min(1, "Titel krävs").max(100, "Max 100 tecken"),
  content: z.string().min(1, "Innehåll krävs").max(2000, "Max 2000 tecken"),
  type: z.enum(["info", "event", "warning"]),
});

const CustomPlaceSchema = z.object({
  name: z.string().min(1, "Namn krävs").max(100),
  category: z.string().min(1, "Kategori krävs"),
  address: z.string().max(255).optional(),
  isOnSite: z.boolean().optional(),
  isIndoor: z.boolean().optional(),
  customHours: z.string().max(255).optional(),
});

const PartnerSchema = z.object({
  business_name: z.string().min(1, "Namn krävs").max(100),
  description: z.string().max(500).optional(),
  website_url: z.string().url().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  cached_place_id: z.string().uuid().nullable().optional(),
  priority_rank: z.number().int().default(0),
  starts_at: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().datetime().optional(),
  ),
  ends_at: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().datetime().nullable().optional(),
  ),
  coupon_code: z.string().max(50).nullable().optional(),
});

const FacilitySchema = z.object({
  name: z.string().min(1, "Namn krävs").max(100, "Max 100 tecken"),
  type: z.string().min(1, "Typ krävs").max(50),
  walking_minutes: z.number().int().min(0).max(30),
  is_active: z.boolean(),
});

const UpdatePlaceDetailsSchema = z.object({
  is_on_site: z.boolean().optional(),
  is_indoor: z.boolean().optional(),
  custom_hours: z.string().max(255, "Max 255 tecken").nullable().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Revalidates dashboard and public-facing cache.
 */
function revalidateAll(slug?: string) {
  revalidatePath("/dashboard");
  if (slug) {
    revalidatePath(`/camp/${slug}`);
  }
  revalidatePath("/camp/[slug]", "page");
}

/**
 * Safe translation wrappers — never crash the parent action.
 */
async function safeTranslateAnnouncement(
  title: string,
  content: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await translateAnnouncement(title, content);
  } catch (err) {
    console.error("[Translation] Announcement translation failed:", err);
    return null;
  }
}

async function safeTranslateNote(
  note: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await translateNote(note);
  } catch (err) {
    console.error("[Translation] Note translation failed:", err);
    return null;
  }
}

async function safeTranslatePartner(
  name: string,
  description: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await translatePartner(name, description);
  } catch (err) {
    console.error("[Translation] Partner translation failed:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔓 AUTH
// ═══════════════════════════════════════════════════════════════════════════

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ CAMPGROUND SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function updateCampgroundSettings(
  campgroundId: string,
  rawData: unknown,
) {
  const validated = CampgroundSettingsSchema.safeParse(rawData);
  if (!validated.success) {
    throw new Error(`Valideringsfel: ${validated.error.issues[0].message}`);
  }

  const data = validated.data;

  // requireCampground replaces verifyOwnership:
  // - Validates JWT
  // - RLS scopes the SELECT to owner's campground only
  // - Checks subscription_status (business logic)
  const { supabase, campground } = await requireCampground(campgroundId);

  const translatableFields = {
    check_out_info: data.check_out_info || null,
    trash_rules: data.trash_rules || null,
    emergency_info: data.emergency_info || null,
    camp_rules: data.camp_rules || null,
    reception_hours: data.reception_hours || null,
  };

  const textChanged =
    (data.check_out_info ?? null) !== (campground.check_out_info ?? null) ||
    (data.trash_rules ?? null) !== (campground.trash_rules ?? null) ||
    (data.emergency_info ?? null) !== (campground.emergency_info ?? null) ||
    (data.camp_rules ?? null) !== (campground.camp_rules ?? null) ||
    (data.reception_hours ?? null) !== (campground.reception_hours ?? null);

  const hasTranslatableContent = Object.values(translatableFields).some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );

  let settingsTranslationsUpdate: Record<string, unknown> | undefined;

  if (textChanged) {
    if (hasTranslatableContent) {
      try {
        const settingsTranslations =
          await translateSettings(translatableFields);
        settingsTranslationsUpdate = settingsTranslations;
      } catch (err) {
        console.error("[Translation] Settings translation failed:", err);
      }
    } else {
      settingsTranslationsUpdate = {};
    }
  }

  const updatePayload: Record<string, unknown> = {
    primary_color: data.primary_color,
    hero_image_url: data.hero_image_url ?? null,
    hero_image_position: data.hero_image_position ?? null,
    logo_url: data.logo_url ?? null,
    wifi_name: data.wifi_name || null,
    wifi_password: data.wifi_password || null,
    trash_rules: data.trash_rules || null,
    check_out_info: data.check_out_info || null,
    emergency_info: data.emergency_info || null,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    address: data.address || null,
    reception_hours: data.reception_hours || null,
    camp_rules: data.camp_rules || null,
  };

  if (settingsTranslationsUpdate !== undefined) {
    updatePayload.settings_translations = settingsTranslationsUpdate;
  }

  // RLS enforces: only rows where owner_id = auth.uid() can be updated.
  // The .eq("id", campground.id) is belt-and-suspenders — campground.id
  // already came from an RLS-scoped query, so this is guaranteed safe.
  const { error } = await supabase
    .from("campgrounds")
    .update(updatePayload)
    .eq("id", campground.id);

  if (error) throw new Error(error.message);

  revalidateAll(campground.slug);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📢 ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function createAnnouncement(
  campgroundId: string,
  title: string,
  content: string,
  type: "info" | "event" | "warning",
) {
  const validated = AnnouncementSchema.safeParse({ title, content, type });
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const { supabase, campground } = await requireCampground(campgroundId);

  const trimmedTitle = validated.data.title.trim();
  const trimmedContent = validated.data.content.trim();

  const translations = await safeTranslateAnnouncement(
    trimmedTitle,
    trimmedContent,
  );

  const insertPayload: Record<string, unknown> = {
    campground_id: campground.id, // Always from the RLS-verified session
    title: trimmedTitle,
    content: trimmedContent,
    type: validated.data.type,
  };
  if (translations) {
    insertPayload.translations = translations;
  }

  // RLS WITH CHECK: user_owns_campground(campground_id) must be true.
  // Since campground.id came from requireCampground, this always passes.
  // If someone tampered with campgroundId in the form, requireCampground
  // would have returned 0 rows and redirected to /onboarding.
  const { error } = await supabase
    .from("announcements")
    .insert([insertPayload]);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  title: string,
  content: string,
  type: "info" | "event" | "warning",
) {
  const validated = AnnouncementSchema.safeParse({ title, content, type });
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  // Authenticate + get campground (we need slug for revalidation)
  const { supabase, campground } = await requireCampground();

  const trimmedTitle = validated.data.title.trim();
  const trimmedContent = validated.data.content.trim();

  const translations = await safeTranslateAnnouncement(
    trimmedTitle,
    trimmedContent,
  );

  const updatePayload: Record<string, unknown> = {
    title: trimmedTitle,
    content: trimmedContent,
    type: validated.data.type,
  };
  if (translations) {
    updatePayload.translations = translations;
  }

  // RLS USING: user_owns_campground(campground_id). If this announcement
  // belongs to another tenant, RLS returns 0 rows → update affects nothing.
  // The .eq("campground_id") is defense-in-depth.
  const { data, error } = await supabase
    .from("announcements")
    .update(updatePayload)
    .eq("id", announcementId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Meddelandet hittades inte.");

  revalidateAll(campground.slug);
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const { supabase, campground } = await requireCampground();

  // RLS prevents deleting another tenant's rows. Defense-in-depth filter:
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("campground_id", campground.id);

  if (error) throw new Error(error.message);

  revalidateAll(campground.slug);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📍 PLACES (DISCOVERY)
// ═══════════════════════════════════════════════════════════════════════════

export async function togglePin(placeId: string, currentState: boolean) {
  const { supabase, campground } = await requireCampground();

  // RLS scopes this: if placeId doesn't belong to our campground, 0 rows.
  const { data, error } = await supabase
    .from("cached_places")
    .update({ is_pinned: !currentState })
    .eq("id", placeId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Platsen hittades inte.");

  revalidateAll(campground.slug);
}

export async function toggleHide(placeId: string, currentState: boolean) {
  const { supabase, campground } = await requireCampground();

  const { data, error } = await supabase
    .from("cached_places")
    .update({ is_hidden: !currentState })
    .eq("id", placeId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Platsen hittades inte.");

  revalidateAll(campground.slug);
}

export async function saveNote(placeId: string, note: string) {
  const { supabase, campground } = await requireCampground();

  const trimmedNote = note.trim();

  let updatePayload: Record<string, unknown>;

  if (trimmedNote) {
    const noteTranslations = await safeTranslateNote(trimmedNote);
    updatePayload = { owner_note: trimmedNote };
    if (noteTranslations) {
      updatePayload.note_translations = noteTranslations;
    }
  } else {
    updatePayload = { owner_note: null, note_translations: null };
  }

  const { data, error } = await supabase
    .from("cached_places")
    .update(updatePayload)
    .eq("id", placeId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Platsen hittades inte.");

  revalidateAll(campground.slug);
}

export async function addCustomPlace(
  campgroundId: string,
  name: string,
  category: string,
  address?: string,
  isOnSite?: boolean,
  isIndoor?: boolean,
  customHours?: string,
) {
  const validated = CustomPlaceSchema.safeParse({
    name,
    category,
    address,
    isOnSite,
    isIndoor,
    customHours,
  });
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const { supabase, campground } = await requireCampground(campgroundId);

  const indoor =
    validated.data.isIndoor ??
    ["bowling", "museum", "cinema", "spa", "shopping"].includes(
      validated.data.category,
    );

  const { error } = await supabase.from("cached_places").insert([
    {
      campground_id: campground.id, // Always from RLS-verified session
      name: validated.data.name.trim(),
      category: validated.data.category,
      address: validated.data.address?.trim() || null,
      is_pinned: true,
      is_hidden: false,
      is_on_site: validated.data.isOnSite ?? false,
      custom_hours: validated.data.customHours?.trim() || null,
      is_indoor: indoor,
      fetched_at: new Date().toISOString(),
    },
  ]);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}

export async function updatePlaceDetails(
  placeId: string,
  rawData: {
    is_on_site?: boolean;
    is_indoor?: boolean;
    custom_hours?: string | null;
  },
) {
  const validated = UpdatePlaceDetailsSchema.safeParse(rawData);
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const data = validated.data;
  const { supabase, campground } = await requireCampground();

  const updatePayload: Record<string, unknown> = {};
  if (data.is_on_site !== undefined) updatePayload.is_on_site = data.is_on_site;
  if (data.is_indoor !== undefined) updatePayload.is_indoor = data.is_indoor;
  if (data.custom_hours !== undefined)
    updatePayload.custom_hours = data.custom_hours;

  const { data: updated, error } = await supabase
    .from("cached_places")
    .update(updatePayload)
    .eq("id", placeId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error("Platsen hittades inte.");

  revalidateAll(campground.slug);
  return { success: true };
}

export async function deletePlace(placeId: string) {
  const { supabase, campground } = await requireCampground();

  // First check if it's a synced place (business rule, not security)
  // RLS scopes this SELECT to our campground only
  const { data: place } = await supabase
    .from("cached_places")
    .select("id, google_place_id")
    .eq("id", placeId)
    .eq("campground_id", campground.id)
    .maybeSingle();

  if (!place) throw new Error("Platsen hittades inte.");

  if (place.google_place_id) {
    throw new Error("Kan ej ta bort synkade platser. Dölj dem istället.");
  }

  const { error } = await supabase
    .from("cached_places")
    .delete()
    .eq("id", placeId)
    .eq("campground_id", campground.id);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤝 PROMOTED PARTNERS
// ═══════════════════════════════════════════════════════════════════════════

export async function createPromotedPartner(
  campgroundId: string,
  rawData: unknown,
) {
  const validated = PartnerSchema.safeParse(rawData);
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const { supabase, campground } = await requireCampground(campgroundId);
  const data = validated.data;

  const translations = await safeTranslatePartner(
    data.business_name.trim(),
    data.description?.trim() || "",
  );

  const insertPayload: Record<string, unknown> = {
    campground_id: campground.id,
    business_name: data.business_name.trim(),
    description: data.description?.trim() || null,
    website_url: data.website_url?.trim() || null,
    phone: data.phone?.trim() || null,
    logo_url: data.logo_url?.trim() || null,
    cached_place_id: data.cached_place_id || null,
    priority_rank: data.priority_rank ?? 0,
    is_active: true,
    starts_at: data.starts_at || new Date().toISOString(),
    ends_at: data.ends_at || null,
    coupon_code: data.coupon_code?.trim() || null,
  };
  if (translations) {
    insertPayload.translations = translations;
  }

  const { error } = await supabase
    .from("promoted_partners")
    .insert([insertPayload]);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}

export async function updatePromotedPartner(
  partnerId: string,
  rawData: unknown,
) {
  const validated = PartnerSchema.partial().safeParse(rawData);
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const data = validated.data;
  const { supabase, campground } = await requireCampground();

  // Fetch current partner data for translation change detection
  // RLS scopes this: only returns if partner belongs to our campground
  const { data: partner } = await supabase
    .from("promoted_partners")
    .select("business_name, description")
    .eq("id", partnerId)
    .eq("campground_id", campground.id)
    .maybeSingle();

  if (!partner) throw new Error("Partner hittades inte.");

  const nameChanged =
    data.business_name !== undefined &&
    data.business_name.trim() !== partner.business_name;
  const descChanged =
    data.description !== undefined &&
    (data.description?.trim() || null) !== (partner.description || null);

  const updatePayload: Record<string, unknown> = {
    ...data,
    business_name: data.business_name?.trim(),
  };

  if (data.coupon_code !== undefined) {
    updatePayload.coupon_code = data.coupon_code?.trim() || null;
  }

  if (nameChanged || descChanged) {
    const newTranslations = await safeTranslatePartner(
      data.business_name?.trim() || partner.business_name,
      data.description?.trim() || partner.description || "",
    );
    if (newTranslations) {
      updatePayload.translations = newTranslations;
    }
  }

  const { error } = await supabase
    .from("promoted_partners")
    .update(updatePayload)
    .eq("id", partnerId)
    .eq("campground_id", campground.id);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}

export async function togglePromotedPartnerActive(
  partnerId: string,
  currentState: boolean,
) {
  const { supabase, campground } = await requireCampground();

  const { data, error } = await supabase
    .from("promoted_partners")
    .update({ is_active: !currentState })
    .eq("id", partnerId)
    .eq("campground_id", campground.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Partner hittades inte.");

  revalidateAll(campground.slug);
}

export async function deletePromotedPartner(partnerId: string) {
  const { supabase, campground } = await requireCampground();

  const { error } = await supabase
    .from("promoted_partners")
    .delete()
    .eq("id", partnerId)
    .eq("campground_id", campground.id);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

export async function trackPartnerClick(partnerId: string) {
  // This uses anon/public access — no auth required
  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_clicks")
    .insert({ partner_id: partnerId });
  // RLS WITH CHECK validates the partner exists and belongs to an active campground
  if (error) console.error("Click track failed:", error.message);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 FACILITIES
// ═══════════════════════════════════════════════════════════════════════════

export async function saveFacility(
  campgroundId: string,
  rawData: {
    name: string;
    type: string;
    walking_minutes: number;
    is_active: boolean;
  },
) {
  const validated = FacilitySchema.safeParse(rawData);
  if (!validated.success) throw new Error(validated.error.issues[0].message);

  const data = validated.data;
  const { supabase, campground } = await requireCampground(campgroundId);

  const { data: inserted, error } = await supabase
    .from("internal_locations")
    .insert({
      campground_id: campground.id,
      name: data.name,
      type: data.type,
      walking_minutes: data.walking_minutes,
      is_active: data.is_active,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true, id: inserted.id };
}

export async function deleteFacility(facilityId: string) {
  const { supabase, campground } = await requireCampground();

  const { error } = await supabase
    .from("internal_locations")
    .delete()
    .eq("id", facilityId)
    .eq("campground_id", campground.id);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}
