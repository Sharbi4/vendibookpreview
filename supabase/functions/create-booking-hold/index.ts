import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Commission rates
const RENTAL_HOST_FEE_PERCENT = 12.9;
const RENTAL_RENTER_FEE_PERCENT = 12.9;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOKING-HOLD] ${step}${detailsStr}`);
};

interface HoldRequest {
  booking_id: string;
  listing_id: string;
  amount: number; // Base rental price in dollars
  delivery_fee?: number;
  deposit_amount?: number;
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body: HoldRequest = await req.json();
    const { 
      booking_id, 
      listing_id, 
      amount, 
      delivery_fee = 0,
    } = body;
    
    // Handle null deposit_amount explicitly (null can be passed from frontend)
    const deposit_amount = body.deposit_amount ?? 0;
    
    logStep("Request received", { booking_id, listing_id, amount, delivery_fee, deposit_amount });

    if (!booking_id || !listing_id || !amount) {
      throw new Error("Missing required fields: booking_id, listing_id, or amount");
    }

    // Fetch listing to get host's Stripe account
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('host_id, title')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }
    logStep("Listing found", { host_id: listing.host_id, title: listing.title });

    // Fetch host's Stripe account
    const { data: hostProfile, error: hostError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', listing.host_id)
      .single();

    if (hostError || !hostProfile?.stripe_account_id) {
      throw new Error("Host has not completed Stripe onboarding");
    }

    if (!hostProfile.stripe_onboarding_complete) {
      throw new Error("Host's Stripe account is not fully onboarded");
    }
    logStep("Host Stripe account verified", { stripe_account_id: hostProfile.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = "https://vendibook.com";

    // Calculate fees - same as regular checkout
    const subtotal = amount + delivery_fee;
    const renterFee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100);
    const customerTotal = Math.round((subtotal + renterFee + deposit_amount) * 100);
    const hostFee = subtotal * (RENTAL_HOST_FEE_PERCENT / 100);
    const applicationFee = Math.round((renterFee + hostFee) * 100);
    const hostReceives = Math.round((subtotal - hostFee) * 100);

    logStep("Fee calculation", {
      subtotal,
      deposit_amount,
      renterFee: renterFee.toFixed(2),
      hostFee: hostFee.toFixed(2),
      customerTotal: (customerTotal / 100).toFixed(2),
      applicationFee: (applicationFee / 100).toFixed(2),
      hostReceives: (hostReceives / 100).toFixed(2),
    });

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Build line items - separate base rental and platform fee
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: listing.title,
            description: `Rental booking${delivery_fee > 0 ? ` (includes $${delivery_fee.toFixed(2)} delivery)` : ''} - Payment held until host approves`,
          },
          unit_amount: Math.round(subtotal * 100),
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Platform Service Fee',
            description: 'Vendibook marketplace fee (12.9%)',
          },
          unit_amount: Math.round(renterFee * 100),
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      },
    ];

    // Add deposit as separate line item if present
    if (deposit_amount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Security Deposit (Refundable)',
            description: 'Held until host approves. Refunded after rental if no issues.',
          },
          unit_amount: Math.round(deposit_amount * 100),
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      });
    }

    // Create Checkout Session with MANUAL capture
    // Funds are held on the PLATFORM (not transferred to host) until booking ends
    // Host payout happens 24 hours after booking completion via complete-ended-bookings cron
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'affirm', 'klarna', 'afterpay_clearpay'],
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_update: customerId ? { address: 'auto' } : undefined,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      line_items: lineItems,
      payment_intent_data: {
        capture_method: 'manual', // ← KEY: Authorizes but doesn't capture until host approves
        // NO transfer_data - funds stay on platform until booking ends
        // Host payout is handled by complete-ended-bookings cron 24h after end_date
        metadata: {
          booking_id,
          listing_id,
          mode: 'rent',
          buyer_id: user.id,
          host_id: listing.host_id,
          deposit_amount: deposit_amount.toString(),
          authorization_hold: 'true',
          platform_fee_cents: applicationFee.toString(),
          host_payout_cents: hostReceives.toString(),
        },
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&hold=true`,
      cancel_url: `${origin}/payment-cancelled?listing=${listing_id}`,
      metadata: {
        booking_id,
        listing_id,
        mode: 'rent',
        buyer_id: user.id,
        host_id: listing.host_id,
        deposit_amount: deposit_amount.toString(),
        authorization_hold: 'true',
      },
    });

    logStep("Checkout session created with manual capture", { sessionId: session.id, url: session.url });

    // Calculate hold expiration (7 days from now - Stripe's auth hold limit)
    const holdExpiresAt = new Date();
    holdExpiresAt.setDate(holdExpiresAt.getDate() + 7);

    // Update booking with checkout session info
    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update({
        checkout_session_id: session.id,
        hold_status: 'pending',
        hold_expires_at: holdExpiresAt.toISOString(),
      })
      .eq('id', booking_id);

    if (updateError) {
      logStep("Warning: Failed to update booking", { error: updateError.message });
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
        customer_total: customerTotal / 100,
        platform_fee: applicationFee / 100,
        host_receives: hostReceives / 100,
        hold_expires_at: holdExpiresAt.toISOString(),
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
