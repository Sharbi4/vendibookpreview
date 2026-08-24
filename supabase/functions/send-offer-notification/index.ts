// Routes offer notification emails through Lovable Emails queue.
// Looks up offer + buyer/seller, picks the right template + recipient, and
// sends through the shared transactional email helper so all sends are queued, retried, and logged.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EventType = 'new_offer' | 'offer_accepted' | 'offer_declined' | 'counter_offer' | 'counter_accepted' | 'counter_declined';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { offer_id, event_type } = await req.json() as { offer_id: string; event_type: EventType };
    if (!offer_id || !event_type) {
      return new Response(JSON.stringify({ error: 'offer_id and event_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('*, listing:listings(id, title, price_sale)')
      .eq('id', offer_id)
      .single();
    if (offerErr || !offer) throw new Error(`Offer not found: ${offerErr?.message}`);

    const [{ data: seller }, { data: buyer }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, first_name').eq('id', offer.seller_id).maybeSingle(),
      supabase.from('profiles').select('id, email, full_name, first_name').eq('id', offer.buyer_id).maybeSingle(),
    ]);
    if (!seller || !buyer) throw new Error('seller or buyer profile not found');

    // pick recipient + template
    let recipient: any = null;
    let templateName = '';
    let templateData: Record<string, any> = {};
    const amount = Number(offer.counter_amount || offer.offer_amount) || 0;
    const expiresAt = offer.expires_at
      ? new Date(offer.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : undefined;

    if (event_type === 'new_offer') {
      recipient = seller;
      templateName = 'offer-received-seller';
      templateData = {
        sellerName: seller.first_name || seller.full_name?.split(' ')[0],
        buyerName: buyer.full_name || 'A buyer',
        listingTitle: offer.listing?.title,
        offerAmount: Number(offer.offer_amount) || 0,
        askingPrice: offer.listing?.price_sale ? Number(offer.listing.price_sale) : undefined,
        message: offer.message,
        offerId: offer.id,
        expiresAt,
      };
    } else if (event_type === 'counter_offer') {
      recipient = buyer;
      templateName = 'offer-counter-buyer';
      templateData = {
        buyerName: buyer.first_name || buyer.full_name?.split(' ')[0],
        sellerName: seller.full_name || 'The seller',
        listingTitle: offer.listing?.title,
        counterAmount: Number(offer.counter_amount) || 0,
        originalOffer: Number(offer.offer_amount) || 0,
        message: offer.counter_message,
        offerId: offer.id,
        expiresAt,
      };
    } else {
      // accepted / declined / counter_accepted / counter_declined → offer-resolved
      const sendToBuyer = event_type === 'offer_accepted' || event_type === 'offer_declined';
      recipient = sendToBuyer ? buyer : seller;
      templateName = 'offer-resolved';
      templateData = {
        recipientName: recipient.first_name || recipient.full_name?.split(' ')[0],
        listingTitle: offer.listing?.title,
        finalAmount: amount,
        accepted: event_type === 'offer_accepted' || event_type === 'counter_accepted',
        offerId: offer.id,
      };
    }

    if (!recipient?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no recipient email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // respect notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('sale_email')
      .eq('user_id', recipient.id)
      .maybeSingle();
    if (prefs?.sale_email === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'user opted out' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await invokeTransactionalEmail({
        templateName,
        recipientEmail: recipient.email,
        idempotencyKey: `offer-${offer.id}-${event_type}`,
        templateData,
      });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-offer-notification]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
