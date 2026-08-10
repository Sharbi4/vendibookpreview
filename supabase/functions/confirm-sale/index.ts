import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-SALE] ${step}${detailsStr}`);
};

interface ConfirmRequest {
  transaction_id: string;
  role: 'buyer' | 'seller';
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body: ConfirmRequest = await req.json();
    const { transaction_id, role } = body;
    
    logStep("Request received", { transaction_id, role });

    if (!transaction_id || !role) {
      throw new Error("Missing required fields: transaction_id or role");
    }

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('sale_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }
    logStep("Transaction found", { status: transaction.status, buyer_id: transaction.buyer_id, seller_id: transaction.seller_id });

    // Verify user is authorized
    if (role === 'buyer' && transaction.buyer_id !== user.id) {
      throw new Error("Not authorized to confirm as buyer");
    }
    if (role === 'seller' && transaction.seller_id !== user.id) {
      throw new Error("Not authorized to confirm as seller");
    }

    // Check if already confirmed by this party
    if (role === 'buyer' && transaction.buyer_confirmed_at) {
      throw new Error("Buyer has already confirmed");
    }
    if (role === 'seller' && transaction.seller_confirmed_at) {
      throw new Error("Seller has already confirmed");
    }

    // Valid statuses for confirmation. `pending_cash` is included so Pay-in-Person
    // (cash) sales can also progress through this function; they never enter the
    // 'paid' state because no online payment was collected.
    const validStatuses = ['pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed'];
    if (!validStatuses.includes(transaction.status)) {
      throw new Error(`Cannot confirm transaction with status: ${transaction.status}`);
    }

    // Determine new status
    let newStatus: string;
    const otherPartyConfirmed = role === 'buyer' 
      ? transaction.seller_confirmed_at !== null
      : transaction.buyer_confirmed_at !== null;

    if (otherPartyConfirmed) {
      // Both parties confirmed - ready for payout
      newStatus = 'completed';
    } else {
      // Only one party confirmed
      newStatus = role === 'buyer' ? 'buyer_confirmed' : 'seller_confirmed';
    }

    logStep("Updating transaction status", { 
      currentStatus: transaction.status, 
      newStatus,
      otherPartyConfirmed 
    });

    // Update transaction
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };
    
    if (role === 'buyer') {
      updateData.buyer_confirmed_at = new Date().toISOString();
    } else {
      updateData.seller_confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from('sale_transactions')
      .update(updateData)
      .eq('id', transaction_id);

    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    // If both parties confirmed, the seller's proceeds become eligible for
    // release. Vendibook settles seller payouts manually: we only flip the
    // payable to eligible and notify the seller — no automated transfer runs.
    // Cash / Pay-in-Person sales settle off-platform and have no payable.
    const isCashSale = !transaction.payment_intent_id;

    if (newStatus === 'completed' && !isCashSale) {
      logStep("Both parties confirmed - releasing payable for manual payout");

      const nowIso = new Date().toISOString();

      const { error: payableError } = await supabaseClient
        .from('seller_payables')
        .update({ payout_eligible_at: nowIso })
        .eq('seller_id', transaction.seller_id)
        .eq('listing_id', transaction.listing_id)
        .eq('status', 'pending_release');

      if (payableError) {
        logStep("Warning: failed to mark payable eligible", { error: payableError.message });
      }

      await supabaseClient
        .from('sale_transactions')
        .update({
          status: 'completed',
          message: 'Both parties confirmed. Your payout is queued for release by our team.',
        })
        .eq('id', transaction_id);

      // Let the seller know their proceeds are queued.
      const supabaseUrlForPayout = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKeyForPayout = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrlForPayout}/functions/v1/send-sale-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKeyForPayout}`,
          },
          body: JSON.stringify({
            transaction_id: transaction_id,
            notification_type: 'payout_completed',
          }),
        })
          .then((res) => logStep("Payout notification sent", { status: res.status }))
          .catch((err) => logStep("Payout notification failed", { error: err.message })),
      );
    }

    // Send notification email (background task)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const notificationType = newStatus === 'completed' 
      ? 'completed' 
      : (role === 'buyer' ? 'buyer_confirmed' : 'seller_confirmed');

    // Send email notification
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/send-sale-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          transaction_id: transaction_id,
          notification_type: notificationType,
        }),
      }).then(res => {
        logStep("Email notification sent", { status: res.status, type: notificationType });
      }).catch(err => {
        logStep("Email notification failed", { error: err.message });
      })
    );

    // Fetch listing title for notification message
    const { data: listingData } = await supabaseClient
      .from('listings')
      .select('title')
      .eq('id', transaction.listing_id)
      .single();
    
    const listingTitle = listingData?.title || 'your item';

    // Send in-app notifications based on status
    if (role === 'buyer') {
      // Buyer confirmed - notify seller
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/create-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            user_id: transaction.seller_id,
            type: 'sale_confirmed',
            title: 'Buyer confirmed receipt',
            message: `The buyer has confirmed receipt of "${listingTitle}". ${newStatus === 'completed' ? 'Funds have been released to your account!' : 'Please confirm the handoff to release funds.'}`,
            link: '/dashboard?tab=sales',
            send_email: false, // Email already sent via send-sale-notification
          }),
        }).then(res => {
          logStep("In-app notification sent to seller", { status: res.status });
        }).catch(err => {
          logStep("In-app notification to seller failed", { error: err.message });
        })
      );
    } else {
      // Seller confirmed - notify buyer
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/create-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            user_id: transaction.buyer_id,
            type: 'sale_confirmed',
            title: 'Seller confirmed handoff',
            message: `The seller has confirmed handoff of "${listingTitle}". ${newStatus === 'completed' ? 'Transaction complete!' : 'Please confirm receipt to release funds.'}`,
            link: '/dashboard?tab=purchases',
            send_email: false, // Email already sent via send-sale-notification
          }),
        }).then(res => {
          logStep("In-app notification sent to buyer", { status: res.status });
        }).catch(err => {
          logStep("In-app notification to buyer failed", { error: err.message });
        })
      );
    }

    // If completed, send completion notifications to both parties
    if (newStatus === 'completed') {
      // Notify both parties that transaction is complete
      EdgeRuntime.waitUntil(
        Promise.all([
          fetch(`${supabaseUrl}/functions/v1/create-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              user_id: transaction.buyer_id,
              type: 'sale',
              title: 'Transaction complete!',
              message: `Your purchase of "${listingTitle}" is complete. Thank you for using VendiBook!`,
              link: '/dashboard?tab=purchases',
              send_email: false,
            }),
          }),
          fetch(`${supabaseUrl}/functions/v1/create-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              user_id: transaction.seller_id,
              type: 'sale',
              title: 'Sale complete - Funds released!',
              message: `Your sale of "${listingTitle}" is complete. Funds have been released to your account!`,
              link: '/dashboard?tab=sales',
              send_email: false,
            }),
          }),
        ]).then(() => {
          logStep("Completion in-app notifications sent to both parties");
        }).catch(err => {
          logStep("Completion in-app notifications failed", { error: err.message });
        })
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: newStatus,
        message: newStatus === 'completed' 
          ? 'Sale completed! Funds have been released to the seller.'
          : `${role === 'buyer' ? 'Buyer' : 'Seller'} confirmation recorded. Waiting for ${role === 'buyer' ? 'seller' : 'buyer'} confirmation.`,
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
