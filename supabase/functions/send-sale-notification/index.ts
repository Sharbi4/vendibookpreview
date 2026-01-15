import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SALE-NOTIFICATION] ${step}${detailsStr}`);
};

type NotificationType = 'payment_received' | 'buyer_confirmed' | 'seller_confirmed' | 'completed' | 'payout_failed' | 'payout_completed';

interface NotificationRequest {
  transaction_id: string;
  notification_type: NotificationType;
}

const getEmailContent = (
  type: NotificationType,
  role: 'buyer' | 'seller',
  data: {
    listingTitle: string;
    amount: number;
    sellerPayout: number;
    buyerName: string;
    sellerName: string;
    fulfillmentType: string;
  }
) => {
  const { listingTitle, amount, sellerPayout, buyerName, sellerName, fulfillmentType } = data;
  const fulfillmentLabel = fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup';

  const templates: Record<NotificationType, { buyer: { subject: string; html: string }; seller: { subject: string; html: string } }> = {
    payment_received: {
      buyer: {
        subject: `Payment Confirmed - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Payment Confirmed! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your payment of <strong>$${amount.toLocaleString()}</strong> for <strong>${listingTitle}</strong> has been received and is now held in escrow.
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; margin: 0 0 12px;">What's Next?</h3>
              <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Coordinate ${fulfillmentLabel.toLowerCase()} with the seller (${sellerName})</li>
                <li>Once you receive the item, confirm receipt in your dashboard</li>
                <li>Funds will be released to the seller after both parties confirm</li>
              </ul>
            </div>
            <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
              Your payment is protected by our escrow system until the transaction is complete.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `New Sale! Payment Received - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">You Made a Sale! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${buyerName}</strong> has purchased <strong>${listingTitle}</strong> for <strong>$${amount.toLocaleString()}</strong>.
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; margin: 0 0 12px;">Transaction Details</h3>
              <table style="width: 100%; color: #4a4a4a;">
                <tr><td style="padding: 8px 0;">Sale Amount:</td><td style="text-align: right;"><strong>$${amount.toLocaleString()}</strong></td></tr>
                <tr><td style="padding: 8px 0;">You'll Receive:</td><td style="text-align: right; color: #16a34a;"><strong>$${sellerPayout.toLocaleString()}</strong></td></tr>
                <tr><td style="padding: 8px 0;">Fulfillment:</td><td style="text-align: right;">${fulfillmentLabel}</td></tr>
              </table>
            </div>
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #92400e; margin: 0 0 12px;">Next Steps</h3>
              <ol style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Coordinate ${fulfillmentLabel.toLowerCase()} with the buyer</li>
                <li>After ${fulfillmentLabel.toLowerCase()}, confirm delivery in your dashboard</li>
                <li>Payment will be released once both parties confirm</li>
              </ol>
            </div>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
    buyer_confirmed: {
      buyer: {
        subject: `Receipt Confirmed - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Receipt Confirmed ✓</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              You've confirmed receipt of <strong>${listingTitle}</strong>. We're now waiting for the seller to confirm delivery.
            </p>
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #166534; margin: 0; font-size: 16px;">
                ✓ Your confirmation recorded<br>
                ⏳ Waiting for seller confirmation
              </p>
            </div>
            <p style="color: #6a6a6a; font-size: 14px;">
              Once the seller confirms, the transaction will be complete and funds will be released.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `Buyer Confirmed Receipt - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Buyer Confirmed Receipt! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${buyerName}</strong> has confirmed receipt of <strong>${listingTitle}</strong>.
            </p>
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
                Please confirm delivery in your dashboard to release payment!
              </p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px;">
              Once you confirm, <strong>$${sellerPayout.toLocaleString()}</strong> will be transferred to your account.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
    seller_confirmed: {
      buyer: {
        subject: `Seller Confirmed Delivery - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Seller Confirmed Delivery 📦</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              The seller has confirmed delivery of <strong>${listingTitle}</strong>.
            </p>
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
                Please confirm receipt in your dashboard to complete the transaction!
              </p>
            </div>
            <p style="color: #6a6a6a; font-size: 14px;">
              Once you confirm receipt, the funds will be released to the seller.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `Delivery Confirmed - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Delivery Confirmed ✓</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              You've confirmed delivery of <strong>${listingTitle}</strong>. We're now waiting for the buyer to confirm receipt.
            </p>
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #166534; margin: 0; font-size: 16px;">
                ✓ Your confirmation recorded<br>
                ⏳ Waiting for buyer confirmation
              </p>
            </div>
            <p style="color: #6a6a6a; font-size: 14px;">
              Once the buyer confirms receipt, <strong>$${sellerPayout.toLocaleString()}</strong> will be transferred to your account.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
    completed: {
      buyer: {
        subject: `Transaction Complete - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Transaction Complete! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your purchase of <strong>${listingTitle}</strong> is now complete. Both parties have confirmed the transaction.
            </p>
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #166534; margin: 0; font-size: 18px; font-weight: 600;">
                ✓ Transaction Completed Successfully
              </p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px;">
              Thank you for using Vendibook! We hope you enjoy your purchase.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `Payment Released - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Payment Released! 💰</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Great news! The transaction for <strong>${listingTitle}</strong> is complete and your payment has been released.
            </p>
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #166534; margin: 0;">
                <span style="font-size: 32px; font-weight: 700;">$${sellerPayout.toLocaleString()}</span><br>
                <span style="font-size: 14px;">has been transferred to your account</span>
              </p>
            </div>
            <p style="color: #6a6a6a; font-size: 14px;">
              Funds typically arrive in your bank account within 2-3 business days.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
    payout_failed: {
      buyer: {
        subject: `Transaction Issue - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Transaction Issue</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              There was an issue processing the payout for <strong>${listingTitle}</strong>. Our team is looking into this and will resolve it shortly.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `Payout Issue - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 24px;">Payout Issue</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              There was an issue transferring your payment of <strong>$${sellerPayout.toLocaleString()}</strong> for <strong>${listingTitle}</strong>.
            </p>
            <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="color: #991b1b; margin: 0;">
                Please ensure your Stripe account is properly set up. Our team will retry the transfer and contact you if needed.
              </p>
            </div>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
    payout_completed: {
      buyer: {
        subject: `Sale Complete - ${listingTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Transaction Complete! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your purchase of <strong>${listingTitle}</strong> is now fully complete. The seller has been paid.
            </p>
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="color: #166534; margin: 0; font-size: 18px; font-weight: 600;">
                ✓ Transaction Finalized
              </p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px;">
              Thank you for using Vendibook! We hope you enjoy your purchase.
            </p>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
      seller: {
        subject: `💰 Payout Sent - $${sellerPayout.toLocaleString()} on the way!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a; font-size: 24px; margin-bottom: 24px;">Your Payout is On Its Way! 💰</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Great news! Your payment for <strong>${listingTitle}</strong> has been successfully transferred to your bank account.
            </p>
            <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #86efac;">
              <p style="color: #166534; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Payout Amount</p>
              <p style="color: #15803d; margin: 0; font-size: 40px; font-weight: 700;">$${sellerPayout.toLocaleString()}</p>
              <p style="color: #166534; margin: 8px 0 0; font-size: 14px;">✓ Transfer initiated</p>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; margin: 0 0 12px; font-size: 16px;">📅 When will I receive my funds?</h3>
              <p style="color: #4a4a4a; margin: 0; font-size: 14px; line-height: 1.6;">
                Funds typically arrive in your bank account within <strong>2-3 business days</strong>, depending on your bank's processing times.
              </p>
            </div>
            <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                💡 <strong>Tip:</strong> You can view all your payouts and account activity in your Stripe dashboard.
              </p>
            </div>
            <p style="color: #4a4a4a; margin-top: 24px;">Best regards,<br><strong>The Vendibook Team</strong><br><a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a></p>
          </div>
        `,
      },
    },
  };

  return templates[type][role];
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

    const body: NotificationRequest = await req.json();
    const { transaction_id, notification_type } = body;

    logStep("Request received", { transaction_id, notification_type });

    if (!transaction_id || !notification_type) {
      throw new Error("Missing required fields");
    }

    // Fetch transaction with related data
    const { data: transaction, error: txError } = await supabaseClient
      .from('sale_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Fetch listing
    const { data: listing } = await supabaseClient
      .from('listings')
      .select('title')
      .eq('id', transaction.listing_id)
      .single();

    // Fetch buyer profile
    const { data: buyerProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', transaction.buyer_id)
      .single();

    // Fetch seller profile
    const { data: sellerProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', transaction.seller_id)
      .single();

    const buyerEmail = transaction.buyer_email || buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = transaction.buyer_name || buyerProfile?.full_name || 'Buyer';
    const sellerName = sellerProfile?.full_name || 'Seller';

    logStep("Fetched data", { 
      buyerEmail, 
      sellerEmail, 
      buyerName, 
      sellerName,
      listingTitle: listing?.title 
    });

    const emailData = {
      listingTitle: listing?.title || 'Item',
      amount: Number(transaction.amount),
      sellerPayout: Number(transaction.seller_payout),
      buyerName,
      sellerName,
      fulfillmentType: transaction.fulfillment_type || 'pickup',
    };

    const emailPromises = [];

    // Send to buyer
    if (buyerEmail) {
      const buyerContent = getEmailContent(notification_type, 'buyer', emailData);
      emailPromises.push(
        resend.emails.send({
          from: "VendiBook <noreply@updates.vendibook.com>",
          to: [buyerEmail],
          subject: buyerContent.subject,
          html: buyerContent.html,
        }).then(result => {
          logStep("Buyer email sent", { email: buyerEmail, result });
          return { role: 'buyer', success: true };
        }).catch(err => {
          logStep("Buyer email failed", { email: buyerEmail, error: err.message });
          return { role: 'buyer', success: false, error: err.message };
        })
      );
    }

    // Send to seller
    if (sellerEmail) {
      const sellerContent = getEmailContent(notification_type, 'seller', emailData);
      emailPromises.push(
        resend.emails.send({
          from: "VendiBook <noreply@updates.vendibook.com>",
          to: [sellerEmail],
          subject: sellerContent.subject,
          html: sellerContent.html,
        }).then(result => {
          logStep("Seller email sent", { email: sellerEmail, result });
          return { role: 'seller', success: true };
        }).catch(err => {
          logStep("Seller email failed", { email: sellerEmail, error: err.message });
          return { role: 'seller', success: false, error: err.message };
        })
      );
    }

    const results = await Promise.all(emailPromises);
    logStep("All emails processed", { results });

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});