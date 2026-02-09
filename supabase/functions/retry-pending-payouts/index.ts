import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RETRY-PENDING-PAYOUTS] ${step}${detailsStr}`);
};

// PAYOUT RULES:
// 1. SALES: Payout when BOTH buyer AND seller confirm, OR auto-release after 25 days
// 2. RENTALS: Payout 24 hours after booking end date
// This function retries any pending payouts that failed due to insufficient balance

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check available Stripe balance first
    const balance = await stripe.balance.retrieve();
    const usdBalance = balance.available.find((b: { currency: string; amount: number }) => b.currency === 'usd');
    const availableBalance = usdBalance?.amount || 0;
    
    logStep("Stripe balance retrieved", { availableBalance: availableBalance / 100 });

    if (availableBalance <= 0) {
      logStep("No available balance - skipping payout retry");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No available balance for payouts",
          processed: 0,
          availableBalance: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch completed transactions with pending payouts
    const { data: pendingPayouts, error: fetchError } = await supabaseClient
      .from('sale_transactions')
      .select('id, seller_id, seller_payout, listing_id, message')
      .eq('status', 'completed')
      .is('payout_completed_at', null)
      .order('created_at', { ascending: true }); // Process oldest first

    if (fetchError) {
      throw new Error(`Failed to fetch pending payouts: ${fetchError.message}`);
    }

    logStep("Found pending payouts", { count: pendingPayouts?.length || 0 });

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending payouts to process",
          processed: 0,
          availableBalance: availableBalance / 100
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let remainingBalance = availableBalance;
    let processedCount = 0;
    let failedCount = 0;
    const results: Array<{ transactionId: string; success: boolean; message: string }> = [];

    for (const transaction of pendingPayouts) {
      const payoutAmount = Math.round(Number(transaction.seller_payout) * 100);
      
      // Skip if insufficient balance for this payout
      if (payoutAmount > remainingBalance) {
        logStep("Insufficient balance for payout", { 
          transactionId: transaction.id, 
          required: payoutAmount / 100,
          available: remainingBalance / 100 
        });
        results.push({
          transactionId: transaction.id,
          success: false,
          message: `Insufficient balance: need $${(payoutAmount / 100).toFixed(2)}, have $${(remainingBalance / 100).toFixed(2)}`
        });
        continue;
      }

      // Get seller's Stripe account
      const { data: sellerProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', transaction.seller_id)
        .single();

      if (profileError || !sellerProfile?.stripe_account_id) {
        logStep("Seller has no Stripe account", { transactionId: transaction.id, sellerId: transaction.seller_id });
        results.push({
          transactionId: transaction.id,
          success: false,
          message: "Seller has no connected Stripe account"
        });
        failedCount++;
        continue;
      }

      try {
        logStep("Creating transfer", { 
          transactionId: transaction.id,
          amount: payoutAmount / 100,
          destination: sellerProfile.stripe_account_id 
        });

        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: 'usd',
          destination: sellerProfile.stripe_account_id,
          metadata: {
            transaction_id: transaction.id,
            listing_id: transaction.listing_id,
            retry: 'true',
          },
        });

        // Update transaction with transfer info
        await supabaseClient
          .from('sale_transactions')
          .update({ 
            transfer_id: transfer.id,
            payout_completed_at: new Date().toISOString(),
            message: null, // Clear pending message
          })
          .eq('id', transaction.id);

        remainingBalance -= payoutAmount;
        processedCount++;
        
        logStep("Transfer successful", { transactionId: transaction.id, transferId: transfer.id });
        results.push({
          transactionId: transaction.id,
          success: true,
          message: `Transfer created: ${transfer.id}`
        });

        // Send payout completed notification
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        
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
        }).catch(err => {
          logStep("Payout notification failed", { transactionId: transaction.id, error: err.message });
        });

      } catch (stripeError) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Transfer failed", { transactionId: transaction.id, error: errorMessage });
        
        // Update message with new error
        await supabaseClient
          .from('sale_transactions')
          .update({ 
            message: `Payout retry failed: ${errorMessage}`,
          })
          .eq('id', transaction.id);

        failedCount++;
        results.push({
          transactionId: transaction.id,
          success: false,
          message: errorMessage
        });
      }
    }

    logStep("Retry complete", { processed: processedCount, failed: failedCount, remaining: pendingPayouts.length - processedCount - failedCount });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${processedCount} payouts, ${failedCount} failed`,
        processed: processedCount,
        failed: failedCount,
        skipped: pendingPayouts.length - processedCount - failedCount,
        availableBalance: remainingBalance / 100,
        results
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
