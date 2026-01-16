import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-REFUND-NOTIFICATION] ${step}${detailsStr}`);
};

interface RefundNotificationRequest {
  email: string;
  fullName: string;
  bookingId: string;
  listingTitle: string;
  refundAmount: number;
  reason: string;
  recipientType: 'shopper' | 'host';
  initiatedBy?: 'shopper' | 'host' | 'admin';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body: RefundNotificationRequest = await req.json();
    const { 
      email, 
      fullName, 
      bookingId, 
      listingTitle, 
      refundAmount, 
      reason,
      recipientType,
      initiatedBy,
    } = body;

    logStep("Request received", { email, recipientType, bookingId });

    if (!email || !bookingId) {
      throw new Error("Missing required fields: email or bookingId");
    }

    const firstName = fullName?.split(' ')[0] || 'there';
    
    let subject: string;
    let mainMessage: string;
    let additionalInfo: string;

    if (recipientType === 'shopper') {
      subject = `Refund Processed: ${listingTitle}`;
      mainMessage = `Your refund of <strong>$${refundAmount.toFixed(2)}</strong> has been successfully processed.`;
      additionalInfo = `
        <p style="font-size: 14px; color: #666; margin-top: 16px;">
          The refund will appear on your original payment method within 5-10 business days, 
          depending on your bank or card issuer.
        </p>
      `;
    } else {
      const initiatorLabel = initiatedBy === 'shopper' ? 'the guest' : 
                            initiatedBy === 'admin' ? 'an admin' : 'you';
      subject = `Booking Cancelled & Refunded: ${listingTitle}`;
      mainMessage = `A booking for <strong>${listingTitle}</strong> has been cancelled by ${initiatorLabel} and a refund of <strong>$${refundAmount.toFixed(2)}</strong> has been issued.`;
      additionalInfo = `
        <p style="font-size: 14px; color: #666; margin-top: 16px;">
          The dates are now available for new bookings. You can view your listings in your dashboard.
        </p>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-logo-official.png" alt="VendiBook" style="height: 40px; max-width: 180px;">
            </div>
            
            <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">
              ${recipientType === 'shopper' ? '💸 Refund Processed' : '📋 Booking Cancelled'}
            </h1>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 16px;">
              Hi ${firstName},
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 16px;">
              ${mainMessage}
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Booking ID</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-family: monospace;">${bookingId.substring(0, 8)}...</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Listing</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${listingTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Refund Amount</td>
                  <td style="padding: 8px 0; color: #22c55e; font-size: 16px; font-weight: 600; text-align: right;">$${refundAmount.toFixed(2)}</td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Reason</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${reason}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${additionalInfo}
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://vendibook.com/dashboard" 
                 style="display: inline-block; background-color: #000; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                View Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #888; margin-top: 40px; text-align: center;">
              Questions? Contact us at <a href="mailto:support@vendibook.com" style="color: #000;">support@vendibook.com</a>
            </p>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
            © ${new Date().getFullYear()} VendiBook. All rights reserved.
          </p>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: [email],
      subject,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
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
