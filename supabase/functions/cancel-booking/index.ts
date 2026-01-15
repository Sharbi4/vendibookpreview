import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-BOOKING] ${step}${detailsStr}`);
};

interface CancelRequest {
  booking_id: string;
  cancellation_reason?: string;
  process_refund?: boolean; // Default true if booking is paid
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

    const body: CancelRequest = await req.json();
    const { 
      booking_id, 
      cancellation_reason,
      process_refund = true,
    } = body;
    
    logStep("Request received", { booking_id, cancellation_reason, process_refund });

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
      status: booking.status,
      payment_status: booking.payment_status 
    });

    // Determine user role
    const isShopper = user.id === booking.shopper_id;
    const isHost = user.id === booking.host_id;
    
    // Check for admin role
    const { data: adminCheck } = await supabaseClient
      .rpc('is_admin', { user_id: user.id });
    const isAdmin = adminCheck === true;

    if (!isShopper && !isHost && !isAdmin) {
      throw new Error("Not authorized to cancel this booking");
    }

    const initiatedBy = isAdmin ? 'admin' : (isHost ? 'host' : 'shopper');
    logStep("Authorization verified", { isShopper, isHost, isAdmin, initiatedBy });

    // Validate booking can be cancelled
    if (booking.status === 'cancelled') {
      throw new Error("Booking is already cancelled");
    }

    if (booking.status === 'completed') {
      throw new Error("Cannot cancel a completed booking");
    }

    // Shoppers can only cancel pending bookings (not yet approved)
    // Hosts and admins can cancel any non-completed booking
    if (isShopper && !isAdmin && booking.status !== 'pending') {
      throw new Error("Shoppers can only cancel pending booking requests. Please contact the host to cancel an approved booking.");
    }

    let refundResult = null;
    const isPaid = booking.payment_status === 'paid';

    // Process refund if booking is paid
    if (isPaid && process_refund && booking.payment_intent_id) {
      logStep("Processing refund for paid booking");
      
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.payment_intent_id,
          reason: 'requested_by_customer',
          metadata: {
            booking_id,
            initiated_by: initiatedBy,
            cancellation_reason: cancellation_reason || '',
          },
        });
        
        refundResult = {
          refund_id: refund.id,
          refund_status: refund.status,
          refund_amount: refund.amount / 100,
        };
        
        logStep("Refund processed", refundResult);
      } catch (refundError) {
        logStep("ERROR: Refund failed", { error: String(refundError) });
        // Still proceed with cancellation but note refund failed
        refundResult = { error: String(refundError) };
      }
    }

    // Update booking status
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
    };

    if (refundResult && !('error' in refundResult)) {
      updateData.payment_status = 'refunded';
    }

    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update(updateData)
      .eq('id', booking_id);

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    logStep("Booking cancelled", { booking_id });

    // Get profiles for notifications
    const { data: shopperProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.shopper_id)
      .single();

    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.host_id)
      .single();

    // Send cancellation/refund notifications
    const notifyPayload = {
      bookingId: booking_id,
      listingTitle: booking.listings?.title || "Booking",
      refundAmount: refundResult && !('error' in refundResult) ? refundResult.refund_amount : 0,
      reason: cancellation_reason || "Booking cancelled",
      initiatedBy,
    };

    // Notify shopper
    if (shopperProfile?.email) {
      try {
        if (refundResult && !('error' in refundResult)) {
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
                ...notifyPayload,
                recipientType: 'shopper',
              }),
            }
          );
        } else {
          // Send booking notification for non-paid cancellations
          await supabaseClient.functions.invoke('send-booking-notification', {
            body: { 
              booking_id, 
              event_type: 'cancelled',
              cancellation_reason,
            },
          });
        }
        logStep("Notification sent to shopper");
      } catch (emailError) {
        logStep("WARNING: Failed to send shopper notification", { error: String(emailError) });
      }
    }

    // Notify host (if cancelled by shopper or admin)
    if (hostProfile?.email && initiatedBy !== 'host') {
      try {
        if (refundResult && !('error' in refundResult)) {
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
                ...notifyPayload,
                recipientType: 'host',
              }),
            }
          );
        }
        logStep("Notification sent to host");
      } catch (emailError) {
        logStep("WARNING: Failed to send host notification", { error: String(emailError) });
      }
    }

    // Create in-app notifications
    const notificationPromises = [];

    // Notify shopper (if not initiated by shopper)
    if (initiatedBy !== 'shopper') {
      notificationPromises.push(
        supabaseClient.from('notifications').insert({
          user_id: booking.shopper_id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking for "${booking.listings?.title || 'listing'}" has been cancelled${isPaid && refundResult && !('error' in refundResult) ? '. A refund has been processed.' : '.'}`,
          link: '/dashboard',
        })
      );
    }

    // Notify host (if not initiated by host)
    if (initiatedBy !== 'host') {
      notificationPromises.push(
        supabaseClient.from('notifications').insert({
          user_id: booking.host_id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `A booking for "${booking.listings?.title || 'listing'}" has been cancelled by the guest.`,
          link: '/dashboard',
        })
      );
    }

    await Promise.allSettled(notificationPromises);
    logStep("In-app notifications created");

    return new Response(
      JSON.stringify({
        success: true,
        booking_id,
        status: 'cancelled',
        payment_status: refundResult && !('error' in refundResult) ? 'refunded' : booking.payment_status,
        refund: refundResult,
        initiated_by: initiatedBy,
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
