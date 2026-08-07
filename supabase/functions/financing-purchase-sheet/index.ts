// Authoritative purchase-sheet data source for the optional Equinox Funding
// financing flow.
//
// The client never assembles this payload from a public listing query: the
// VIN/serial lives in an owner-only table and is released here ONLY when the
// global launch flag is on, the seller opted this listing in, AND the seller
// explicitly consented to VIN inclusion. Private address and seller contact
// details are never returned.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';

const DISCLOSURE_VERSION = 'equinox-financing-v1';
const FLAG_KEY = 'equinox_financing_enabled';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return jsonError(405, 'method_not_allowed', 'Use POST.');
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId ?? '').trim();
    if (!UUID_RE.test(listingId)) {
      return jsonError(400, 'invalid_listing_id', 'A valid listing id is required.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Who is asking? Owners may always generate their own sheet.
    let viewerId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      viewerId = data?.user?.id ?? null;
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(
        'id, host_id, title, mode, category, status, price_sale, year_built, make, model, condition, mileage, title_status, city, state, description',
      )
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) return jsonError(500, 'listing_lookup_failed', 'Could not load this listing.');
    if (!listing) return jsonError(404, 'listing_not_found', 'This listing is no longer available.');

    const isOwner = !!viewerId && viewerId === listing.host_id;

    if (listing.mode !== 'sale') {
      return jsonError(400, 'not_financeable', 'Financing summaries are only available for listings that are for sale.');
    }

    if (!isOwner) {
      const { data: visible } = await supabase.rpc('is_listing_publicly_visible', {
        _listing_id: listingId,
      });
      if (visible !== true) {
        return jsonError(404, 'listing_not_found', 'This listing is no longer available.');
      }
    }

    const [{ data: flagRow }, { data: pref }] = await Promise.all([
      supabase.from('app_feature_flags').select('enabled').eq('key', FLAG_KEY).maybeSingle(),
      supabase
        .from('listing_financing_preferences')
        .select('equinox_opt_in, include_vin, disclosure_version, disclosure_accepted_at')
        .eq('listing_id', listingId)
        .maybeSingle(),
    ]);

    const flagOn = flagRow?.enabled === true;
    // Opt-in only counts with a current, accepted disclosure on file.
    const optedIn =
      pref?.equinox_opt_in === true &&
      pref?.disclosure_version === DISCLOSURE_VERSION &&
      !!pref?.disclosure_accepted_at;

    // Buyers only see the sheet through the public, fully gated surface.
    if (!isOwner && !(flagOn && optedIn)) {
      return jsonError(403, 'financing_not_available', 'Financing options are not available for this listing.');
    }

    // Full VIN requires explicit seller consent on an opted-in listing.
    let vinSerial: string | null = null;
    if (optedIn && pref?.include_vin === true) {
      const { data: ownership } = await supabase
        .from('listing_ownership_details')
        .select('vin_serial')
        .eq('listing_id', listingId)
        .maybeSingle();
      vinSerial = (ownership?.vin_serial as string | null) ?? null;
    }

    let sellerName = 'Vendibook member';
    const { data: publicName } = await supabase.rpc('public_display_name', {
      _user_id: listing.host_id,
    });
    if (typeof publicName === 'string' && publicName.trim()) sellerName = publicName.trim();

    return jsonResponse(200, {
      listing: {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        price_sale: listing.price_sale,
        year_built: listing.year_built,
        make: listing.make,
        model: listing.model,
        condition: listing.condition,
        mileage: listing.mileage,
        title_status: listing.title_status,
        city: listing.city,
        state: listing.state,
        description: listing.description,
        vin_serial: vinSerial,
      },
      sellerName,
      vinIncluded: !!vinSerial,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
