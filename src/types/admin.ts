export interface CampStats {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  primary_color: string;
  logo_url: string | null;
  hero_image_url: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  check_out_info: string | null;
  trash_rules: string | null;
  emergency_info: string | null;
  supported_languages: string[] | null;
  owner_id: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  reception_hours: string | null;
  camp_rules: string | null;
  ownerEmail: string | null;
  ownerCreatedAt: string | null;
  ownerLastSignIn: string | null;
  googlePlacesActive: number;
  googlePlacesHidden: number;
  customPlaces: number;
  lastSyncedAt: string | null;
  pinnedPlaces: number;
  announcementCount: number;
  partnerCount: number;
  trialDaysLeft: number | null;
  isTrialExpired: boolean;
  billingPlan: string;
  mrr: number | null;
  nextBillingDate: string | null;
}

export interface PlatformStats {
  total: number;
  active: number;
  trial: number;
  cancelled: number;
  inactive: number;
  trialExpiredCount: number;
  totalPlaces: number;
  totalAnnouncements: number;
  totalPartners: number;
  neverSynced: number;
  missingWifi: number;
  missingEmergency: number;
  estimatedMRR: number;
}

export interface AdminDashboardData {
  platform: PlatformStats;
  alerts: CampStats[];
  healthy: CampStats[];
  offline: CampStats[];
}
