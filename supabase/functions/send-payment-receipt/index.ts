import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  email: string;
  fullName: string;
  // New flexible interface
  transactionId: string;
  itemName: string;
  amount: number;
  paymentMethod?: string;
  transactionType?: 'rental' | 'purchase';
  startDate?: string;
  endDate?: string;
  address?: string;
  fulfillmentType?: string;
  isEscrow?: boolean;
  // Legacy interface (still supported)
  listingTitle?: string;
  platformFee?: number;
  deliveryFee?: number;
  paymentDate?: string;
  isRental?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-payment-receipt function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PaymentReceiptRequest = await req.json();
    
    // Support both new and legacy interfaces
    const email = data.email;
    const fullName = data.fullName || 'Valued Customer';
    const transactionId = data.transactionId;
    const itemName = data.itemName || data.listingTitle || 'Item';
    const amount = data.amount;
    const paymentMethod = data.paymentMethod || 'Card';
    const isRental = data.transactionType === 'rental' || data.isRental === true;
    const startDate = data.startDate;
    const endDate = data.endDate;
    const address = data.address;
    const fulfillmentType = data.fulfillmentType || 'pickup';
    const isEscrow = data.isEscrow === true;
    const deliveryFee = data.deliveryFee || 0;
    const platformFee = data.platformFee || 0;
    const paymentDate = data.paymentDate || new Date().toISOString();

    console.log(`Sending payment receipt to: ${email}, transaction: ${transactionId}, type: ${isRental ? 'rental' : 'purchase'}, escrow: ${isEscrow}`);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibookpreview.lovable.app";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const formatDateTime = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const totalAmount = amount;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="${logoUrl}" alt="VendiBook" style="max-width: 200px; height: auto; margin-bottom: 16px;" />
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content Card -->
            <div style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Receipt Header -->
              <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px dashed #e5e7eb; padding-bottom: 24px;">
                <span style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 16px;">
                  ✓ Payment Successful
                </span>
                <h2 style="color: #1f2937; font-size: 24px; margin: 16px 0 8px 0;">
                  Payment Receipt
                </h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Transaction ID: <span style="font-family: monospace; color: #1f2937;">${transactionId.slice(0, 20)}...</span>
                </p>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${fullName || 'there'}, thank you for your payment! Here's your receipt.
              </p>
              
              <!-- Order Details -->
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isRental ? '📅 Rental Details' : '🛒 Purchase Details'}
                </h3>
                
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                  <p style="color: #1f2937; font-size: 16px; margin: 0 0 4px 0; font-weight: 600;">${itemName}</p>
                  ${isRental && startDate && endDate ? `
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      ${formatDate(startDate)} — ${formatDate(endDate)}
                    </p>
                  ` : ''}
                  ${address ? `
                    <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">
                      📍 ${address}
                    </p>
                  ` : ''}
                  ${!isRental && fulfillmentType ? `
                    <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">
                      ${fulfillmentType === 'delivery' ? '🚚 Delivery' : '📦 Pickup'}
                    </p>
                  ` : ''}
                  ${isEscrow ? `
                    <p style="color: #FF9800; font-size: 12px; margin: 8px 0 0 0; font-weight: 500;">
                      🔒 Escrow Protected - Funds released after confirmation
                    </p>
                  ` : ''}
                </div>
                
                <!-- Line Items -->
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #4b5563; font-size: 14px; padding: 8px 0;">${isRental ? 'Rental Fee' : 'Item Price'}</td>
                    <td style="color: #1f2937; font-size: 14px; padding: 8px 0; text-align: right;">$${(amount - platformFee - deliveryFee).toFixed(2)}</td>
                  </tr>
                  ${deliveryFee && deliveryFee > 0 ? `
                  <tr>
                    <td style="color: #4b5563; font-size: 14px; padding: 8px 0;">Delivery Fee</td>
                    <td style="color: #1f2937; font-size: 14px; padding: 8px 0; text-align: right;">$${deliveryFee.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${platformFee > 0 ? `
                  <tr>
                    <td style="color: #4b5563; font-size: 14px; padding: 8px 0;">Service Fee</td>
                    <td style="color: #1f2937; font-size: 14px; padding: 8px 0; text-align: right;">$${platformFee.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #e5e7eb;">
                    <td style="color: #1f2937; font-size: 18px; padding: 16px 0 0 0; font-weight: 700;">Total Paid</td>
                    <td style="color: #FF5124; font-size: 24px; padding: 16px 0 0 0; text-align: right; font-weight: 700;">$${totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Payment Info -->
              <div style="background: #FFF5F2; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #6b7280; font-size: 14px;">Payment Date</span>
                  <span style="color: #1f2937; font-size: 14px;">${formatDateTime(paymentDate)}</span>
                </div>
                ${paymentMethod ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                  <span style="color: #1f2937; font-size: 14px;">${paymentMethod}</span>
                </div>
                ` : ''}
              </div>
              
              <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #1E40AF; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>📧 Keep this email</strong> as proof of payment. You can also access your payment history from your dashboard.
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${siteUrl}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View in Dashboard
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
        subject: `Payment Receipt: $${totalAmount.toFixed(2)} - ${itemName}`,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Payment receipt email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending payment receipt email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
