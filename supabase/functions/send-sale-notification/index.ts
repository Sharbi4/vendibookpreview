// Routes sale notification emails through Lovable Emails queue.
// Looks up transaction + buyer/seller, picks the right template,
// and invokes send-transactional-email so all sends are queued, retried, and logged.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType =
  | 'payment_received'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'sale_completed'
  | 'cash_purchase_request'
  | 'seller_confirmed'
  | 'buyer_confirmed'
  | 'payout_completed';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { transaction_id, notification_type, audience } = await req.json() as {
      transaction_id: string; notification_type: NotificationType; audience?: 'buyer' | 'seller' | 'both';
    };
    if (!transaction_id || !notification_type) {
      return new Response(JSON.stringify({ error: 'transaction_id and notification_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: tx, error: txErr } = await supabase
      .from('sale_transactions').select('*').eq('id', transaction_id).single();
    if (txErr || !tx) throw new Error('Transaction not found');

    const [{ data: listing }, { data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
      supabase.from('listings').select('title').eq('id', tx.listing_id).maybeSingle(),
      supabase.from('profiles').select('full_name, first_name, email').eq('id', tx.buyer_id).maybeSingle(),
      supabase.from('profiles').select('full_name, first_name, email').eq('id', tx.seller_id).maybeSingle(),
    ]);

    const buyerEmail = tx.buyer_email || buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = tx.buyer_name || buyerProfile?.full_name || 'Buyer';
    const sellerName = sellerProfile?.full_name || 'Seller';
    const buyerFirst = buyerProfile?.first_name || buyerName.split(' ')[0];
    const sellerFirst = sellerProfile?.first_name || sellerName.split(' ')[0];
    const listingTitle = listing?.title || 'Item';
    const orderNumber = `VB-${String(tx.id).slice(0, 8).toUpperCase()}`;

    // A cash / Pay-in-Person sale is one that never went through Stripe.
    const isCashSale = !tx.payment_intent_id;

    const [{ data: buyerPrefs }, { data: sellerPrefs }] = await Promise.all([
      supabase.from('notification_preferences').select('sale_email').eq('user_id', tx.buyer_id).maybeSingle(),
      supabase.from('notification_preferences').select('sale_email').eq('user_id', tx.seller_id).maybeSingle(),
    ]);
    const buyerOptedIn = buyerPrefs?.sale_email !== false;
    const sellerOptedIn = sellerPrefs?.sale_email !== false;

    const sends: Promise<any>[] = [];
    const enqueue = (templateName: string, recipientEmail: string, key: string, templateData: Record<string, any>) => {
      sends.push(
        supabase.functions.invoke('send-transactional-email', {
          body: { templateName, recipientEmail, idempotencyKey: key, templateData },
        }).then((r) => ({ recipient: recipientEmail, template: templateName, error: r.error?.message }))
      );
    };

    const commonSeller = {
      sellerName: sellerFirst,
      listingTitle,
      salePrice: Number(tx.amount) || 0,
      buyerName,
      buyerEmail,
      buyerPhone: tx.buyer_phone,
      orderNumber,
      transactionId: tx.id,
      fulfillmentType: tx.fulfillment_type,
    };
    const commonBuyer = {
      buyerName: buyerFirst,
      listingTitle,
      salePrice: Number(tx.amount) || 0,
      sellerName: sellerFirst,
      orderNumber,
      transactionId: tx.id,
    };

    // --- Cash / Pay-in-Person flow ---
    if (notification_type === 'cash_purchase_request') {
      // Fetch immutable terms snapshot recorded at cash-sale creation so the
      // email shows the same policy + total the buyer/seller agreed to.
      // Prefer the direct terms_id link on the sale row; fall back to the
      // reverse lookup for legacy rows created before terms_id existed.
      let terms: any = null;
      if ((tx as any).terms_id) {
        const { data } = await supabase
          .from('transaction_terms')
          .select('snapshot, terms_version')
          .eq('id', (tx as any).terms_id)
          .maybeSingle();
        terms = data;
      }
      if (!terms) {
        const { data } = await supabase
          .from('transaction_terms')
          .select('snapshot, terms_version')
          .eq('sale_transaction_id', tx.id)
          .maybeSingle();
        terms = data;
      }
      const termsSnapshot = terms?.snapshot ?? undefined;
      const termsVersion = terms?.terms_version ?? termsSnapshot?.termsVersion;

      if (sellerOptedIn && sellerEmail) {
        enqueue('cash-purchase-request-seller', sellerEmail, `sale-${tx.id}-seller-cashreq`, { ...commonSeller, termsSnapshot, termsVersion });
      }
      if (buyerOptedIn && buyerEmail) {
        enqueue('cash-purchase-request-buyer', buyerEmail, `sale-${tx.id}-buyer-cashreq`, { ...commonBuyer, termsSnapshot, termsVersion });
      }
    } else if (isCashSale && notification_type === 'seller_confirmed') {
      // Cash: seller just confirmed → nudge buyer to confirm receipt
      if (buyerOptedIn && buyerEmail) {
        enqueue('cash-seller-confirmed-buyer', buyerEmail, `sale-${tx.id}-buyer-sellerconfirm`, commonBuyer);
      }
    } else if (isCashSale && (notification_type === 'buyer_confirmed' || notification_type === 'completed')) {
      // Cash: buyer confirmed receipt → notify seller of close
      if (sellerOptedIn && sellerEmail) {
        enqueue('cash-buyer-confirmed-seller', sellerEmail, `sale-${tx.id}-seller-buyerconfirm-${notification_type}`, {
          ...commonSeller,
          bothConfirmed: notification_type === 'completed' || (!!tx.seller_confirmed_at && !!tx.buyer_confirmed_at),
        });
      }
    } else {
      // --- Online (PayPal) flow ---
      // Seller-facing template for any milestone. A freshly paid sale gets the
      // handoff-oriented email; later milestones keep the completion email.
      if (sellerOptedIn && sellerEmail && audience !== 'buyer') {
        const sellerTemplate = notification_type === 'payment_received' ? 'sale-paid-seller' : 'sale-completed-seller';
        enqueue(
          sellerTemplate,
          sellerEmail,
          `sale-${tx.id}-seller-${notification_type}`,
          {
            sellerName: sellerFirst,
            listingTitle,
            salePrice: Number(tx.amount) || 0,
            buyerName,
            orderNumber,
            transactionId: tx.id,
            fulfillmentType: tx.fulfillment_type,
          }
        );
      }

      // Buyer-facing receipt only on payment_received
      if (buyerOptedIn && buyerEmail && notification_type === 'payment_received' && audience !== 'seller') {
        enqueue(
          'payment-receipt',
          buyerEmail,
          `sale-${tx.id}-buyer-receipt`,
          {
            customerName: buyerFirst,
            orderNumber,
            amount: `$${(Number(tx.amount) || 0).toFixed(2)}`,
            paymentMethod: 'Card',
            paidAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            listingTitle,
            description: 'Purchase',
          }
        );
      }
    }

    const results = await Promise.all(sends);
    const errors = results.filter((r) => r?.error);
    if (errors.length) console.error('[send-sale-notification] errors', errors);

    return new Response(JSON.stringify({ success: true, sent: results.length - errors.length, errors, isCashSale, notification_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-sale-notification]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
