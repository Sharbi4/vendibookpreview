import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { releaseHeldPayment } from "../_shared/paymentOps.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPIRE-BOOKING-HOLDS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started - checking for expired booking holds");


    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find bookings with expired holds that haven't been processed
    // Give 24-hour buffer before auto-expiring (host has 6 days to respond)
    const { data: expiredBookings, error: fetchError } = await supabaseClient
      .from('booking_requests')
      .select('id, payment_intent_id, payment_provider, host_id, shopper_id, listing_id, hold_expires_at')
      .eq('hold_status', 'held')
      .eq('status', 'pending')
      .lt('hold_expires_at', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch expired bookings: ${fetchError.message}`);
    }

    logStep("Found expired holds", { count: expiredBookings?.length || 0 });

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const booking of expiredBookings) {
      try {
        logStep("Processing expired hold", { booking_id: booking.id });

        if (booking.payment_intent_id) {
          // Vendibook releases authorizations through PayPal only. Legacy
          // references resolve to a manual outcome for administrator cleanup.
          const release = await releaseHeldPayment({
            authorizationId: booking.payment_intent_id,
            provider: booking.payment_provider,
            idempotencyKey: `booking-expire-${booking.id}`,
          });
          logStep("Hold release outcome", {
            booking_id: booking.id,
            success: release.success,
            manual: release.manual ?? false,
            status: release.status,
          });
        }

        // Update booking status
        await supabaseClient
          .from('booking_requests')
          .update({
            status: 'cancelled',
            hold_status: 'expired',
            payment_status: 'released',
          })
          .eq('id', booking.id);

        // Notify both parties
        await supabaseClient.functions.invoke('send-booking-notification', {
          body: { 
            booking_id: booking.id, 
            event_type: 'hold_expired',
          },
        }).catch((e) => logStep("Warning: Failed to send notification", { error: e.message }));

        processed++;
      } catch (bookingError) {
        logStep("Error processing booking", { 
          booking_id: booking.id, 
          error: bookingError instanceof Error ? bookingError.message : String(bookingError) 
        });
        errors++;
      }
    }

    logStep("Cron job completed", { processed, errors });

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
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
