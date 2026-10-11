// Authoritative purchase-sheet data source for the optional Equinox Funding
// financing flow.
//
// The client never assembles this payload from a public listing query: the
// VIN/serial lives in an owner-only table and is released here ONLY when the
// shared server-side financing gate passes (global launch flag on + seller
// opted this listing in with a current disclosure) AND the seller consented to
// VIN inclusion. Private address and seller contact details are never returned.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { checkFinancingEligibility, resolveViewerId } from '../_shared/financingEligibility.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return jsonError(405, 'method_not_allowed', 'Use POST.');
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId ?? '').trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const viewerId = await resolveViewerId(supabase, req);

    const gate = await checkFinancingEligibility(
      supabase,
      listingId,
      viewerId,
      'id, host_id, title, mode, category, status, price_sale, year_built, make, model, condition, mileage, title_status, city, state, description',
    );
    if (!gate.ok) return gate.response;

    const listing = gate.listing;

    // Full VIN requires the seller's VIN-inclusion consent on the opted-in listing.
    let vinSerial: string | null = null;
    if (gate.includeVin) {
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
