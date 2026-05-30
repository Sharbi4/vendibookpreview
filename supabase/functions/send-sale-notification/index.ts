// Routes sale notification emails through Lovable Emails queue.
// Looks up transaction + buyer/seller, picks the right template,
// and invokes send-transactional-email so all sends are queued, retried, and logged.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType = 'payment_received' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'sale_completed';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { transaction_id, notification_type } = await req.json() as {
      transaction_id: string; notification_type: NotificationType;
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
    const listingTitle = listing?.title || 'Item';
    const orderNumber = `VB-${String(tx.id).slice(0, 8).toUpperCase()}`;

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
        }).then((r) => ({ recipient: recipientEmail, error: r.error?.message }))
      );
    };

    // Seller-facing template for any milestone
    if (sellerOptedIn && sellerEmail) {
      enqueue(
        'sale-completed-seller',
        sellerEmail,
        `sale-${tx.id}-seller-${notification_type}`,
        {
          sellerName: sellerProfile?.first_name || sellerName.split(' ')[0],
          listingTitle,
          salePrice: Number(tx.amount) || 0,
          buyerName,
          orderNumber,
        }
      );
    }

    // Buyer-facing receipt only on payment_received (other statuses log only)
    if (buyerOptedIn && buyerEmail && notification_type === 'payment_received') {
      enqueue(
        'payment-receipt',
        buyerEmail,
        `sale-${tx.id}-buyer-receipt`,
        {
          customerName: buyerProfile?.first_name || buyerName.split(' ')[0],
          orderNumber,
          amount: `$${(Number(tx.amount) || 0).toFixed(2)}`,
          paymentMethod: 'Card',
          paidAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          listingTitle,
          description: 'Purchase',
        }
      );
    }

    const results = await Promise.all(sends);
    const errors = results.filter((r) => r?.error);
    if (errors.length) console.error('[send-sale-notification] errors', errors);

    return new Response(JSON.stringify({ success: true, sent: results.length - errors.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-sale-notification]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
