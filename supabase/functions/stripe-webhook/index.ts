import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No signature provided");
      return new Response(JSON.stringify({ error: "No signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the raw body for signature verification
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { message: errorMessage });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        });

        const bookingId = session.metadata?.booking_id;
        const listingId = session.metadata?.listing_id;
        const mode = session.metadata?.mode;

        if (bookingId && session.payment_status === "paid") {
          // Update booking with payment info
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "paid",
              checkout_session_id: session.id,
              payment_intent_id: typeof session.payment_intent === 'string' 
                ? session.payment_intent 
                : session.payment_intent?.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update booking", { error: updateError.message, bookingId });
          } else {
            logStep("Booking marked as paid", { bookingId });

            // Send payment confirmation notification
            try {
              await supabaseClient.functions.invoke("send-booking-notification", {
                body: { booking_id: bookingId, event_type: "payment_received" },
              });
              logStep("Payment notification sent", { bookingId });
            } catch (notifyError) {
              logStep("WARNING: Failed to send notification", { error: String(notifyError) });
            }
          }
        } else if (!bookingId) {
          logStep("No booking_id in metadata, skipping update", { sessionId: session.id });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.expired", { sessionId: session.id });

        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "failed",
              checkout_session_id: session.id,
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update expired booking", { error: updateError.message });
          } else {
            logStep("Booking marked as failed (expired)", { bookingId });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { 
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });

        const bookingId = paymentIntent.metadata?.booking_id;
        if (bookingId) {
          // Update as backup in case checkout.session.completed didn't fire
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "paid",
              payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .eq("payment_status", "unpaid"); // Only update if not already paid

          if (updateError) {
            logStep("ERROR: Failed to update booking from payment_intent", { error: updateError.message });
          } else {
            logStep("Booking updated from payment_intent.succeeded", { bookingId });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.payment_failed", { paymentIntentId: paymentIntent.id });

        const bookingId = paymentIntent.metadata?.booking_id;
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "failed",
              payment_intent_id: paymentIntent.id,
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update failed payment", { error: updateError.message });
          } else {
            logStep("Booking marked as payment failed", { bookingId });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing charge.refunded", { chargeId: charge.id });

        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "refunded",
            })
            .eq("payment_intent_id", paymentIntentId);

          if (updateError) {
            logStep("ERROR: Failed to update refunded booking", { error: updateError.message });
          } else {
            logStep("Booking marked as refunded", { paymentIntentId });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
