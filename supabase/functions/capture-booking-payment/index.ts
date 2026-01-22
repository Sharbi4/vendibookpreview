import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAPTURE-BOOKING-PAYMENT] ${step}${detailsStr}`);
};

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

    // Verify the caller is the host or an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("Missing booking_id");

    // Fetch booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('*, listing:listings(title)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Verify caller is the host
    if (booking.host_id !== user.id) {
      // Check if admin
      const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_id: user.id });
      if (!isAdmin) {
        throw new Error("Unauthorized: Only the host can capture payment");
      }
    }

    logStep("Booking found", { 
      booking_id, 
      payment_intent_id: booking.payment_intent_id,
      hold_status: booking.hold_status,
    });

    if (!booking.payment_intent_id) {
      throw new Error("No payment intent found for this booking");
    }

    if (booking.hold_status === 'captured') {
      throw new Error("Payment has already been captured");
    }

    if (booking.hold_status === 'released') {
      throw new Error("Payment hold was already released");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
    logStep("PaymentIntent retrieved", { 
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    if (paymentIntent.status !== 'requires_capture') {
      if (paymentIntent.status === 'succeeded') {
        // Already captured
        await supabaseClient
          .from('booking_requests')
          .update({ hold_status: 'captured', payment_status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', booking_id);
        
        return new Response(
          JSON.stringify({ success: true, message: "Payment was already captured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      throw new Error(`Cannot capture payment. Current status: ${paymentIntent.status}`);
    }

    // Capture the payment
    const capturedIntent = await stripe.paymentIntents.capture(booking.payment_intent_id);
    logStep("Payment captured", { 
      id: capturedIntent.id, 
      status: capturedIntent.status,
      amount_captured: capturedIntent.amount_received,
    });

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update({
        hold_status: 'captured',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    if (updateError) {
      logStep("Warning: Failed to update booking", { error: updateError.message });
    }

    // Send confirmation email
    await supabaseClient.functions.invoke('send-booking-confirmation', {
      body: { booking_id },
    }).catch((e) => logStep("Warning: Failed to send confirmation", { error: e.message }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_intent_id: capturedIntent.id,
        amount_captured: capturedIntent.amount_received / 100,
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
