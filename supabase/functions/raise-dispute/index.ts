import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveSaleTerms, formatTermsForEmail } from "../_shared/resolveSaleTerms.ts";



declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RAISE-DISPUTE] ${step}${detailsStr}`);
};

interface DisputeRequest {
  transaction_id: string;
  reason: string;
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

    const body: DisputeRequest = await req.json();
    const { transaction_id, reason } = body;
    
    logStep("Request received", { transaction_id, reason: reason?.substring(0, 50) });

    if (!transaction_id || !reason) {
      throw new Error("Missing required fields: transaction_id or reason");
    }

    if (reason.length < 10) {
      throw new Error("Please provide a more detailed reason (at least 10 characters)");
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

    // Verify user is buyer or seller
    const isBuyer = transaction.buyer_id === user.id;
    const isSeller = transaction.seller_id === user.id;
    
    if (!isBuyer && !isSeller) {
      throw new Error("Not authorized to dispute this transaction");
    }

    const role = isBuyer ? 'buyer' : 'seller';

    // Check if transaction can be disputed
    const disputeableStatuses = ['paid', 'buyer_confirmed', 'seller_confirmed'];
    if (!disputeableStatuses.includes(transaction.status)) {
      throw new Error(`Cannot dispute transaction with status: ${transaction.status}`);
    }

    // Update transaction to disputed
    const disputeMessage = `[${role.toUpperCase()} DISPUTE] ${reason}`;
    
    const { error: updateError } = await supabaseClient
      .from('sale_transactions')
      .update({ 
        status: 'disputed',
        message: disputeMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction_id);

    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    logStep("Transaction disputed", { role, transactionId: transaction_id });

    // Fetch listing, buyer, and seller info for email
    const { data: listing } = await supabaseClient
      .from('listings')
      .select('title')
      .eq('id', transaction.listing_id)
      .single();

    const { data: buyerProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', transaction.buyer_id)
      .single();

    const { data: sellerProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', transaction.seller_id)
      .single();

    // Send email notifications via Lovable Email
    const listingTitle = listing?.title || 'Item';
    const buyerEmail = transaction.buyer_email || buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = transaction.buyer_name || buyerProfile?.full_name || 'Buyer';
    const sellerName = sellerProfile?.full_name || 'Seller';
    const disputeRaiser = isBuyer ? buyerName : sellerName;
    const otherParty = isBuyer ? sellerName : buyerName;
    const otherPartyId = isBuyer ? transaction.seller_id : transaction.buyer_id;

    // In-app notification for the other party
    await supabaseClient.from("notifications").insert({
      user_id: otherPartyId,
      type: "dispute",
      title: "Dispute Raised",
      message: `${disputeRaiser} raised a dispute for ${listingTitle}: "${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}"`,
      link: "/dashboard",
    });
    logStep("In-app notification created for other party");

    const emailPromises: Promise<any>[] = [];
    const raiserEmail = isBuyer ? buyerEmail : sellerEmail;
    const otherEmail = isBuyer ? sellerEmail : buyerEmail;

    // Resolve the immutable terms snapshot for this sale (primary
    // lookup by sale.terms_id, fallback by sale_transaction_id). Both
    // parties + admin will see the same numbers they agreed to.
    const terms = await resolveSaleTerms(supabaseClient, transaction);
    const termsBlock = formatTermsForEmail(terms);
    if (terms) {
      logStep("Resolved agreed terms", { terms_id: terms.id, via: terms.resolvedVia });
    } else {
      logStep("No agreed terms snapshot found for sale");
    }

    // The support-reply template renders `firstName` + `bodyParagraphs`
    // (previous version passed `name`/`message`, which the template
    // ignored — leaving the body blank). Fixed while we're here so the
    // agreed-terms block actually reaches the recipient.
    const raiserParagraphs = [
      `Your dispute for ${listingTitle} has been submitted and is under review.`,
      `Your reason: ${reason}`,
      `Payment will remain in escrow until the dispute is resolved. We've notified ${otherParty} and our team will review within 3–5 business days.`,
      ...(termsBlock ? [termsBlock] : []),
    ];

    if (raiserEmail) {
      emailPromises.push(
        supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "support-reply",
            recipientEmail: raiserEmail,
            idempotencyKey: `dispute-raiser-${transaction_id}`,
            templateData: {
              firstName: disputeRaiser?.split(' ')[0],
              subject: `Dispute Submitted - ${listingTitle}`,
              bodyParagraphs: raiserParagraphs,
            },
          },
        }).catch(err => logStep("Raiser email failed", { error: err.message }))
      );
    }

    const otherParagraphs = [
      `${disputeRaiser} has raised a dispute for the transaction involving ${listingTitle}.`,
      `Reason: ${reason}`,
      `Payment is now held pending resolution. Our team may contact you for more information.`,
      ...(termsBlock ? [termsBlock] : []),
    ];

    if (otherEmail) {
      emailPromises.push(
        supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "support-reply",
            recipientEmail: otherEmail,
            idempotencyKey: `dispute-other-${transaction_id}`,
            templateData: {
              firstName: otherParty?.split(' ')[0],
              subject: `Dispute Raised - ${listingTitle}`,
              bodyParagraphs: otherParagraphs,
            },
          },
        }).catch(err => logStep("Other party email failed", { error: err.message }))
      );
    }

    // Admin notification (forwarded silently to owner too)
    const adminParagraphs = [
      `Transaction: ${transaction_id}`,
      `Listing: ${listingTitle}`,
      `Raised by: ${disputeRaiser} (${role})`,
      `Amount: $${Number(transaction.amount).toLocaleString()}`,
      `Seller payout: $${Number(transaction.seller_payout).toLocaleString()}`,
      `Buyer: ${buyerName} (${buyerEmail || 'no email'})`,
      `Seller: ${sellerName} (${sellerEmail || 'no email'})`,
      `Reason: ${reason}`,
      ...(termsBlock ? [termsBlock] : ['(No transaction_terms snapshot linked to this sale.)']),
    ];

    for (const adminTo of ["support@vendibook.com"]) {
      emailPromises.push(
        supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "support-reply",
            recipientEmail: adminTo,
            idempotencyKey: `dispute-admin-${transaction_id}-${adminTo}`,
            templateData: {
              firstName: "Vendibook Support",
              subject: `[ACTION REQUIRED] New Dispute - ${listingTitle}`,
              bodyParagraphs: adminParagraphs,
            },
          },
        }).catch(err => logStep("Admin email failed", { error: err.message, adminTo }))
      );
    }



    // Zendesk ticket creation removed — dispute is already emailed to support above


    // Wait for emails in background
    EdgeRuntime.waitUntil(Promise.all(emailPromises));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Dispute submitted successfully. Our team will review it shortly.",
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