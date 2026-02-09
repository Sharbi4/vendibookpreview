import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get active promotion
    const { data: promos } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true)
      .limit(1);

    const promo = promos?.[0];
    if (!promo) {
      return new Response(JSON.stringify({ message: 'No active promotion' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rules = promo.rules_json as any;
    const daysRequired = rules?.active_days_required || 14;

    // Get all pending listing rewards
    const { data: rewards } = await supabase
      .from('listing_rewards')
      .select('*, listings(status, published_at)')
      .eq('payout_status', 'pending')
      .eq('promotion_id', promo.id);

    if (!rewards || rewards.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending rewards to check', checked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    let eligible = 0;
    let disqualified = 0;

    for (const reward of rewards) {
      const listing = (reward as any).listings;

      // Check if listing is still active
      if (!listing || listing.status !== 'published') {
        await supabase
          .from('listing_rewards')
          .update({
            disqualified_at: new Date().toISOString(),
            disqualified_reason: `Listing status is ${listing?.status || 'deleted'}`,
            payout_status: 'disqualified',
          })
          .eq('id', reward.id);
        disqualified++;
        continue;
      }

      // Calculate consecutive active days
      const publishedAt = new Date(reward.published_at);
      const now = new Date();
      const diffMs = now.getTime() - publishedAt.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      await supabase
        .from('listing_rewards')
        .update({
          active_days_count: diffDays,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', reward.id);
      updated++;

      // If 14+ days active, mark as eligible
      if (diffDays >= daysRequired) {
        await supabase
          .from('listing_rewards')
          .update({
            eligible_at: new Date().toISOString(),
            payout_status: 'eligible',
            active_days_count: diffDays,
          })
          .eq('id', reward.id);
        eligible++;
      }
    }

    return new Response(
      JSON.stringify({ message: 'Eligibility check complete', checked: rewards.length, updated, eligible, disqualified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
