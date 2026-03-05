"use server"; // <-- MAGIC WORD: This means "Run this on the backend only"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Logs the user in.
 * Python equivalent: A Flask POST route that checks passwords.
 */
export async function login(formData: FormData) {
  // 1. Grab the email and password from the HTML form
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;

  // 2. Connect to Supabase
  const supabase = await createClient();

  // 3. Ask Supabase to verify the credentials
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Pass the ACTUAL error message to the URL
    redirect(`/login?message=${error.message}`);
  }

  // 4. If success, clear the cache and send them to their dashboard
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Creates a brand new account.
 */
export async function signup(formData: FormData) {
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    // Pass the ACTUAL error message to the URL
    redirect(`/login?message=${error.message}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
