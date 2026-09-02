import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import type { Booking, Order, Property } from "@/api/types";
import { formatDate, formatUsd, nightsBetween, sourceLabel } from "@/lib/format";

interface Props {
  bookings: Booking[];
  properties: Property[];
  orders?: Order[];
  onSelectBooking: (booking: Booking) => void;
  selectedPropertyId?: string;
  orderStatus?: string;
}

function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getBookingStyle(source: string, status: string): string {
  if (status === "cancelled") {
    return "bg-red-50 text-red-700 border-red-200 line-through opacity-60";
  }
  const isPending = status === "pending";
  const pendingExtra = isPending ? "border-dashed opacity-90" : "";

  switch (source) {
    case "direct":
      return `bg-brand-forest text-brand-cream border-brand-forest/40 ${pendingExtra}`;
    case "airbnb":
      return `bg-rose-600 text-white border-rose-700 ${pendingExtra}`;
    case "vrbo":
      return `bg-sky-600 text-white border-sky-700 ${pendingExtra}`;
    case "manual_block":
      return `bg-slate-700 text-slate-100 border-slate-800 ${pendingExtra}`;
    default:
      return `bg-brand-forest/90 text-white border-brand-forest ${pendingExtra}`;
  }
}

function computeTracksForBookings(
  propBookings: Booking[],
  dateIndexMap: Map<string, number>,
  firstIso: string,
  lastIso: string,
  totalDates: number
): Map<string, number> {
  const sorted = [...propBookings].sort((a, b) => a.check_in.localeCompare(b.check_in));
  const trackEndCols: number[] = [];
  const trackMap = new Map<string, number>();

  for (const b of sorted) {
    const startIdx = dateIndexMap.get(b.check_in);
    const endIdx = dateIndexMap.get(b.check_out);

    const startCol = startIdx != null ? startIdx : b.check_in < firstIso ? 0 : -1;
    const endCol = endIdx != null ? endIdx : b.check_out > lastIso ? totalDates : -1;

    if (startCol < 0 || endCol < 0 || startCol >= totalDates || endCol <= 0) {
      continue;
    }

    const actualStart = Math.max(0, startCol);
    const actualEnd = Math.min(totalDates, endCol);

    let assignedTrack = -1;
    for (let i = 0; i < trackEndCols.length; i++) {
      if (trackEndCols[i] <= actualStart) {
        assignedTrack = i;
        trackEndCols[i] = actualEnd;
        break;
      }
    }

    if (assignedTrack === -1) {
      assignedTrack = trackEndCols.length;
      trackEndCols.push(actualEnd);
    }

    trackMap.set(b.id, assignedTrack + 1);
  }

  return trackMap;
}

export function CalendarTimeline({
  bookings,
  properties,
  orders = [],
  onSelectBooking,
  selectedPropertyId = "",
  orderStatus = "",
}: Props) {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [customStart, setCustomStart] = useState<string | null>(null);
  const [rangeSpan, setRangeSpan] = useState<"14" | "30" | "60" | "all">("all");

  const bookingOrdersMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (order.booking_id && order.status !== "cancelled" && order.status !== "failed") {
        map.set(order.booking_id, (map.get(order.booking_id) ?? 0) + order.amount_cents);
      }
    }
    return map;
  }, [orders]);

  const { defaultStart, defaultEnd } = useMemo(() => {
    if (bookings.length === 0) {
      const today = parseISODate(todayIso);
      const start = new Date(today.getTime());
      start.setUTCDate(start.getUTCDate() - 2);
      const end = new Date(start.getTime());
      end.setUTCDate(end.getUTCDate() + 30);
      return { defaultStart: formatISODate(start), defaultEnd: formatISODate(end) };
    }

    let minDate = bookings[0].check_in;
    let maxDate = bookings[0].check_out;

    for (const b of bookings) {
      if (b.check_in < minDate) minDate = b.check_in;
      if (b.check_out > maxDate) maxDate = b.check_out;
    }

    const startDate = parseISODate(minDate);
    startDate.setUTCDate(startDate.getUTCDate() - 2);

    const endDate = parseISODate(maxDate);
    endDate.setUTCDate(endDate.getUTCDate() + 2);

    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
    if (diffDays < 14) {
      endDate.setUTCDate(startDate.getUTCDate() + 14);
    }

    return { defaultStart: formatISODate(startDate), defaultEnd: formatISODate(endDate) };
  }, [bookings, todayIso]);

  const effectiveStart = customStart ?? defaultStart;

  const dates = useMemo(() => {
    const start = parseISODate(effectiveStart);
    let daysCount = 30;
    if (rangeSpan === "14") daysCount = 14;
    else if (rangeSpan === "30") daysCount = 30;
    else if (rangeSpan === "60") daysCount = 60;
    else if (rangeSpan === "all") {
      const end = parseISODate(defaultEnd);
      daysCount = Math.max(14, Math.round((end.getTime() - start.getTime()) / 86400000));
    }

    const list: { date: Date; iso: string }[] = [];
    const curr = new Date(start.getTime());
    for (let i = 0; i < daysCount; i++) {
      list.push({ date: new Date(curr.getTime()), iso: formatISODate(curr) });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return list;
  }, [effectiveStart, rangeSpan, defaultEnd]);

  const dateIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    dates.forEach((d, idx) => map.set(d.iso, idx));
    return map;
  }, [dates]);

  const monthGroups = useMemo(() => {
    const groups: { monthName: string; year: number; count: number }[] = [];
    for (const item of dates) {
      const monthName = item.date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
      const year = item.date.getUTCFullYear();
      const last = groups[groups.length - 1];
      if (last && last.monthName === monthName && last.year === year) {
        last.count++;
      } else {
        groups.push({ monthName, year, count: 1 });
      }
    }
    return groups;
  }, [dates]);

  const dayHeaders = useMemo(() => {
    return dates.map((item) => ({
      iso: item.iso,
      dayName: item.date.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayNumber: item.date.getUTCDate(),
      isToday: item.iso === todayIso,
      isWeekend: item.date.getUTCDay() === 0 || item.date.getUTCDay() === 6,
    }));
  }, [dates, todayIso]);

  const bookingOrderStatusesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const order of orders) {
      if (order.booking_id && order.status) {
        const set = map.get(order.booking_id) ?? new Set<string>();
        set.add(order.status);
        map.set(order.booking_id, set);
      }
    }
    return map;
  }, [orders]);

  const filteredBookings = useMemo(() => {
    if (!orderStatus) return bookings;
    return bookings.filter((b) => {
      const statuses = bookingOrderStatusesMap.get(b.id);
      return statuses ? statuses.has(orderStatus) : false;
    });
  }, [bookings, orderStatus, bookingOrderStatusesMap]);

  const displayProperties = useMemo(() => {
    const activePropertyIds = new Set(filteredBookings.map((b) => b.property_id));

    let baseList = properties;
    if (selectedPropertyId) {
      baseList = properties.filter((p) => p.id === selectedPropertyId);
    }

    if (baseList.length > 0) {
      return baseList.filter((p) => activePropertyIds.has(p.id));
    }

    // Fallback if properties array is not loaded yet
    return Array.from(activePropertyIds).map((id) => ({
      id,
      slug: id,
      listing_id: id,
      title: `Property ${id.slice(0, 8)}`,
      address: `Property ${id.slice(0, 8)}`,
      city: "Augusta",
      state: "GA",
      description: null,
      guests: 2,
      bedrooms: 1,
      beds: null,
      baths: 1,
      price_cents: null,
      rating: null,
      reviews_count: null,
      airbnb_url: null,
      vrbo_url: null,
      airbnb_ical_configured: false,
      vrbo_ical_configured: false,
      airbnb_ical_preview: null,
      vrbo_ical_preview: null,
      walking_cluster: false,
      large_group: false,
      is_published: true,
      is_signature: false,
      lat: null,
      lon: null,
      miles_to_angc: null,
      tags: [],
      images: [],
    }));
  }, [properties, selectedPropertyId, filteredBookings]);

  const bookingsByProperty = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of filteredBookings) {
      const existing = map.get(b.property_id) ?? [];
      existing.push(b);
      map.set(b.property_id, existing);
    }
    return map;
  }, [filteredBookings]);

  const getBookingValueText = (booking: Booking): string | null => {
    const orderValue = bookingOrdersMap.get(booking.id);
    if (orderValue != null && orderValue > 0) {
      return formatUsd(orderValue);
    }
    return null;
  };

  const handlePrev = () => {
    const start = parseISODate(effectiveStart);
    start.setUTCDate(start.getUTCDate() - 14);
    setCustomStart(formatISODate(start));
  };

  const handleNext = () => {
    const start = parseISODate(effectiveStart);
    start.setUTCDate(start.getUTCDate() + 14);
    setCustomStart(formatISODate(start));
  };

  const handleToday = () => {
    const today = parseISODate(todayIso);
    today.setUTCDate(today.getUTCDate() - 2);
    setCustomStart(formatISODate(today));
  };

  const handleReset = () => {
    setCustomStart(null);
    setRangeSpan("all");
  };

  const columnWidth = 54;
  const firstIso = dates[0]?.iso ?? "";
  const lastIso = dates[dates.length - 1]?.iso ?? "";

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-forest/10 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-ink">
            {formatDate(dates[0]?.iso)} – {formatDate(dates[dates.length - 1]?.iso)}
          </span>
          <span className="text-xs text-brand-ink/40">({dates.length} days)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center rounded-md border border-brand-forest/15 bg-white p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              title="Shift 14 days earlier"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-brand-ink/70 hover:bg-brand-cream hover:text-brand-ink transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-md px-2.5 py-1 font-medium text-brand-ink/80 hover:bg-brand-cream hover:text-brand-ink transition-colors border-x border-brand-forest/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Shift 14 days later"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-brand-ink/70 hover:bg-brand-cream hover:text-brand-ink transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex rounded-md border border-brand-forest/15 bg-white p-0.5">
            {(["14", "30", "60", "all"] as const).map((span) => (
              <button
                key={span}
                type="button"
                onClick={() => setRangeSpan(span)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  rangeSpan === span
                    ? "bg-brand-forest text-brand-cream font-semibold"
                    : "text-brand-ink/60 hover:text-brand-ink"
                }`}
              >
                {span === "all" ? "Fit All" : `${span}d`}
              </button>
            ))}
          </div>

          {(customStart !== null || rangeSpan !== "all") && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset range"
              className="flex items-center gap-1 rounded-md border border-brand-forest/15 px-2 py-1 text-brand-ink/50 hover:bg-brand-cream hover:text-brand-ink transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View Container */}
      <div className="relative overflow-x-auto rounded-xl border border-brand-forest/15 bg-white shadow-xs">
        <div
          className="inline-block min-w-full align-middle"
          style={{ width: `calc(240px + ${dates.length * columnWidth}px)` }}
        >
          {/* HEADER ROW 1: MONTHS */}
          <div className="sticky top-0 z-30 flex border-b border-brand-forest/10 bg-brand-cream/60 backdrop-blur-xs">
            <div className="sticky left-0 z-40 w-60 min-w-[240px] flex-shrink-0 border-r border-brand-forest/10 bg-brand-cream-dark/90 px-4 py-2 text-xs font-semibold text-brand-ink">
              Property ({displayProperties.length})
            </div>
            <div className="flex flex-1">
              {monthGroups.map((group, idx) => (
                <div
                  key={`${group.year}-${group.monthName}-${idx}`}
                  style={{ width: `${group.count * columnWidth}px` }}
                  className="border-r border-brand-forest/10 px-2 py-1.5 text-center text-xs font-semibold text-brand-forest truncate bg-brand-cream/70"
                >
                  {group.monthName} {group.year}
                </div>
              ))}
            </div>
          </div>

          {/* HEADER ROW 2: DAYS */}
          <div className="sticky top-9 z-30 flex border-b border-brand-forest/15 bg-white">
            <div className="sticky left-0 z-40 w-60 min-w-[240px] flex-shrink-0 border-r border-brand-forest/10 bg-white px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider text-brand-ink/40">
              Dates
            </div>
            <div className="flex flex-1">
              {dayHeaders.map((day) => (
                <div
                  key={day.iso}
                  style={{ width: `${columnWidth}px` }}
                  className={`flex-shrink-0 border-r border-brand-forest/10 py-1 text-center text-[11px] leading-tight ${
                    day.isToday
                      ? "bg-brand-forest/15 text-brand-forest font-bold"
                      : day.isWeekend
                      ? "bg-brand-cream/40 text-brand-ink/60"
                      : "text-brand-ink/70"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{day.dayName}</div>
                  <div className="font-semibold text-xs">{day.dayNumber}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PROPERTY ROWS */}
          {displayProperties.map((property) => {
            const propBookings = bookingsByProperty.get(property.id) ?? [];
            const trackMap = computeTracksForBookings(
              propBookings,
              dateIndexMap,
              firstIso,
              lastIso,
              dates.length
            );

            return (
              <div
                key={property.id}
                className="flex border-b border-brand-forest/10 hover:bg-brand-cream/15 transition-colors min-h-[58px]"
              >
                {/* Sticky Left Property Column */}
                <div className="sticky left-0 z-20 w-60 min-w-[240px] flex-shrink-0 border-r border-brand-forest/10 bg-white px-4 py-2.5 flex flex-col justify-center shadow-[3px_0_8px_-3px_rgba(0,0,0,0.06)]">
                  <span className="font-medium text-xs text-brand-ink truncate" title={property.address}>
                    {property.address}
                  </span>
                  <span className="text-[11px] text-brand-ink/40 truncate">
                    {property.bedrooms} bed · {property.guests} guests
                  </span>
                </div>

                {/* Timeline Grid Area */}
                <div className="relative flex-1 bg-white min-h-[58px] flex flex-col justify-center">
                  {/* Background Date Guidelines */}
                  <div className="absolute inset-0 flex pointer-events-none z-0">
                    {dayHeaders.map((day) => (
                      <div
                        key={day.iso}
                        style={{ width: `${columnWidth}px` }}
                        className={`flex-shrink-0 border-r border-brand-forest/5 ${
                          day.isToday
                            ? "bg-brand-forest/5"
                            : day.isWeekend
                            ? "bg-brand-cream/20"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  {/* Booking Blocks Layer */}
                  <div
                    className="relative z-10 py-1.5"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${dates.length}, ${columnWidth}px)`,
                      gridAutoRows: "38px",
                      gap: "4px 0px",
                    }}
                  >
                    {propBookings.map((b) => {
                      const startIdx = dateIndexMap.get(b.check_in);
                      const endIdx = dateIndexMap.get(b.check_out);

                      const startCol = startIdx != null ? startIdx : b.check_in < firstIso ? 0 : -1;
                      const endCol = endIdx != null ? endIdx : b.check_out > lastIso ? dates.length : -1;

                      if (startCol < 0 || endCol < 0 || startCol >= dates.length || endCol <= 0) {
                        return null;
                      }

                      const actualStart = Math.max(0, startCol);
                      const actualEnd = Math.min(dates.length, endCol);
                      const span = actualEnd - actualStart;
                      if (span <= 0) return null;

                      const trackRow = trackMap.get(b.id) ?? 1;
                      const nights = nightsBetween(b.check_in, b.check_out);
                      const valText = getBookingValueText(b);

                      return (
                        <div
                          key={b.id}
                          onClick={() => onSelectBooking(b)}
                          title={`Property: ${property.address}\nGuest: ${b.guest_name || 'Owner Block'}\nCheck-in: ${b.check_in}\nCheck-out: ${b.check_out} (${nights} nights)\nStatus: ${b.status}\nSource: ${sourceLabel(b.source)}${valText ? `\nValue: ${valText}` : ''}`}
                          style={{
                            gridColumnStart: actualStart + 1,
                            gridColumnEnd: actualEnd + 1,
                            gridRowStart: trackRow,
                          }}
                          className={`group relative mx-0.5 cursor-pointer rounded-lg px-2.5 py-1 text-xs transition-all duration-150 hover:shadow-md hover:scale-[1.01] flex flex-col justify-center overflow-hidden border ${getBookingStyle(
                            b.source,
                            b.status
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1 font-semibold truncate leading-tight">
                            <span className="truncate">
                              {valText ? `${valText} • ${nights}n` : (b.guest_name || sourceLabel(b.source))}
                            </span>
                            {!valText && (
                              <span className="text-[10px] opacity-80 flex-shrink-0">
                                {nights}n
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] opacity-85 truncate leading-tight">
                            {valText
                              ? (b.guest_name ? `${b.guest_name} (${sourceLabel(b.source)})` : sourceLabel(b.source))
                              : sourceLabel(b.source)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-brand-ink/60 px-1 pt-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-brand-ink">Sources:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-forest" /> Direct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Airbnb
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> VRBO
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Owner Block
          </span>
        </div>
        <span className="text-[11px] text-brand-ink/40">
          Click any block to view or edit details
        </span>
      </div>
    </div>
  );
}