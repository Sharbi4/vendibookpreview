import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESOLVE-DISPUTE] ${step}${detailsStr}`);
};

interface ResolveDisputeRequest {
  transaction_id: string;
  resolution: "refund_buyer" | "release_to_seller";
  admin_notes?: string;
}

// Helper to update Zendesk ticket when dispute is resolved
const updateZendeskTicket = async (
  transactionId: string,
  resolution: string,
  adminNotes: string | undefined,
  listingTitle: string,
  buyerName: string,
  sellerName: string
) => {
  const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
  const ZENDESK_SUBDOMAIN = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook1";
  const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";

  if (!ZENDESK_API_KEY) {
    logStep("Zendesk not configured, skipping ticket update");
    return;
  }

  try {
    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
    
    // Search for the dispute ticket by transaction ID
    const searchQuery = encodeURIComponent(`type:ticket subject:"${transactionId.slice(0, 8)}"`);
    const searchResponse = await fetch(
      `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=${searchQuery}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!searchResponse.ok) {
      logStep("Zendesk search failed", { status: searchResponse.status });
      return;
    }

    const searchData = await searchResponse.json();
    const disputeTickets = searchData.results?.filter((r: any) => 
      r.result_type === 'ticket' && 
      r.subject?.includes('[DISPUTE]') &&
      r.subject?.includes(transactionId.slice(0, 8))
    );

    if (!disputeTickets || disputeTickets.length === 0) {
      logStep("No matching Zendesk ticket found for dispute");
      return;
    }

    const ticketId = disputeTickets[0].id;
    const resolutionText = resolution === "refund_buyer" 
      ? "REFUND ISSUED TO BUYER - Full refund has been processed."
      : "PAYMENT RELEASED TO SELLER - Funds have been transferred to seller.";

    // Update the ticket with resolution
    const updatePayload = {
      ticket: {
        status: "solved",
        comment: {
          body: `DISPUTE RESOLVED\n\n` +
            `Resolution: ${resolutionText}\n\n` +
            `Transaction: ${transactionId}\n` +
            `Listing: ${listingTitle}\n` +
            `Buyer: ${buyerName}\n` +
            `Seller: ${sellerName}\n\n` +
            (adminNotes ? `Admin Notes: ${adminNotes}\n\n` : '') +
            `This ticket has been automatically resolved by the VendiBook dispute resolution system.`,
          public: false,
        },
        tags: ['dispute-resolved', resolution.replace('_', '-')],
      },
    };

    const updateResponse = await fetch(
      `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (updateResponse.ok) {
      logStep("Zendesk ticket resolved", { ticketId, resolution });
    } else {
      const errorText = await updateResponse.text();
      logStep("Zendesk ticket update failed", { status: updateResponse.status, error: errorText });
    }
  } catch (error) {
    logStep("Zendesk integration error", { error: String(error) });
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user and check if admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    
    if (!isAdmin) {
      logStep("User is not admin", { userId: user.id });
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transaction_id, resolution, admin_notes } = await req.json() as ResolveDisputeRequest;
    logStep("Resolving dispute", { transaction_id, resolution, admin_notes, admin_id: user.id });

    if (!transaction_id || !resolution) {
      return new Response(
        JSON.stringify({ error: "transaction_id and resolution are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["refund_buyer", "release_to_seller"].includes(resolution)) {
      return new Response(
        JSON.stringify({ error: "Invalid resolution. Must be 'refund_buyer' or 'release_to_seller'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the transaction with listing info
    const { data: transaction, error: txError } = await supabase
      .from("sale_transactions")
      .select("*, buyer:profiles!sale_transactions_buyer_id_fkey(email, full_name), seller:profiles!sale_transactions_seller_id_fkey(email, full_name, stripe_account_id), listing:listings!sale_transactions_listing_id_fkey(title)")
      .eq("id", transaction_id)
      .single();

    if (txError || !transaction) {
      logStep("Transaction not found", { error: txError?.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (transaction.status !== "disputed") {
      return new Response(
        JSON.stringify({ error: "Transaction is not in disputed status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transaction.payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "No payment intent found for this transaction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newStatus: string;
    let resultMessage: string;

    if (resolution === "refund_buyer") {
      // Refund the payment intent
      logStep("Refunding payment intent", { paymentIntentId: transaction.payment_intent_id });
      
      try {
        await stripe.refunds.create({
          payment_intent: transaction.payment_intent_id,
        });
        
        newStatus = "refunded";
        resultMessage = "Dispute resolved: Full refund issued to buyer";
        logStep("Refund successful");
      } catch (refundError: any) {
        logStep("Refund error", { error: refundError.message });
        return new Response(
          JSON.stringify({ error: `Refund failed: ${refundError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Release payment to seller
      if (!transaction.seller?.stripe_account_id) {
        return new Response(
          JSON.stringify({ error: "Seller has no connected Stripe account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("Creating transfer to seller", { stripeAccountId: transaction.seller.stripe_account_id });
      
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(transaction.seller_payout * 100),
          currency: "usd",
          destination: transaction.seller.stripe_account_id,
          transfer_group: `sale_${transaction.id}`,
          metadata: {
            transaction_id: transaction.id,
            dispute_resolution: "released_to_seller",
          },
        });

        newStatus = "completed";
        resultMessage = "Dispute resolved: Payment released to seller";
        logStep("Transfer successful", { transferId: transfer.id });

        // Update with transfer info
        await supabase
          .from("sale_transactions")
          .update({
            transfer_id: transfer.id,
            payout_completed_at: new Date().toISOString(),
          })
          .eq("id", transaction_id);
      } catch (transferError: any) {
        logStep("Transfer error", { error: transferError.message });
        return new Response(
          JSON.stringify({ error: `Transfer failed: ${transferError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update transaction status
    const disputeResolutionNote = admin_notes 
      ? `Dispute resolved by admin: ${resolution}. Notes: ${admin_notes}`
      : `Dispute resolved by admin: ${resolution}`;

    const { error: updateError } = await supabase
      .from("sale_transactions")
      .update({
        status: newStatus,
        message: disputeResolutionNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction_id);

    if (updateError) {
      logStep("Failed to update transaction", { error: updateError.message });
      return new Response(
        JSON.stringify({ error: "Failed to update transaction status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listingTitle = transaction.listing?.title || 'Unknown Item';
    const buyerName = transaction.buyer?.full_name || transaction.buyer_name || 'Unknown Buyer';
    const sellerName = transaction.seller?.full_name || 'Unknown Seller';

    // Update Zendesk ticket (fire and forget)
    updateZendeskTicket(
      transaction_id,
      resolution,
      admin_notes,
      listingTitle,
      buyerName,
      sellerName
    ).catch(err => logStep("Zendesk update failed", { error: String(err) }));

    // Send notification emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && transaction.buyer?.email && transaction.seller?.email) {
      try {
        const { Resend } = await import("https://esm.sh/resend@2.0.0");
        const resend = new Resend(resendApiKey);

        const resolutionText = resolution === "refund_buyer" 
          ? "A full refund has been issued to the buyer."
          : "The payment has been released to the seller.";

        // Email buyer
        await resend.emails.send({
          from: "VendiBook <noreply@vendibook.com>",
          to: transaction.buyer.email,
          subject: "Dispute Resolved - VendiBook",
          html: `
            <h2>Your Dispute Has Been Resolved</h2>
            <p>Hi ${transaction.buyer.full_name || "there"},</p>
            <p>Our team has reviewed your dispute and made a decision.</p>
            <p><strong>Resolution:</strong> ${resolutionText}</p>
            ${admin_notes ? `<p><strong>Admin Notes:</strong> ${admin_notes}</p>` : ""}
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The VendiBook Team</p>
          `,
        });

        // Email seller
        await resend.emails.send({
          from: "VendiBook <noreply@vendibook.com>",
          to: transaction.seller.email,
          subject: "Dispute Resolved - VendiBook",
          html: `
            <h2>A Dispute Has Been Resolved</h2>
            <p>Hi ${transaction.seller.full_name || "there"},</p>
            <p>Our team has reviewed the dispute on one of your transactions and made a decision.</p>
            <p><strong>Resolution:</strong> ${resolutionText}</p>
            ${admin_notes ? `<p><strong>Admin Notes:</strong> ${admin_notes}</p>` : ""}
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The VendiBook Team</p>
          `,
        });

        logStep("Notification emails sent");
      } catch (emailError) {
        logStep("Failed to send notification emails", { error: String(emailError) });
        // Don't fail the request if emails fail
      }
    }

    // Create in-app notifications for both parties
    await supabase.from("notifications").insert([
      {
        user_id: transaction.buyer_id,
        type: "dispute",
        title: "Dispute Resolved",
        message: resolution === "refund_buyer" 
          ? `Your dispute for "${listingTitle}" has been resolved. A full refund has been issued.`
          : `Your dispute for "${listingTitle}" has been resolved. Payment was released to the seller.`,
        link: "/dashboard",
      },
      {
        user_id: transaction.seller_id,
        type: "dispute",
        title: "Dispute Resolved",
        message: resolution === "refund_buyer" 
          ? `The dispute for "${listingTitle}" has been resolved. A refund was issued to the buyer.`
          : `The dispute for "${listingTitle}" has been resolved. Payment has been released to you.`,
        link: "/dashboard",
      },
    ]);
    logStep("In-app notifications created");

    logStep("Dispute resolved successfully", { transaction_id, resolution, newStatus });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: resultMessage,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message || String(error) });
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
