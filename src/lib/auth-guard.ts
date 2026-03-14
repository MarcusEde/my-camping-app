/**
 * auth-guard.ts
 * ─────────────────────────────────────────────────────────
 * SINGLE source of truth for authentication & authorization.
 *
 * SECURITY MODEL (post-RLS overhaul):
 * ───────────────────────────────────
 * Layer 1: requireAuth()       → Validates JWT exists
 * Layer 2: requireCampground() → Fetches owner's campground (RLS-scoped)
 *                                + business-logic gating (subscription status)
 * Layer 3: .eq("campground_id", campground.id) in every query (belt & suspenders)
 * Layer 4: PostgreSQL RLS      → FINAL GATE, even if app code has bugs
 *
 * verifyOwnership() is DELETED. RLS now enforces tenant isolation at the
 * database level. If a user queries data they don't own, Supabase returns
 * 0 rows — no error, no data leak.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CampgroundSession {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  campground: {
    id: string;
    slug: string;
    subscription_status: string;
    owner_id: string;
    // Add any other fields you commonly need
    check_out_info: string | null;
    trash_rules: string | null;
    emergency_info: string | null;
    camp_rules: string | null;
    reception_hours: string | null;
  };
}

// ─── Super Admin (full SaaS platform access) ──────────────────────────────

export async function requireSuperAdmin() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Unauthorized: You must be logged in.");
  }

  if (user.app_metadata?.role !== "superadmin") {
    throw new Error("Forbidden: You do not have superadmin privileges.");
  }

  return user;
}

// ─── Campground Owner (scoped tenant access) ──────────────────────────────

/**
 * Authenticates the user and fetches their campground in a single call.
 *
 * HOW IT WORKS:
 * - The Supabase client sends the user's JWT with every query.
 * - The RLS policy on `campgrounds` is: USING (auth.uid() = owner_id)
 * - So `.select().single()` will ONLY return the campground this user owns.
 * - If they own nothing, or the campground doesn't exist, we redirect.
 *
 * We still check subscription_status here because that's BUSINESS LOGIC
 * (feature gating), not SECURITY (tenant isolation). RLS handles security.
 *
 * @param campgroundId - Optional. If provided, filters to that specific
 *   campground. If omitted, returns the user's single campground.
 *   Either way, RLS guarantees they can only see their own.
 */
export async function requireCampground(
  campgroundId?: string,
): Promise<CampgroundSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Build the query — RLS automatically scopes to owner_id = auth.uid()
  let query = supabase
    .from("campgrounds")
    .select(
      "id, slug, owner_id, subscription_status, check_out_info, trash_rules, emergency_info, camp_rules, reception_hours",
    );

  if (campgroundId) {
    query = query.eq("id", campgroundId);
  }

  const { data: campground, error } = await query.single();

  if (error || !campground) {
    // RLS returned 0 rows: either user owns no campground, or the
    // campgroundId doesn't belong to them. Same result, no data leaked.
    redirect("/onboarding");
  }

  // Business logic gate — NOT security (RLS already handled that)
  if (
    campground.subscription_status === "inactive" ||
    campground.subscription_status === "cancelled"
  ) {
    throw new Error(
      "Konto inaktivt eller avslutat. Inga ändringar kan sparas.",
    );
  }

  return { supabase, user, campground };
}

// ─── Legacy alias (for the transition period) ─────────────────────────────

/**
 * @deprecated Use requireCampground(campgroundId) instead.
 * This alias exists only so you can migrate call-by-call.
 */
export async function requireOwner(campgroundId: string) {
  return requireCampground(campgroundId);
}

// ─── Session check (for Server Components / conditionals) ─────────────────

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
