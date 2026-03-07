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
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  created_at: string;
  primary_color: string;
  secondary_color: string | null;
  logo_url: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  check_out_info: string | null;
  trash_rules: string | null;
  emergency_info: string | null;
}

export interface CachedPlace {
  id: string;
  campground_id: string;
  google_place_id: string | null;
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
  is_pinned: boolean;
  is_hidden: boolean;
  owner_note: string | null;
}

export interface Announcement {
  id: string;
  campground_id: string;
  title: string;
  content: string;
  type: "info" | "event" | "warning";
  created_at: string;
}

export interface PromotedPartner {
  id: string;
  campground_id: string;
  cached_place_id: string | null;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  priority_rank: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}