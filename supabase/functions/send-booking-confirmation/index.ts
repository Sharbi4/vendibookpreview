import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  email: string;
  fullName: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  hostName: string;
  fulfillmentType: string;
  address?: string;
  deliveryAddress?: string;
  bookingId: string;
  depositAmount?: number;
  platformFee?: number;
  rentalSubtotal?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-confirmation function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      fullName, 
      listingTitle,
      startDate,
      endDate,
      totalPrice,
      hostName,
      fulfillmentType,
      address,
      deliveryAddress,
      bookingId,
      depositAmount = 0,
      platformFee = 0,
      rentalSubtotal = 0,
    }: BookingConfirmationRequest = await req.json();

    console.log(`Sending booking confirmation to: ${email}, booking: ${bookingId}`);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always use production domain
    const siteUrl = "https://vendibook.com";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;

    // Create short booking reference ID (first 8 chars uppercase)
    const bookingRef = bookingId.substring(0, 8).toUpperCase();

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const fulfillmentLabel = fulfillmentType === 'delivery' ? 'Delivery' : 
                            fulfillmentType === 'pickup' ? 'Pickup' : 
                            fulfillmentType === 'on_site' ? 'On-Site Access' : 'Pickup/Delivery';

    const locationInfo = fulfillmentType === 'delivery' && deliveryAddress 
      ? `<strong>Delivery Address:</strong> ${deliveryAddress}`
      : address 
        ? `<strong>Location:</strong> ${address}`
        : '';

    // Calculate total due with deposit
    const totalDue = totalPrice + depositAmount;
    const hasDeposit = depositAmount > 0;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @font-face {
              font-family: 'Sofia Pro Soft';
              src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
              font-weight: 300;
              font-style: normal;
            }
          </style>
        </head>
        <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-block; background-color: #ffffff; padding: 16px 24px; border-radius: 12px; margin-bottom: 16px;">
                <img src="${logoUrl}" alt="VendiBook" style="max-width: 360px; height: auto;" />
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content Card -->
            <div style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Action Required Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  💳 Payment Required
                </span>
              </div>

              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
                Your Booking Has Been Approved! 🎉
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Hi ${fullName || 'there'}, great news! <strong>${hostName}</strong> approved your booking request. 
                <strong>Complete your payment to confirm the booking.</strong>
              </p>
              
              <!-- Booking Details Card -->
              <div style="background: #FFF5F2; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FF5124; font-size: 18px; margin: 0 0 16px 0; border-bottom: 1px solid #FFD4C7; padding-bottom: 12px;">
                  📋 Booking Details
                </h3>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Booking Reference</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 600;">#${bookingRef}</p>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Listing</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 600;">${listingTitle}</p>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Host</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0;">${hostName}</p>
                </div>
                
                <div style="display: flex; gap: 24px; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Start Date</p>
                    <p style="color: #1f2937; font-size: 14px; margin: 0;">${formatDate(startDate)}</p>
                  </div>
                  <div style="flex: 1;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">End Date</p>
                    <p style="color: #1f2937; font-size: 14px; margin: 0;">${formatDate(endDate)}</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Fulfillment</p>
                  <p style="color: #1f2937; font-size: 14px; margin: 0;">${fulfillmentLabel}</p>
                </div>
                
                ${locationInfo ? `
                <div style="margin-bottom: 12px;">
                  <p style="color: #1f2937; font-size: 14px; margin: 0;">${locationInfo}</p>
                </div>
                ` : ''}
                
                <!-- Payment Breakdown -->
                <div style="border-top: 1px solid #FFD4C7; padding-top: 16px; margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">Rental Total (incl. 12.9% fee)</p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">$${totalPrice.toFixed(2)}</p>
                  </div>
                  ${hasDeposit ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">Security Deposit <span style="font-size: 12px;">(refundable)</span></p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">$${depositAmount.toFixed(2)}</p>
                  </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #FF5124; padding-top: 12px; margin-top: 12px;">
                    <p style="color: #1f2937; font-size: 16px; font-weight: 700; margin: 0;">Total Due Now</p>
                    <p style="color: #FF5124; font-size: 24px; font-weight: 700; margin: 0;">$${totalDue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #92400E; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>⏰ Action Required:</strong> Complete your payment to confirm this booking. 
                  Your booking will not be guaranteed until payment is received.
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${siteUrl}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  💳 Complete Payment - $${totalDue.toFixed(2)}
                </a>
              </div>

              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">
                ${hasDeposit ? 'Your security deposit will be refunded after the rental ends if there are no issues.' : ''}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                Need help? Call us at <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none;">support@vendibook.com</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                <a href="${siteUrl}/notification-preferences" style="color: #FF5124; text-decoration: none;">Manage notification preferences</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VendiBook <noreply@updates.vendibook.com>",
        to: [email],
        subject: `💳 Action Required: Complete Payment for Booking #${bookingRef}`,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Booking confirmation email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending booking confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
