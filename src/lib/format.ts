import type {
  BookingSource,
  BookingStatus,
  EventWeek,
  InquiryStatus,
  OrderStatus,
} from "@/api/types";

export function formatUsd(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Axis-friendly money: $1.2M / $340k / $820. */
export function formatUsdCompact(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (Math.abs(dollars) >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

export function parseUsdToCents(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

export function centsToUsdInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return e164;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function telHref(e164: string): string {
  return `tel:${e164}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

/** ISO date (yyyy-mm-dd) for <input type="date">, timezone-safe. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${toDateInput(checkIn)}T00:00:00Z`).getTime();
  const end = new Date(`${toDateInput(checkOut)}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(Math.round((end - start) / 86_400_000), 0);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ labels */

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "deposit_paid",
  "balance_due",
  "paid_in_full",
  "partially_refunded",
  "refunded",
  "cancelled",
  "failed",
];

export const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled"];

export const BOOKING_SOURCES: BookingSource[] = ["direct", "airbnb", "vrbo", "manual_block"];

export const INQUIRY_STATUSES: InquiryStatus[] = ["new", "contacted", "converted", "archived"];

export const EVENT_WEEKS: EventWeek[] = [
  "masters",
  "anwa",
  "ironman",
  "peach-jam",
  "private-event",
  "other",
];

export const EVENT_LABELS: Record<string, string> = {
  masters: "Masters",
  anwa: "ANWA",
  ironman: "Ironman",
  "peach-jam": "Peach Jam",
  "private-event": "Private event",
  "student-living": "Student living",
  other: "Other",
};

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  vrbo: "VRBO",
  manual_block: "Manual block",
  helcim_webhook: "Helcim",
  manual: "Manual",
  seed: "Seed data",
};

export function eventLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return EVENT_LABELS[value] ?? titleCase(value);
}

export function sourceLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return SOURCE_LABELS[value] ?? titleCase(value);
}

/** Tailwind classes for a status pill. Falls back to neutral for unknown keys
 *  so a new backend enum value degrades gracefully instead of rendering bare. */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    paid_in_full: "bg-green-100 text-green-800",
    deposit_paid: "bg-amber-100 text-amber-800",
    balance_due: "bg-amber-100 text-amber-800",
    pending: "bg-slate-100 text-slate-700",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-red-100 text-red-700",
    partially_refunded: "bg-orange-100 text-orange-800",
    failed: "bg-red-100 text-red-700",
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-amber-100 text-amber-800",
    converted: "bg-green-100 text-green-800",
    archived: "bg-slate-100 text-slate-600",
    direct: "bg-green-100 text-green-800",
    airbnb: "bg-rose-100 text-rose-700",
    vrbo: "bg-sky-100 text-sky-700",
    manual_block: "bg-slate-200 text-slate-700",
    admin: "bg-brand-forest/10 text-brand-forest",
    manager: "bg-brand-gold/20 text-amber-800",
    staff: "bg-sky-100 text-sky-700",
    moderator: "bg-violet-100 text-violet-700",
    guest: "bg-slate-100 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}

export const CHART_COLORS = [
  "#0e3b2c",
  "#c8a34d",
  "#16523d",
  "#d4607a",
  "#5b8c7b",
  "#ddc07f",
  "#8fae9f",
  "#a8546b",
];