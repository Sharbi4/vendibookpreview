import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type ListingRow = Tables<'listings'>;

/** Categories that can be rented out after being listed for sale. */
const CONVERTIBLE_CATEGORIES = ['food_truck', 'food_trailer'] as const;

/** A phone number accidentally stored in the public pickup-location field. */
const PHONE_LIKE = /^\+?1?\s*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}$/;

/**
 * Public pickup/location text only. Legacy rows sometimes stored a contact
 * phone here; never propagate that into a new listing or public surface.
 */
export const sanitizePickupLocationText = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  if (!text) return null;
  return PHONE_LIKE.test(text) ? null : text;
};

/** A published/paused food truck or trailer sale listing can spawn a rental. */
export const isRentalConversionEligible = (listing: Pick<
  ListingRow,
  'mode' | 'category' | 'status' | 'deleted_at'
>): boolean =>
  listing.mode === 'sale' &&
  !listing.deleted_at &&
  (listing.status === 'published' || listing.status === 'paused') &&
  (CONVERTIBLE_CATEGORIES as readonly string[]).includes(listing.category as string);

export type LinkedRentalState = 'none' | 'draft' | 'live' | 'paused';

export const linkedRentalState = (rental: Pick<ListingRow, 'status'> | null | undefined): LinkedRentalState => {
  if (!rental) return 'none';
  if (rental.status === 'published') return 'live';
  if (rental.status === 'paused') return 'paused';
  return 'draft';
};

export const linkedRentalCtaLabel = (state: LinkedRentalState): string => {
  switch (state) {
    case 'draft':
      return 'Finish rental setup';
    case 'live':
    case 'paused':
      return 'Manage rental';
    default:
      return 'Rent it out';
  }
};

/**
 * Asset-level fields that describe the physical truck/trailer. Sale-offer
 * state, performance counters, promotions and transaction history are
 * deliberately excluded.
 */
export const buildRentalDraftPayload = (source: ListingRow) => ({
  host_id: source.host_id,
  source_listing_id: source.id,
  mode: 'rent' as const,
  status: 'draft' as const,
  category: source.category,
  subcategory: source.subcategory,
  title: source.title,
  description: source.description,
  highlights: source.highlights ?? [],
  amenities: source.amenities ?? [],
  image_urls: source.image_urls ?? [],
  video_urls: source.video_urls ?? [],
  cover_image_url: source.cover_image_url,

  // Location / fulfillment (asset-level)
  fulfillment_type: source.fulfillment_type,
  address: source.address,
  city: source.city,
  state: source.state,
  postal_code: source.postal_code,
  latitude: source.latitude,
  longitude: source.longitude,
  pickup_location_text: sanitizePickupLocationText(source.pickup_location_text),
  pickup_instructions: source.pickup_instructions,
  delivery_instructions: source.delivery_instructions,
  access_instructions: source.access_instructions,
  location_notes: source.location_notes,
  delivery_radius_miles: source.delivery_radius_miles,
  delivery_fee: source.delivery_fee,
  delivery_fee_type: source.delivery_fee_type,

  // Physical specs
  year_built: source.year_built,
  make: source.make,
  model: source.model,
  condition: source.condition,
  mileage: source.mileage,
  fuel_type: source.fuel_type,
  weight_lbs: source.weight_lbs,
  length_inches: source.length_inches,
  width_inches: source.width_inches,
  height_inches: source.height_inches,
  space_sqft: source.space_sqft,
  kitchen_build_year: source.kitchen_build_year,
  included_items: source.included_items,
  total_slots: source.total_slots ?? 1,

  // Rental defaults — nothing carried over from the sale offer.
  price_sale: null,
  price_daily: null,
  price_weekly: null,
  price_monthly: null,
  price_hourly: null,
  deposit_amount: null,
  rental_min_days: null,
  available_from: null,
  available_to: null,
  instant_book: false,
  accepts_offers: false,
  price_negotiable: false,
  min_offer_amount: null,
  featured_enabled: false,
  featured_at: null,
  featured_expires_at: null,
  pending_featured_payment: null,
  proof_notary_enabled: false,
  vendibook_freight_enabled: false,
  published_at: null,
  view_count: 0,
});

export type CreateLinkedRentalResult =
  | { ok: true; rentalId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Creates (or returns the existing) rental draft linked to a sale listing.
 * Idempotent: repeated clicks always resolve to the same rental listing.
 */
export const createLinkedRentalDraft = async (
  sourceListingId: string,
): Promise<CreateLinkedRentalResult> => {
  const { data: source, error: sourceError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', sourceListingId)
    .maybeSingle();

  if (sourceError) return { ok: false, error: sourceError.message };
  if (!source) return { ok: false, error: 'Listing not found.' };
  if (!isRentalConversionEligible(source)) {
    return { ok: false, error: 'This listing is not eligible to be rented out.' };
  }

  const { data: existing } = await supabase
    .from('listings')
    .select('id')
    .eq('source_listing_id', sourceListingId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing?.id) return { ok: true, rentalId: existing.id, created: false };

  const { data: created, error: insertError } = await supabase
    .from('listings')
    .insert(buildRentalDraftPayload(source))
    .select('id')
    .single();

  if (insertError) {
    // Unique index race — another click already created it.
    const { data: raced } = await supabase
      .from('listings')
      .select('id')
      .eq('source_listing_id', sourceListingId)
      .is('deleted_at', null)
      .maybeSingle();
    if (raced?.id) return { ok: true, rentalId: raced.id, created: false };
    return { ok: false, error: insertError.message };
  }

  // Carry over renter document requirements as a starting point.
  const { data: docs } = await supabase
    .from('listing_required_documents')
    .select('document_type, is_required, deadline_type, deadline_offset_hours, description')
    .eq('listing_id', sourceListingId);

  if (docs?.length) {
    await supabase.from('listing_required_documents').insert(
      docs.map((d) => ({ ...d, listing_id: created.id })),
    );
  }

  return { ok: true, rentalId: created.id, created: true };
};
