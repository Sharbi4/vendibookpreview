import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
};

interface RefundRequest {
  booking_id: string;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  refund_amount?: number; // Optional partial refund amount in dollars
  initiated_by: 'shopper' | 'host' | 'admin';
  cancellation_reason?: string;
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

    const body: RefundRequest = await req.json();
    const { 
      booking_id, 
      reason = 'requested_by_customer', 
      refund_amount,
      initiated_by,
      cancellation_reason 
    } = body;
    
    logStep("Request received", { booking_id, reason, refund_amount, initiated_by });

    if (!booking_id) {
      throw new Error("Missing required field: booking_id");
    }

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('*, listings(title, host_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }
    logStep("Booking found", { 
      booking_id, 
      payment_status: booking.payment_status,
      payment_intent_id: booking.payment_intent_id 
    });

    // Verify user is authorized (must be shopper, host, or admin)
    const isShopperOrHost = user.id === booking.shopper_id || user.id === booking.host_id;
    
    // Check for admin role
    const { data: adminCheck } = await supabaseClient
      .rpc('is_admin', { user_id: user.id });
    const isAdmin = adminCheck === true;

    if (!isShopperOrHost && !isAdmin) {
      throw new Error("Not authorized to refund this booking");
    }
    logStep("Authorization verified", { isShopperOrHost, isAdmin });

    // Check if booking is paid and has payment intent
    if (booking.payment_status !== 'paid') {
      throw new Error(`Cannot refund booking with status: ${booking.payment_status}`);
    }

    if (!booking.payment_intent_id) {
      throw new Error("No payment intent found for this booking");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate refund amount in cents
    let refundAmountCents: number | undefined;
    if (refund_amount !== undefined) {
      refundAmountCents = Math.round(refund_amount * 100);
      logStep("Partial refund requested", { refundAmountCents });
    } else {
      logStep("Full refund requested");
    }

    // Create the refund in Stripe
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: booking.payment_intent_id,
      reason,
      metadata: {
        booking_id,
        initiated_by,
        initiated_by_user_id: user.id,
        cancellation_reason: cancellation_reason || '',
      },
    };

    if (refundAmountCents) {
      refundParams.amount = refundAmountCents;
    }

    const refund = await stripe.refunds.create(refundParams);
    logStep("Refund created", { 
      refundId: refund.id, 
      status: refund.status,
      amount: refund.amount 
    });

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update({
        payment_status: 'refunded',
        status: 'cancelled',
      })
      .eq('id', booking_id);

    if (updateError) {
      logStep("WARNING: Failed to update booking status", { error: updateError.message });
    } else {
      logStep("Booking status updated to refunded");
    }

    // Get shopper details for notification
    const { data: shopperProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.shopper_id)
      .single();

    // Get host details for notification
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.host_id)
      .single();

    // Send refund notification email
    if (shopperProfile?.email) {
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-refund-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email: shopperProfile.email,
              fullName: shopperProfile.full_name || "Valued Customer",
              bookingId: booking_id,
              listingTitle: booking.listings?.title || "Booking",
              refundAmount: refund.amount / 100,
              reason: cancellation_reason || "Booking cancelled",
              recipientType: 'shopper',
            }),
          }
        );
        logStep("Refund notification sent to shopper", { email: shopperProfile.email });
      } catch (emailError) {
        logStep("WARNING: Failed to send shopper notification", { error: String(emailError) });
      }
    }

    // Notify host as well
    if (hostProfile?.email) {
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-refund-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email: hostProfile.email,
              fullName: hostProfile.full_name || "Host",
              bookingId: booking_id,
              listingTitle: booking.listings?.title || "Booking",
              refundAmount: refund.amount / 100,
              reason: cancellation_reason || "Booking cancelled",
              recipientType: 'host',
              initiatedBy: initiated_by,
            }),
          }
        );
        logStep("Refund notification sent to host", { email: hostProfile.email });
      } catch (emailError) {
        logStep("WARNING: Failed to send host notification", { error: String(emailError) });
      }
    }

    // Create in-app notification for shopper
    try {
      await supabaseClient.from('notifications').insert({
        user_id: booking.shopper_id,
        type: 'refund',
        title: 'Refund Processed',
        message: `Your refund of $${(refund.amount / 100).toFixed(2)} for "${booking.listings?.title || 'booking'}" has been processed.`,
        link: '/dashboard',
      });
      logStep("In-app notification created for shopper");
    } catch (notifError) {
      logStep("WARNING: Failed to create in-app notification", { error: String(notifError) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refund.id,
        refund_status: refund.status,
        refund_amount: refund.amount / 100,
        booking_status: 'cancelled',
        payment_status: 'refunded',
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
