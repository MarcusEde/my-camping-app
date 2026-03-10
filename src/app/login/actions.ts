"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  // Use FormData directly
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // DEBUG: Check if values are actually reaching the server
  console.log("SERVER ACTION RECEIVED:", {
    email: !!email,
    password: !!password,
  });

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("SUPABASE AUTH ERROR:", error.message);
    return { error: error.message };
  }

  redirect("/dashboard");
}
