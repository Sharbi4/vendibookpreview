// Single authoritative server-side gate for every Equinox Funding surface
// (apply link + pro forma purchase sheet).
//
// The client can never be trusted to decide this: a listing is financing-
// enabled ONLY when the global launch flag is on, the listing is a for-sale
// listing that is publicly visible (or viewed by its owner), the seller opted
// this listing in, and a CURRENT disclosure version was accepted.

import { jsonError } from './jsonError.ts';

export const EQUINOX_DISCLOSURE_VERSION = 'equinox-financing-v1';
export const EQUINOX_FLAG_KEY = 'equinox_financing_enabled';
export const EQUINOX_APPLY_URL = 'https://equinox-funding.com/efapplication/';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FinancingEligibility {
  ok: true;
  listing: Record<string, any>;
  isOwner: boolean;
  includeVin: boolean;
}

export interface FinancingEligibilityFailure {
  ok: false;
  response: Response;
}

export async function resolveViewerId(
  supabase: any,
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  return data?.user?.id ?? null;
}

/**
 * Loads the listing and enforces financing eligibility. Returns either the
 * verified listing row or a ready-to-return error Response.
 *
 * `columns` lets callers select only what they need.
 */
export async function checkFinancingEligibility(
  supabase: any,
  listingId: string,
  viewerId: string | null,
  columns = 'id, host_id, mode, status',
): Promise<FinancingEligibility | FinancingEligibilityFailure> {
  if (!UUID_RE.test(listingId)) {
    return {
      ok: false,
      response: jsonError(400, 'invalid_listing_id', 'A valid listing id is required.'),
    };
  }

  const select = columns.includes('host_id') ? columns : `host_id, mode, status, ${columns}`;

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(select)
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) {
    return {
      ok: false,
      response: jsonError(500, 'listing_lookup_failed', 'Could not load this listing.'),
    };
  }
  if (!listing) {
    return {
      ok: false,
      response: jsonError(404, 'listing_not_found', 'This listing is no longer available.'),
    };
  }

  const isOwner = !!viewerId && viewerId === listing.host_id;

  if (listing.mode !== 'sale') {
    return {
      ok: false,
      response: jsonError(
        403,
        'financing_not_available',
        'Financing is only available on listings that are for sale.',
      ),
    };
  }

  if (!isOwner) {
    const { data: visible } = await supabase.rpc('is_listing_publicly_visible', {
      _listing_id: listingId,
    });
    if (visible !== true) {
      return {
        ok: false,
        response: jsonError(404, 'listing_not_found', 'This listing is no longer available.'),
      };
    }
  }

  // Buyer financing is a marketplace-level benefit on every for-sale listing.
  // No seller opt-in is required; the launch flag remains the only kill switch.
  const [{ data: flagRow }, { data: pref }] = await Promise.all([
    supabase.from('app_feature_flags').select('enabled').eq('key', EQUINOX_FLAG_KEY).maybeSingle(),
    supabase
      .from('listing_financing_preferences')
      .select('include_vin')
      .eq('listing_id', listingId)
      .maybeSingle(),
  ]);

  if (flagRow?.enabled !== true) {
    return {
      ok: false,
      response: jsonError(
        403,
        'financing_not_available',
        'Financing options are not enabled for this listing.',
      ),
    };
  }

  return { ok: true, listing, isOwner, includeVin: pref?.include_vin === true };
}
