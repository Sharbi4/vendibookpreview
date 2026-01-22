import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RELEASE-BOOKING-HOLD] ${step}${detailsStr}`);
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

    // Can be called by host (decline), cron job (expiry), or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { booking_id, reason } = await req.json();
    if (!booking_id) throw new Error("Missing booking_id");

    // Fetch booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('*, listing:listings(title), shopper:profiles!booking_requests_shopper_id_fkey(email, full_name)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Verify caller is the host or admin
    if (booking.host_id !== user.id) {
      const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_id: user.id });
      if (!isAdmin) {
        throw new Error("Unauthorized: Only the host or admin can release payment hold");
      }
    }

    logStep("Booking found", { 
      booking_id, 
      payment_intent_id: booking.payment_intent_id,
      hold_status: booking.hold_status,
    });

    if (!booking.payment_intent_id) {
      // No payment to release - just update status
      await supabaseClient
        .from('booking_requests')
        .update({ hold_status: 'none' })
        .eq('id', booking_id);
      
      return new Response(
        JSON.stringify({ success: true, message: "No payment hold to release" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (booking.hold_status === 'released') {
      return new Response(
        JSON.stringify({ success: true, message: "Payment hold was already released" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (booking.hold_status === 'captured') {
      throw new Error("Cannot release hold - payment was already captured. Use refund instead.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
    logStep("PaymentIntent retrieved", { status: paymentIntent.status });

    // Cancel the payment intent to release the hold
    if (paymentIntent.status === 'requires_capture') {
      const canceledIntent = await stripe.paymentIntents.cancel(booking.payment_intent_id, {
        cancellation_reason: 'requested_by_customer',
      });
      logStep("Payment hold released", { 
        id: canceledIntent.id, 
        status: canceledIntent.status,
      });
    } else if (paymentIntent.status === 'canceled') {
      logStep("Payment was already canceled");
    } else {
      logStep("Warning: Unexpected payment status", { status: paymentIntent.status });
    }

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update({
        hold_status: 'released',
        payment_status: 'released',
      })
      .eq('id', booking_id);

    if (updateError) {
      logStep("Warning: Failed to update booking", { error: updateError.message });
    }

    // Send notification to shopper that their hold was released
    if (booking.shopper?.email) {
      await supabaseClient.functions.invoke('send-booking-notification', {
        body: { 
          booking_id, 
          event_type: 'hold_released',
          reason: reason || 'Host declined the booking request',
        },
      }).catch((e) => logStep("Warning: Failed to send notification", { error: e.message }));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment hold released - funds returned to customer",
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
