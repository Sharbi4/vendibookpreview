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
  event_type: 'new_offer' | 'offer_accepted' | 'offer_declined' | 'counter_offer' | 'counter_accepted' | 'counter_declined';
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
            <td style="padding: 24px; text-align: center;">
              <a href="https://vendibook.com" style="display: inline-block; text-decoration: none;">
                <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="Vendibook" style="height: 56px;">
              </a>
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

    // Determine recipient based on event type
    const recipientIsSellerEvents = ['counter_accepted', 'counter_declined'];
    const recipientIsBuyerEvents = ['offer_accepted', 'offer_declined', 'counter_offer'];
    const recipientId = event_type === 'new_offer' ? seller.id : 
                        recipientIsSellerEvents.includes(event_type) ? seller.id : buyer.id;

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("sale_email")
      .eq("user_id", recipientId)
      .single();

    const shouldSendEmail = prefs?.sale_email !== false;

    let emailContent = "";
    let emailSubject = "";
    let recipientEmail = "";

    if (event_type === "new_offer") {
      recipientEmail = seller.email!;
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
      const agreedPrice = offer.counter_amount || offer.offer_amount;
      emailSubject = `🎉 Great news! Your offer was accepted`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">Your offer was accepted! 🎉</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          Congratulations! ${seller.full_name || "The seller"} has accepted your offer.
        </p>
        
        <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #10b981;">
          <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">${offer.listing.title}</h2>
          <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: bold;">
            Agreed Price: $${agreedPrice.toLocaleString()}
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
    } else if (event_type === "counter_offer") {
      recipientEmail = buyer.email!;
      emailSubject = `↔️ Counter-Offer: $${offer.counter_amount?.toLocaleString()} for ${offer.listing.title}`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">You've received a counter-offer!</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          ${seller.full_name || "The seller"} has responded with a counter-offer on your listing inquiry.
        </p>
        
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #3b82f6;">
          <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">${offer.listing.title}</h2>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Your Original Offer:</strong> <span style="text-decoration: line-through;">$${offer.offer_amount.toLocaleString()}</span>
          </p>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Counter-Offer:</strong> 
            <span style="color: #3b82f6; font-size: 20px; font-weight: bold;">$${offer.counter_amount?.toLocaleString()}</span>
          </p>
          ${offer.counter_message ? `
            <p style="margin: 16px 0 0; color: #666; font-size: 14px;">
              <strong>Seller's Message:</strong><br>
              <em>"${offer.counter_message}"</em>
            </p>
          ` : ""}
        </div>
        
        <p style="margin: 0 0 8px; color: #f59e0b; font-size: 14px;">
          ⏰ This counter-offer expires in 48 hours
        </p>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Review Counter-Offer
          </a>
        </div>
      `;
    } else if (event_type === "counter_accepted") {
      recipientEmail = seller.email!;
      emailSubject = `🎉 Your counter-offer was accepted!`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">Counter-offer accepted! 🎉</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          Great news! ${buyer.full_name || "The buyer"} has accepted your counter-offer.
        </p>
        
        <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #10b981;">
          <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">${offer.listing.title}</h2>
          <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: bold;">
            Agreed Price: $${offer.counter_amount?.toLocaleString()}
          </p>
        </div>
        
        <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.5;">
          The buyer will now complete their purchase. You'll receive a notification once payment is received.
        </p>
        
        <div style="text-align: center;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Dashboard
          </a>
        </div>
      `;
    } else if (event_type === "counter_declined") {
      recipientEmail = seller.email!;
      emailSubject = `Counter-offer declined for ${offer.listing.title}`;
      
      emailContent = `
        <h1 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">Counter-offer declined</h1>
        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
          ${buyer.full_name || "The buyer"} has declined your counter-offer on "${offer.listing.title}".
        </p>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Their Original Offer:</strong> $${offer.offer_amount.toLocaleString()}
          </p>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            <strong>Your Counter:</strong> $${offer.counter_amount?.toLocaleString()}
          </p>
        </div>
        
        <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.5;">
          Your listing is still active. Keep an eye out for new offers!
        </p>
        
        <div style="text-align: center;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Dashboard
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
