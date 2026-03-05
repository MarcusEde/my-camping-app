"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Utility to get and validate the camp for the current owner
async function getValidatedCamp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized access");

  const { data: camp } = await supabase
    .from("campgrounds")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!camp) throw new Error("Campground not found for this user");
  return { supabase, campId: camp.id };
}

export async function addCustomRental(formData: FormData) {
  const { supabase, campId } = await getValidatedCamp();
  const name = (formData.get("name") as string).trim();

  if (!name) return;

  const { error } = await supabase.from("cached_places").insert({
    campground_id: campId,
    name: name,
    category: "other", // Default category for custom rentals
    is_pinned: true, // Custom items are usually important, so we pin them by default
    owner_note: "Managed onsite by campground staff.",
    is_indoor: false,
  });

  if (error) console.error("Error adding rental:", error);
  revalidatePath("/dashboard");
}

export async function togglePin(formData: FormData) {
  const supabase = await createClient();
  const placeId = formData.get("place_id") as string;
  const currentStatus = formData.get("current_status") === "true";

  await supabase
    .from("cached_places")
    .update({ is_pinned: !currentStatus })
    .eq("id", placeId);

  revalidatePath("/dashboard");
}

export async function toggleHide(formData: FormData) {
  const supabase = await createClient();
  const placeId = formData.get("place_id") as string;
  const currentStatus = formData.get("current_status") === "true";

  await supabase
    .from("cached_places")
    .update({ is_hidden: !currentStatus })
    .eq("id", placeId);

  revalidatePath("/dashboard");
}

export async function saveNote(formData: FormData) {
  const supabase = await createClient();
  const placeId = formData.get("place_id") as string;
  const note = (formData.get("note") as string).trim();

  await supabase
    .from("cached_places")
    .update({ owner_note: note === "" ? null : note })
    .eq("id", placeId);

  revalidatePath("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
