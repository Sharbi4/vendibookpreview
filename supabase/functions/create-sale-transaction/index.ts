import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SALE-TRANSACTION] ${step}${detailsStr}`);
};

interface CreateTransactionRequest {
  session_id: string;
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

    const body: CreateTransactionRequest = await req.json();
    const { session_id } = body;
    
    logStep("Request received", { session_id });

    if (!session_id) {
      throw new Error("Missing required field: session_id");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });
    
    logStep("Session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Check if this is an escrow sale
    if (session.metadata?.mode !== 'sale' || session.metadata?.escrow !== 'true') {
      throw new Error("This is not an escrow sale transaction");
    }

    // Check if transaction already exists
    const { data: existingTx } = await supabaseClient
      .from('sale_transactions')
      .select('id')
      .eq('checkout_session_id', session_id)
      .single();

    if (existingTx) {
      logStep("Transaction already exists", { id: existingTx.id });
      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: existingTx.id,
          message: "Transaction already recorded",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get payment intent details
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    
    // Calculate amounts
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const platformFee = paymentIntent.metadata?.platform_fee 
      ? Number(paymentIntent.metadata.platform_fee) / 100 
      : amount * 0.15;
    const sellerPayout = paymentIntent.metadata?.seller_payout 
      ? Number(paymentIntent.metadata.seller_payout) / 100 
      : amount - platformFee;

    // Create the sale transaction record
    const { data: transaction, error: txError } = await supabaseClient
      .from('sale_transactions')
      .insert({
        listing_id: session.metadata?.listing_id,
        buyer_id: session.metadata?.buyer_id || user.id,
        seller_id: session.metadata?.seller_id,
        amount: amount,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        payment_intent_id: paymentIntent.id,
        checkout_session_id: session_id,
        status: 'paid',
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }

    logStep("Transaction created", { id: transaction.id, status: transaction.status });

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction_id: transaction.id,
        message: "Transaction recorded successfully. Waiting for both parties to confirm.",
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
