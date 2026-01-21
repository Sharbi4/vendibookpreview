import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface OfferNotificationRequest {
  offer_id: string;
  event_type: 'new_offer' | 'offer_accepted' | 'offer_declined';
}

const wrapEmailHtml = (content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendibook</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="Vendibook" height="32" style="height: 32px;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                © ${new Date().getFullYear()} Vendibook. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #999; font-size: 12px;">
                The Food Truck Marketplace
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offer_id, event_type }: OfferNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch offer with listing details
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(`
        *,
        listing:listings(id, title, cover_image_url, price_sale)
      `)
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) {
      throw new Error(`Offer not found: ${offerError?.message}`);
    }

    // Fetch seller and buyer profiles
    const { data: seller } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", offer.seller_id)
      .single();

    const { data: buyer } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", offer.buyer_id)
      .single();

    if (!seller || !buyer) {
      throw new Error("Could not find seller or buyer profile");
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("sale_email")
      .eq("user_id", event_type === 'new_offer' ? seller.id : buyer.id)
      .single();

    const shouldSendEmail = prefs?.sale_email !== false;

    let emailContent = "";
    let emailSubject = "";
    let recipientEmail = "";
    let recipientName = "";

    if (event_type === "new_offer") {
      recipientEmail = seller.email!;
      recipientName = seller.full_name || "Seller";
      emailSubject = `💰 New Offer Received: $${offer.offer_amount.toLocaleString()}`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">You've received a new offer!</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          ${buyer.full_name || "A buyer"} has made an offer on your listing.
        </p>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">${offer.listing.title}</h2>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Offer Amount:</strong> 
            <span style="color: #10b981; font-size: 20px; font-weight: bold;">$${offer.offer_amount.toLocaleString()}</span>
          </p>
          ${offer.listing.price_sale ? `
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
              <strong>Your Asking Price:</strong> $${offer.listing.price_sale.toLocaleString()}
            </p>
          ` : ""}
          ${offer.message ? `
            <p style="margin: 16px 0 0; color: #666; font-size: 14px;">
              <strong>Buyer's Message:</strong><br>
              <em>"${offer.message}"</em>
            </p>
          ` : ""}
        </div>
        
        <p style="margin: 0 0 8px; color: #f59e0b; font-size: 14px;">
          ⏰ This offer expires in 48 hours
        </p>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Review Offer
          </a>
        </div>
      `;
    } else if (event_type === "offer_accepted") {
      recipientEmail = buyer.email!;
      recipientName = buyer.full_name || "Buyer";
      emailSubject = `🎉 Great news! Your offer was accepted`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">Your offer was accepted! 🎉</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          Congratulations! ${seller.full_name || "The seller"} has accepted your offer.
        </p>
        
        <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #10b981;">
          <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">${offer.listing.title}</h2>
          <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: bold;">
            Agreed Price: $${offer.offer_amount.toLocaleString()}
          </p>
        </div>
        
        <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.5;">
          Complete your purchase now to secure this deal.
        </p>
        
        <div style="text-align: center;">
          <a href="https://vendibookpreview.lovable.app/checkout/${offer.listing_id}" 
             style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Complete Purchase
          </a>
        </div>
      `;
    } else if (event_type === "offer_declined") {
      recipientEmail = buyer.email!;
      recipientName = buyer.full_name || "Buyer";
      emailSubject = `Update on your offer for ${offer.listing.title}`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">Your offer was declined</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          Unfortunately, ${seller.full_name || "the seller"} has declined your offer on "${offer.listing.title}".
        </p>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Your Offer:</strong> $${offer.offer_amount.toLocaleString()}
          </p>
          ${offer.seller_response ? `
            <p style="margin: 16px 0 0; color: #666; font-size: 14px;">
              <strong>Seller's Response:</strong><br>
              <em>"${offer.seller_response}"</em>
            </p>
          ` : ""}
        </div>
        
        <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.5;">
          Don't give up! You can still submit a new offer or browse other listings.
        </p>
        
        <div style="text-align: center;">
          <a href="https://vendibookpreview.lovable.app/listing/${offer.listing_id}" 
             style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Listing
          </a>
        </div>
      `;
    }

    // Send email if preferences allow
    if (shouldSendEmail && recipientEmail) {
      await resend.emails.send({
        from: "Vendibook <notifications@vendibook.com>",
        to: [recipientEmail],
        subject: emailSubject,
        html: wrapEmailHtml(emailContent),
      });
      console.log(`Email sent to ${recipientEmail} for event: ${event_type}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: shouldSendEmail && !!recipientEmail 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-offer-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
