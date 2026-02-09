import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SET-HOLD] ${step}${detailsStr}`);
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

    const { booking_id, hold_until, reason, clear_hold } = await req.json();
    
    if (!booking_id) {
      throw new Error("booking_id is required");
    }

    // Fetch booking to validate it exists and get host info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('id, host_id, listing_id, payout_processed')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    if (booking.payout_processed) {
      throw new Error("Cannot set hold - payout already processed");
    }

    const now = new Date();

    if (clear_hold) {
      // Clear existing hold
      logStep("Clearing hold", { bookingId: booking_id, adminId: user.id });

      await supabaseClient
        .from('booking_requests')
        .update({
          payout_hold_until: null,
          payout_hold_reason: `Hold cleared by admin: ${reason || 'No reason provided'}`,
          payout_hold_set_by: user.id,
        })
        .eq('id', booking_id);

      // Notify host
      await supabaseClient.from('notifications').insert({
        user_id: booking.host_id,
        type: 'payout_hold_cleared',
        title: 'Payout Hold Cleared',
        message: 'The hold on your payout has been cleared. It will be processed in the next payout cycle.',
      });

      // Log the admin action
      await supabaseClient.from('admin_notes').insert({
        entity_type: 'booking',
        entity_id: booking_id,
        created_by: user.id,
        note: `Payout hold cleared. Reason: ${reason || 'Not specified'}`,
      });

      logStep("Hold cleared", { bookingId: booking_id });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Payout hold cleared successfully'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Set or extend hold
    if (!hold_until) {
      throw new Error("hold_until date is required when setting a hold");
    }

    if (!reason) {
      throw new Error("reason is required when setting a hold");
    }

    const holdUntilDate = new Date(hold_until);
    if (holdUntilDate <= now) {
      throw new Error("hold_until must be in the future");
    }

    logStep("Setting hold", { bookingId: booking_id, holdUntil: hold_until, adminId: user.id });

    await supabaseClient
      .from('booking_requests')
      .update({
        payout_hold_until: holdUntilDate.toISOString(),
        payout_hold_reason: reason,
        payout_hold_set_by: user.id,
      })
      .eq('id', booking_id);

    // Get listing title for notification
    const { data: listing } = await supabaseClient
      .from('listings')
      .select('title')
      .eq('id', booking.listing_id)
      .single();

    // Notify host about the hold
    await supabaseClient.from('notifications').insert({
      user_id: booking.host_id,
      type: 'payout_hold_set',
      title: 'Payout Temporarily Held',
      message: `Your payout for "${listing?.title || 'a booking'}" is on hold until ${holdUntilDate.toLocaleDateString()}. Reason: ${reason}`,
    });

    // Log the admin action
    await supabaseClient.from('admin_notes').insert({
      entity_type: 'booking',
      entity_id: booking_id,
      created_by: user.id,
      note: `Payout hold set until ${holdUntilDate.toISOString()}. Reason: ${reason}`,
    });

    logStep("Hold set", { bookingId: booking_id, holdUntil: holdUntilDate.toISOString() });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payout hold set successfully',
        hold_until: holdUntilDate.toISOString()
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
