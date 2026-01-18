import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PendingBooking {
  id: string;
  created_at: string;
  listing_title: string;
  shopper_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  hours_pending: number;
}

interface PendingDocument {
  id: string;
  uploaded_at: string;
  document_type: string;
  booking_id: string;
  file_name: string;
  shopper_name: string;
  listing_title: string;
}

interface ActiveDispute {
  id: string;
  created_at: string;
  listing_title: string;
  buyer_name: string;
  seller_name: string;
  amount: number;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting admin daily digest generation...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails
    const adminIds = adminRoles.map((r) => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    const adminEmails = adminProfiles?.filter((p) => p.email).map((p) => p.email) || [];
    
    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails to send to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${adminEmails.length} admin email(s)`);

    // Fetch pending booking requests
    const { data: pendingBookings, error: bookingsError } = await supabase
      .from("booking_requests")
      .select(`
        id,
        created_at,
        start_date,
        end_date,
        total_price,
        listing_id,
        shopper_id
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (bookingsError) {
      console.error("Error fetching pending bookings:", bookingsError);
    }

    // Enrich booking data with listing titles and shopper names
    const enrichedBookings: PendingBooking[] = [];
    if (pendingBookings && pendingBookings.length > 0) {
      for (const booking of pendingBookings) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", booking.listing_id)
          .single();

        const { data: shopper } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.shopper_id)
          .single();

        const hoursAgo = Math.round(
          (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60)
        );

        enrichedBookings.push({
          id: booking.id,
          created_at: booking.created_at,
          listing_title: listing?.title || "Unknown Listing",
          shopper_name: shopper?.full_name || "Unknown Shopper",
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_price: booking.total_price,
          hours_pending: hoursAgo,
        });
      }
    }

    console.log(`Found ${enrichedBookings.length} pending booking(s)`);

    // Fetch pending documents
    const { data: pendingDocs, error: docsError } = await supabase
      .from("booking_documents")
      .select(`
        id,
        uploaded_at,
        document_type,
        booking_id,
        file_name
      `)
      .eq("status", "pending")
      .order("uploaded_at", { ascending: true });

    if (docsError) {
      console.error("Error fetching pending documents:", docsError);
    }

    // Enrich document data
    const enrichedDocs: PendingDocument[] = [];
    if (pendingDocs && pendingDocs.length > 0) {
      for (const doc of pendingDocs) {
        const { data: booking } = await supabase
          .from("booking_requests")
          .select("listing_id, shopper_id")
          .eq("id", doc.booking_id)
          .single();

        let listingTitle = "Unknown Listing";
        let shopperName = "Unknown Shopper";

        if (booking) {
          const { data: listing } = await supabase
            .from("listings")
            .select("title")
            .eq("id", booking.listing_id)
            .single();

          const { data: shopper } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", booking.shopper_id)
            .single();

          listingTitle = listing?.title || "Unknown Listing";
          shopperName = shopper?.full_name || "Unknown Shopper";
        }

        enrichedDocs.push({
          id: doc.id,
          uploaded_at: doc.uploaded_at,
          document_type: doc.document_type,
          booking_id: doc.booking_id,
          file_name: doc.file_name,
          shopper_name: shopperName,
          listing_title: listingTitle,
        });
      }
    }

    console.log(`Found ${enrichedDocs.length} pending document(s)`);

    // Fetch active disputes (sale transactions with disputed status)
    const { data: disputes, error: disputesError } = await supabase
      .from("sale_transactions")
      .select(`
        id,
        created_at,
        listing_id,
        buyer_id,
        seller_id,
        amount,
        status
      `)
      .eq("status", "disputed")
      .order("created_at", { ascending: true });

    if (disputesError) {
      console.error("Error fetching disputes:", disputesError);
    }

    // Enrich dispute data
    const enrichedDisputes: ActiveDispute[] = [];
    if (disputes && disputes.length > 0) {
      for (const dispute of disputes) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", dispute.listing_id)
          .single();

        const { data: buyer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", dispute.buyer_id)
          .single();

        const { data: seller } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", dispute.seller_id)
          .single();

        enrichedDisputes.push({
          id: dispute.id,
          created_at: dispute.created_at,
          listing_title: listing?.title || "Unknown Listing",
          buyer_name: buyer?.full_name || "Unknown Buyer",
          seller_name: seller?.full_name || "Unknown Seller",
          amount: dispute.amount,
          status: dispute.status,
        });
      }
    }

    console.log(`Found ${enrichedDisputes.length} active dispute(s)`);

    // Generate email HTML
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const totalItems = enrichedBookings.length + enrichedDocs.length + enrichedDisputes.length;
    const logoUrl = 'https://vendibookpreview.lovable.app/images/vendibook-email-logo.png';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://vendibookpreview.lovable.app" style="display: inline-block; background-color: #ffffff; padding: 16px 24px; border-radius: 12px;">
              <img src="${logoUrl}" alt="VendiBook" style="max-width: 360px; height: auto;" />
            </a>
          </div>
          <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a1a; font-size: 28px; margin: 0 0 8px 0;">📊 Admin Daily Digest</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">${today}</p>
            </div>

            <!-- Summary Stats -->
            <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 32px; flex-wrap: wrap;">
              <div style="background: ${enrichedBookings.length > 0 ? '#fef3c7' : '#f3f4f6'}; border-radius: 12px; padding: 16px 24px; text-align: center; min-width: 120px;">
                <p style="color: #92400e; font-size: 28px; font-weight: bold; margin: 0;">${enrichedBookings.length}</p>
                <p style="color: #92400e; font-size: 14px; margin: 4px 0 0 0;">Pending Bookings</p>
              </div>
              <div style="background: ${enrichedDocs.length > 0 ? '#dbeafe' : '#f3f4f6'}; border-radius: 12px; padding: 16px 24px; text-align: center; min-width: 120px;">
                <p style="color: #1e40af; font-size: 28px; font-weight: bold; margin: 0;">${enrichedDocs.length}</p>
                <p style="color: #1e40af; font-size: 14px; margin: 4px 0 0 0;">Pending Documents</p>
              </div>
              <div style="background: ${enrichedDisputes.length > 0 ? '#fee2e2' : '#f3f4f6'}; border-radius: 12px; padding: 16px 24px; text-align: center; min-width: 120px;">
                <p style="color: #991b1b; font-size: 28px; font-weight: bold; margin: 0;">${enrichedDisputes.length}</p>
                <p style="color: #991b1b; font-size: 14px; margin: 4px 0 0 0;">Active Disputes</p>
              </div>
            </div>

            ${totalItems === 0 ? `
              <div style="text-align: center; padding: 40px 20px; background: #f0fdf4; border-radius: 12px;">
                <p style="color: #166534; font-size: 18px; margin: 0;">✅ All caught up! No pending items require attention.</p>
              </div>
            ` : ''}

            <!-- Pending Bookings Section -->
            ${enrichedBookings.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #fbbf24;">
                  📋 Pending Booking Requests
                </h2>
                ${enrichedBookings.map((booking) => `
                  <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                      <div>
                        <p style="color: #1a1a1a; font-weight: 600; margin: 0 0 4px 0;">${booking.listing_title}</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">Guest: ${booking.shopper_name}</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">
                          ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div style="text-align: right;">
                        <p style="color: #166534; font-weight: 600; font-size: 16px; margin: 0;">$${booking.total_price}</p>
                        <p style="color: ${booking.hours_pending > 24 ? '#dc2626' : '#f59e0b'}; font-size: 12px; margin: 4px 0 0 0;">
                          ${booking.hours_pending > 24 ? '⚠️ ' : ''}${booking.hours_pending}h pending
                        </p>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Pending Documents Section -->
            ${enrichedDocs.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
                  📄 Pending Document Reviews
                </h2>
                ${enrichedDocs.map((doc) => `
                  <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #3b82f6;">
                    <p style="color: #1a1a1a; font-weight: 600; margin: 0 0 4px 0;">
                      ${doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      Uploaded by: ${doc.shopper_name} • For: ${doc.listing_title}
                    </p>
                    <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">
                      File: ${doc.file_name}
                    </p>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Active Disputes Section -->
            ${enrichedDisputes.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #ef4444;">
                  ⚠️ Active Disputes
                </h2>
                ${enrichedDisputes.map((dispute) => `
                  <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #ef4444;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                      <div>
                        <p style="color: #1a1a1a; font-weight: 600; margin: 0 0 4px 0;">${dispute.listing_title}</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                          Buyer: ${dispute.buyer_name} • Seller: ${dispute.seller_name}
                        </p>
                        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">
                          Opened: ${new Date(dispute.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style="text-align: right;">
                        <p style="color: #dc2626; font-weight: 600; font-size: 16px; margin: 0;">$${dispute.amount}</p>
                        <span style="display: inline-block; background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;">
                          Disputed
                        </span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- CTA Button -->
            ${totalItems > 0 ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://vendibookpreview.lovable.app/admin" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Admin Dashboard
                </a>
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                This is an automated daily digest from VendiBook. 
                <br>You're receiving this because you're an admin.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to all admins
    console.log(`Sending digest email to ${adminEmails.length} admin(s)...`);
    
    const emailResponse = await resend.emails.send({
      from: "VendiBook <notifications@resend.dev>",
      to: adminEmails as string[],
      subject: `📊 Daily Admin Digest - ${totalItems} item${totalItems !== 1 ? 's' : ''} need attention`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Digest sent to ${adminEmails.length} admin(s)`,
        summary: {
          pendingBookings: enrichedBookings.length,
          pendingDocuments: enrichedDocs.length,
          activeDisputes: enrichedDisputes.length,
          totalItems,
        },
        emailResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-admin-daily-digest function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
