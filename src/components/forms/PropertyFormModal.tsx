import { useState } from "react";
import { Link } from "react-router-dom";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput, Toggle } from "@/components/ui/Field";
import { centsToUsdInput, parseUsdToCents } from "@/lib/format";
import type { Property, PropertyPayload } from "@/api/types";

interface Props {
  property: Property | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<PropertyPayload>) => void;
}

interface FormState {
  slug: string;
  listing_id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  description: string;
  guests: string;
  bedrooms: string;
  beds: string;
  baths: string;
  price: string;
  rating: string;
  reviews_count: string;
  airbnb_url: string;
  vrbo_url: string;
  lat: string;
  lon: string;
  miles_to_angc: string;
  tags: string;
  walking_cluster: boolean;
  large_group: boolean;
  is_published: boolean;
  is_signature: boolean;
}

const EMPTY: FormState = {
  slug: "",
  listing_id: "",
  title: "",
  address: "",
  city: "Augusta",
  state: "GA",
  description: "",
  guests: "8",
  bedrooms: "4",
  beds: "",
  baths: "3",
  price: "",
  rating: "",
  reviews_count: "",
  airbnb_url: "",
  vrbo_url: "",
  lat: "",
  lon: "",
  miles_to_angc: "",
  tags: "",
  walking_cluster: false,
  large_group: false,
  is_published: true,
  is_signature: false,
};

function toForm(property: Property): FormState {
  return {
    slug: property.slug,
    listing_id: property.listing_id,
    title: property.title,
    address: property.address,
    city: property.city ?? "Augusta",
    state: property.state ?? "GA",
    description: property.description ?? "",
    guests: String(property.guests),
    bedrooms: String(property.bedrooms),
    beds: property.beds == null ? "" : String(property.beds),
    baths: String(property.baths),
    price: centsToUsdInput(property.price_cents),
    rating: property.rating == null ? "" : String(property.rating),
    reviews_count: property.reviews_count == null ? "" : String(property.reviews_count),
    airbnb_url: property.airbnb_url ?? "",
    vrbo_url: property.vrbo_url ?? "",
    lat: property.lat == null ? "" : String(property.lat),
    lon: property.lon == null ? "" : String(property.lon),
    miles_to_angc: property.miles_to_angc == null ? "" : String(property.miles_to_angc),
    tags: (property.tags ?? []).join(", "),
    walking_cluster: property.walking_cluster,
    large_group: property.large_group,
    is_published: property.is_published,
    is_signature: property.is_signature,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const numberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/* Mounted only while open and keyed by record id, so opening the dialog
   creates a fresh component with its state seeded from props. That replaces the
   usual "sync props into state with an effect" dance, which React 19 correctly
   flags as a cascading render. */
export function PropertyFormModal({ property, saving, onClose, onSubmit }: Props) {
  const isEdit = property !== null;
  const [form, setForm] = useState<FormState>(() => (property ? toForm(property) : EMPTY));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.title.trim()) next.title = "Title is required";
    if (!isEdit && !form.slug.trim()) next.slug = "Slug is required";
    if (!isEdit && !form.listing_id.trim()) next.listing_id = "Listing ID is required";
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug))
      next.slug = "Lowercase words separated by single hyphens";
    if (numberOrNull(form.guests) == null) next.guests = "Required";
    if (numberOrNull(form.bedrooms) == null) next.bedrooms = "Required";
    if (numberOrNull(form.baths) == null) next.baths = "Required";
    const rating = numberOrNull(form.rating);
    if (form.rating && (rating == null || rating < 0 || rating > 5))
      next.rating = "Must be between 0 and 5";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload: Partial<PropertyPayload> = {
      title: form.title.trim(),
      address: form.address.trim(),
      city: form.city.trim() || "Augusta",
      state: (form.state.trim() || "GA").toUpperCase().slice(0, 2),
      description: form.description.trim() || null,
      guests: Number(form.guests),
      bedrooms: Number(form.bedrooms),
      beds: numberOrNull(form.beds),
      baths: Number(form.baths),
      price_cents: parseUsdToCents(form.price),
      rating: numberOrNull(form.rating),
      reviews_count: numberOrNull(form.reviews_count),
      airbnb_url: form.airbnb_url.trim() || null,
      vrbo_url: form.vrbo_url.trim() || null,
      lat: numberOrNull(form.lat),
      lon: numberOrNull(form.lon),
      miles_to_angc: numberOrNull(form.miles_to_angc),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      walking_cluster: form.walking_cluster,
      large_group: form.large_group,
      is_published: form.is_published,
      is_signature: form.is_signature,
    };

    // Identity fields only travel on create — changing a slug after launch
    // breaks every published URL and inbound link to that home.
    if (!isEdit) {
      payload.slug = form.slug.trim();
      payload.listing_id = form.listing_id.trim();
      payload.images = [];
    }

    onSubmit(payload);
  };

  return (
    <Modal
      open
      size="lg"
      title={isEdit ? "Edit property" : "Add property"}
      description={
        isEdit
          ? property?.address
          : "Create a new home in the portfolio. Photos are managed by the gallery seeder."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Create property"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            Identity
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address" error={errors.address} required>
              <TextInput
                value={form.address}
                invalid={Boolean(errors.address)}
                onChange={(e) => {
                  set("address", e.target.value);
                  if (!isEdit && !form.slug) set("slug", slugify(e.target.value));
                }}
                placeholder="1204 Magnolia Dr"
              />
            </Field>

            <Field label="Listing title" error={errors.title} required>
              <TextInput
                value={form.title}
                invalid={Boolean(errors.title)}
                onChange={(e) => set("title", e.target.value)}
                placeholder="7B4B Masters Golf Magnolia Dr. 8888"
              />
            </Field>

            <Field
              label="Slug"
              error={errors.slug}
              required={!isEdit}
              hint={isEdit ? "Locked after creation — changing it breaks live URLs" : undefined}
            >
              <TextInput
                value={form.slug}
                disabled={isEdit}
                invalid={Boolean(errors.slug)}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="1204-magnolia-dr"
              />
            </Field>

            <Field label="Listing ID" error={errors.listing_id} required={!isEdit}>
              <TextInput
                value={form.listing_id}
                disabled={isEdit}
                invalid={Boolean(errors.listing_id)}
                onChange={(e) => set("listing_id", e.target.value)}
                placeholder="8888-1204M"
              />
            </Field>

            <Field label="City">
              <TextInput value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>

            <Field label="State">
              <TextInput
                value={form.state}
                maxLength={2}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
              />
            </Field>
          </div>

          <Field label="Description" className="mt-4">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What makes this home stand out for event-week guests…"
            />
          </Field>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            Capacity &amp; pricing
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Guests" error={errors.guests} required>
              <TextInput
                type="number"
                min={1}
                value={form.guests}
                invalid={Boolean(errors.guests)}
                onChange={(e) => set("guests", e.target.value)}
              />
            </Field>
            <Field label="Bedrooms" error={errors.bedrooms} required>
              <TextInput
                type="number"
                min={0}
                value={form.bedrooms}
                invalid={Boolean(errors.bedrooms)}
                onChange={(e) => set("bedrooms", e.target.value)}
              />
            </Field>
            <Field label="Beds">
              <TextInput
                type="number"
                min={0}
                value={form.beds}
                onChange={(e) => set("beds", e.target.value)}
              />
            </Field>
            <Field label="Baths" error={errors.baths} required>
              <TextInput
                type="number"
                min={0}
                step="0.5"
                value={form.baths}
                invalid={Boolean(errors.baths)}
                onChange={(e) => set("baths", e.target.value)}
              />
            </Field>
            <Field label="Event price (USD)" hint="Blank = inquire for pricing">
              <TextInput
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="37077.00"
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Rating" error={errors.rating}>
              <TextInput
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={form.rating}
                invalid={Boolean(errors.rating)}
                onChange={(e) => set("rating", e.target.value)}
              />
            </Field>
            <Field label="Review count">
              <TextInput
                type="number"
                min={0}
                value={form.reviews_count}
                onChange={(e) => set("reviews_count", e.target.value)}
              />
            </Field>
            <Field label="Miles to ANGC">
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={form.miles_to_angc}
                onChange={(e) => set("miles_to_angc", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            Channels &amp; calendar sync
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Airbnb listing URL">
              <TextInput
                value={form.airbnb_url}
                onChange={(e) => set("airbnb_url", e.target.value)}
              />
            </Field>
            <Field label="VRBO listing URL">
              <TextInput value={form.vrbo_url} onChange={(e) => set("vrbo_url", e.target.value)} />
            </Field>
            {/*
              * Calendar feed URLs are deliberately NOT editable here.
              *
              * They used to be, and it was a data-loss bug rather than only a
              * permissions one: the admin API returns a masked preview of a
              * feed URL, never the real value, so these inputs hydrated to ""
              * on every edit and the save then PATCHed null over a working
              * feed. Editing a home's bathroom count silently unconfigured its
              * Airbnb sync.
              *
              * Feeds now live only on Channel Sync, which is Manager+ and
              * validates the URL against the approved channel hosts.
              */}
            <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Calendar feed URLs</p>
              <p className="mt-1 text-sm text-slate-500">
                Airbnb and VRBO iCal feeds are managed on the{" "}
                <Link to="/channel-sync" className="font-medium text-slate-900 underline">
                  Channel Sync
                </Link>{" "}
                screen. They are calendar credentials, so they are restricted to
                Manager and Admin and are never shown in full after saving.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            Location &amp; tags
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Latitude">
              <TextInput
                type="number"
                step="0.000001"
                value={form.lat}
                onChange={(e) => set("lat", e.target.value)}
              />
            </Field>
            <Field label="Longitude">
              <TextInput
                type="number"
                step="0.000001"
                value={form.lon}
                onChange={(e) => set("lon", e.target.value)}
              />
            </Field>
            <Field label="Tags" hint="Comma separated">
              <TextInput
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="12+ guests, Near course"
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            Visibility
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={form.is_published}
              onChange={(next) => set("is_published", next)}
              label="Published"
              description="Visible on the public site"
            />
            <Toggle
              checked={form.is_signature}
              onChange={(next) => set("is_signature", next)}
              label="Signature home"
              description="Featured placement in the portfolio"
            />
            <Toggle
              checked={form.walking_cluster}
              onChange={(next) => set("walking_cluster", next)}
              label="Walking cluster"
              description="Within walking distance of the course"
            />
            <Toggle
              checked={form.large_group}
              onChange={(next) => set("large_group", next)}
              label="Large group"
              description="Suited to 12+ guest parties"
            />
          </div>
        </section>
      </div>
    </Modal>
  );
}