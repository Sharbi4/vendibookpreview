// create-cash-sale — writes a Pay-in-Person sale with an immutable
// transaction_terms snapshot in one atomic path, and enqueues the seller
// notification.
//
// Guarantees enforced here (and re-checked by the DB trigger
// `trg_enforce_sale_terms_link`):
//   1. `terms_id` is REQUIRED. Callers must pre-create a snapshot via
//      `create-transaction-terms-draft` and acknowledge it in
//      `FinalReviewSheet` before the buyer clicks "Buy now".
//   2. The referenced terms row must belong to this buyer + listing + host.
//   3. Retries or double-clicks that pass the same `idempotency_key` reuse
//      the existing sale + terms rows instead of duplicating them.
//
// Legacy row 7c95ac1c-5163-45cd-a48f-b6ec50747cda predates this contract
// and is grandfathered at the DB level via `legacy_terms_unavailable`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Body {
  listing_id: string;
  amount: number;
  fulfillment_type: 'pickup' | 'delivery' | 'vendibook_freight' | 'both' | string;
  delivery_fee?: number;
  freight_cost?: number;
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string | null;
  // REQUIRED: id of a pre-created transaction_terms row (draft or active).
  terms_id: string;
  // Optional dedupe key so retries/double-clicks reuse the same row pair.
  idempotency_key?: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    if (!body?.listing_id || !body?.amount || !body?.buyer_email) {
      return json({ error: 'invalid_body' }, 400);
    }
    if (!body?.terms_id) {
      // Hard requirement — never insert a cash sale without an acknowledged
      // terms snapshot. The DB trigger enforces the same rule as a backstop.
      return json({ error: 'terms_id_required' }, 400);
    }

    // Idempotency short-circuit — if the same (user, action, key) has already
    // succeeded, return the cached response. Prevents duplicate sales from
    // retries or double-clicks.
    if (body.idempotency_key) {
      const { data: cached } = await supabase
        .from('edge_action_idempotency')
        .select('response')
        .eq('action', 'create-cash-sale')
        .eq('idempotency_key', body.idempotency_key)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cached?.response) return json(cached.response);
    }

    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select(
        'id, host_id, title, cover_image_url, mode, category, cancellation_policy, city, state, price_sale, deposit_amount, accept_cash_payment, accept_paypal_checkout',
      )
      .eq('id', body.listing_id)
      .maybeSingle();

    if (listingErr || !listing) return json({ error: 'listing_not_found' }, 404);
    // Canonical availability gate — paused/removed/archived listings can never
    // start a cash sale, even if the buyer had the page open.
    const { data: cashState } = await supabase.rpc('listing_purchase_state', { _listing_id: listing.id });
    if (!(cashState as { purchasable?: boolean } | null)?.purchasable) {
      return json({
        error: 'listing_unavailable',
        code: 'listing_unavailable',
        message: 'This listing is no longer available and no payment was created.',
      }, 409);
    }
    if (listing.host_id === user.id) return json({ error: 'cannot_buy_own_listing' }, 403);
    if (!listing.accept_cash_payment) return json({ error: 'cash_not_accepted' }, 400);

    // Validate the caller-supplied terms row before we touch sale_transactions.
    // The DB trigger will re-check all of this, but doing it here yields
    // clearer 4xx errors to the client than a raw Postgres exception.
    const { data: terms, error: termsFetchErr } = await supabase
      .from('transaction_terms')
      .select('id, buyer_id, host_id, listing_id, transaction_mode, sale_transaction_id, status')
      .eq('id', body.terms_id)
      .maybeSingle();

    if (termsFetchErr) throw termsFetchErr;
    if (!terms) return json({ error: 'terms_not_found' }, 404);
    if (terms.buyer_id !== user.id) return json({ error: 'terms_owner_mismatch' }, 403);
    if (terms.listing_id !== listing.id) return json({ error: 'terms_listing_mismatch' }, 400);
    if (terms.host_id !== listing.host_id) return json({ error: 'terms_host_mismatch' }, 400);
    if (terms.transaction_mode !== 'sale') return json({ error: 'terms_mode_mismatch' }, 400);

    // If this terms row is already linked to a sale (from a prior successful
    // call), return that sale so the retry stays idempotent even without a key.
    if (terms.sale_transaction_id) {
      const response = { transaction_id: terms.sale_transaction_id, terms_id: terms.id };
      if (body.idempotency_key) {
        await supabase.from('edge_action_idempotency').upsert({
          action: 'create-cash-sale',
          idempotency_key: body.idempotency_key,
          user_id: user.id,
          response,
        });
      }
      return json(response);
    }

    // Pay-in-Person is 100% free: no commission, no buyer fee.
    const isFreight = body.fulfillment_type === 'vendibook_freight';
    const { data: tx, error: txErr } = await supabase
      .from('sale_transactions')
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.host_id,
        amount: body.amount,
        delivery_fee: body.fulfillment_type === 'delivery' ? (body.delivery_fee ?? 0) : 0,
        freight_cost: isFreight ? (body.freight_cost ?? 0) : 0,
        fulfillment_type: isFreight ? 'vendibook_freight' : body.fulfillment_type,
        delivery_address:
          body.fulfillment_type === 'delivery' || isFreight
            ? (body.delivery_address ?? null)
            : null,
        delivery_instructions:
          body.fulfillment_type === 'delivery' || isFreight
            ? (body.delivery_instructions ?? null)
            : null,
        buyer_name: body.buyer_name,
        buyer_email: body.buyer_email,
        buyer_phone: body.buyer_phone ?? null,
        status: 'pending_cash',
        platform_fee: 0, // Pay in person is 100% free — no Pro discount applies
        fee_rate_pct: 0,
        pro_discount: 0,
        pro_fee_applied: false,
        fee_locked_at: new Date().toISOString(),
        seller_payout: body.amount,
        // terms_id set at insert time so the enforcement trigger sees it
        // atomically — no window where the sale exists without a terms link.
        terms_id: terms.id,
      })
      .select('id')
      .single();

    if (txErr) throw txErr;

    // Link the terms row back to the sale and mark it active. If this update
    // fails we roll back the sale so we never leave a sale row without a
    // fully-linked terms snapshot.
    const { error: linkErr } = await supabase
      .from('transaction_terms')
      .update({ status: 'active', sale_transaction_id: tx.id })
      .eq('id', terms.id)
      .eq('buyer_id', user.id);

    if (linkErr) {
      await supabase.from('sale_transactions').delete().eq('id', tx.id);
      throw linkErr;
    }

    // Fire-and-forget notifications.
    try {
      await supabase.functions.invoke('send-sale-notification', {
        body: { transaction_id: tx.id, notification_type: 'cash_purchase_request' },
      });
    } catch (_) { /* email failures do not block checkout */ }

    try {
      await supabase.from('notifications').insert({
        user_id: listing.host_id,
        type: 'sale',
        title: '💵 New Cash Purchase Request',
        message: `${body.buyer_name || 'A buyer'} wants to buy "${listing.title}" for $${Number(body.amount).toFixed(2)} in cash.`,
        link: `/order-tracking/${tx.id}`,
      });
    } catch (_) { /* non-fatal */ }

    const response = { transaction_id: tx.id, terms_id: terms.id };

    if (body.idempotency_key) {
      await supabase.from('edge_action_idempotency').upsert({
        action: 'create-cash-sale',
        idempotency_key: body.idempotency_key,
        user_id: user.id,
        response,
      });
    }

    return json(response);
  } catch (err) {
    console.error('create-cash-sale error', err);
    return json(
      { error: err instanceof Error ? err.message : 'unknown_error' },
      500,
    );
  }
});
