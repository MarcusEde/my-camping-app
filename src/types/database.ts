/**
 * database.ts
 * ─────────────────────────────────────────────────────────
 * Source of truth for all database entity types.
 * Synced with the Supabase schema.
 */

export type SubscriptionStatus = "trial" | "active" | "inactive" | "cancelled";

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
  | "activity"
  | "playground"
  | "sports"
  | "attraction"
  | "other";

export type AnnouncementType = "info" | "event" | "warning";
export type AnnouncementPriority = "normal" | "high";

// ─── Translation shapes ───────────────────────────────────

/** Per-language translation for an announcement (title + content). */
export type AnnouncementTranslations = {
  [lang in "en" | "de" | "da" | "nl" | "no"]?: {
    title: string;
    content: string;
  };
};

/** Per-language translation for a short owner note (plain string). */
export type NoteTranslations = {
  [lang in "en" | "de" | "da" | "nl" | "no"]?: string;
};

/** Per-language translation for a partner (name + description). */
export type PartnerTranslations = {
  [lang in "en" | "de" | "da" | "nl" | "no"]?: {
    business_name: string;
    description: string;
  };
};

/** Translatable campground settings fields. */
export type TranslatableSettingsFields =
  | "check_out_info"
  | "trash_rules"
  | "emergency_info"
  | "camp_rules"
  | "reception_hours";

/** Per-language translation for campground info/settings text. */
export type SettingsTranslations = {
  [lang in "en" | "de" | "da" | "nl" | "no"]?: {
    [field in TranslatableSettingsFields]?: string;
  };
};

// ─── Campground ───────────────────────────────────────────

export type Campground = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  created_at: string;

  // Branding
  primary_color: string;
  logo_url?: string | null;
  hero_image_url?: string | null;
  hero_image_position?: string | null;

  // Guest info
  wifi_name?: string | null;
  wifi_password?: string | null;
  check_out_info?: string | null;
  trash_rules?: string | null;
  emergency_info?: string | null;

  // Contact & reception
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  reception_hours?: string | null;
  camp_rules?: string | null;

  // Localization
  supported_languages?: string[] | null;

  /** Auto-translated settings fields keyed by language code. */
  settings_translations?: SettingsTranslations | null;
};

// ─── CachedPlace ──────────────────────────────────────────

export type CachedPlace = {
  id: string;
  campground_id: string;
  google_place_id: string | null;
  name: string;
  address: string | null;
  rating: number | null;
  category: PlaceCategory;
  is_on_site: boolean;
  custom_hours: string | null;
  is_indoor: boolean;
  latitude: number | null;
  longitude: number | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
  created_at: string;
  is_pinned: boolean;
  is_hidden: boolean;
  owner_note: string | null;
  /** Auto-translated owner notes keyed by language code. */
  note_translations: NoteTranslations | null;
  /** Pre-computed OSRM road distance from the parent campground (km). */
  road_distance_km: number | null;
};

// ─── Announcement ─────────────────────────────────────────

export type Announcement = {
  id: string;
  campground_id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  created_at: string;
  expires_at?: string | null;
  /** Auto-translated title & content keyed by language code. */
  translations: AnnouncementTranslations | null;
};

// ─── PromotedPartner ──────────────────────────────────────

export type PromotedPartner = {
  id: string;
  campground_id: string;
  cached_place_id?: string | null;
  business_name: string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  priority_rank: number;
  is_active: boolean;
  starts_at: string;
  ends_at?: string | null;
  created_at: string;
  /** Auto-translated name & description keyed by language code. */
  translations: PartnerTranslations | null;
};

// ─── InternalLocation ─────────────────────────────────────

export type InternalLocation = {
  id: string;
  campground_id: string;
  name: string;
  type: string;
  walking_minutes: number;
  is_active: boolean;
  created_at: string;
};

// ─── Utility types ────────────────────────────────────────

export type CampgroundAdminRow = Pick<
  Campground,
  | "id"
  | "name"
  | "slug"
  | "latitude"
  | "longitude"
  | "subscription_status"
  | "trial_ends_at"
  | "created_at"
>;

// ─── Extended types ───────────────────────────────────────

export interface PromotedPartnerWithClicks extends PromotedPartner {
  click_count: number;
  linked_place_name?: string | null;
}

// ─── Analytics ────────────────────────────────────────────

export type PageView = {
  id: string;
  campground_id: string;
  session_id: string;
  tab: string;
  created_at: string;
};

export type GuestFeedbackRow = {
  id: string;
  campground_id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type DirectionsClick = {
  id: string;
  campground_id: string;
  place_id: string;
  session_id: string | null;
  created_at: string;
};

export interface AnalyticsStats {
  totalViews: number;
  uniqueGuests: number;
  plannerUsage: number;
  avgRating: number | null;
  feedbackCount: number;
  directionsClicks: number;
  topTabs: { tab: string; count: number }[];
  topPlaces: { placeId: string; placeName: string; clicks: number }[];
  dailyViews: { date: string; views: number; unique: number }[];
  recentFeedback: {
    rating: number;
    comment: string | null;
    created_at: string;
  }[];
  weekOverWeek: { viewsChange: number; guestsChange: number };
}
// ─── Database Schema ──────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      campgrounds: {
        Row: Campground;
        Insert: Omit<Campground, "id" | "created_at">;
        Update: Partial<Omit<Campground, "id" | "created_at">>;
        Relationships: [];
      };
      cached_places: {
        Row: CachedPlace;
        Insert: Omit<CachedPlace, "id" | "created_at">;
        Update: Partial<Omit<CachedPlace, "id" | "created_at">>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, "id" | "created_at">;
        Update: Partial<Omit<Announcement, "id" | "created_at">>;
        Relationships: [];
      };
      promoted_partners: {
        Row: PromotedPartner;
        Insert: Omit<PromotedPartner, "id" | "created_at">;
        Update: Partial<Omit<PromotedPartner, "id" | "created_at">>;
        Relationships: [];
      };
      internal_locations: {
        Row: InternalLocation;
        Insert: Omit<InternalLocation, "id" | "created_at">;
        Update: Partial<Omit<InternalLocation, "id" | "created_at">>;
        Relationships: [];
      };
      page_views: {
        Row: PageView;
        Insert: Omit<PageView, "id" | "created_at">;
        Update: Partial<Omit<PageView, "id" | "created_at">>;
        Relationships: [];
      };
      guest_feedback: {
        Row: GuestFeedbackRow;
        Insert: Omit<GuestFeedbackRow, "id" | "created_at">;
        Update: Partial<Omit<GuestFeedbackRow, "id" | "created_at">>;
        Relationships: [];
      };
      directions_clicks: {
        Row: DirectionsClick;
        Insert: Omit<DirectionsClick, "id" | "created_at">;
        Update: Partial<Omit<DirectionsClick, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      subscription_status: SubscriptionStatus;
      place_category: PlaceCategory;
      announcement_type: AnnouncementType;
      announcement_priority: AnnouncementPriority;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
