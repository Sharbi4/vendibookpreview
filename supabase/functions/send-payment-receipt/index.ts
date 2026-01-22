import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  email: string;
  fullName: string;
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
  // Listing details
  listingTitle?: string;
  listingCategory?: string;
  listingImageUrl?: string;
  hostName?: string;
  // Price breakdown
  platformFee?: number;
  deliveryFee?: number;
  freightCost?: number;
  basePrice?: number;
  // Security deposit
  depositAmount?: number;
  // Additional info
  paymentDate?: string;
  isRental?: boolean;
  numberOfDays?: number;
  bookingId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-payment-receipt function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PaymentReceiptRequest = await req.json();
    
    const email = data.email;
    const fullName = data.fullName || 'Valued Customer';
    const transactionId = data.transactionId;
    const itemName = data.itemName || data.listingTitle || 'Item';
    const amount = data.amount;
    const paymentMethod = data.paymentMethod || 'Card ending in ****';
    const isRental = data.transactionType === 'rental' || data.isRental === true;
    const startDate = data.startDate;
    const endDate = data.endDate;
    const address = data.address;
    const fulfillmentType = data.fulfillmentType || 'pickup';
    const isEscrow = data.isEscrow === true;
    const deliveryFee = data.deliveryFee || 0;
    const freightCost = data.freightCost || 0;
    const platformFee = data.platformFee || 0;
    const depositAmount = data.depositAmount || 0;
    const hasDeposit = depositAmount > 0;
    const paymentDate = data.paymentDate || new Date().toISOString();
    const listingCategory = data.listingCategory || '';
    const listingImageUrl = data.listingImageUrl;
    const hostName = data.hostName || 'Host';
    const numberOfDays = data.numberOfDays;
    const bookingId = data.bookingId || transactionId;
    const basePrice = data.basePrice || (amount - platformFee - deliveryFee - freightCost - depositAmount);

    console.log(`Sending payment receipt to: ${email}, transaction: ${transactionId}`);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
    const logoUrl = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-logo-official.png";

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const formatDateTime = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getCategoryLabel = (cat: string) => {
      const labels: Record<string, string> = {
        'food_truck': 'Food Truck',
        'food_trailer': 'Food Trailer',
        'ghost_kitchen': 'Ghost Kitchen',
        'vendor_lot': 'Vendor Lot'
      };
      return labels[cat] || cat;
    };

    const getFulfillmentLabel = (type: string) => {
      const labels: Record<string, string> = {
        'pickup': '📦 Pickup',
        'delivery': '🚚 Delivery',
        'both': '📦 Pickup / 🚚 Delivery',
        'on_site': '📍 On-Site'
      };
      return labels[type] || type;
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt - VendiBook</title>
          <style>
            @font-face {
              font-family: 'Sofia Pro Soft';
              src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
              font-weight: 300;
              font-style: normal;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #FFF5F2 0%, #FFFFFF 50%, #F9FAFB 100%); font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background-color: #ffffff; padding: 16px 24px; border-radius: 12px; margin-bottom: 8px;">
                <img src="${logoUrl}" alt="VendiBook" style="height: 96px;" />
              </div>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Card -->
            <div style="background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
              
              <!-- Success Banner -->
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">✓</span>
                </div>
                <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Payment Successful</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
                  ${formatDateTime(paymentDate)}
                </p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px;">
                
                <!-- Greeting -->
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hi <strong>${fullName}</strong>, thank you for your ${isRental ? 'booking' : 'purchase'}! Here's your official receipt.
                </p>
                
                ${listingImageUrl ? `
                <!-- Listing Preview -->
                <div style="border-radius: 16px; overflow: hidden; margin-bottom: 24px; border: 1px solid #E5E7EB;">
                  <img src="${listingImageUrl}" alt="${itemName}" style="width: 100%; height: 200px; object-fit: cover;" />
                  <div style="padding: 20px; background: #F9FAFB;">
                    <h3 style="color: #1F2937; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">${itemName}</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${listingCategory ? `<span style="background: #FFF5F2; color: #FF5124; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">${getCategoryLabel(listingCategory)}</span>` : ''}
                      ${hostName ? `<span style="color: #6B7280; font-size: 13px;">Hosted by <strong>${hostName}</strong></span>` : ''}
                    </div>
                  </div>
                </div>
                ` : `
                <!-- Item Name Only -->
                <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #FF5124;">
                  <h3 style="color: #1F2937; font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">${itemName}</h3>
                  ${listingCategory ? `<span style="color: #FF5124; font-size: 13px; font-weight: 500;">${getCategoryLabel(listingCategory)}</span>` : ''}
                </div>
                `}
                
                <!-- Transaction Details Grid -->
                <div style="background: #F9FAFB; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                  <h4 style="color: #1F2937; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0;">
                    ${isRental ? '📅 Booking Details' : '🛒 Order Details'}
                  </h4>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    ${isRental && startDate && endDate ? `
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">Rental Period</td>
                      <td style="color: #1F2937; font-size: 14px; padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB; font-weight: 500;">
                        ${formatDate(startDate)} — ${formatDate(endDate)}
                        ${numberOfDays ? `<br/><span style="color: #6B7280; font-size: 12px;">(${numberOfDays} day${numberOfDays > 1 ? 's' : ''})</span>` : ''}
                      </td>
                    </tr>
                    ` : ''}
                    ${address ? `
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">Location</td>
                      <td style="color: #1F2937; font-size: 14px; padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;">${address}</td>
                    </tr>
                    ` : ''}
                    ${fulfillmentType ? `
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">Fulfillment</td>
                      <td style="color: #1F2937; font-size: 14px; padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;">${getFulfillmentLabel(fulfillmentType)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">Confirmation #</td>
                      <td style="color: #1F2937; font-size: 13px; padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB; font-family: 'SF Mono', Monaco, monospace;">${bookingId.slice(0, 8).toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="color: #6B7280; font-size: 14px; padding: 10px 0;">Payment Method</td>
                      <td style="color: #1F2937; font-size: 14px; padding: 10px 0; text-align: right;">💳 ${paymentMethod}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Price Breakdown -->
                <div style="background: linear-gradient(135deg, #1F2937 0%, #374151 100%); border-radius: 16px; padding: 24px; color: #FFFFFF;">
                  <h4 style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0; color: rgba(255,255,255,0.7);">
                    💰 Payment Summary
                  </h4>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0;">${isRental ? 'Rental Fee' : 'Item Price'}</td>
                      <td style="color: #FFFFFF; font-size: 14px; padding: 8px 0; text-align: right;">$${basePrice.toFixed(2)}</td>
                    </tr>
                    ${deliveryFee > 0 ? `
                    <tr>
                      <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0;">Delivery Fee</td>
                      <td style="color: #FFFFFF; font-size: 14px; padding: 8px 0; text-align: right;">$${deliveryFee.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${freightCost > 0 ? `
                    <tr>
                      <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0;">Freight / Shipping</td>
                      <td style="color: #FFFFFF; font-size: 14px; padding: 8px 0; text-align: right;">$${freightCost.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${platformFee > 0 ? `
                    <tr>
                      <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0;">Service Fee</td>
                      <td style="color: #FFFFFF; font-size: 14px; padding: 8px 0; text-align: right;">$${platformFee.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${hasDeposit ? `
                    <tr>
                      <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0;">
                        Security Deposit
                        <span style="display: block; font-size: 11px; color: rgba(255,255,255,0.5);">Refundable</span>
                      </td>
                      <td style="color: #FFFFFF; font-size: 14px; padding: 8px 0; text-align: right;">$${depositAmount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td colspan="2" style="padding: 12px 0 0 0;">
                        <div style="border-top: 1px solid rgba(255,255,255,0.2); margin-bottom: 12px;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #FFFFFF; font-size: 18px; font-weight: 700;">Total Paid</td>
                      <td style="color: #34D399; font-size: 28px; font-weight: 700; text-align: right;">$${amount.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
                
                ${isEscrow ? `
                <!-- Escrow Notice -->
                <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; padding: 16px 20px; margin-top: 20px; display: flex; align-items: flex-start; gap: 12px;">
                  <span style="font-size: 20px;">🔒</span>
                  <div>
                    <p style="color: #92400E; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Escrow Protected Payment</p>
                    <p style="color: #A16207; font-size: 13px; margin: 0; line-height: 1.5;">Your funds are held securely and will be released to the seller after you confirm receipt of the item.</p>
                  </div>
                </div>
                ` : ''}
                
                ${hasDeposit && isRental ? `
                <!-- Deposit Notice -->
                <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); border-radius: 12px; padding: 16px 20px; margin-top: 20px; display: flex; align-items: flex-start; gap: 12px;">
                  <span style="font-size: 20px;">🛡️</span>
                  <div>
                    <p style="color: #1E40AF; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Security Deposit: $${depositAmount.toFixed(2)}</p>
                    <p style="color: #1E3A8A; font-size: 13px; margin: 0; line-height: 1.5;">Your deposit will be automatically refunded after the rental ends, provided there are no issues or damages reported by the host.</p>
                  </div>
                </div>
                ` : ''}
                
                <!-- Transaction ID -->
                <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px dashed #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 4px 0;">Transaction ID</p>
                  <p style="color: #6B7280; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; margin: 0;">${transactionId}</p>
                </div>
                
                <!-- CTA Buttons -->
                <div style="text-align: center; margin-top: 32px;">
                  <a href="${siteUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 81, 36, 0.3);">
                    View in Dashboard
                  </a>
                </div>
                
                <!-- Help Note -->
                <div style="background: #EFF6FF; border-radius: 12px; padding: 16px 20px; margin-top: 24px;">
                  <p style="color: #1E40AF; font-size: 13px; line-height: 1.6; margin: 0;">
                    <strong>📧 Keep this email</strong> as your official receipt. You can also download a PDF version from your dashboard.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding: 24px;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 8px 0;">
                Questions? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none; font-weight: 500;">1-877-8-VENDI-2</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none; font-weight: 500;">support@vendibook.com</a>
              </p>
              <p style="color: #D1D5DB; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} VendiBook Inc. All rights reserved.
              </p>
            </div>
            
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: [email],
      subject: `✅ Payment Receipt: $${amount.toFixed(2)} - ${itemName}`,
      html,
    });

    console.log("Payment receipt email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
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
