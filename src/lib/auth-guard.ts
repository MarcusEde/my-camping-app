/**
 * auth-guard.ts
 * ─────────────────────────────────────────────────────────
 * SINGLE source of truth for all authentication/authorization.
 * Previously split across admin/page.tsx + admin/actions.ts — now unified.
 *
 * B2B ROI: Changing the master admin email or adding role-based access
 * requires touching exactly ONE file.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve from env first, fall back to legacy hard-coded value.
 * (Keeping this export prevents breaking other files that might still import it,
 * even though we now use app_metadata for superadmin checks).
 */

// ─── Super Admin (full SaaS platform access) ──────────────────────────────

export async function requireSuperAdmin() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Unauthorized: You must be logged in.");
  }

  // 🔒 SECURITY FIX: Rely on app_metadata.role instead of hardcoded emails
  if (user.app_metadata?.role !== "superadmin") {
    throw new Error("Forbidden: You do not have superadmin privileges.");
  }

  return user;
}

export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}

// ─── Campground Owner (scoped tenant access) ──────────────────────────────

export async function requireOwner(campgroundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthenticated — please log in.");

  // RLS-backed ownership check — DB enforces this even if client bypasses
  const { data: campground, error } = await supabase
    .from("campgrounds")
    .select("id, owner_id, name, subscription_status")
    .eq("id", campgroundId)
    .eq("owner_id", user.id)
    .single();

  if (error || !campground) {
    throw new Error("Forbidden — you do not own this campground.");
  }

  return { supabase, user, campground };
}

// ─── Auth-or-redirect (for Server Components) ─────────────────────────────

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
