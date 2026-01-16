import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListingLiveEmailRequest {
  hostEmail: string;
  hostName: string;
  listingTitle: string;
  listingId: string;
  listingImageUrl: string | null;
  listingPrice: string;
  category: string;
  // Enhanced listing data
  mode?: 'rent' | 'sale';
  priceDaily?: number;
  priceWeekly?: number;
  priceSale?: number;
  address?: string;
  description?: string;
  amenities?: string[];
  fulfillmentType?: string;
  deliveryRadius?: number;
  availableFrom?: string;
  availableTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-listing-live-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      hostEmail, 
      hostName, 
      listingTitle, 
      listingId, 
      listingImageUrl,
      listingPrice,
      category,
      mode = 'rent',
      priceDaily,
      priceWeekly,
      priceSale,
      address,
      description,
      amenities = [],
      fulfillmentType,
      deliveryRadius,
      availableFrom,
      availableTo
    }: ListingLiveEmailRequest = await req.json();

    console.log("Sending listing live email to:", hostEmail);
    console.log("Listing:", listingTitle, listingId);

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibookpreview.lovable.app";
    const logoUrl = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-logo-official.png";
    const listingUrl = `${siteUrl}/listing/${listingId}`;
    const dashboardUrl = `${siteUrl}/dashboard`;

    const getCategoryLabel = (cat: string) => {
      const labels: Record<string, string> = {
        'food_truck': 'Food Truck',
        'food_trailer': 'Food Trailer',
        'ghost_kitchen': 'Ghost Kitchen',
        'vendor_lot': 'Vendor Lot'
      };
      return labels[cat] || cat;
    };

    const getCategoryIcon = (cat: string) => {
      const icons: Record<string, string> = {
        'food_truck': '🚚',
        'food_trailer': '🚐',
        'ghost_kitchen': '🏪',
        'vendor_lot': '📍'
      };
      return icons[cat] || '📦';
    };

    const getFulfillmentLabel = (type: string) => {
      const labels: Record<string, string> = {
        'pickup': 'Pickup Available',
        'delivery': 'Delivery Available',
        'both': 'Pickup & Delivery',
        'on_site': 'On-Site Only'
      };
      return labels[type] || type;
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };

    const truncateDescription = (desc: string, maxLength: number = 150) => {
      if (!desc) return '';
      if (desc.length <= maxLength) return desc;
      return desc.slice(0, maxLength).trim() + '...';
    };

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: [hostEmail],
      subject: `🎉 Your listing "${listingTitle}" is now live on VendiBook!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Listing Live - VendiBook</title>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #FFF5F2 0%, #FFFFFF 50%, #F9FAFB 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="${logoUrl}" alt="VendiBook" style="height: 48px; margin-bottom: 8px;" />
              <p style="color: #6B7280; font-size: 13px; margin: 0;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Card -->
            <div style="background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
              
              <!-- Celebration Banner -->
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 40px; text-align: center; position: relative; overflow: hidden;">
                <!-- Decorative circles -->
                <div style="position: absolute; top: -20px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; right: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; top: 20px; right: 40px; font-size: 24px;">🎊</div>
                <div style="position: absolute; bottom: 20px; left: 40px; font-size: 24px;">🎉</div>
                
                <div style="position: relative; z-index: 1;">
                  <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 36px;">✨</span>
                  </div>
                  <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 700; margin: 0 0 8px 0;">Congratulations!</h1>
                  <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Your listing is now live and ready for bookings</p>
                </div>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px;">
                
                <!-- Greeting -->
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hi <strong>${hostName || 'there'}</strong>, great news! Your listing is now published and visible to thousands of potential ${mode === 'sale' ? 'buyers' : 'renters'} on VendiBook.
                </p>
                
                <!-- Listing Card -->
                <div style="border: 2px solid #E5E7EB; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                  ${listingImageUrl ? `
                  <img src="${listingImageUrl}" alt="${listingTitle}" style="width: 100%; height: 220px; object-fit: cover;" />
                  ` : `
                  <div style="width: 100%; height: 160px; background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 64px;">${getCategoryIcon(category)}</span>
                  </div>
                  `}
                  
                  <div style="padding: 24px;">
                    <!-- Category Badge -->
                    <div style="margin-bottom: 12px;">
                      <span style="background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #FFFFFF; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${getCategoryIcon(category)} ${getCategoryLabel(category)}
                      </span>
                      <span style="background: ${mode === 'sale' ? '#DCFCE7' : '#DBEAFE'}; color: ${mode === 'sale' ? '#166534' : '#1D4ED8'}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 8px;">
                        ${mode === 'sale' ? '💰 For Sale' : '📅 For Rent'}
                      </span>
                    </div>
                    
                    <!-- Title -->
                    <h2 style="color: #1F2937; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">${listingTitle}</h2>
                    
                    ${description ? `
                    <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">${truncateDescription(description)}</p>
                    ` : ''}
                    
                    <!-- Pricing -->
                    <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                      <p style="color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Pricing</p>
                      ${mode === 'sale' && priceSale ? `
                      <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">$${priceSale.toLocaleString()}</p>
                      ` : `
                      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                        ${priceDaily ? `
                        <div>
                          <span style="color: #FF5124; font-size: 24px; font-weight: 700;">$${priceDaily}</span>
                          <span style="color: #6B7280; font-size: 14px;">/day</span>
                        </div>
                        ` : ''}
                        ${priceWeekly ? `
                        <div>
                          <span style="color: #6B7280; font-size: 18px; font-weight: 600;">$${priceWeekly}</span>
                          <span style="color: #9CA3AF; font-size: 13px;">/week</span>
                        </div>
                        ` : ''}
                      </div>
                      `}
                      ${!priceDaily && !priceWeekly && !priceSale ? `
                      <p style="color: #1F2937; font-size: 18px; font-weight: 600; margin: 0;">${listingPrice}</p>
                      ` : ''}
                    </div>
                    
                    <!-- Details Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      ${address ? `
                      <div style="background: #FFF5F2; border-radius: 8px; padding: 12px;">
                        <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; margin: 0 0 4px 0;">📍 Location</p>
                        <p style="color: #1F2937; font-size: 13px; margin: 0; font-weight: 500;">${address.split(',').slice(0, 2).join(', ')}</p>
                      </div>
                      ` : ''}
                      ${fulfillmentType ? `
                      <div style="background: #EFF6FF; border-radius: 8px; padding: 12px;">
                        <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; margin: 0 0 4px 0;">🚚 Fulfillment</p>
                        <p style="color: #1F2937; font-size: 13px; margin: 0; font-weight: 500;">${getFulfillmentLabel(fulfillmentType)}</p>
                      </div>
                      ` : ''}
                      ${availableFrom ? `
                      <div style="background: #F0FDF4; border-radius: 8px; padding: 12px;">
                        <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; margin: 0 0 4px 0;">📅 Available From</p>
                        <p style="color: #1F2937; font-size: 13px; margin: 0; font-weight: 500;">${formatDate(availableFrom)}</p>
                      </div>
                      ` : ''}
                      ${deliveryRadius ? `
                      <div style="background: #FEF3C7; border-radius: 8px; padding: 12px;">
                        <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; margin: 0 0 4px 0;">📏 Delivery Radius</p>
                        <p style="color: #1F2937; font-size: 13px; margin: 0; font-weight: 500;">${deliveryRadius} miles</p>
                      </div>
                      ` : ''}
                    </div>
                    
                    ${amenities && amenities.length > 0 ? `
                    <!-- Amenities -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
                      <p style="color: #6B7280; font-size: 12px; font-weight: 600; margin: 0 0 8px 0;">Featured Amenities</p>
                      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${amenities.slice(0, 5).map(a => `
                        <span style="background: #F3F4F6; color: #4B5563; padding: 4px 10px; border-radius: 6px; font-size: 12px;">✓ ${a}</span>
                        `).join('')}
                        ${amenities.length > 5 ? `<span style="color: #9CA3AF; font-size: 12px; padding: 4px;">+${amenities.length - 5} more</span>` : ''}
                      </div>
                    </div>
                    ` : ''}
                  </div>
                </div>
                
                <!-- Next Steps -->
                <div style="background: linear-gradient(135deg, #1F2937 0%, #374151 100%); border-radius: 16px; padding: 24px; color: #FFFFFF; margin-bottom: 24px;">
                  <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">🚀 Tips to Get Bookings Fast</h3>
                  <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8;">
                    <li>Share your listing on social media to reach more customers</li>
                    <li>Keep your calendar updated to avoid booking conflicts</li>
                    <li>Respond quickly to inquiries to improve your ranking</li>
                    <li>Add high-quality photos to attract more interest</li>
                  </ul>
                </div>
                
                <!-- Stats Preview -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                  <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; text-align: center;">
                    <p style="font-size: 24px; margin: 0;">👁️</p>
                    <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Track Views</p>
                  </div>
                  <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; text-align: center;">
                    <p style="font-size: 24px; margin: 0;">💬</p>
                    <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Get Messages</p>
                  </div>
                  <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; text-align: center;">
                    <p style="font-size: 24px; margin: 0;">📊</p>
                    <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">View Analytics</p>
                  </div>
                </div>
                
                <!-- CTA Buttons -->
                <div style="text-align: center; margin-top: 32px;">
                  <a href="${listingUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin-right: 12px; box-shadow: 0 4px 14px rgba(255, 81, 36, 0.3);">
                    View Your Listing
                  </a>
                  <a href="${dashboardUrl}" style="display: inline-block; background: #F3F4F6; color: #374151; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding: 24px;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 8px 0;">
                Questions? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none; font-weight: 500;">1-877-8-VENDI-2</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none; font-weight: 500;">support@vendibook.com</a>
              </p>
              <p style="color: #D1D5DB; font-size: 11px; margin: 0;">
                You're receiving this email because you published a listing on VendiBook.<br/>
                © ${new Date().getFullYear()} VendiBook Inc. All rights reserved.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-listing-live-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
