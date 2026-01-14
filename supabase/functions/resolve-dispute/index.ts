import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveDisputeRequest {
  transaction_id: string;
  resolution: "refund_buyer" | "release_to_seller";
  admin_notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    
    if (!isAdmin) {
      console.error("User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transaction_id, resolution, admin_notes } = await req.json() as ResolveDisputeRequest;
    console.log("Resolving dispute:", { transaction_id, resolution, admin_notes, admin_id: user.id });

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

    // Get the transaction
    const { data: transaction, error: txError } = await supabase
      .from("sale_transactions")
      .select("*, buyer:profiles!sale_transactions_buyer_id_fkey(email, full_name), seller:profiles!sale_transactions_seller_id_fkey(email, full_name, stripe_account_id)")
      .eq("id", transaction_id)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
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
      console.log("Refunding payment intent:", transaction.payment_intent_id);
      
      try {
        await stripe.refunds.create({
          payment_intent: transaction.payment_intent_id,
        });
        
        newStatus = "refunded";
        resultMessage = "Dispute resolved: Full refund issued to buyer";
        console.log("Refund successful");
      } catch (refundError: any) {
        console.error("Refund error:", refundError);
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

      console.log("Creating transfer to seller:", transaction.seller.stripe_account_id);
      
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
        console.log("Transfer successful:", transfer.id);

        // Update with transfer info
        await supabase
          .from("sale_transactions")
          .update({
            transfer_id: transfer.id,
            payout_completed_at: new Date().toISOString(),
          })
          .eq("id", transaction_id);
      } catch (transferError: any) {
        console.error("Transfer error:", transferError);
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
      console.error("Failed to update transaction:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update transaction status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

        console.log("Notification emails sent");
      } catch (emailError) {
        console.error("Failed to send notification emails:", emailError);
        // Don't fail the request if emails fail
      }
    }

    console.log("Dispute resolved successfully:", { transaction_id, resolution, newStatus });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: resultMessage,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error resolving dispute:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
