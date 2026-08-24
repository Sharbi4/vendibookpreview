import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

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

    // Email sending now goes through send-transactional-email (Lovable Email)


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

    // shopper_id references auth.users, not profiles — fetch profiles separately.
    const shopperIds = Array.from(new Set((bookings || []).map((b: any) => b.shopper_id).filter(Boolean)));
    const profilesById = new Map<string, { id: string; email: string | null; full_name: string | null }>();
    if (shopperIds.length > 0) {
      const { data: profileRows } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name")
        .in("id", shopperIds);
      (profileRows || []).forEach((p: any) => profilesById.set(p.id, p));
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
        const profile = profilesById.get(booking.shopper_id) ?? null;
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

        // Send the email via Lovable Email
        const { error: emailError } = await invokeTransactionalEmail({
            templateName: "document-status",
            recipientEmail: renterEmail,
            idempotencyKey: `doc-reminder-${booking.id}-${isUrgent ? "urgent" : "normal"}-${new Date().toISOString().slice(0,10)}`,
            templateData: {
              name: renterName,
              listingTitle,
              startDate,
              isUrgent,
              missingDocuments: missingDocsList,
              rejectedDocuments: rejectedDocsList,
              ctaUrl: "https://vendibook.com/dashboard",
            },
          });

        if (emailError) {
          logStep("Email send failed", { bookingId: booking.id, error: emailError.message });
          errors.push(`Failed to send email for booking ${booking.id}: ${emailError.message}`);
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
