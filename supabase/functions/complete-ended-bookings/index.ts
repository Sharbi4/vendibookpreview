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
    logStep("Function started - checking for ended bookings and pending releases");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current date and 24 hours ago
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const releaseThresholdStr = twentyFourHoursAgo.toISOString().split('T')[0];

    logStep("Date thresholds", { today: todayStr, releaseThreshold: releaseThresholdStr, nowISO: now.toISOString(), twentyFourHoursAgoISO: twentyFourHoursAgo.toISOString() });

    const results = {
      markedCompleted: 0,
      payoutsProcessed: 0,
      depositsRefunded: 0,
      errors: [] as string[],
    };

    // ========================================
    // STEP 1: Mark bookings as completed when booking_end_timestamp has passed
    // For hourly bookings, this is the end of the last booked hour
    // For daily bookings, this is end of the last day (23:59:59)
    // ========================================
    logStep("Step 1: Marking ended bookings as completed");

    const { data: endedBookings, error: fetchEndedError } = await supabaseClient
      .from('booking_requests')
      .select('id, listing_id, shopper_id, host_id, end_date, booking_end_timestamp')
      .eq('status', 'approved')
      .eq('payment_status', 'paid')
      .lt('booking_end_timestamp', now.toISOString());

    if (fetchEndedError) {
      throw new Error(`Failed to fetch ended bookings: ${fetchEndedError.message}`);
    }

    if (endedBookings && endedBookings.length > 0) {
      for (const booking of endedBookings) {
        try {
          const { error: updateError } = await supabaseClient
            .from('booking_requests')
            .update({ 
              status: 'completed',
              updated_at: now.toISOString()
            })
            .eq('id', booking.id);

          if (updateError) {
            results.errors.push(`Failed to mark booking ${booking.id} as completed: ${updateError.message}`);
          } else {
            results.markedCompleted++;
            logStep("Marked booking as completed", { bookingId: booking.id });

            // Notify shopper
            EdgeRuntime.waitUntil(
              (async () => {
                await supabaseClient.from('notifications').insert({
                  user_id: booking.shopper_id,
                  type: 'booking_completed',
                  title: 'Booking Completed',
                  message: 'Your booking has been marked as completed. We hope you had a great experience!',
                  data: { booking_id: booking.id },
                });
              })()
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Error completing booking ${booking.id}: ${msg}`);
        }
      }
    }

    // ========================================
    // STEP 2: Process RENTAL payouts 24 hours after booking_end_timestamp (if no dispute or manual hold)
    // NOTE: For SALES, payouts are handled by confirm-sale (both parties confirm) or 
    // auto-release-sale-payouts (25 days after payment if not both confirmed)
    // ========================================
    logStep("Step 2: Processing RENTAL payouts for bookings ended 24+ hours ago");

    const { data: payoutEligibleBookings, error: payoutFetchError } = await supabaseClient
      .from('booking_requests')
      .select(`
        id,
        listing_id,
        shopper_id,
        host_id,
        end_date,
        booking_end_timestamp,
        total_price,
        payment_intent_id,
        payout_processed,
        payout_hold_until,
        payout_hold_reason
      `)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .is('payout_processed', null) // Only bookings that haven't had payout processed
      .lt('booking_end_timestamp', twentyFourHoursAgo.toISOString()); // 24+ hours since actual end

    if (payoutFetchError) {
      logStep("Error fetching payout eligible bookings", { error: payoutFetchError.message });
    } else if (payoutEligibleBookings && payoutEligibleBookings.length > 0) {
      for (const booking of payoutEligibleBookings) {
        try {
          // Check if manual hold is set and not yet expired
          if (booking.payout_hold_until && new Date(booking.payout_hold_until) > now) {
            logStep("Booking has manual hold - skipping payout", { 
              bookingId: booking.id, 
              holdUntil: booking.payout_hold_until,
              reason: booking.payout_hold_reason 
            });
            continue;
          }

          // Check if there's an active dispute on the booking itself
          const { data: bookingWithDispute } = await supabaseClient
            .from('booking_requests')
            .select('dispute_status')
            .eq('id', booking.id)
            .single();

          if (bookingWithDispute?.dispute_status && bookingWithDispute.dispute_status !== 'closed') {
            logStep("Booking has active dispute - skipping payout", { bookingId: booking.id, disputeStatus: bookingWithDispute.dispute_status });
            continue;
          }

          // Get host's Stripe account
          const { data: hostProfile } = await supabaseClient
            .from('profiles')
            .select('stripe_account_id, full_name')
            .eq('id', booking.host_id)
            .single();

          if (!hostProfile?.stripe_account_id) {
            logStep("Host has no Stripe account - skipping payout", { bookingId: booking.id });
            continue;
          }

          // Calculate payout (10% platform fee)
          const platformFeePercent = 0.10;
          const payoutAmount = Math.round(Number(booking.total_price) * (1 - platformFeePercent) * 100);

          logStep("Processing payout", { 
            bookingId: booking.id, 
            amount: payoutAmount / 100,
            stripeAccount: hostProfile.stripe_account_id 
          });

          // Create transfer
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

          // Mark payout as processed
          await supabaseClient
            .from('booking_requests')
            .update({ 
              payout_processed: true,
              payout_processed_at: now.toISOString(),
              payout_transfer_id: transfer.id,
            })
            .eq('id', booking.id);

          results.payoutsProcessed++;
          logStep("Payout processed", { bookingId: booking.id, transferId: transfer.id });

          // Notify host
          EdgeRuntime.waitUntil(
            (async () => {
              await supabaseClient.from('notifications').insert({
                user_id: booking.host_id,
                type: 'payout_completed',
                title: 'Payout Received! 💰',
                message: `Your payout of $${(payoutAmount / 100).toFixed(2)} has been sent to your bank account.`,
                data: { booking_id: booking.id, transfer_id: transfer.id, amount: payoutAmount / 100 },
              });
            })()
          );

          // Send payout notification email
          EdgeRuntime.waitUntil(
            supabaseClient.functions.invoke('send-payout-notification', {
              body: { booking_id: booking.id, amount: payoutAmount / 100 },
            }).catch(err => logStep("Payout email failed", { error: err }))
          );

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Payout failed for booking ${booking.id}: ${msg}`);
          logStep("Payout error", { bookingId: booking.id, error: msg });
        }
      }
    }

    // ========================================
    // STEP 3: Auto-refund deposits 24 hours after booking_end_timestamp (if no dispute or manual hold)
    // ========================================
    logStep("Step 3: Auto-refunding deposits for bookings ended 24+ hours ago");

    const { data: depositEligibleBookings, error: depositFetchError } = await supabaseClient
      .from('booking_requests')
      .select(`
        id,
        listing_id,
        shopper_id,
        host_id,
        end_date,
        booking_end_timestamp,
        deposit_amount,
        deposit_status,
        deposit_charge_id,
        payout_hold_until,
        payout_hold_reason
      `)
      .eq('status', 'completed')
      .eq('deposit_status', 'charged') // Only charged deposits
      .gt('deposit_amount', 0) // Has a deposit
      .lt('booking_end_timestamp', twentyFourHoursAgo.toISOString()); // 24+ hours since actual end

    if (depositFetchError) {
      logStep("Error fetching deposit eligible bookings", { error: depositFetchError.message });
    } else if (depositEligibleBookings && depositEligibleBookings.length > 0) {
      for (const booking of depositEligibleBookings) {
        try {
          // Check if manual hold is set and not yet expired
          if (booking.payout_hold_until && new Date(booking.payout_hold_until) > now) {
            logStep("Booking has manual hold - skipping deposit refund", { 
              bookingId: booking.id, 
              holdUntil: booking.payout_hold_until,
              reason: booking.payout_hold_reason 
            });
            continue;
          }

          // Check if there's an active dispute on the booking itself
          const { data: bookingWithDispute } = await supabaseClient
            .from('booking_requests')
            .select('dispute_status')
            .eq('id', booking.id)
            .single();

          if (bookingWithDispute?.dispute_status && bookingWithDispute.dispute_status !== 'closed') {
            logStep("Booking has active dispute - skipping deposit refund", { bookingId: booking.id, disputeStatus: bookingWithDispute.dispute_status });
            continue;
          }

          const refundAmount = booking.deposit_amount;

          logStep("Processing auto deposit refund", { 
            bookingId: booking.id, 
            depositAmount: refundAmount 
          });

          // Process Stripe refund if we have a charge ID
          let refundId = null;
          if (booking.deposit_charge_id) {
            try {
              const refund = await stripe.refunds.create({
                charge: booking.deposit_charge_id,
                amount: Math.round(refundAmount * 100),
                reason: 'requested_by_customer',
              });
              refundId = refund.id;
              logStep("Stripe deposit refund processed", { refundId, amount: refundAmount });
            } catch (stripeError: any) {
              logStep("Stripe deposit refund failed", { error: stripeError.message });
              results.errors.push(`Deposit refund failed for ${booking.id}: ${stripeError.message}`);
              continue;
            }
          }

          // Update booking
          await supabaseClient
            .from('booking_requests')
            .update({ 
              deposit_status: 'refunded',
              deposit_refunded_at: now.toISOString(),
              deposit_refund_notes: 'Auto-refunded 24 hours after rental completion - no issues reported',
            })
            .eq('id', booking.id);

          results.depositsRefunded++;
          logStep("Deposit refunded", { bookingId: booking.id, refundId });

          // Get renter info for notification
          const { data: renterProfile } = await supabaseClient
            .from('profiles')
            .select('full_name, email, display_name')
            .eq('id', booking.shopper_id)
            .single();

          const { data: listing } = await supabaseClient
            .from('listings')
            .select('title')
            .eq('id', booking.listing_id)
            .single();

          // Notify renter
          EdgeRuntime.waitUntil(
            (async () => {
              await supabaseClient.from('notifications').insert({
                user_id: booking.shopper_id,
                type: 'deposit_refunded',
                title: 'Deposit Refunded! 💰',
                message: `Your $${refundAmount.toFixed(2)} security deposit has been automatically refunded.`,
                data: { booking_id: booking.id, amount: refundAmount },
              });
            })()
          );

          // Send email notification
          if (renterProfile?.email) {
            EdgeRuntime.waitUntil(
              supabaseClient.functions.invoke('send-deposit-notification', {
                body: {
                  email: renterProfile.email,
                  renterName: renterProfile.display_name || renterProfile.full_name || 'Renter',
                  listingTitle: listing?.title || 'Your Rental',
                  bookingId: booking.id,
                  startDate: booking.end_date, // Use end date context
                  endDate: booking.end_date,
                  originalDeposit: refundAmount,
                  refundAmount: refundAmount,
                  deductionAmount: 0,
                  refundType: 'full',
                  notes: 'Your security deposit was automatically released 24 hours after your rental ended with no issues reported.',
                  hostName: 'Host',
                },
              }).catch(err => logStep("Deposit email failed", { error: err }))
            );
          }

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Deposit refund failed for booking ${booking.id}: ${msg}`);
          logStep("Deposit refund error", { bookingId: booking.id, error: msg });
        }
      }
    }

    logStep("Processing complete", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Completed: ${results.markedCompleted} marked, ${results.payoutsProcessed} payouts, ${results.depositsRefunded} deposits refunded`,
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
