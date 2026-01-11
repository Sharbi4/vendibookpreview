import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentNotificationRequest {
  booking_id: string;
  document_type: string;
  event_type: "uploaded" | "approved" | "rejected";
  rejection_reason?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  business_license: "Business License",
  food_handler_certificate: "Food Handler's Certificate",
  safeserve_certification: "SafeServe Certification",
  health_department_permit: "Health Department Permit",
  commercial_liability_insurance: "Commercial Liability Insurance",
  vehicle_insurance: "Vehicle Insurance",
  certificate_of_insurance: "Certificate of Insurance",
  work_history_proof: "Work History Proof",
  prior_experience_proof: "Prior Experience Proof",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOCUMENT-NOTIFICATION] ${step}${detailsStr}`);
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

    const { booking_id, document_type, event_type, rejection_reason }: DocumentNotificationRequest = await req.json();
    logStep("Request received", { booking_id, document_type, event_type });

    if (!booking_id || !document_type || !event_type) {
      throw new Error("Missing required fields: booking_id, document_type, and event_type");
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("booking_requests")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`);
    }
    logStep("Booking fetched", { booking_id: booking.id });

    // Fetch listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("title, cover_image_url")
      .eq("id", booking.listing_id)
      .single();

    if (listingError) {
      logStep("Warning: Could not fetch listing", { error: listingError.message });
    }

    // Fetch shopper profile (renter)
    const { data: renter, error: renterError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.shopper_id)
      .single();

    if (renterError) {
      logStep("Warning: Could not fetch renter", { error: renterError.message });
    }

    // Fetch host profile
    const { data: host, error: hostError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.host_id)
      .single();

    if (hostError) {
      logStep("Warning: Could not fetch host", { error: hostError.message });
    }

    const listingTitle = listing?.title || "your listing";
    const documentLabel = DOCUMENT_TYPE_LABELS[document_type] || document_type.replace(/_/g, ' ');
    const startDate = new Date(booking.start_date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const endDate = new Date(booking.end_date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const emails: { to: string; subject: string; html: string }[] = [];

    if (event_type === "uploaded") {
      // Notify host that a document was uploaded
      if (host?.email) {
        emails.push({
          to: host.email,
          subject: `📄 Document Uploaded - ${listingTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Document Submitted for Review 📄</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${host.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  <strong>${renter?.full_name || 'A renter'}</strong> has uploaded a document for their booking of <strong>${listingTitle}</strong>.
                </p>
                
                <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Document:</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${documentLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Booking Dates:</td>
                      <td style="padding: 8px 0; color: #1f2937;">${startDate} - ${endDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                      <td style="padding: 8px 0;">
                        <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">Pending Review</span>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Please log in to your dashboard to review and approve or reject this document.
                </p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Document</a>
                </div>
              </div>
              
              <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    } else if (event_type === "approved") {
      // Notify renter that their document was approved
      if (renter?.email) {
        emails.push({
          to: renter.email,
          subject: `✅ Document Approved - ${listingTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Document Approved! ✅</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${renter.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Great news! Your document has been approved by the host for your booking of <strong>${listingTitle}</strong>.
                </p>
                
                <div style="background: #dcfce7; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0; margin: 0 0 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #166534;">Document:</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #166534;">${documentLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #166534;">Status:</td>
                      <td style="padding: 8px 0;">
                        <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">Approved</span>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  You can check your booking status and any remaining document requirements in your dashboard.
                </p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
                </div>
              </div>
              
              <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    } else if (event_type === "rejected") {
      // Notify renter that their document was rejected
      if (renter?.email) {
        emails.push({
          to: renter.email,
          subject: `⚠️ Document Needs Attention - ${listingTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Document Needs Attention ⚠️</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${renter.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  The host has requested a new version of a document for your booking of <strong>${listingTitle}</strong>.
                </p>
                
                <div style="background: #fef3c7; border-radius: 8px; padding: 16px; border: 1px solid #fcd34d; margin: 0 0 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #92400e;">Document:</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #92400e;">${documentLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #92400e;">Status:</td>
                      <td style="padding: 8px 0;">
                        <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">Needs Revision</span>
                      </td>
                    </tr>
                    ${rejection_reason ? `
                    <tr>
                      <td colspan="2" style="padding: 12px 0 0 0;">
                        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #fcd34d;">
                          <p style="margin: 0 0 4px 0; color: #92400e; font-weight: 600; font-size: 14px;">Reason:</p>
                          <p style="margin: 0; color: #78350f;">${rejection_reason}</p>
                        </div>
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Please upload a new version of this document in your dashboard to proceed with your booking.
                </p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Upload New Document</a>
                </div>
              </div>
              
              <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    }

    // Send all emails using Resend API
    const results = [];
    for (const email of emails) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Vendibook <onboarding@resend.dev>",
            to: [email.to],
            subject: email.subject,
            html: email.html,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send email");
        }
        
        logStep("Email sent", { to: email.to, subject: email.subject });
        results.push({ success: true, to: email.to });
      } catch (emailError: any) {
        logStep("Failed to send email", { to: email.to, error: emailError.message });
        results.push({ success: false, to: email.to, error: emailError.message });
      }
    }

    logStep("Function completed", { emailsSent: results.filter(r => r.success).length });

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
