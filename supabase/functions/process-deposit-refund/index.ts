import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEPOSIT-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { booking_id, refund_type = 'full', deduction_amount = 0, notes = '' } = await req.json();
    
    if (!booking_id) {
      throw new Error("booking_id is required");
    }
    logStep("Processing refund request", { booking_id, refund_type, deduction_amount });

    // Get booking details with listing and renter info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('*, listings(title, host_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }
    logStep("Found booking", { bookingId: booking.id, depositAmount: booking.deposit_amount, depositStatus: booking.deposit_status });

    // Get renter profile
    const { data: renterProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email, display_name')
      .eq('id', booking.shopper_id)
      .single();

    // Get host profile
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, display_name, business_name')
      .eq('id', booking.host_id)
      .single();

    // Check if there's a deposit to refund
    if (!booking.deposit_amount || booking.deposit_amount <= 0) {
      throw new Error("No deposit to refund for this booking");
    }

    if (booking.deposit_status === 'refunded') {
      throw new Error("Deposit has already been refunded");
    }

    if (booking.deposit_status !== 'charged') {
      throw new Error(`Cannot refund deposit with status: ${booking.deposit_status}`);
    }

    // Calculate refund amount
    let refundAmount = booking.deposit_amount;
    if (refund_type === 'partial') {
      refundAmount = Math.max(0, booking.deposit_amount - deduction_amount);
    } else if (refund_type === 'forfeit') {
      refundAmount = 0;
    }
    logStep("Calculated refund amount", { original: booking.deposit_amount, refundAmount, deduction: deduction_amount });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Process refund if there's an amount to refund and we have a charge ID
    let refundId = null;
    if (refundAmount > 0 && booking.deposit_charge_id) {
      try {
        const refund = await stripe.refunds.create({
          charge: booking.deposit_charge_id,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
        });
        refundId = refund.id;
        logStep("Stripe refund processed", { refundId, amount: refundAmount });
      } catch (stripeError: any) {
        logStep("Stripe refund failed", { error: stripeError.message });
        throw new Error(`Failed to process refund: ${stripeError.message}`);
      }
    }

    // Update booking record
    const updateData: any = {
      deposit_status: refund_type === 'forfeit' ? 'forfeited' : 'refunded',
      deposit_refunded_at: new Date().toISOString(),
      deposit_refund_notes: notes || (refund_type === 'forfeit' 
        ? `Deposit forfeited. Deducted: $${booking.deposit_amount}` 
        : refund_type === 'partial' 
        ? `Partial refund: $${refundAmount}. Deducted: $${deduction_amount}` 
        : `Full deposit refunded: $${refundAmount}`),
    };

    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update(updateData)
      .eq('id', booking_id);

    if (updateError) {
      logStep("Failed to update booking", { error: updateError.message });
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    logStep("Booking updated successfully");

    // Send notification to renter
    try {
      await supabaseClient.functions.invoke('create-notification', {
        body: {
          user_id: booking.shopper_id,
          type: 'deposit_refund',
          title: refundAmount > 0 ? 'Deposit Refunded' : 'Deposit Forfeited',
          message: refundAmount > 0 
            ? `Your $${refundAmount.toFixed(2)} security deposit has been refunded for your rental.`
            : `Your security deposit was forfeited due to: ${notes || 'damage or late return'}`,
          link: `/dashboard`,
        },
      });
      logStep("In-app notification sent to renter");
    } catch (notifError) {
      logStep("Failed to send in-app notification", { error: notifError });
    }

    // Send email notification to renter
    if (renterProfile?.email) {
      try {
        const hostName = hostProfile?.business_name || hostProfile?.display_name || hostProfile?.full_name || 'Host';
        const renterName = renterProfile.display_name || renterProfile.full_name || 'Renter';
        
        await supabaseClient.functions.invoke('send-deposit-notification', {
          body: {
            email: renterProfile.email,
            renterName,
            listingTitle: booking.listings?.title || 'Your Rental',
            bookingId: booking_id,
            startDate: booking.start_date,
            endDate: booking.end_date,
            originalDeposit: booking.deposit_amount,
            refundAmount,
            deductionAmount: booking.deposit_amount - refundAmount,
            refundType: refund_type,
            notes,
            hostName,
          },
        });
        logStep("Deposit notification email sent to renter");
      } catch (emailError) {
        logStep("Failed to send deposit notification email", { error: emailError });
      }
    } else {
      logStep("No email found for renter, skipping email notification");
    }

    return new Response(JSON.stringify({ 
      success: true,
      refund_amount: refundAmount,
      deposit_status: updateData.deposit_status,
      refund_id: refundId,
    }), {
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
