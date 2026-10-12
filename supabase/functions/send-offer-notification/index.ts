// Durable offer events feed the shared branded email sender; successful delivery
// or suppression acknowledges the event. Failed sends retain a retry schedule.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCaller, isBackendCaller, forbiddenResponse, unauthorizedResponse } from "../_shared/callerGuard.ts";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EventType = 'new_offer' | 'offer_accepted' | 'offer_declined' | 'counter_offer' | 'counter_accepted' | 'counter_declined';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: corsHeaders });
  let claimed: { offer: string; event: string; token: string } | null = null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const finish = async (error: string | null = null) => {
    if (!claimed) return;
    const { error: finishError } = await supabase.rpc('finish_offer_email', {
      p_offer: claimed.offer, p_event: claimed.event, p_token: claimed.token, p_error: error,
    });
    if (finishError) throw finishError;
  };
  try {
    const backend = await isBackendCaller(req);
    const caller = backend ? null : await getCaller(req);
    if (!backend && !caller) return unauthorizedResponse(corsHeaders);
    const { offer_id, event_type } = await req.json() as { offer_id: string; event_type: EventType };
    if (!offer_id || !event_type) {
      return new Response(JSON.stringify({ error: 'offer_id and event_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowed = ['new_offer','counter_offer','offer_accepted','offer_declined','counter_accepted','counter_declined'];
    if (!allowed.includes(event_type) || !/^[0-9a-f-]{36}$/i.test(offer_id)) {
      return new Response(JSON.stringify({ error: 'Invalid event' }), { status: 400, headers: corsHeaders });
    }
    // Use recorded transition history, not mutable current status. A later
    // acceptance must not make an earlier notification impossible to retry.
    const { data: event, error: eventError } = await supabase.from('offer_events')
      .select('actor_id,snapshot,delivered_at').eq('offer_id', offer_id).eq('event_type', event_type).maybeSingle();
    if (eventError) throw eventError;
    if (!event || (!backend && caller?.id !== event.actor_id)) return forbiddenResponse(corsHeaders);
    if (event.delivered_at) return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders });
    const token = crypto.randomUUID();
    const { data: acquired, error: claimError } = await supabase.rpc('claim_offer_email', {
      p_offer: offer_id, p_event: event_type, p_token: token,
    });
    if (claimError) throw claimError;
    if (!acquired) return new Response(JSON.stringify({ pending: true }), { status: 202, headers: corsHeaders });
    claimed = { offer: offer_id, event: event_type, token };
    const offer = event.snapshot;
    const { data: listing, error: listingError } = await supabase.from('listings')
      .select('id,title,price_sale').eq('id', offer.listing_id).single();
    if (listingError) throw listingError;
    offer.listing = listing;

    const [{ data: seller, error: sellerError }, { data: buyer, error: buyerError }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, first_name').eq('id', offer.seller_id).maybeSingle(),
      supabase.from('profiles').select('id, email, full_name, first_name').eq('id', offer.buyer_id).maybeSingle(),
    ]);
    if (sellerError || buyerError) throw sellerError || buyerError;
    if (!seller || !buyer) throw new Error('seller or buyer profile not found');

    // pick recipient + template
    let recipient: any = null;
    let templateName = '';
    let templateData: Record<string, any> = {};
    const amount = Number(offer.agreed_amount ?? offer.counter_amount ?? offer.offer_amount) || 0;
    const deadline = event_type === 'counter_offer' ? offer.counter_expires_at : offer.expires_at;
    const expiresAt = deadline
      ? new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
      throw new Error('Recipient email missing; notification remains pending');

    }

    // respect notification preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('sale_email')
      .eq('user_id', recipient.id)
      .maybeSingle();
    if (prefsError) throw prefsError;
    if (prefs?.sale_email === false) {
      await finish();
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
    await finish();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    try { await finish(e instanceof Error ? e.message : String(e)); } catch (persistError) { console.error('[offer retry persistence]', persistError); }
    console.error('[send-offer-notification]', e);
    return new Response(JSON.stringify({ error: 'Offer notification could not be delivered; retry is scheduled' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
