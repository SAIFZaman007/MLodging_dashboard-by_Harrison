/* Shapes mirrored from the FastAPI response models. Kept hand-written rather
   than generated so the console can add view-model conveniences (label maps,
   optional fields) without fighting a codegen step. */

export type UserRole = "admin" | "manager" | "staff" | "moderator" | "guest";

export const ROLE_RANK: Record<UserRole, number> = {
  admin: 100,
  manager: 60,
  staff: 40,
  moderator: 20,
  guest: 0,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  moderator: "Moderator",
  guest: "Guest",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full control, including team accounts and deletions",
  manager: "All operations, refunds and channel calendar settings",
  staff: "Properties, bookings and inquiries. No refunds or deletions",
  moderator: "Inquiries and SEO content. Read-only elsewhere",
  guest: "No operator console access",
};

/** Roles that can sign in to this console. */
export const CONSOLE_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "moderator", label: "Moderator" },
];

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserPayload {
  email: string;
  full_name: string;
  role: UserRole;
  password?: string;
  is_active?: boolean;
}

export type OrderStatus =
  | "pending"
  | "deposit_paid"
  | "balance_due"
  | "paid_in_full"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "failed";

export type OrderSource = "helcim_webhook" | "manual" | "seed";

export type BookingSource = "direct" | "airbnb" | "vrbo" | "manual_block";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type InquiryStatus = "new" | "contacted" | "converted" | "archived";

export type EventWeek =
  | "masters"
  | "anwa"
  | "ironman"
  | "peach-jam"
  | "private-event"
  | "student-living"
  | "other";

export interface RevenueByEvent {
  event_week: string;
  orders: number;
  collected_cents: number;
}

export interface RevenueByProperty {
  property_slug: string;
  property_address: string;
  orders: number;
  collected_cents: number;
  bookings: number;
}

export interface TimeseriesPoint {
  period: string;
  label: string;
  revenue_cents: number;
  refunded_cents: number;
  orders: number;
  bookings: number;
  inquiries: number;
}

export interface OccupancyPoint {
  period: string;
  label: string;
  nights_booked: number;
  nights_available: number;
  occupancy_pct: number;
}

export interface CountBreakdown {
  key: string;
  label: string;
  count: number;
  amount_cents: number;
}

export interface DashboardStats {
  total_orders: number;
  total_bookings: number;
  total_properties: number;
  published_properties: number;
  total_inquiries: number;
  total_inquiries_new: number;
  upcoming_bookings: number;
  gross_collected_cents: number;
  refunded_total_cents: number;
  net_collected_cents: number;
  outstanding_balance_cents: number;
  average_order_cents: number;
  revenue_change_pct: number;
  orders_change_pct: number;
  occupancy_next_30_pct: number;
  by_event: RevenueByEvent[];
  by_property: RevenueByProperty[];
  timeseries: TimeseriesPoint[];
  occupancy_by_month: OccupancyPoint[];
  orders_by_status: CountBreakdown[];
  bookings_by_source: CountBreakdown[];
  inquiries_by_status: CountBreakdown[];
}

export interface Order {
  id: string;
  invoice_number: string;
  property_id: string | null;
  booking_id: string | null;
  customer_name: string;
  customer_email: string | null;
  amount_cents: number;
  amount_refunded_cents: number;
  currency: string;
  status: OrderStatus;
  source: OrderSource;
  event_week: EventWeek | null;
  payment_provider_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderPayload {
  property_id?: string | null;
  booking_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  amount_cents: number;
  status: OrderStatus;
  source?: OrderSource;
  event_week?: EventWeek | null;
  payment_provider_ref?: string | null;
}

export interface DashboardOverview {
  generated_at: string;
  months: number;
  stats: DashboardStats;
  recent_orders: Order[];
  recent_inquiries: Inquiry[];
}

export interface Booking {
  id: string;
  property_id: string;
  source: BookingSource;
  status: BookingStatus;
  external_uid: string | null;
  check_in: string;
  check_out: string;
  event_week: EventWeek | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guests_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface BookingPayload {
  property_id: string;
  source: BookingSource;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  event_week?: EventWeek | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guests_count?: number | null;
  notes?: string | null;
}

export interface PropertyImage {
  id?: string;
  thumb_url: string;
  hero_url: string;
  alt_text: string | null;
  sort_order: number;
}

export type CalendarSyncStatus = "success" | "failed" | "skipped";

export interface ChannelConfig {
  property_id: string;
  slug: string;
  address: string;
  is_published: boolean;
  airbnb_ical_configured: boolean;
  vrbo_ical_configured: boolean;
  /* Masked previews only. The API never returns a usable feed URL — those are
     calendar credentials and a compromised console session must not leak one. */
  airbnb_ical_preview: string | null;
  vrbo_ical_preview: string | null;
  airbnb_last_synced_at: string | null;
  vrbo_last_synced_at: string | null;
  last_sync_error: string | null;
  export_url: string;
  upcoming_blocked_nights: number;
}

export interface ChannelConfigPayload {
  airbnb_ical_url?: string;
  vrbo_ical_url?: string;
}

export interface SyncLog {
  id: string;
  property_id: string;
  source: BookingSource;
  status: CalendarSyncStatus;
  events_found: number;
  events_created: number;
  events_updated: number;
  events_removed: number;
  duration_ms: number;
  feed_fingerprint: string | null;
  error_message: string | null;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
}

export interface SyncRun {
  property_id: string;
  slug: string;
  ok: boolean;
  results: SyncLog[];
}

export interface Property {
  id: string;
  slug: string;
  listing_id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  description: string | null;
  guests: number;
  bedrooms: number;
  beds: number | null;
  baths: number;
  price_cents: number | null;
  rating: number | null;
  reviews_count: number | null;
  airbnb_url: string | null;
  vrbo_url: string | null;
  airbnb_ical_url: string | null;
  vrbo_ical_url: string | null;
  walking_cluster: boolean;
  large_group: boolean;
  is_published: boolean;
  is_signature: boolean;
  lat: number | null;
  lon: number | null;
  miles_to_angc: number | null;
  tags: string[];
  images: PropertyImage[];
}

export type PropertyPayload = Omit<Property, "id" | "images"> & {
  images: Array<Omit<PropertyImage, "id">>;
};

export interface Inquiry {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  group_size: number | null;
  event_week: EventWeek | null;
  check_in: string | null;
  check_out: string | null;
  property_slug: string | null;
  notes: string | null;
  status: InquiryStatus;
  created_at: string;
}

export interface InquiryPayload {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  group_size?: number | null;
  event_week?: EventWeek | null;
  check_in?: string | null;
  check_out?: string | null;
  property_slug?: string | null;
  notes?: string | null;
  status?: InquiryStatus;
}

export interface SeoMeta {
  path: string;
  title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
}