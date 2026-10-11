import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { refundPayment } from "../_shared/paymentOps.ts";
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";
import { queueCompletedRentalPayouts } from "../_shared/rentalPayoutEligibility.ts";
import { confirmedRefundId } from "../_shared/confirmedRefund.ts";

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
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();

  try {
    logStep("Function started - checking for ended bookings and pending releases");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current date and 24 hours ago
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const releaseThresholdStr = twentyFourHoursAgo.toISOString().split('T')[0];

    logStep("Date thresholds", { today: todayStr, releaseThreshold: releaseThresholdStr, nowISO: now.toISOString(), twentyFourHoursAgoISO: twentyFourHoursAgo.toISOString() });

    const results = {
      markedCompleted: 0,
      payoutsQueued: 0,
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

            // Fire rental referral qualifying event (idempotent via booking id).
            // referral-record-event enforces all eligibility gates (min value, duration, fraud).
            EdgeRuntime.waitUntil((async () => {
              try {
                const { data: full } = await supabaseClient
                  .from('booking_requests')
                  .select('referral_code, total_price, dispute_status, payment_status, booking_end_timestamp, start_date')
                  .eq('id', booking.id)
                  .maybeSingle();
                if (!full || full.dispute_status || full.payment_status !== 'paid') return;
                const durationHours = full.booking_end_timestamp && full.start_date
                  ? (new Date(full.booking_end_timestamp).getTime() - new Date(full.start_date).getTime()) / 36e5
                  : 24;
                if (durationHours < 2) return;
                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/referral-record-event`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    program_type: 'rental',
                    referred_user_id: booking.shopper_id,
                    transaction_id: booking.id,
                    transaction_value: Number(full.total_price ?? 0),
                    referral_code: full.referral_code || undefined,
                    seller_id: booking.host_id,
                    idempotency_key: `rental-complete-${booking.id}`,
                  }),
                });
              } catch (e) {
                logStep('WARNING: rental referral event failed', { bookingId: booking.id, error: String(e) });
              }
            })());
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Error completing booking ${booking.id}: ${msg}`);
        }
      }
    }

    // ========================================
    // STEP 2: Queue completed rentals for manual payout review after 24 hours.
    // Eligibility is not a transfer and must never appear as "payout sent".
    // ========================================
    const { data: payoutEligibleBookings, error: payoutFetchError } = await supabaseClient
      .from('booking_requests')
      .select('id, host_id, status, payment_status, dispute_status, payout_hold_until, payout_hold_reason')
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .lt('booking_end_timestamp', twentyFourHoursAgo.toISOString());

    if (payoutFetchError) {
      results.errors.push(`Unable to check rental payout eligibility: ${payoutFetchError.message}`);
    } else {
      for (const booking of payoutEligibleBookings ?? []) {
        try {
          const queued = await queueCompletedRentalPayouts(supabaseClient, booking);
          if (!queued.count) continue;
          results.payoutsQueued += queued.count;
          // No payout_processed flag or sent email: an administrator must record
          // the confirmed external transfer before the payout is completed.
          const { error: notificationError } = await supabaseClient.from('notifications').insert({
            user_id: booking.host_id,
            type: 'payout_pending',
            title: 'Rental payout ready for review',
            message: `Your rental proceeds of $${(queued.amountCents / 100).toFixed(2)} are ready for payout review. Payment has not been sent yet.`,
            data: { booking_id: booking.id, amount: queued.amountCents / 100 },
          });
          if (notificationError) logStep('Payout review notification failed', { bookingId: booking.id });
        } catch (err) {
          results.errors.push(`Payout review failed for booking ${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
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
        payment_provider,
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
          const { data: bookingWithDispute, error: disputeError } = await supabaseClient
            .from('booking_requests')
            .select('dispute_status')
            .eq('id', booking.id)
            .single();

          if (disputeError || !bookingWithDispute) {
            results.errors.push(`Cannot verify deposit dispute status for ${booking.id}`);
            continue;
          }
          if (bookingWithDispute.dispute_status && !['none', 'closed', 'resolved'].includes(bookingWithDispute.dispute_status)) {
            logStep("Booking has active dispute - skipping deposit refund", { bookingId: booking.id, disputeStatus: bookingWithDispute.dispute_status });
            continue;
          }

          const refundAmount = booking.deposit_amount;

          logStep("Processing auto deposit refund", { 
            bookingId: booking.id, 
            depositAmount: refundAmount 
          });

          // Refund the deposit through PayPal. Legacy references from the
          // retired processor resolve to a manual outcome for admin settlement.
          let refundId: string | null = null;
          if (booking.payment_provider !== 'paypal') {
            results.errors.push(`Deposit ${booking.id} requires review through its original payment provider.`);
            continue;
          }
          if (!booking.deposit_charge_id) {
            results.errors.push(`Deposit ${booking.id} has no payment reference; manual review is required.`);
            continue;
          }
          if (booking.deposit_charge_id) {
            try {
              const outcome = await refundPayment({
                paymentReference: booking.deposit_charge_id,
                amountCents: Math.round(refundAmount * 100),
                reason: 'Automatic deposit release after rental completion',
                idempotencyKey: `deposit-auto-refund:${booking.id}`,
              });
              refundId = confirmedRefundId(outcome, Math.round(refundAmount * 100));
              logStep("Deposit refund completed", { refundId, amount: refundAmount });
            } catch (refundError) {
              const message = refundError instanceof Error ? refundError.message : String(refundError);
              logStep("Deposit refund failed", { error: message });
              results.errors.push(`Deposit refund failed for ${booking.id}: ${message}`);
              continue;
            }
          }

          // Update booking
          const { data: refundedBooking, error: recordError } = await supabaseClient
            .from('booking_requests')
            .update({ 
              deposit_status: 'refunded',
              deposit_refunded_at: now.toISOString(),
              deposit_refund_notes: 'Auto-refunded 24 hours after rental completion - no issues reported',
            })
            .eq('id', booking.id)
            .eq('deposit_status', 'charged')
            .select('id');
          if (recordError) throw new Error(`Refund ${refundId} completed but could not be recorded: ${recordError.message}`);
          if (!refundedBooking?.length) continue;

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
        message: `Completed: ${results.markedCompleted} marked, ${results.payoutsQueued} payouts queued, ${results.depositsRefunded} deposits refunded`,
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
