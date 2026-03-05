"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// 📌 ACTION 1: Toggle the "Pinned" status
export async function togglePin(formData: FormData) {
  const placeId = formData.get("place_id") as string;
  const currentStatus = formData.get("current_status") === "true";

  const supabase = await createClient();

  // Flip the switch! (If it was true, make it false)
  await supabase
    .from("cached_places")
    .update({ is_pinned: !currentStatus })
    .eq("id", placeId);

  revalidatePath("/dashboard");
}

// 🚫 ACTION 2: Toggle the "Hidden" status
export async function toggleHide(formData: FormData) {
  const placeId = formData.get("place_id") as string;
  const currentStatus = formData.get("current_status") === "true";

  const supabase = await createClient();

  await supabase
    .from("cached_places")
    .update({ is_hidden: !currentStatus })
    .eq("id", placeId);

  revalidatePath("/dashboard");
}

// 💬 ACTION 3: Save an Owner's Note
export async function saveNote(formData: FormData) {
  const placeId = formData.get("place_id") as string;
  const note = (formData.get("note") as string).trim();

  const supabase = await createClient();

  await supabase
    .from("cached_places")
    .update({ owner_note: note === "" ? null : note }) // If they delete the text, set to null
    .eq("id", placeId);

  revalidatePath("/dashboard");
}
