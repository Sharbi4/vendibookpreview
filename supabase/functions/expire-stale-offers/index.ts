import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Expire pending offers older than 48 hours
    const { data: expiredOffers, error: offersError } = await supabase
      .from('offers')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now)
      .select('id, buyer_id, listing_id');

    if (offersError) {
      console.error('Error expiring offers:', offersError);
    }

    // Expire countered offers where counter has expired
    const { data: expiredCounters, error: countersError } = await supabase
      .from('offers')
      .update({ status: 'expired' })
      .eq('status', 'countered')
      .lt('counter_expires_at', now)
      .select('id, buyer_id, seller_id, listing_id');

    if (countersError) {
      console.error('Error expiring counter-offers:', countersError);
    }

    // Send notifications for expired offers
    const allExpired = [...(expiredOffers || []), ...(expiredCounters || [])];
    
    for (const offer of allExpired) {
      // Notify buyer that their offer expired
      await supabase.from('notifications').insert({
        user_id: offer.buyer_id,
        type: 'offer',
        title: 'Offer Expired',
        message: 'Your offer has expired without a response.',
        link: '/dashboard'
      });
    }

    console.log(`Expired ${expiredOffers?.length || 0} pending offers and ${expiredCounters?.length || 0} counter-offers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_offers: expiredOffers?.length || 0,
        expired_counters: expiredCounters?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in expire-stale-offers:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
