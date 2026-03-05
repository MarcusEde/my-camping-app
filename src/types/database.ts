export type SubscriptionStatus = "trial" | "active" | "cancelled";

export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "museum"
  | "park"
  | "beach"
  | "bowling"
  | "swimming"
  | "shopping"
  | "cinema"
  | "spa"
  | "other";

export interface Campground {
  id: string; // UUID comes as a string
  owner_id: string; // Links to auth.users
  name: string; // "Solvik Camping"
  slug: string; // "solvik-camping"
  latitude: number; // 57.7089
  longitude: number; // 11.9746
  subscription_status: SubscriptionStatus; // Uses our strict type!
  trial_ends_at: string; // ISO date string from Supabase
  created_at: string;
}

export interface CachedPlace {
  id: string;
  campground_id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  category: PlaceCategory;
  is_indoor: boolean;
  latitude: number | null;
  longitude: number | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
  created_at: string;

  // 🌟 NEW: The Curation Columns we just added
  is_pinned: boolean;
  is_hidden: boolean;
  owner_note: string | null;
}

export interface CachedPlace {
  id: string;
  campground_id: string; // FK → campgrounds.id
  google_place_id: string; // Google's own ID
  name: string; // "Pizzeria Roma"
  address: string | null; // Nullable! Some places lack this.
  rating: number | null; // 4.5 or null if unrated
  category: PlaceCategory; // Uses our strict type!
  is_indoor: boolean; // 🌧️ Rainy day pivot flag
  latitude: number | null;
  longitude: number | null;
  raw_data: Record<string, unknown> | null; // The raw Google JSON
  fetched_at: string; // 🧊 "Check the Fridge" timestamp
  created_at: string;
}

/**
 * PromotedPartner
 *
 * A local business that PAYS the campground owner
 * to appear prominently in the guest's activity list.
 */
export interface PromotedPartner {
  id: string;
  campground_id: string; // FK → campgrounds.id
  cached_place_id: string | null; // FK → cached_places.id (nullable!)
  business_name: string; // "Pizzeria Roma"
  description: string | null; // "Best wood-fired pizza in town"
  logo_url: string | null; // Uploaded by partner
  website_url: string | null;
  phone: string | null;
  priority_rank: number; // Lower = higher on list
  is_active: boolean;
  starts_at: string;
  ends_at: string | null; // Null = runs forever
  created_at: string;
}
