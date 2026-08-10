import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { refundPayment } from "../_shared/paymentOps.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveSaleTerms, formatTermsForEmail } from "../_shared/resolveSaleTerms.ts";


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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("is_admin", { user_id: user.id });
    
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
    const { data: transaction, error: txError } = await supabaseClient
      .from("sale_transactions")
      .select("*, buyer:profiles!sale_transactions_buyer_id_fkey(email, full_name), seller:profiles!sale_transactions_seller_id_fkey(email, full_name), listing:listings!sale_transactions_listing_id_fkey(title)")
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
      // Vendibook refunds through PayPal only.
      logStep("Refunding buyer", { paymentReference: transaction.payment_intent_id });

      const refund = await refundPayment({
        paymentReference: transaction.payment_intent_id,
        provider: (transaction as any).payment_provider,
        reason: "Dispute resolved in buyer's favor",
        idempotencyKey: `dispute-refund-${transaction.id}`,
      });

      if (!refund.success) {
        logStep("Refund not completed", { error: refund.error, manual: refund.manual });
        return new Response(
          JSON.stringify({ error: `Refund failed: ${refund.error}`, manual: refund.manual ?? false }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newStatus = "refunded";
      resultMessage = "Dispute resolved: Full refund issued to buyer";
      logStep("Refund successful", { id: refund.id, status: refund.status });
    } else {
      // Vendibook pays sellers manually: releasing a dispute marks the seller's
      // payable eligible so an administrator can settle it. No transfer API runs.
      logStep("Releasing seller payable for manual payout", { transactionId: transaction.id });

      const { error: payableError } = await supabaseClient
        .from("seller_payables")
        .update({
          payout_eligible_at: new Date().toISOString(),
          hold_reason: null,
        })
        .eq("seller_id", transaction.seller_id)
        .eq("listing_id", transaction.listing_id)
        .in("status", ["pending_release", "on_hold"]);

      if (payableError) {
        logStep("Warning: failed to release payable", { error: payableError.message });
      }

      newStatus = "completed";
      resultMessage = "Dispute resolved: Payment released to seller for payout";
    }

    // Update transaction status
    const disputeResolutionNote = admin_notes 
      ? `Dispute resolved by admin: ${resolution}. Notes: ${admin_notes}`
      : `Dispute resolved by admin: ${resolution}`;

    const { error: updateError } = await supabaseClient
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

    // Send notification emails via Lovable Emails (premium generic-notice template)
    if (transaction.buyer?.email && transaction.seller?.email) {
      const resolutionText = resolution === "refund_buyer"
        ? "A full refund has been issued to the buyer."
        : "The payment has been released to the seller.";
      const tone = resolution === "refund_buyer" ? "success" : "info";
      const dashboardUrl = "https://vendibook.com/dashboard";

      // Resolve the immutable terms snapshot the buyer/seller agreed
      // to at checkout. Rendered inline so both parties see the exact
      // pricing (and cancellation policy) the resolution acts on.
      const terms = await resolveSaleTerms(supabaseClient, transaction);
      const termsBlock = formatTermsForEmail(terms);
      if (terms) {
        logStep("Resolved agreed terms for resolution email", {
          terms_id: terms.id, via: terms.resolvedVia,
        });
      }

      const baseDetails: Array<{ label: string; value: string }> = [
        { label: "Listing", value: listingTitle },
      ];
      if (terms?.total_cents != null) {
        baseDetails.push({
          label: "Total agreed",
          value: `$${(Number(terms.total_cents) / 100).toFixed(2)}`,
        });
      }
      if (terms?.payment_method) {
        baseDetails.push({
          label: "Payment method",
          value: terms.payment_method.replace(/_/g, ' '),
        });
      }
      if (terms?.terms_version) {
        baseDetails.push({ label: "Terms version", value: terms.terms_version });
      }
      if (admin_notes) {
        baseDetails.push({ label: "Admin notes", value: admin_notes });
      }

      const send = async (to: string, name: string | undefined, audience: "buyer" | "seller") => {
        try {
          const paragraphs = [
            audience === "buyer"
              ? "Our team has reviewed your dispute and made a decision."
              : "Our team has reviewed the dispute on one of your transactions and made a decision.",
            resolutionText,
            ...(termsBlock ? [termsBlock] : []),
          ];
          const { error } = await supabaseClient.functions.invoke("send-transactional-email", {
            body: {
              templateName: "generic-notice",
              recipientEmail: to,
              idempotencyKey: `dispute-resolved-${transaction_id}-${audience}`,
              templateData: {
                preview: `Dispute resolved — ${listingTitle}`,
                kicker: "Dispute resolution",
                heading: audience === "buyer"
                  ? "Your dispute has been resolved"
                  : "A dispute has been resolved",
                greeting: `Hi ${name || "there"},`,
                paragraphs,
                details: baseDetails,
                alert: {
                  tone,
                  title: "Resolution",
                  body: resolutionText,
                },
                ctaLabel: "View dashboard",
                ctaUrl: dashboardUrl,
                footnote: "Questions? Email support@vendibook.com or call (725) 755-9598.",
              },
            },
          });
          if (error) throw error;
        } catch (e) {
          logStep("Failed to enqueue dispute email", { audience, error: String(e) });
        }
      };

      await send(transaction.buyer.email, transaction.buyer.full_name, "buyer");
      await send(transaction.seller.email, transaction.seller.full_name, "seller");
      logStep("Dispute resolution emails enqueued via Lovable Emails");

    }

    // Create in-app notifications for both parties
    await supabaseClient.from("notifications").insert([
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
