"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function trackPartnerClick(partnerId: string) {
  // 🔒 SECURITY FIX: Implement server-side debounce/rate limit using cookies
  const cookieStore = await cookies();
  const clickKey = `partner_click_${partnerId}`;

  // If the cookie exists, this session has already clicked this partner recently
  if (cookieStore.get(clickKey)) {
    return { success: true }; // Silently ignore to prevent DB bloat
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_clicks")
    .insert({ partner_id: partnerId });

  if (error) {
    console.error("Failed to track click:", error.message);
    return { success: false, error: "Failed to track click" };
  }

  // Set cookie to prevent duplicate clicks on this specific partner for 24 hours
  cookieStore.set(clickKey, "true", { maxAge: 60 * 60 * 24 });

  return { success: true };
}
