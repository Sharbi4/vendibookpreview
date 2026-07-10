// create-cash-sale — writes a Pay-in-Person sale with an immutable
// transaction_terms snapshot in one atomic path, and enqueues the seller
// notification. This is the ONLY server-side entry point for cash sales;
// SaleCheckout.tsx must call this instead of inserting sale_transactions
// directly so the audit trail is guaranteed.
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Identify caller from the JWT
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.listing_id || !body?.amount || !body?.buyer_email) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select(
        'id, host_id, title, cover_image_url, mode, category, cancellation_policy, city, state, price_sale, deposit_amount, accept_cash_payment, accept_card_payment',
      )
      .eq('id', body.listing_id)
      .maybeSingle();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: 'listing_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ownership rule (memory: no self-transacting)
    if (listing.host_id === user.id) {
      return new Response(JSON.stringify({ error: 'cannot_buy_own_listing' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!listing.accept_cash_payment) {
      return new Response(JSON.stringify({ error: 'cash_not_accepted' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Snapshot terms first so we always have a paired ledger row.
    // Pay-in-Person: 100% free — no commission, no buyer fee, seller keeps full amount.
    const TERMS_VERSION = 'v1';
    const totalCents = Math.round(Number(body.amount) * 100);
    const cancellation =
      (listing.cancellation_policy && String(listing.cancellation_policy).trim()) ||
      'Pay-in-Person sales are between buyer and seller. Vendibook does not hold funds or process refunds for cash transactions — inspect the item in person before you pay.';

    const location = [listing.city, listing.state].filter(Boolean).join(', ') || null;

    const termsSnapshot = {
      version: TERMS_VERSION,
      mode: 'sale',
      payment_method: 'pay_in_person',
      listing: {
        id: listing.id,
        title: listing.title,
        cover_image_url: listing.cover_image_url,
        host_id: listing.host_id,
        location,
      },
      buyer: { id: user.id, email: body.buyer_email, name: body.buyer_name },
      pricing: {
        subtotal_cents: totalCents,
        delivery_cents: Math.round(Number(body.delivery_fee ?? 0) * 100),
        renter_fee_cents: 0,
        commission_cents: 0,
        deposit_cents: 0,
        total_cents: totalCents,
        currency: 'usd',
        lines: [
          { label: 'Item price', amount_cents: totalCents, kind: 'base' },
          {
            label: 'Buyer fee',
            amount_cents: 0,
            kind: 'fee',
            hint: 'Pay-in-Person sales are 100% free — no buyer fee, no commission.',
          },
          { label: 'Total due today', amount_cents: totalCents, kind: 'total' },
        ],
      },
      policies: {
        cancellation,
        acknowledgements: [
          `You are buying "${listing.title}" from the seller.`,
          'Vendibook does not process or hold funds for Pay-in-Person transactions. Inspect the item and confirm terms in person before paying.',
        ],
      },
    };

    const { data: terms, error: termsErr } = await supabase
      .from('transaction_terms')
      .insert({
        terms_version: TERMS_VERSION,
        mode: 'sale',
        payment_method: 'pay_in_person',
        listing_id: listing.id,
        host_id: listing.host_id,
        buyer_id: user.id,
        subtotal_cents: totalCents,
        delivery_cents: Math.round(Number(body.delivery_fee ?? 0) * 100),
        renter_fee_cents: 0,
        commission_cents: 0,
        deposit_cents: 0,
        total_cents: totalCents,
        currency: 'usd',
        snapshot: termsSnapshot,
      })
      .select('id')
      .single();

    if (termsErr) throw termsErr;

    // 2) Sale transaction row, referencing the terms snapshot.
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
        payment_method: 'pay_in_person',
        platform_fee: 0,
        seller_payout: body.amount,
        terms_id: terms.id,
      })
      .select('id')
      .single();

    if (txErr) throw txErr;

    // 3) Fire-and-forget notification + seller bell.
    try {
      await supabase.functions.invoke('send-sale-notification', {
        body: { transaction_id: tx.id, notification_type: 'cash_purchase_request' },
      });
    } catch (_) { /* email failures do not block the checkout */ }

    try {
      await supabase.from('notifications').insert({
        user_id: listing.host_id,
        type: 'sale',
        title: '💵 New Cash Purchase Request',
        message: `${body.buyer_name || 'A buyer'} wants to buy "${listing.title}" for $${Number(body.amount).toFixed(2)} in cash.`,
        link: `/order-tracking/${tx.id}`,
      });
    } catch (_) { /* non-fatal */ }

    return new Response(
      JSON.stringify({ transaction_id: tx.id, terms_id: terms.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-cash-sale error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
