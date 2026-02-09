import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RELEASE-SALE-PAYOUTS] ${step}${detailsStr}`);
};

// Auto-release sale payouts 25 days after payment if buyer and seller haven't both confirmed
// This is a scheduled cron job that runs daily

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - checking for sales eligible for auto-release");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const now = new Date();
    // 25 days ago threshold
    const autoReleaseThreshold = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const thresholdISO = autoReleaseThreshold.toISOString();

    logStep("Auto-release threshold", { threshold: thresholdISO });

    const results = {
      autoReleased: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Find sale transactions that:
    // 1. Are in a state where not both parties have confirmed (paid, buyer_confirmed, seller_confirmed)
    // 2. Were created more than 25 days ago
    // 3. Don't have a payout yet
    const { data: eligibleSales, error: fetchError } = await supabaseClient
      .from('sale_transactions')
      .select('*')
      .in('status', ['paid', 'buyer_confirmed', 'seller_confirmed'])
      .is('payout_completed_at', null)
      .lt('created_at', thresholdISO)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch eligible sales: ${fetchError.message}`);
    }

    logStep("Found eligible sales for auto-release", { count: eligibleSales?.length || 0 });

    if (!eligibleSales || eligibleSales.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No sales eligible for auto-release",
          ...results
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check available Stripe balance
    const balance = await stripe.balance.retrieve();
    const usdBalance = balance.available.find((b: { currency: string; amount: number }) => b.currency === 'usd');
    let remainingBalance = usdBalance?.amount || 0;

    logStep("Available balance", { balance: remainingBalance / 100 });

    for (const transaction of eligibleSales) {
      try {
        const payoutAmount = Math.round(Number(transaction.seller_payout) * 100);

        // Check if we have enough balance
        if (payoutAmount > remainingBalance) {
          logStep("Insufficient balance for auto-release", { 
            transactionId: transaction.id,
            required: payoutAmount / 100,
            available: remainingBalance / 100
          });
          // Mark as completed but with pending payout message
          await supabaseClient
            .from('sale_transactions')
            .update({
              status: 'completed',
              message: 'Auto-completed after 25 days. Payout pending - funds will be transferred when available.',
            })
            .eq('id', transaction.id);
          results.skipped++;
          continue;
        }

        // Get seller's Stripe account
        const { data: sellerProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', transaction.seller_id)
          .single();

        if (profileError || !sellerProfile?.stripe_account_id) {
          logStep("Seller has no Stripe account", { transactionId: transaction.id });
          // Mark as completed but note the issue
          await supabaseClient
            .from('sale_transactions')
            .update({
              status: 'completed',
              message: 'Auto-completed after 25 days. Payout pending - seller needs to connect Stripe account.',
            })
            .eq('id', transaction.id);
          results.skipped++;
          continue;
        }

        logStep("Processing auto-release payout", { 
          transactionId: transaction.id,
          amount: payoutAmount / 100,
          destination: sellerProfile.stripe_account_id,
          daysSincePaid: Math.floor((now.getTime() - new Date(transaction.created_at).getTime()) / (24 * 60 * 60 * 1000))
        });

        // Create transfer
        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: 'usd',
          destination: sellerProfile.stripe_account_id,
          metadata: {
            transaction_id: transaction.id,
            listing_id: transaction.listing_id,
            type: 'auto_release_25_days',
          },
        });

        // Update transaction
        await supabaseClient
          .from('sale_transactions')
          .update({
            status: 'completed',
            transfer_id: transfer.id,
            payout_completed_at: now.toISOString(),
            message: 'Auto-completed and payout released after 25 days.',
          })
          .eq('id', transaction.id);

        remainingBalance -= payoutAmount;
        results.autoReleased++;

        logStep("Auto-release payout successful", { transactionId: transaction.id, transferId: transfer.id });

        // Fetch listing title for notifications
        const { data: listingData } = await supabaseClient
          .from('listings')
          .select('title')
          .eq('id', transaction.listing_id)
          .single();
        const listingTitle = listingData?.title || 'your item';

        // Send notifications to both parties
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

        EdgeRuntime.waitUntil(
          Promise.all([
            // Notify seller
            fetch(`${supabaseUrl}/functions/v1/create-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                user_id: transaction.seller_id,
                type: 'sale',
                title: 'Sale auto-completed - Funds released! 💰',
                message: `Your sale of "${listingTitle}" has been automatically completed after 25 days. $${(payoutAmount / 100).toFixed(2)} has been transferred to your account.`,
                link: '/dashboard?tab=sales',
              }),
            }),
            // Notify buyer
            fetch(`${supabaseUrl}/functions/v1/create-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                user_id: transaction.buyer_id,
                type: 'sale',
                title: 'Purchase auto-completed',
                message: `Your purchase of "${listingTitle}" has been automatically completed after 25 days. Funds have been released to the seller.`,
                link: '/dashboard?tab=purchases',
              }),
            }),
            // Send payout notification email
            fetch(`${supabaseUrl}/functions/v1/send-sale-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                transaction_id: transaction.id,
                notification_type: 'payout_completed',
              }),
            }),
          ]).catch(err => {
            logStep("Notification error", { error: err.message });
          })
        );

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Transaction ${transaction.id}: ${msg}`);
        logStep("Auto-release error", { transactionId: transaction.id, error: msg });
      }
    }

    logStep("Auto-release complete", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Auto-released ${results.autoReleased} payouts, ${results.skipped} skipped`,
        ...results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
