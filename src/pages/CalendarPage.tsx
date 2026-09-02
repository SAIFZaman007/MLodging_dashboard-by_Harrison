import { useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, List, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  useAdminProperties,
  useBookings,
  useCreateBooking,
  useDeleteBooking,
  useOrders,
  useSyncCalendar,
  useUpdateBooking,
} from "@/hooks/useAdminData";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
  StatusBadge,
} from "@/components/ui/Feedback";
import { BookingFormModal } from "@/components/forms/BookingFormModal";
import { SelectInput } from "@/components/ui/Field";
import { CalendarTimeline } from "@/components/CalendarTimeline";
import {
  BOOKING_SOURCES,
  ORDER_STATUSES,
  eventLabel,
  formatDate,
  nightsBetween,
  sourceLabel,
  titleCase,
} from "@/lib/format";
import type { Booking, BookingPayload } from "@/api/types";

type Timeframe = "upcoming" | "past" | "all";
type ViewMode = "timeline" | "list";

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [timeframe, setTimeframe] = useState<Timeframe>("upcoming");
  const [source, setSource] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);

  const toast = useToast();
  const { data: bookings, isLoading, isError, error, refetch } = useBookings({
    source,
    property_id: propertyId,
  });
  const { data: properties } = useAdminProperties();
  const { data: orders } = useOrders();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const syncCalendar = useSyncCalendar();

  const propertyLookup = useMemo(
    () => new Map((properties ?? []).map((p) => [p.id, p])),
    [properties],
  );

  /*
    Homes with at least one channel feed configured.

    This previously filtered on `p.airbnb_ical_url || p.vrbo_ical_url`. Those
    fields were removed from PropertyAdminOut when feed URLs were reclassified
    as credentials, so both read `undefined` on every row and `syncable` was
    always empty - which silently hid the entire "Sync external calendars"
    panel below, including immediately after a feed had been saved.

    `*_ical_configured` is the boolean the API actually returns for this.
  */
  const syncable = (properties ?? []).filter(
    (p) => p.airbnb_ical_configured || p.vrbo_ical_configured,
  );

  const visible = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (bookings ?? []).filter((booking) => {
      if (timeframe === "upcoming") return booking.check_out >= today;
      if (timeframe === "past") return booking.check_out < today;
      return true;
    });
  }, [bookings, timeframe]);

  const handleSubmit = (payload: BookingPayload) => {
    if (editing) {
      updateBooking.mutate(
        { id: editing.id, payload },
        {
          onSuccess: () => {
            toast.success("Booking updated");
            setFormOpen(false);
          },
          // A 409 here is the double-booking guard doing its job — surface the
          // API's message verbatim so the operator knows which dates clashed.
          onError: (err: Error) => toast.error(err.message),
        },
      );
    } else {
      createBooking.mutate(payload, {
        onSuccess: () => {
          toast.success("Booking created");
          setFormOpen(false);
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteBooking.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Booking removed");
        setDeleting(null);
      },
      onError: (err: Error) => {
        toast.error(err.message);
        setDeleting(null);
      },
    });
  };

  const handleSync = (id: string, address: string) => {
    syncCalendar.mutate(id, {
      onSuccess: () => toast.success(`Synced ${address}`),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Manage · Calendar"
        title="Calendar"
        description="Every hold across every home — direct bookings plus anything synced from Airbnb and VRBO."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add booking
          </Button>
        }
      />

      {syncable.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg text-brand-ink">Sync external calendars</h2>
            <span className="text-xs text-brand-ink/40">
              {syncable.length} home{syncable.length === 1 ? "" : "s"} with iCal feeds
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {syncable.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => handleSync(property.id, property.address)}
                disabled={syncCalendar.isPending}
                className="flex items-center gap-1.5 rounded-full border border-brand-forest/20 px-3.5 py-1.5 text-xs text-brand-ink/70 transition-colors hover:bg-brand-cream-dark disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    syncCalendar.isPending && syncCalendar.variables === property.id
                      ? "animate-spin"
                      : ""
                  }`}
                />
                {property.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Timeline / List Toggle */}
        <div className="flex rounded-full border border-brand-forest/15 bg-white p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "timeline"
                ? "bg-brand-forest text-brand-cream"
                : "text-brand-ink/55 hover:text-brand-ink"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "list"
                ? "bg-brand-forest text-brand-cream"
                : "text-brand-ink/55 hover:text-brand-ink"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>

        <div className="hidden h-4 w-px bg-brand-forest/15 sm:block" />

        {/* Timeframe selector: Upcoming / Past / All */}
        <div className="flex rounded-full border border-brand-forest/15 bg-white p-0.5">
          {(["upcoming", "past", "all"] as Timeframe[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTimeframe(option)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                timeframe === option
                  ? "bg-brand-forest text-brand-cream"
                  : "text-brand-ink/55 hover:text-brand-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="w-44">
          <SelectInput
            value={source}
            placeholder="All sources"
            onChange={(e) => setSource(e.target.value)}
            options={BOOKING_SOURCES.map((option) => ({
              value: option,
              label: sourceLabel(option),
            }))}
          />
        </div>

        <div className="w-60">
          <SelectInput
            value={propertyId}
            placeholder="All properties"
            onChange={(e) => setPropertyId(e.target.value)}
            options={(properties ?? []).map((property) => ({
              value: property.id,
              label: property.address,
            }))}
          />
        </div>

        <div className="w-44">
          <SelectInput
            value={orderStatus}
            placeholder="All statuses"
            onChange={(e) => setOrderStatus(e.target.value)}
            options={ORDER_STATUSES.map((statusKey) => ({
              value: statusKey,
              label: titleCase(statusKey),
            }))}
          />
        </div>

        {visible.length > 0 && (
          <p className="ml-auto text-sm text-brand-ink/50">{visible.length} shown</p>
        )}
      </div>

      <div className="card-flush">
        {isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <SkeletonRows rows={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={timeframe === "upcoming" ? "Nothing on the books" : "No bookings here"}
            description="Add a direct booking, block dates for maintenance, or configure an iCal feed on a property to pull in external reservations."
          />
        ) : viewMode === "timeline" ? (
          <CalendarTimeline
            bookings={visible}
            properties={properties ?? []}
            orders={orders ?? []}
            selectedPropertyId={propertyId}
            orderStatus={orderStatus}
            onSelectBooking={(booking) => {
              setEditing(booking);
              setFormOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl">
              <thead>
                <tr className="border-b border-brand-forest/10">
                  <th className="th">Property</th>
                  <th className="th">Guest</th>
                  <th className="th">Check-in</th>
                  <th className="th">Check-out</th>
                  <th className="th text-right">Nights</th>
                  <th className="th">Event</th>
                  <th className="th">Source</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.id} className="row">
                    <td className="td text-brand-ink">
                      {propertyLookup.get(booking.property_id)?.address ??
                        booking.property_id.slice(0, 8)}
                    </td>
                    <td className="td">
                      {booking.guest_name ?? (
                        <span className="text-brand-ink/35">Owner block</span>
                      )}
                      {booking.guests_count != null && (
                        <span className="block text-xs text-brand-ink/40">
                          {booking.guests_count} guests
                        </span>
                      )}
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(booking.check_in)}</td>
                    <td className="td whitespace-nowrap">{formatDate(booking.check_out)}</td>
                    <td className="td tnum text-right">
                      {nightsBetween(booking.check_in, booking.check_out)}
                    </td>
                    <td className="td">{eventLabel(booking.event_week)}</td>
                    <td className="td">
                      <StatusBadge value={booking.source} />
                    </td>
                    <td className="td">
                      <StatusBadge value={booking.status} />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(booking);
                            setFormOpen(true);
                          }}
                          title="Edit booking"
                          aria-label="Edit booking"
                          className="rounded-lg p-2 text-brand-ink/50 transition-colors hover:bg-brand-cream hover:text-brand-ink"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(booking)}
                          title="Delete booking"
                          aria-label="Delete booking"
                          className="rounded-lg p-2 text-brand-ink/40 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <BookingFormModal
          key={editing?.id ?? "new"}
          booking={editing}
          properties={properties ?? []}
          saving={createBooking.isPending || updateBooking.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete booking"
        message="Remove this hold entirely? The dates become immediately bookable again. Cancelling the booking instead keeps a record of what happened."
        confirmLabel="Delete booking"
        loading={deleteBooking.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}