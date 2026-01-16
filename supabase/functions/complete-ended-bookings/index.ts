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
  console.log(`[COMPLETE-ENDED-BOOKINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - checking for ended bookings");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current date (end of day to ensure booking has fully ended)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    logStep("Looking for bookings ended before", { date: todayStr });

    // Find all approved and paid bookings where end_date has passed
    const { data: endedBookings, error: fetchError } = await supabaseClient
      .from('booking_requests')
      .select(`
        id,
        listing_id,
        shopper_id,
        host_id,
        start_date,
        end_date,
        status,
        payment_status,
        total_price,
        payment_intent_id
      `)
      .eq('status', 'approved')
      .eq('payment_status', 'paid')
      .lt('end_date', todayStr);

    if (fetchError) {
      throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
    }

    if (!endedBookings || endedBookings.length === 0) {
      logStep("No ended bookings found to complete");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No ended bookings found",
          completed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep(`Found ${endedBookings.length} bookings to complete`);

    const results = {
      completed: 0,
      payouts: 0,
      errors: [] as string[],
    };

    for (const booking of endedBookings) {
      try {
        logStep("Processing booking", { 
          bookingId: booking.id, 
          endDate: booking.end_date,
          totalPrice: booking.total_price 
        });

        // Update booking status to completed
        const { error: updateError } = await supabaseClient
          .from('booking_requests')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          throw new Error(`Failed to update booking ${booking.id}: ${updateError.message}`);
        }

        results.completed++;
        logStep("Booking marked as completed", { bookingId: booking.id });

        // Get host's Stripe account for payout
        const { data: hostProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('stripe_account_id, full_name, email')
          .eq('id', booking.host_id)
          .single();

        if (profileError || !hostProfile?.stripe_account_id) {
          logStep("Host has no Stripe account - payout skipped", { 
            hostId: booking.host_id,
            bookingId: booking.id 
          });
          continue;
        }

        // Calculate payout amount (total_price minus platform fee of 10%)
        const platformFeePercent = 0.10;
        const payoutAmount = Math.round(Number(booking.total_price) * (1 - platformFeePercent) * 100); // Convert to cents

        logStep("Initiating payout", { 
          bookingId: booking.id,
          hostId: booking.host_id,
          totalPrice: booking.total_price,
          payoutAmount: payoutAmount / 100,
          stripeAccountId: hostProfile.stripe_account_id
        });

        try {
          // Create transfer to host
          const transfer = await stripe.transfers.create({
            amount: payoutAmount,
            currency: 'usd',
            destination: hostProfile.stripe_account_id,
            metadata: {
              booking_id: booking.id,
              listing_id: booking.listing_id,
              type: 'booking_payout',
            },
          });

          logStep("Transfer created", { transferId: transfer.id, bookingId: booking.id });
          results.payouts++;

          // Create a notification for the host about payout
          EdgeRuntime.waitUntil(
            (async () => {
              const { error } = await supabaseClient
                .from('notifications')
                .insert({
                  user_id: booking.host_id,
                  type: 'payout_completed',
                  title: 'Booking Payout Received',
                  message: `Your payout of $${(payoutAmount / 100).toFixed(2)} for the completed booking has been sent to your account.`,
                  data: {
                    booking_id: booking.id,
                    transfer_id: transfer.id,
                    amount: payoutAmount / 100,
                  },
                });
              if (error) logStep("Notification insert failed", { error: error.message });
              else logStep("Payout notification created", { hostId: booking.host_id });
            })()
          );

          // Also notify the shopper that their booking was completed
          EdgeRuntime.waitUntil(
            (async () => {
              const { error } = await supabaseClient
                .from('notifications')
                .insert({
                  user_id: booking.shopper_id,
                  type: 'booking_completed',
                  title: 'Booking Completed',
                  message: `Your booking has been marked as completed. We hope you had a great experience! You can now leave a review.`,
                  data: {
                    booking_id: booking.id,
                  },
                });
              if (error) logStep("Shopper notification insert failed", { error: error.message });
              else logStep("Completion notification created for shopper", { shopperId: booking.shopper_id });
            })()
          );

        } catch (stripeError) {
          const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
          logStep("Stripe transfer failed", { bookingId: booking.id, error: errorMessage });
          results.errors.push(`Payout failed for booking ${booking.id}: ${errorMessage}`);
        }

      } catch (bookingError) {
        const errorMessage = bookingError instanceof Error ? bookingError.message : String(bookingError);
        logStep("Error processing booking", { bookingId: booking.id, error: errorMessage });
        results.errors.push(errorMessage);
      }
    }

    logStep("Processing complete", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Completed ${results.completed} bookings, ${results.payouts} payouts processed`,
        ...results
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
