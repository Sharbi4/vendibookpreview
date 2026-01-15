import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // Send email notifications
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const listingTitle = listing?.title || 'Item';
    const buyerEmail = transaction.buyer_email || buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = transaction.buyer_name || buyerProfile?.full_name || 'Buyer';
    const sellerName = sellerProfile?.full_name || 'Seller';
    const disputeRaiser = isBuyer ? buyerName : sellerName;
    const otherParty = isBuyer ? sellerName : buyerName;
    const otherPartyId = isBuyer ? transaction.seller_id : transaction.buyer_id;

    // Create in-app notification for the other party
    await supabaseClient.from("notifications").insert({
      user_id: otherPartyId,
      type: "dispute",
      title: "Dispute Raised",
      message: `${disputeRaiser} raised a dispute for ${listingTitle}: "${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}"`,
      link: "/dashboard",
    });
    logStep("In-app notification created for other party");

    const emailPromises = [];

    // Email to the person who raised the dispute
    const raiserEmail = isBuyer ? buyerEmail : sellerEmail;
    if (raiserEmail) {
      emailPromises.push(
        resend.emails.send({
          from: "Vendibook <updates@vendibook.com>",
          to: [raiserEmail],
          subject: `Dispute Submitted - ${listingTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Dispute Submitted</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your dispute for <strong>${listingTitle}</strong> has been submitted and is under review.
              </p>
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #92400e; margin: 0 0 12px;">Your Reason</h3>
                <p style="color: #78350f; margin: 0;">${reason}</p>
              </div>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 12px;">What Happens Next?</h3>
                <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Payment will remain in escrow until the dispute is resolved</li>
                  <li>We've notified ${otherParty} about this dispute</li>
                  <li>Our team will review and may contact both parties</li>
                  <li>Resolution typically takes 3-5 business days</li>
                </ul>
              </div>
              <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong></p>
            </div>
          `,
        }).catch(err => logStep("Raiser email failed", { error: err.message }))
      );
    }

    // Email to the other party
    const otherEmail = isBuyer ? sellerEmail : buyerEmail;
    if (otherEmail) {
      emailPromises.push(
        resend.emails.send({
          from: "Vendibook <updates@vendibook.com>",
          to: [otherEmail],
          subject: `Dispute Raised - ${listingTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 24px;">Dispute Raised</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${disputeRaiser}</strong> has raised a dispute for the transaction involving <strong>${listingTitle}</strong>.
              </p>
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #991b1b; margin: 0 0 12px;">Dispute Reason</h3>
                <p style="color: #7f1d1d; margin: 0;">${reason}</p>
              </div>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 12px;">What This Means</h3>
                <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Payment is now held pending dispute resolution</li>
                  <li>No funds will be released until this is resolved</li>
                  <li>Our team may contact you for more information</li>
                  <li>You can respond via your dashboard or by contacting support</li>
                </ul>
              </div>
              <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong></p>
            </div>
          `,
        }).catch(err => logStep("Other party email failed", { error: err.message }))
      );
    }

    // Send admin notification
    emailPromises.push(
      resend.emails.send({
        from: "Vendibook <updates@vendibook.com>",
        to: ["support@vendibook.com"],
        subject: `[ACTION REQUIRED] New Dispute - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 24px;">New Dispute Requires Attention</h1>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; color: #4a4a4a;">
                <tr><td style="padding: 8px 0; font-weight: 600;">Transaction ID:</td><td>${transaction_id}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: 600;">Listing:</td><td>${listingTitle}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: 600;">Raised By:</td><td>${disputeRaiser} (${role})</td></tr>
                <tr><td style="padding: 8px 0; font-weight: 600;">Amount:</td><td>$${Number(transaction.amount).toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: 600;">Seller Payout:</td><td>$${Number(transaction.seller_payout).toLocaleString()}</td></tr>
              </table>
            </div>
            <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #991b1b; margin: 0 0 12px;">Dispute Reason</h3>
              <p style="color: #7f1d1d; margin: 0;">${reason}</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; margin: 0 0 12px;">Parties</h3>
              <p style="margin: 8px 0;"><strong>Buyer:</strong> ${buyerName} (${buyerEmail || 'No email'})</p>
              <p style="margin: 8px 0;"><strong>Seller:</strong> ${sellerName} (${sellerEmail || 'No email'})</p>
            </div>
          </div>
        `,
      }).catch(err => logStep("Admin email failed", { error: err.message }))
    );

    // Create Zendesk ticket for the dispute
    emailPromises.push(
      fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-zendesk-ticket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            requester_name: disputeRaiser,
            requester_email: raiserEmail || 'unknown@vendibook.com',
            subject: `[DISPUTE] ${listingTitle} - Transaction ${transaction_id.slice(0, 8)}`,
            description: `A dispute has been raised for a VendiBook transaction.\n\n` +
              `TRANSACTION DETAILS:\n` +
              `- Transaction ID: ${transaction_id}\n` +
              `- Listing: ${listingTitle}\n` +
              `- Amount: $${Number(transaction.amount).toLocaleString()}\n` +
              `- Seller Payout: $${Number(transaction.seller_payout).toLocaleString()}\n\n` +
              `PARTIES:\n` +
              `- Buyer: ${buyerName} (${buyerEmail || 'No email'})\n` +
              `- Seller: ${sellerName} (${sellerEmail || 'No email'})\n\n` +
              `DISPUTE RAISED BY: ${disputeRaiser} (${role})\n\n` +
              `REASON:\n${reason}`,
            priority: 'urgent',
            type: 'problem',
            tags: ['vendibook', 'dispute', 'escrow', `${role}-dispute`],
          }),
        }
      ).then(async (res) => {
        if (res.ok) {
          const result = await res.json();
          logStep("Zendesk dispute ticket created", { ticketId: result.ticket_id });
        } else {
          const errorData = await res.json();
          logStep("Zendesk ticket creation failed", { error: errorData });
        }
      }).catch(err => logStep("Zendesk integration error", { error: err.message }))
    );

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