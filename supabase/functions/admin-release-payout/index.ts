import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-RELEASE-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authorization header to identify the admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Verify the user is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error("Admin access required");
    }

    const { booking_id, release_type, reason } = await req.json();
    
    if (!booking_id) {
      throw new Error("booking_id is required");
    }
    
    if (!release_type || !['payout', 'deposit', 'both'].includes(release_type)) {
      throw new Error("release_type must be 'payout', 'deposit', or 'both'");
    }

    logStep("Processing manual release", { bookingId: booking_id, releaseType: release_type, adminId: user.id });

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select(`
        id,
        listing_id,
        shopper_id,
        host_id,
        total_price,
        deposit_amount,
        deposit_status,
        deposit_charge_id,
        payout_processed,
        payment_intent_id
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const now = new Date();
    const results: { payout?: string; deposit?: string } = {};

    // Process payout if requested
    if (release_type === 'payout' || release_type === 'both') {
      if (booking.payout_processed) {
        logStep("Payout already processed", { bookingId: booking_id });
      } else {
        // Get host's Stripe account
        const { data: hostProfile } = await supabaseClient
          .from('profiles')
          .select('stripe_account_id, full_name')
          .eq('id', booking.host_id)
          .single();

        if (!hostProfile?.stripe_account_id) {
          throw new Error("Host has no connected Stripe account");
        }

        // Calculate payout (10% platform fee)
        const platformFeePercent = 0.10;
        const payoutAmount = Math.round(Number(booking.total_price) * (1 - platformFeePercent) * 100);

        logStep("Creating transfer", { amount: payoutAmount / 100, destination: hostProfile.stripe_account_id });

        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: 'usd',
          destination: hostProfile.stripe_account_id,
          metadata: {
            booking_id: booking.id,
            listing_id: booking.listing_id,
            type: 'manual_early_release',
            released_by: user.id,
            reason: reason || 'Admin manual release',
          },
        });

        // Update booking
        await supabaseClient
          .from('booking_requests')
          .update({
            payout_processed: true,
            payout_processed_at: now.toISOString(),
            payout_transfer_id: transfer.id,
            payout_hold_until: null, // Clear any hold
            payout_hold_reason: `Manually released by admin: ${reason || 'No reason provided'}`,
            payout_hold_set_by: user.id,
          })
          .eq('id', booking_id);

        // Notify host
        await supabaseClient.from('notifications').insert({
          user_id: booking.host_id,
          type: 'payout_completed',
          title: 'Early Payout Released! 💰',
          message: `Your payout of $${(payoutAmount / 100).toFixed(2)} has been manually released.`,
        });

        results.payout = transfer.id;
        logStep("Payout processed", { transferId: transfer.id });
      }
    }

    // Process deposit refund if requested
    if (release_type === 'deposit' || release_type === 'both') {
      if (booking.deposit_status === 'refunded') {
        logStep("Deposit already refunded", { bookingId: booking_id });
      } else if (!booking.deposit_amount || booking.deposit_amount <= 0) {
        logStep("No deposit to refund", { bookingId: booking_id });
      } else if (booking.deposit_status !== 'charged') {
        logStep("Deposit not in refundable state", { bookingId: booking_id, status: booking.deposit_status });
      } else {
        const refundAmount = booking.deposit_amount;
        let refundId = null;

        if (booking.deposit_charge_id) {
          const refund = await stripe.refunds.create({
            charge: booking.deposit_charge_id,
            amount: Math.round(refundAmount * 100),
            reason: 'requested_by_customer',
          });
          refundId = refund.id;
        }

        // Update booking
        await supabaseClient
          .from('booking_requests')
          .update({
            deposit_status: 'refunded',
            deposit_refunded_at: now.toISOString(),
            deposit_refund_notes: `Manually released by admin: ${reason || 'No reason provided'}`,
          })
          .eq('id', booking_id);

        // Notify renter
        await supabaseClient.from('notifications').insert({
          user_id: booking.shopper_id,
          type: 'deposit_refunded',
          title: 'Deposit Refunded! 💰',
          message: `Your $${refundAmount.toFixed(2)} security deposit has been manually released.`,
        });

        results.deposit = refundId || 'released';
        logStep("Deposit refunded", { refundId });
      }
    }

    // Log the admin action
    await supabaseClient.from('admin_notes').insert({
      entity_type: 'booking',
      entity_id: booking_id,
      created_by: user.id,
      note: `Manual release: ${release_type}. Reason: ${reason || 'Not specified'}`,
    });

    logStep("Manual release complete", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Manual release processed successfully',
        results
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
