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

    // Note: We don't require user authentication here because:
    // 1. The user may have just returned from Stripe and their session might not be restored
    // 2. The buyer_id comes from the Stripe session metadata which we created and trust
    // 3. We validate the session_id against Stripe to ensure the payment is legitimate
    logStep("Processing transaction creation (no auth required)");

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

    // Check if transaction already exists (avoid .single() so "0 rows" doesn't throw)
    const { data: existingTx, error: existingTxError } = await supabaseClient
      .from('sale_transactions')
      .select('id')
      .eq('checkout_session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTxError) {
      throw new Error(`Failed to check existing transaction: ${existingTxError.message}`);
    }

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
    
    // Calculate amounts - commission is 12.9%
    const SALE_SELLER_FEE_PERCENT = 12.9;
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    
    // Get fulfillment data from payment intent metadata
    const fulfillmentType = paymentIntent.metadata?.fulfillment_type || 'pickup';
    const deliveryAddress = paymentIntent.metadata?.delivery_address || null;
    const deliveryInstructions = paymentIntent.metadata?.delivery_instructions || null;
    const deliveryFee = paymentIntent.metadata?.delivery_fee 
      ? Number(paymentIntent.metadata.delivery_fee) 
      : 0;
    const buyerName = paymentIntent.metadata?.buyer_name || null;
    const buyerEmail = paymentIntent.metadata?.buyer_email || null;
    const buyerPhone = paymentIntent.metadata?.buyer_phone || null;
    
    // Vendibook freight metadata
    const vendibookFreightEnabled = paymentIntent.metadata?.vendibook_freight_enabled === 'true';
    const freightPayer = paymentIntent.metadata?.freight_payer || 'buyer';
    const freightCost = paymentIntent.metadata?.freight_cost 
      ? Number(paymentIntent.metadata.freight_cost) 
      : 0;
    const sellerFreightDeduction = paymentIntent.metadata?.seller_freight_deduction 
      ? Number(paymentIntent.metadata.seller_freight_deduction) 
      : 0;
    
    // Platform fee = 12.9% of sale price (from metadata or calculated)
    const platformFee = paymentIntent.metadata?.platform_fee 
      ? Number(paymentIntent.metadata.platform_fee) / 100 
      : amount * (SALE_SELLER_FEE_PERCENT / 100);
    
    // Seller payout = amount - platform fee - freight (if seller pays)
    // Use metadata if available (already calculated in checkout), otherwise calculate
    const sellerPayout = paymentIntent.metadata?.seller_payout 
      ? Number(paymentIntent.metadata.seller_payout) / 100 
      : amount - platformFee - sellerFreightDeduction;
    
    logStep("Fee calculation", {
      amount,
      platformFee,
      sellerPayout,
      sellerFreightDeduction,
      vendibookFreightEnabled,
      freightPayer,
      freightCost,
    });

    // Create the sale transaction record
    // NOTE: checkout_session_id is unique (DB index) so concurrent calls can't create duplicates.
    // If we race and hit a unique violation, we just fetch the existing transaction.
    const insertPayload = {
      listing_id: session.metadata?.listing_id,
      buyer_id: session.metadata?.buyer_id,
      seller_id: session.metadata?.seller_id,
      amount: amount,
      platform_fee: platformFee,
      seller_payout: sellerPayout,
      payment_intent_id: paymentIntent.id,
      checkout_session_id: session_id,
      status: 'paid',
      fulfillment_type: fulfillmentType,
      delivery_address: deliveryAddress,
      delivery_instructions: deliveryInstructions,
      delivery_fee: deliveryFee,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      // Vendibook freight fields
      freight_cost: vendibookFreightEnabled ? freightCost : 0,
    };

    let transaction: any = null;

    const { data: insertedTx, error: insertErr } = await supabaseClient
      .from('sale_transactions')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      // 23505 = unique_violation
      const isUniqueViolation = (insertErr as any)?.code === '23505' || insertErr.message.toLowerCase().includes('duplicate');
      if (!isUniqueViolation) {
        throw new Error(`Failed to create transaction: ${insertErr.message}`);
      }

      logStep('Insert raced with existing transaction; fetching existing record', { code: (insertErr as any)?.code });
      const { data: existingAfter, error: existingAfterError } = await supabaseClient
        .from('sale_transactions')
        .select('*')
        .eq('checkout_session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAfterError || !existingAfter) {
        throw new Error(`Transaction already exists but could not be fetched: ${existingAfterError?.message ?? 'not found'}`);
      }

      transaction = existingAfter;
    } else {
      transaction = insertedTx;
    }

    logStep("Transaction ready", { id: transaction.id, status: transaction.status });

    // Mark any accepted offers for this buyer/listing as purchased
    const { error: offerUpdateError } = await supabaseClient
      .from('offers')
      .update({ status: 'purchased' })
      .eq('buyer_id', session.metadata?.buyer_id)
      .eq('listing_id', session.metadata?.listing_id)
      .eq('status', 'accepted');
    
    if (offerUpdateError) {
      logStep("Warning: Failed to update offer status", { error: offerUpdateError.message });
    } else {
      logStep("Offer status updated to purchased");
    }

    // Send payment received notification (background task)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/send-sale-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
          notification_type: 'payment_received',
        }),
      }).then(res => {
        logStep("Notification sent", { status: res.status });
      }).catch(err => {
        logStep("Notification failed", { error: err.message });
      })
    );

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
