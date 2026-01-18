import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  email: string;
  renterName: string;
  listingTitle: string;
  bookingId: string;
  startDate: string;
  endDate: string;
  originalDeposit: number;
  refundAmount: number;
  deductionAmount: number;
  refundType: 'full' | 'partial' | 'forfeit';
  notes?: string;
  hostName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-deposit-notification function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      renterName,
      listingTitle,
      bookingId,
      startDate,
      endDate,
      originalDeposit,
      refundAmount,
      deductionAmount,
      refundType,
      notes,
      hostName
    }: DepositNotificationRequest = await req.json();

    console.log(`Sending deposit notification to: ${email}, type: ${refundType}`);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibookpreview.lovable.app";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;
    const bookingRef = bookingId.substring(0, 8).toUpperCase();

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Different messaging based on refund type
    const getSubjectLine = () => {
      switch (refundType) {
        case 'full':
          return `Your $${refundAmount.toFixed(2)} Security Deposit Has Been Refunded ✓`;
        case 'partial':
          return `Security Deposit Update: $${refundAmount.toFixed(2)} Refunded`;
        case 'forfeit':
          return `Security Deposit Notice: Important Update`;
        default:
          return `Security Deposit Update for Booking #${bookingRef}`;
      }
    };

    const getBadgeStyle = () => {
      switch (refundType) {
        case 'full':
          return 'background: linear-gradient(135deg, #10B981 0%, #34D399 100%);';
        case 'partial':
          return 'background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);';
        case 'forfeit':
          return 'background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);';
        default:
          return 'background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);';
      }
    };

    const getBadgeText = () => {
      switch (refundType) {
        case 'full':
          return '✓ Full Deposit Refunded';
        case 'partial':
          return '⚠ Partial Deposit Refunded';
        case 'forfeit':
          return '✕ Deposit Forfeited';
        default:
          return 'Deposit Update';
      }
    };

    const getMainMessage = () => {
      switch (refundType) {
        case 'full':
          return `Great news! Your security deposit of <strong>$${originalDeposit.toFixed(2)}</strong> has been fully refunded. The rental was completed successfully with no issues.`;
        case 'partial':
          return `Your security deposit has been processed. Due to ${notes || 'deductions for damages or late return'}, a portion of your deposit was withheld.`;
        case 'forfeit':
          return `We regret to inform you that your security deposit of <strong>$${originalDeposit.toFixed(2)}</strong> has been forfeited due to ${notes || 'damages or violations of rental terms'}.`;
        default:
          return 'Your security deposit has been processed.';
      }
    };

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
              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; ${getBadgeStyle()} color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  ${getBadgeText()}
                </span>
              </div>

              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
                Security Deposit Update
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Hi ${renterName || 'there'}, ${getMainMessage()}
              </p>
              
              <!-- Deposit Breakdown Card -->
              <div style="background: #FFF5F2; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FF5124; font-size: 18px; margin: 0 0 16px 0; border-bottom: 1px solid #FFD4C7; padding-bottom: 12px;">
                  💰 Deposit Breakdown
                </h3>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Booking Reference</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 600;">#${bookingRef}</p>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Listing</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 600;">${listingTitle}</p>
                </div>

                ${hostName ? `
                <div style="margin-bottom: 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Host</p>
                  <p style="color: #1f2937; font-size: 16px; margin: 0;">${hostName}</p>
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 24px; margin-bottom: 16px;">
                  <div style="flex: 1;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Rental Period</p>
                    <p style="color: #1f2937; font-size: 14px; margin: 0;">${formatDate(startDate)} - ${formatDate(endDate)}</p>
                  </div>
                </div>
                
                <!-- Financial Breakdown -->
                <div style="border-top: 1px solid #FFD4C7; padding-top: 16px; margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">Original Deposit</p>
                    <p style="color: #1f2937; font-size: 16px; margin: 0;">$${originalDeposit.toFixed(2)}</p>
                  </div>
                  
                  ${deductionAmount > 0 ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <p style="color: #EF4444; font-size: 14px; margin: 0;">Deductions</p>
                    <p style="color: #EF4444; font-size: 16px; margin: 0;">-$${deductionAmount.toFixed(2)}</p>
                  </div>
                  ` : ''}
                  
                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #FF5124; padding-top: 12px; margin-top: 12px;">
                    <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">Amount Refunded</p>
                    <p style="color: ${refundAmount > 0 ? '#10B981' : '#EF4444'}; font-size: 24px; font-weight: 700; margin: 0;">$${refundAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              ${notes ? `
              <div style="background: ${refundType === 'forfeit' ? '#FEE2E2' : '#FEF3C7'}; border-left: 4px solid ${refundType === 'forfeit' ? '#EF4444' : '#F59E0B'}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: ${refundType === 'forfeit' ? '#991B1B' : '#92400E'}; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Host Notes:</strong> ${notes}
                </p>
              </div>
              ` : ''}
              
              ${refundAmount > 0 ? `
              <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #065F46; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Refund Timeline:</strong> Your refund of $${refundAmount.toFixed(2)} will be credited to your original payment method within 5-10 business days.
                </p>
              </div>
              ` : ''}
              
              ${refundType !== 'full' ? `
              <div style="background: #F3F4F6; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Questions about this decision?</strong> If you believe there has been an error or would like to dispute this decision, please contact our support team within 7 days.
                </p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${siteUrl}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Booking Details
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                Need help? Call us at <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none;">support@vendibook.com</a>
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
        subject: getSubjectLine(),
        html,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Deposit notification email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending deposit notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
