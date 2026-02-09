import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const body = await req.json().catch(() => ({}));
    const { type } = body; // 'reward' or 'contest'

    if (type === 'contest') {
      // Process $500 contest winner payout
      const { data: winners } = await supabase
        .from('contest_winners')
        .select('*, profiles:user_id(stripe_account_id, stripe_onboarding_complete, identity_verified)')
        .eq('payout_status', 'pending');

      if (!winners || winners.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending contest payouts' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let paid = 0;
      for (const winner of winners) {
        const profile = (winner as any).profiles;
        if (!profile?.stripe_account_id || !profile?.stripe_onboarding_complete || !profile?.identity_verified) {
          console.log(`Winner ${winner.user_id} not eligible for payout - missing Stripe/KYC`);
          continue;
        }

        try {
          const transfer = await stripe.transfers.create({
            amount: 50000, // $500 in cents
            currency: 'usd',
            destination: profile.stripe_account_id,
            description: 'Vendibook $500 Facebook Share Drawing Winner',
            metadata: { winner_id: winner.id, user_id: winner.user_id },
          });

          await supabase
            .from('contest_winners')
            .update({
              payout_status: 'paid',
              payout_initiated_at: new Date().toISOString(),
              payout_completed_at: new Date().toISOString(),
              stripe_transfer_id: transfer.id,
            })
            .eq('id', winner.id);
          paid++;
        } catch (err) {
          console.error(`Failed to pay winner ${winner.id}:`, err);
        }
      }

      return new Response(JSON.stringify({ message: `Contest payouts processed`, paid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: Process $10 listing reward payouts
    const { data: rewards } = await supabase
      .from('listing_rewards')
      .select('*, profiles:user_id(stripe_account_id, stripe_onboarding_complete, identity_verified)')
      .eq('payout_status', 'eligible');

    if (!rewards || rewards.length === 0) {
      return new Response(JSON.stringify({ message: 'No eligible reward payouts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let paid = 0;
    let skipped = 0;

    // Anti-fraud: track which Stripe accounts have been paid
    const paidAccounts = new Set<string>();

    // First, get already-paid accounts for this promotion
    const { data: existingPaid } = await supabase
      .from('listing_rewards')
      .select('stripe_account_id')
      .eq('payout_status', 'paid')
      .not('stripe_account_id', 'is', null);

    existingPaid?.forEach(r => {
      if (r.stripe_account_id) paidAccounts.add(r.stripe_account_id);
    });

    for (const reward of rewards) {
      const profile = (reward as any).profiles;
      if (!profile?.stripe_account_id || !profile?.stripe_onboarding_complete || !profile?.identity_verified) {
        console.log(`User ${reward.user_id} not eligible - missing Stripe/KYC`);
        skipped++;
        continue;
      }

      // Anti-fraud: one payout per Stripe account
      if (paidAccounts.has(profile.stripe_account_id)) {
        console.log(`Stripe account ${profile.stripe_account_id} already paid - skipping`);
        await supabase
          .from('listing_rewards')
          .update({ payout_status: 'disqualified', disqualified_reason: 'Duplicate Stripe account' })
          .eq('id', reward.id);
        skipped++;
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: 1000, // $10 in cents
          currency: 'usd',
          destination: profile.stripe_account_id,
          description: 'Vendibook $10 Listing Reward',
          metadata: { reward_id: reward.id, user_id: reward.user_id, listing_id: reward.listing_id },
        });

        await supabase
          .from('listing_rewards')
          .update({
            payout_status: 'paid',
            payout_initiated_at: new Date().toISOString(),
            payout_completed_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
            stripe_account_id: profile.stripe_account_id,
          })
          .eq('id', reward.id);

        paidAccounts.add(profile.stripe_account_id);
        paid++;
      } catch (err) {
        console.error(`Failed to pay reward ${reward.id}:`, err);
        await supabase
          .from('listing_rewards')
          .update({ payout_status: 'failed' })
          .eq('id', reward.id);
      }
    }

    return new Response(JSON.stringify({ message: 'Reward payouts processed', paid, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
