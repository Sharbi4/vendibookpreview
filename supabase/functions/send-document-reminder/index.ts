import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  business_license: "Business License",
  health_permit: "Health Permit",
  food_handlers_cert: "Food Handler's Certificate",
  insurance_certificate: "Insurance Certificate",
  vehicle_registration: "Vehicle Registration",
  fire_safety_cert: "Fire Safety Certificate",
  other: "Other Document",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOCUMENT-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting document reminder job");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get bookings created more than 24 hours ago but less than 7 days ago
    // that are still pending document uploads
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    logStep("Looking for bookings with pending documents", { 
      createdBefore: twentyFourHoursAgo,
      createdAfter: sevenDaysAgo 
    });

    // Get all bookings that require documents (Instant Book with pending/paid status)
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("booking_requests")
      .select(`
        id,
        shopper_id,
        host_id,
        listing_id,
        start_date,
        end_date,
        is_instant_book,
        status,
        payment_status,
        created_at,
        document_reminder_sent_at,
        listings!inner (
          id,
          title
        ),
        profiles!booking_requests_shopper_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq("is_instant_book", true)
      .in("status", ["pending", "approved"])
      .in("payment_status", ["paid", "pending"])
      .lt("created_at", twentyFourHoursAgo)
      .gt("created_at", sevenDaysAgo);

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    if (!bookings || bookings.length === 0) {
      logStep("No bookings found that need document reminders");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders needed", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Found ${bookings.length} potential bookings to check`);

    let remindersSent = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      try {
        // Skip if reminder was already sent in the last 24 hours
        if (booking.document_reminder_sent_at) {
          const reminderSentAt = new Date(booking.document_reminder_sent_at);
          const hoursSinceReminder = (Date.now() - reminderSentAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceReminder < 24) {
            logStep("Skipping - reminder already sent recently", { 
              bookingId: booking.id,
              hoursSinceReminder 
            });
            continue;
          }
        }

        // Get required documents for this listing
        const { data: requiredDocs, error: reqDocsError } = await supabaseClient
          .from("listing_required_documents")
          .select("document_type, description")
          .eq("listing_id", booking.listing_id)
          .eq("is_required", true);

        if (reqDocsError) {
          logStep("Error fetching required docs", { error: reqDocsError.message });
          continue;
        }

        if (!requiredDocs || requiredDocs.length === 0) {
          logStep("No required documents for this listing", { listingId: booking.listing_id });
          continue;
        }

        // Get uploaded documents for this booking
        const { data: uploadedDocs, error: uploadedError } = await supabaseClient
          .from("booking_documents")
          .select("document_type, status")
          .eq("booking_id", booking.id);

        if (uploadedError) {
          logStep("Error fetching uploaded docs", { error: uploadedError.message });
          continue;
        }

        // Find missing documents
        const uploadedTypes = new Set(uploadedDocs?.map(d => d.document_type) || []);
        const missingDocs = requiredDocs.filter(rd => !uploadedTypes.has(rd.document_type));

        if (missingDocs.length === 0) {
          logStep("All documents uploaded for booking", { bookingId: booking.id });
          continue;
        }

        // Check for rejected documents that need re-upload
        const rejectedDocs = uploadedDocs?.filter(d => d.status === "rejected") || [];

        logStep("Sending reminder", { 
          bookingId: booking.id, 
          missingCount: missingDocs.length,
          rejectedCount: rejectedDocs.length 
        });

        const renterEmail = (booking.profiles as any)?.email;
        const renterName = (booking.profiles as any)?.full_name || "there";
        const listingTitle = (booking.listings as any)?.title || "your booking";

        if (!renterEmail) {
          logStep("No email for renter", { bookingId: booking.id });
          continue;
        }

        const startDate = new Date(booking.start_date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const missingDocsList = missingDocs
          .map(d => DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type)
          .join(", ");

        const rejectedDocsList = rejectedDocs
          .map(d => DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type)
          .join(", ");

        const appUrl = "https://vendibookpreview.lovable.app";

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">📄 Document Reminder</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hi ${renterName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is a friendly reminder that your Instant Book booking for <strong>${listingTitle}</strong> is still waiting for required documents.
              </p>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 12px; border: 1px solid #fcd34d; margin: 0 0 16px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> Your booking cannot be confirmed until all required documents are uploaded and approved by the host.
                </p>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Listing:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${listingTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Start Date:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${startDate}</td>
                  </tr>
                  ${missingDocs.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Missing Documents:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">${missingDocsList}</span>
                    </td>
                  </tr>
                  ` : ""}
                  ${rejectedDocs.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Needs Re-upload:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">${rejectedDocsList}</span>
                    </td>
                  </tr>
                  ` : ""}
                </table>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Please upload your documents as soon as possible to complete your booking.
              </p>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Upload Documents Now</a>
              </div>
            </div>
            
            <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
              <p style="margin: 0;">© ${new Date().getFullYear()} VendiBook. All rights reserved.</p>
            </div>
          </div>
        `;

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "VendiBook <noreply@updates.vendibook.com>",
            to: [renterEmail],
            subject: `📄 Reminder: Documents needed for your ${listingTitle} booking`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          logStep("Email send failed", { error: errorText });
          errors.push(`Failed to send email for booking ${booking.id}: ${errorText}`);
          continue;
        }

        // Update booking to mark reminder as sent
        await supabaseClient
          .from("booking_requests")
          .update({ document_reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        logStep("Reminder sent successfully", { 
          bookingId: booking.id, 
          email: renterEmail 
        });

        remindersSent++;

        // Create in-app notification too
        await supabaseClient.from("notifications").insert({
          user_id: booking.shopper_id,
          type: "document_reminder",
          title: "Documents Still Needed",
          message: `Your booking for ${listingTitle} is waiting for required documents. Please upload them to confirm your booking.`,
          data: {
            booking_id: booking.id,
            listing_id: booking.listing_id,
            missing_documents: missingDocs.map(d => d.document_type),
          },
        });

      } catch (bookingError) {
        const errorMsg = bookingError instanceof Error ? bookingError.message : String(bookingError);
        logStep("Error processing booking", { bookingId: booking.id, error: errorMsg });
        errors.push(errorMsg);
      }
    }

    logStep("Job complete", { 
      remindersSent, 
      errorsCount: errors.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${remindersSent} document reminder(s)`,
        sent: remindersSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
