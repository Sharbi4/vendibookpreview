import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-SALE] ${step}${detailsStr}`);
};

interface ConfirmRequest {
  transaction_id: string;
  role: 'buyer' | 'seller';
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body: ConfirmRequest = await req.json();
    const { transaction_id, role } = body;
    
    logStep("Request received", { transaction_id, role });

    if (!transaction_id || !role) {
      throw new Error("Missing required fields: transaction_id or role");
    }

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('sale_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }
    logStep("Transaction found", { status: transaction.status, buyer_id: transaction.buyer_id, seller_id: transaction.seller_id });

    // Verify user is authorized
    if (role === 'buyer' && transaction.buyer_id !== user.id) {
      throw new Error("Not authorized to confirm as buyer");
    }
    if (role === 'seller' && transaction.seller_id !== user.id) {
      throw new Error("Not authorized to confirm as seller");
    }

    // Check if already confirmed by this party
    if (role === 'buyer' && transaction.buyer_confirmed_at) {
      throw new Error("Buyer has already confirmed");
    }
    if (role === 'seller' && transaction.seller_confirmed_at) {
      throw new Error("Seller has already confirmed");
    }

    // Valid statuses for confirmation
    const validStatuses = ['paid', 'buyer_confirmed', 'seller_confirmed'];
    if (!validStatuses.includes(transaction.status)) {
      throw new Error(`Cannot confirm transaction with status: ${transaction.status}`);
    }

    // Determine new status
    let newStatus: string;
    const otherPartyConfirmed = role === 'buyer' 
      ? transaction.seller_confirmed_at !== null
      : transaction.buyer_confirmed_at !== null;

    if (otherPartyConfirmed) {
      // Both parties confirmed - ready for payout
      newStatus = 'completed';
    } else {
      // Only one party confirmed
      newStatus = role === 'buyer' ? 'buyer_confirmed' : 'seller_confirmed';
    }

    logStep("Updating transaction status", { 
      currentStatus: transaction.status, 
      newStatus,
      otherPartyConfirmed 
    });

    // Update transaction
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };
    
    if (role === 'buyer') {
      updateData.buyer_confirmed_at = new Date().toISOString();
    } else {
      updateData.seller_confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from('sale_transactions')
      .update(updateData)
      .eq('id', transaction_id);

    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    // If both parties confirmed, initiate payout
    if (newStatus === 'completed') {
      logStep("Both parties confirmed - initiating payout");
      
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Get seller's Stripe account
      const { data: sellerProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', transaction.seller_id)
        .single();

      if (profileError || !sellerProfile?.stripe_account_id) {
        // Mark as completed but note payout issue
        await supabaseClient
          .from('sale_transactions')
          .update({ status: 'completed' })
          .eq('id', transaction_id);
        throw new Error("Seller has no connected Stripe account for payout");
      }

      // Create transfer to seller
      // seller_payout is already in cents from checkout creation
      const payoutAmount = Math.round(Number(transaction.seller_payout) * 100);
      
      logStep("Creating transfer", { 
        amount: payoutAmount, 
        destination: sellerProfile.stripe_account_id 
      });

      try {
        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: 'usd',
          destination: sellerProfile.stripe_account_id,
          metadata: {
            transaction_id: transaction.id,
            listing_id: transaction.listing_id,
          },
        });

        logStep("Transfer created", { transferId: transfer.id });

        // Update transaction with transfer info
        await supabaseClient
          .from('sale_transactions')
          .update({ 
            transfer_id: transfer.id,
            payout_completed_at: new Date().toISOString(),
          })
          .eq('id', transaction_id);

      } catch (stripeError) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Transfer failed", { error: errorMessage });
        
        // Transaction is still completed, but transfer failed
        // This would need manual intervention
        await supabaseClient
          .from('sale_transactions')
          .update({ 
            status: 'disputed',
            message: `Payout transfer failed: ${errorMessage}`,
          })
          .eq('id', transaction_id);

        throw new Error(`Transfer failed: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: newStatus,
        message: newStatus === 'completed' 
          ? 'Sale completed! Funds have been released to the seller.'
          : `${role === 'buyer' ? 'Buyer' : 'Seller'} confirmation recorded. Waiting for ${role === 'buyer' ? 'seller' : 'buyer'} confirmation.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
