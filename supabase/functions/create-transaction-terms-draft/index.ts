// create-transaction-terms-draft
// ─────────────────────────────────────────────────────────────
// Persists a client-built terms snapshot as a `draft` row in
// `transaction_terms` BEFORE the buyer/renter is asked for their
// final acknowledgement in FinalReviewSheet. The draft id is then
// passed on to create-checkout / create-cash-sale / create-booking-hold,
// which flip it to `active` and back-link it to the sale/booking row.
//
// Why a client-built snapshot is safe here:
//   1. This row NEVER moves money — real charges are computed
//      independently inside the money-moving edge functions using
//      values loaded from `listings` server-side.
//   2. `transaction_terms` is the immutable record of *what the user
//      saw and agreed to*. The whole point is to mirror the client
//      exactly so it can be shown back in emails/receipts/disputes.
//   3. Buyer_id/host_id/listing_id/status are all set by the server;
//      the client cannot forge them.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  listing_id: string;
  mode: 'rent' | 'sale';
  payment_method: 'paypal_checkout' | 'stripe_card' | 'pay_in_person' | 'offer' | 'other';
  snapshot: Record<string, unknown>;
  total_cents: number;
  subtotal_cents: number;
  deposit_cents?: number;
  commission_cents?: number;
  renter_fee_cents?: number;
  terms_version?: string;
  booking_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    if (!body?.listing_id || !body?.mode || !body?.snapshot || !body?.payment_method) {
      return json({ error: 'listing_id, mode, snapshot, payment_method required' }, 400);
    }
    if (body.mode !== 'rent' && body.mode !== 'sale') {
      return json({ error: 'mode must be rent or sale' }, 400);
    }
    if (typeof body.total_cents !== 'number' || typeof body.subtotal_cents !== 'number') {
      return json({ error: 'total_cents and subtotal_cents must be numbers' }, 400);
    }

    // Service-role client for the trusted insert. RLS on this row is
    // permissive-select-owner already; we use service role so listing_id
    // + host_id + status stay authoritative regardless of client policies.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: listing, error: listingErr } = await admin
      .from('listings')
      .select('id, host_id, status')
      .eq('id', body.listing_id)
      .maybeSingle();
    if (listingErr || !listing) return json({ error: 'Listing not found' }, 404);
    if (listing.host_id === userId) {
      return json({ error: 'You cannot transact on your own listing' }, 403);
    }

    const { data: row, error: insErr } = await admin
      .from('transaction_terms')
      .insert({
        listing_id: body.listing_id,
        booking_id: body.booking_id ?? null,
        buyer_id: userId,
        host_id: listing.host_id,
        snapshot: body.snapshot,
        total_cents: Math.max(0, Math.round(body.total_cents)),
        subtotal_cents: Math.max(0, Math.round(body.subtotal_cents)),
        deposit_cents: Math.max(0, Math.round(body.deposit_cents ?? 0)),
        commission_cents: Math.max(0, Math.round(body.commission_cents ?? 0)),
        renter_fee_cents: Math.max(0, Math.round(body.renter_fee_cents ?? 0)),
        terms_version: body.terms_version || 'v1',
        payment_method: body.payment_method,
        transaction_mode: body.mode,
        status: 'draft',
      })
      .select('id, terms_version')
      .single();

    if (insErr || !row) {
      console.error('[create-transaction-terms-draft] insert failed', insErr);
      return json({ error: insErr?.message || 'Failed to create draft terms' }, 500);
    }

    return json({ terms_id: row.id, terms_version: row.terms_version });
  } catch (e) {
    console.error('[create-transaction-terms-draft]', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
