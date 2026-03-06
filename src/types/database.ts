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
  
  // 🎨 BRANDING & DESIGN
  primary_color: string;      // Standard: '#2A3C34'
  secondary_color: string | null;
  logo_url: string | null;

  // 📶 GUEST INFORMATION (Digital Gästpärm)
  wifi_name: string | null;
  wifi_password: string | null;
  check_out_info: string | null;
  trash_rules: string | null;
  emergency_info: string | null;
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

  // 🌟 CURATION COLUMNS
  is_pinned: boolean;
  is_hidden: boolean;
  owner_note: string | null;
}

/**
 * Notice Board / Announcements
 * For the "Dagens anslagstavla" feature
 */
export interface Announcement {
  id: string;
  campground_id: string;
  title: string;
  content: string;
  type: 'info' | 'event' | 'warning';
  created_at: string;
}

/**
 * PromotedPartner
 * A local business that PAYS the campground owner
 */
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