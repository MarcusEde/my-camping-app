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
