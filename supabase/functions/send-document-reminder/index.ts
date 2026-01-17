import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  business_license: "Business License",
  food_handler_certificate: "Food Handler Certificate",
  safeserve_certification: "SafeServe Certification",
  health_department_permit: "Health Department Permit",
  commercial_liability_insurance: "Commercial Liability Insurance",
  vehicle_insurance: "Vehicle Insurance",
  certificate_of_insurance: "Certificate of Insurance",
  work_history_proof: "Work History Proof",
  prior_experience_proof: "Prior Experience Proof",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DOCUMENT-REMINDER] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    logStep("Starting document reminder job");

    // Get bookings created more than 24 hours ago but less than 7 days ago
    // that are still pending document uploads
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    logStep("Looking for bookings with pending documents", { 
      createdBefore: twentyFourHoursAgo,
      fortyEightHoursAgo,
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
      logStep("Error fetching bookings", { error: bookingsError });
      throw bookingsError;
    }

    logStep("Found bookings to check", { count: bookings?.length || 0 });

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No bookings need reminders", remindersSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      try {
        // Determine if this is a 48-hour urgent reminder
        const bookingCreatedAt = new Date(booking.created_at);
        const hoursSinceBooking = (Date.now() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
        const isUrgent = hoursSinceBooking >= 48;

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
          .select("*")
          .eq("listing_id", booking.listing_id)
          .eq("is_required", true);

        if (reqDocsError) {
          logStep("Error fetching required docs", { error: reqDocsError, bookingId: booking.id });
          continue;
        }

        if (!requiredDocs || requiredDocs.length === 0) {
          logStep("No required documents for listing", { bookingId: booking.id });
          continue;
        }

        // Get uploaded documents for this booking
        const { data: uploadedDocs, error: uploadedDocsError } = await supabaseClient
          .from("booking_documents")
          .select("*")
          .eq("booking_id", booking.id);

        if (uploadedDocsError) {
          logStep("Error fetching uploaded docs", { error: uploadedDocsError, bookingId: booking.id });
          continue;
        }

        // Find missing and rejected documents
        const uploadedMap = new Map((uploadedDocs || []).map(d => [d.document_type, d]));
        const missingDocs = requiredDocs.filter(req => !uploadedMap.has(req.document_type));
        const rejectedDocs = (uploadedDocs || []).filter(d => d.status === "rejected");

        if (missingDocs.length === 0 && rejectedDocs.length === 0) {
          logStep("All documents uploaded/approved", { bookingId: booking.id });
          continue;
        }

        logStep("Found pending documents", { 
          bookingId: booking.id, 
          missing: missingDocs.length, 
          rejected: rejectedDocs.length,
          isUrgent,
          hoursSinceBooking
        });

        // Get renter info
        const profileData = booking.profiles as unknown as { id: string; email: string | null; full_name: string | null }[] | null;
        const profile = profileData?.[0] ?? null;
        const renterEmail = profile?.email;
        const renterName = profile?.full_name || "Renter";

        if (!renterEmail) {
          logStep("No email for renter", { bookingId: booking.id });
          continue;
        }

        const listingData = booking.listings as unknown as { id: string; title: string }[] | null;
        const listing = listingData?.[0] ?? null;
        const listingTitle = listing?.title || "your booking";
        const startDate = new Date(booking.start_date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
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

        // Determine email content based on urgency level
        const emailSubject = isUrgent 
          ? `🚨 URGENT: Documents required immediately for your ${listingTitle} booking`
          : `📄 Reminder: Documents needed for your ${listingTitle} booking`;

        const emailHeaderBg = isUrgent
          ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
          : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";

        const emailHeaderIcon = isUrgent ? "🚨" : "📄";
        const emailHeaderTitle = isUrgent ? "Urgent: Documents Required" : "Document Reminder";

        const urgentBanner = isUrgent ? `
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 600;">
              ⏰ This is your second reminder. Your booking was created over 48 hours ago and still requires documents.
            </p>
            <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px;">
              If documents are not uploaded soon, your booking may be at risk of cancellation.
            </p>
          </div>
        ` : '';

        const reminderText = isUrgent
          ? `<strong>Action required immediately:</strong> Your Instant Book booking for <strong>${listingTitle}</strong> is still waiting for required documents. This is your second reminder.`
          : `This is a friendly reminder that your Instant Book booking for <strong>${listingTitle}</strong> is still waiting for required documents.`;

        const emailHtml = `
          <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${emailHeaderBg}; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">${emailHeaderIcon} ${emailHeaderTitle}</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hi ${renterName},
              </p>
              
              ${urgentBanner}
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${reminderText}
              </p>
              
              <div style="background: ${isUrgent ? '#fef2f2' : '#fef3c7'}; border-radius: 8px; padding: 12px; border: 1px solid ${isUrgent ? '#fecaca' : '#fcd34d'}; margin: 0 0 16px 0;">
                <p style="margin: 0; color: ${isUrgent ? '#991b1b' : '#92400e'}; font-size: 14px;">
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
                    <td style="padding: 8px 0; color: #dc2626; font-weight: 500;">${missingDocsList}</td>
                  </tr>
                  ` : ''}
                  ${rejectedDocs.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Rejected Documents:</td>
                    <td style="padding: 8px 0; color: #dc2626; font-weight: 500;">${rejectedDocsList}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${appUrl}/dashboard" 
                   style="display: inline-block; background: ${isUrgent ? '#dc2626' : '#f97316'}; color: white; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">
                  Upload Documents Now
                </a>
              </div>
              
              ${isUrgent ? `
              <div style="background: #fef2f2; border-radius: 8px; padding: 12px; border: 1px solid #fecaca; margin: 20px 0 0 0;">
                <p style="margin: 0; color: #991b1b; font-size: 13px;">
                  <strong>Need help?</strong> If you're having trouble uploading documents, please contact our support team immediately.
                </p>
              </div>
              ` : ''}
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                If you have any questions, feel free to message the host or contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </div>
          </div>
        `;

        // Send the email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "VendiBook <noreply@updates.vendibook.com>",
            to: [renterEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          logStep("Email send failed", { bookingId: booking.id, error: errorText });
          errors.push(`Failed to send email for booking ${booking.id}: ${errorText}`);
          continue;
        }

        logStep("Email sent successfully", { bookingId: booking.id, isUrgent, to: renterEmail });

        // Update the reminder sent timestamp
        const { error: updateError } = await supabaseClient
          .from("booking_requests")
          .update({ document_reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        if (updateError) {
          logStep("Failed to update reminder timestamp", { error: updateError, bookingId: booking.id });
        }

        // Create in-app notification too
        const notificationTitle = isUrgent ? "🚨 Urgent: Documents Required" : "Documents Still Needed";
        const notificationMessage = isUrgent
          ? `URGENT: Your booking for ${listingTitle} requires documents immediately. This is your second reminder.`
          : `Your booking for ${listingTitle} is waiting for required documents. Please upload them to confirm your booking.`;

        await supabaseClient.from("notifications").insert({
          user_id: booking.shopper_id,
          type: "document_reminder",
          title: notificationTitle,
          message: notificationMessage,
          link: "/dashboard",
        });

        remindersSent++;
      } catch (bookingError) {
        const errorMessage = bookingError instanceof Error ? bookingError.message : "Unknown error";
        logStep("Error processing booking", { bookingId: booking.id, error: errorMessage });
        errors.push(`Error for booking ${booking.id}: ${errorMessage}`);
      }
    }

    logStep("Document reminder job completed", { remindersSent, errors: errors.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Fatal error in document reminder job", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
