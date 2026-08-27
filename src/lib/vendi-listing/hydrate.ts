/**
 * Canonical server-row → VendiDraft hydration.
 *
 * One explicit normalization layer. Before this existed, resume mapped a narrow
 * subset of columns inline in the builder, so a returning seller could resume
 * the right listing row and still be re-asked for pricing, fulfilment, deposit,
 * amenities, dimensions and documents that were already saved.
 *
 * Rules:
 *  - Only columns Vendi actually supports are mapped. Nothing is invented.
 *  - A non-empty server value never loses to an empty/stale browser value.
 *  - The conversational `answered` ledger is DERIVED from saved facts so
 *    `nextQuestion` skips anything the database already holds.
 */
import type { DocumentType } from '@/types/documents';
import { parseKnownProblems } from '@/lib/listings/stages';
import type { VendiDraft } from './script';


export type ListingRow = Record<string, unknown>;

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const arr = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const items = v.filter((i): i is string => typeof i === 'string' && i.trim().length > 0);
  return items.length ? items : undefined;
};

/** Every Vendi-supported listing column, mapped onto the interview's draft shape. */
export function listingRowToVendiDraft(
  row: ListingRow,
  requiredDocuments?: DocumentType[],
): VendiDraft {
  const draft: VendiDraft = {
    title: str(row.title),
    description: str(row.description),
    category: str(row.category),
    mode: str(row.mode),
    subcategory: str(row.subcategory),

    address: str(row.address) ?? str(row.pickup_location_text),
    city: str(row.city),
    state: str(row.state),
    zip_code: str(row.postal_code),
    latitude: num(row.latitude),
    longitude: num(row.longitude),

    price_sale: num(row.price_sale),
    price_monthly: num(row.price_monthly),
    price_weekly: num(row.price_weekly),
    price_daily: num(row.price_daily),
    price_hourly: num(row.price_hourly),
    deposit_amount: num(row.deposit_amount),

    available_from: str(row.available_from),
    available_to: str(row.available_to),
    operating_hours_start: str(row.operating_hours_start),
    operating_hours_end: str(row.operating_hours_end),
    instant_book: bool(row.instant_book),

    fulfillment_type: str(row.fulfillment_type),
    delivery_fee: num(row.delivery_fee),
    delivery_radius_miles: num(row.delivery_radius_miles),
    pickup_instructions: str(row.pickup_instructions),
    delivery_instructions: str(row.delivery_instructions),
    access_instructions: str(row.access_instructions),
    hours_of_access: str(row.hours_of_access),
    location_notes: str(row.location_notes),

    amenities: arr(row.amenities),
    highlights: arr(row.highlights),
    length_inches: num(row.length_inches),
    width_inches: num(row.width_inches),
    height_inches: num(row.height_inches),
    weight_lbs: num(row.weight_lbs),

    condition: str(row.condition),
    operational_status: str(row.operational_status),
    title_status: str(row.title_status),
    has_lien: str(row.has_lien),
    no_known_problems: bool(row.no_known_problems),
    known_problems: parseKnownProblems(row.known_problems),
    included_items: str(row.included_items),
    photos_exclusions_answered: bool(row.photos_exclusions_answered),
    photos_exclusions_note: str(row.photos_exclusions_note),

    accept_paypal_checkout: bool(row.accept_paypal_checkout),
    accept_cash_payment: bool(row.accept_cash_payment),
    vendibook_freight_enabled: bool(row.vendibook_freight_enabled),
  };


  // Which rate the seller priced first is not a column; derive it from the
  // rates that actually exist so the rate question is not re-asked.
  draft.rent_period =
    draft.price_monthly ? 'monthly'
      : draft.price_weekly ? 'weekly'
        : draft.price_daily ? 'daily'
          : draft.price_hourly ? 'hourly'
            : null;

  if (requiredDocuments?.length) draft.required_documents = requiredDocuments;
  return draft;
}

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Merge a server draft into local state.
 *
 * `preferServer` is used whenever the server row is the authoritative newer copy
 * (cross-device resume, or a return trip from the full editor). Otherwise the
 * server only fills gaps, so an answer the seller just typed is never reverted
 * by a slower server read.
 */
export function mergeServerDraft(
  local: VendiDraft,
  server: VendiDraft,
  opts: { preferServer?: boolean } = {},
): VendiDraft {
  const merged: VendiDraft = { ...local };
  for (const [key, serverValue] of Object.entries(server)) {
    if (isEmpty(serverValue)) continue;
    const localValue = (merged as unknown as Record<string, unknown>)[key];
    if (opts.preferServer || isEmpty(localValue)) {
      (merged as unknown as Record<string, unknown>)[key] = serverValue;
    }
  }
  return merged;
}

/**
 * Interview questions that the saved facts already answer.
 *
 * Deliberately conservative: a derived answer is only produced when the value
 * could not have been written by anything other than a real seller answer.
 * Optional questions the seller skipped are left alone (they carry no fact) and
 * are re-offered — a skipped optional never blocks publishing.
 */
export function deriveAnsweredFromDraft(
  draft: VendiDraft,
  opts: { hasMedia?: boolean } = {},
): string[] {
  const done: string[] = [];
  const mark = (id: string, satisfied: unknown) => { if (satisfied) done.push(id); };
  const anyRate = !!(draft.price_monthly || draft.price_weekly || draft.price_daily || draft.price_hourly);

  // A resumed listing has already been through the opening; never re-offer import.
  if (draft.category || draft.mode || draft.title || draft.description) {
    done.push('import_choice', 'import_paste');
  }

  mark('category', draft.category);
  mark('mode', draft.mode);
  mark('subcategory', draft.subcategory);
  mark('location', draft.city && draft.state);
  mark('description', (draft.description?.trim().length ?? 0) >= 20);
  mark('title', (draft.title?.trim().length ?? 0) >= 8);
  mark('sale_price', draft.mode === 'sale' && draft.price_sale);
  mark('rent_period', draft.mode === 'rent' && (draft.rent_period || anyRate));
  mark('rent_price', draft.mode === 'rent' && anyRate);
  // `fulfillment_type` and `instant_book` carry database defaults ('pickup',
  // false) written at draft creation, so only a non-default value proves the
  // seller actually answered.
  mark('fulfillment', ['delivery', 'both'].includes(draft.fulfillment_type ?? ''));
  mark('instant_book', draft.mode === 'rent' && draft.instant_book === true);
  mark('photos', opts.hasMedia);

  // Optional depth — only derived from a value that must have been supplied.
  mark('deposit', draft.deposit_amount);
  mark('availability', draft.available_from);
  mark('required_documents', draft.required_documents?.length);
  mark('delivery_terms', draft.delivery_radius_miles || draft.delivery_fee);
  mark('delivery_instructions', draft.delivery_instructions);
  mark('pickup_instructions', draft.pickup_instructions);
  mark('hours_of_access', draft.hours_of_access);
  mark('access_instructions', draft.access_instructions);
  mark('location_notes', draft.location_notes);
  mark('amenities', draft.amenities?.length);
  mark('highlights', draft.highlights?.length);
  mark('dimensions', draft.length_inches);
  mark('sale_dimensions', draft.length_inches && draft.height_inches);

  // Disclosures. `no_known_problems` and `photos_exclusions_answered` carry
  // database defaults (false), so only a truthy value proves a real answer.
  mark('condition', draft.condition);
  mark('operational_status', draft.operational_status);
  mark('title_status', draft.title_status);
  mark('has_lien', draft.has_lien);
  mark('known_problems', draft.no_known_problems === true || (draft.known_problems?.length ?? 0) > 0);
  mark('included_items', (draft.included_items?.trim().length ?? 0) >= 3);
  mark('photo_exclusions', draft.photos_exclusions_answered === true);



  return Array.from(new Set(done));
}
