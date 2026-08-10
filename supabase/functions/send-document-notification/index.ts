import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { refundPayment } from "../_shared/paymentOps.ts";

// Emails are sent via the Lovable Emails queue (send-transactional-email),
// using the premium Satin Lux `generic-notice` template. No direct Resend usage.
const DASHBOARD_URL = "https://vendibook.com/dashboard";
const ADMIN_URL = "https://vendibook.com/admin";

type EmailJob = {
  to: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentNotificationRequest {
  booking_id: string;
  document_type?: string;
  document_types?: string[]; // For bulk approval
  event_type: "uploaded" | "approved" | "rejected" | "all_approved";
  rejection_reason?: string;
  check_all_approved?: boolean;
  is_bulk_approval?: boolean; // When true, sends single summary email
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

// Helper to process refund for instant book bookings
async function processInstantBookRefund(
  supabaseClient: any,
  booking: any,
  listingTitle: string,
  rejectionReason: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  if (!booking.payment_intent_id) {
    logStep("Cannot process refund - no payment reference found");
    return { success: false, error: "No payment reference found" };
  }

  try {
    // Vendibook refunds through PayPal only.
    const refund = await refundPayment({
      paymentReference: booking.payment_intent_id,
      provider: booking.payment_provider,
      reason: `Instant Book document rejected: ${rejectionReason}`.slice(0, 200),
      idempotencyKey: `doc-reject-refund-${booking.id}`,
    });

    if (!refund.success) {
      logStep("Refund not completed automatically", { error: refund.error, manual: refund.manual });
      return { success: false, error: refund.error };
    }

    logStep("Instant Book refund created", { refundId: refund.id, amountCents: refund.amountCents });

    // Update booking status
    await supabaseClient
      .from('booking_requests')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
      })
      .eq('id', booking.id);

    logStep("Booking cancelled and marked as refunded");

    return { success: true, refundId: refund.id };
  } catch (error: any) {
    logStep("Refund failed", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Helper to confirm instant book booking when all docs approved
async function confirmInstantBookBooking(
  supabaseClient: any,
  booking: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update booking status to approved (payment is already done)
    await supabaseClient
      .from('booking_requests')
      .update({
        status: 'approved',
        responded_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    logStep("Instant Book booking auto-confirmed");
    return { success: true };
  } catch (error: any) {
    logStep("Failed to confirm booking", { error: error.message });
    return { success: false, error: error.message };
  }
}

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

    const { booking_id, document_type, document_types, event_type, rejection_reason, check_all_approved, is_bulk_approval }: DocumentNotificationRequest = await req.json();
    logStep("Request received", { booking_id, document_type, document_types, event_type, check_all_approved, is_bulk_approval });

    if (!booking_id || !event_type) {
      throw new Error("Missing required fields: booking_id and event_type");
    }

    // Fetch booking details with is_instant_book flag
    const { data: booking, error: bookingError } = await supabaseClient
      .from("booking_requests")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`);
    }
    logStep("Booking fetched", { booking_id: booking.id, is_instant_book: booking.is_instant_book });

    // Fetch listing details including instant_book flag
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("title, cover_image_url, instant_book")
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
    const isInstantBook = booking.is_instant_book === true;
    
    // Handle document labels for single or bulk
    let documentLabel = '';
    let documentLabels: string[] = [];
    if (is_bulk_approval && document_types && document_types.length > 0) {
      documentLabels = document_types.map(dt => DOCUMENT_TYPE_LABELS[dt] || dt?.replace(/_/g, ' ') || 'Document');
      documentLabel = documentLabels.join(', ');
    } else {
      documentLabel = DOCUMENT_TYPE_LABELS[document_type || ''] || document_type?.replace(/_/g, ' ') || 'Document';
    }
    
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

    const emails: EmailJob[] = [];

    if (event_type === "uploaded") {
      // Notify ADMIN that a document was uploaded for review (not host)
      // Fetch admin emails from user_roles table
      const { data: adminRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      let adminEmails: string[] = [];
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", adminIds);
        adminEmails = adminProfiles?.filter((p: any) => p.email).map((p: any) => p.email) || [];
      }
      
      // Fallback to hardcoded admin email if no admins found
      if (adminEmails.length === 0) {
        adminEmails = ["support@vendibook.com"];
      }
      // Admin doc alerts route to support inbox only
      if (!adminEmails.includes("support@vendibook.com")) {
        adminEmails.push("support@vendibook.com");
      }
      
      logStep("Sending document upload notification to admins", { adminEmails });

      for (const adminEmail of adminEmails) {
        emails.push({
          to: adminEmail,
          idempotencyKey: `doc-uploaded-${booking_id}-${document_type || "any"}-${adminEmail}`,
          payload: {
            preview: `Document pending review — ${listingTitle}`,
            kicker: "Admin review",
            heading: "Document pending admin review",
            paragraphs: [
              "A new document has been uploaded and requires your review.",
              isInstantBook
                ? "⚡ Instant Book: payment has been collected. If approved, the booking auto-confirms; if rejected, payment is refunded."
                : "The renter will be notified once you've reviewed the document.",
            ],
            details: [
              { label: "Document", value: documentLabel },
              { label: "Listing", value: listingTitle },
              { label: "Renter", value: `${renter?.full_name || "Unknown"} (${renter?.email || "N/A"})` },
              { label: "Host", value: host?.full_name || "Unknown" },
              { label: "Booking dates", value: `${startDate} – ${endDate}` },
              { label: "Status", value: "Pending review" },
            ],
            alert: {
              tone: "warning",
              title: "Action required",
              body: "Typical review time: within 30 minutes.",
            },
            ctaLabel: "Review in admin panel",
            ctaUrl: ADMIN_URL,
            footnote: "Vendibook admin notification",
          },
        });
      }
    } else if (event_type === "all_approved") {
      // This is a bulk approval - send summary email to BOTH host and renter

      const approvedDocs = is_bulk_approval && documentLabels.length > 0
        ? documentLabels.join(", ")
        : documentLabel;

      // Email to RENTER
      if (renter?.email) {
        emails.push({
          to: renter.email,
          idempotencyKey: `doc-all-approved-renter-${booking_id}`,
          payload: {
            preview: `Your documents have been approved — ${listingTitle}`,
            kicker: "Documents approved",
            heading: "Documents approved 🎉",
            greeting: `Hi ${renter.full_name || "there"},`,
            paragraphs: [
              `Great news! All your documents for ${listingTitle} have been reviewed and approved by our team.`,
              isInstantBook
                ? "⚡ Instant Book: your booking has been automatically confirmed!"
                : "The host will now review your booking request and respond soon.",
            ],
            details: [
              { label: "Listing", value: listingTitle },
              { label: "Booking dates", value: `${startDate} – ${endDate}` },
              { label: "Approved documents", value: approvedDocs },
            ],
            alert: {
              tone: "success",
              title: "All set",
              body: isInstantBook
                ? "Your booking is confirmed and you're all set."
                : "All documentation requirements are complete.",
            },
            ctaLabel: "View your booking",
            ctaUrl: DASHBOARD_URL,
            footnote: "Need help? Call (725) 755-9598 or email support@vendibook.com.",
          },
        });
      }

      // Email to HOST
      if (host?.email) {
        emails.push({
          to: host.email,
          idempotencyKey: `doc-all-approved-host-${booking_id}`,
          payload: {
            preview: `All documents approved — ${listingTitle}`,
            kicker: "Documents verified",
            heading: "All documents verified 🎉",
            greeting: `Hi ${host.full_name || "there"},`,
            paragraphs: [
              `All required documents for ${renter?.full_name || "your renter"}'s booking of ${listingTitle} have been verified and approved.`,
              isInstantBook
                ? "⚡ Instant Book: this booking has been automatically confirmed. Payment has already been collected."
                : "The booking is now fully compliant with all documentation requirements.",
            ],
            details: [
              { label: "Renter", value: renter?.full_name || "N/A" },
              { label: "Listing", value: listingTitle },
              { label: "Booking dates", value: `${startDate} – ${endDate}` },
              { label: "Approved documents", value: approvedDocs },
            ],
            alert: {
              tone: "success",
              title: "Documents complete",
              body: "All required documents have been submitted and approved.",
            },
            ctaLabel: "View dashboard",
            ctaUrl: DASHBOARD_URL,
            footnote: "Need help? Call (725) 755-9598 or email support@vendibook.com.",
          },
        });
      }

      // Create in-app notifications for BOTH
      try {
        // Notification for renter
        await supabaseClient.from("notifications").insert({
          user_id: booking.shopper_id,
          type: "document",
          title: "Documents Approved ✅",
          message: `All your documents for "${listingTitle}" have been verified and approved!`,
          link: "/dashboard",
        });
        logStep("In-app notification created for renter", { shopper_id: booking.shopper_id });

        // Notification for host
        await supabaseClient.from("notifications").insert({
          user_id: booking.host_id,
          type: "document",
          title: "All Documents Approved",
          message: `All required documents for ${renter?.full_name || 'your renter'}'s booking of "${listingTitle}" have been verified and approved.`,
          link: "/dashboard",
        });
        logStep("In-app notification created for host", { host_id: booking.host_id });
      } catch (notifError: any) {
        logStep("Failed to create in-app notifications", { error: notifError.message });
      }

      // For Instant Book with bulk approval: auto-confirm the booking
      if (isInstantBook && booking.status === 'pending' && is_bulk_approval) {
        logStep("Bulk approval for Instant Book - auto-confirming booking");
        await confirmInstantBookBooking(supabaseClient, booking);
      }
    }

    // Check if all documents are now approved (after approving a single doc)
    if (check_all_approved && event_type === "approved") {
      logStep("Checking if all documents are now approved");
      
      // Get required documents for the listing
      const { data: requiredDocs, error: reqError } = await supabaseClient
        .from("listing_required_documents")
        .select("document_type")
        .eq("listing_id", booking.listing_id)
        .eq("is_required", true);
      
      if (reqError) {
        logStep("Error fetching required docs", { error: reqError.message });
      } else if (requiredDocs && requiredDocs.length > 0) {
        // Get uploaded documents for this booking
        const { data: uploadedDocs, error: uploadError } = await supabaseClient
          .from("booking_documents")
          .select("document_type, status")
          .eq("booking_id", booking_id);
        
        if (uploadError) {
          logStep("Error fetching uploaded docs", { error: uploadError.message });
        } else if (uploadedDocs) {
          // Check if all required docs are approved
          const allApproved = requiredDocs.every(req => {
            const uploaded = uploadedDocs.find(u => u.document_type === req.document_type);
            return uploaded && uploaded.status === "approved";
          });
          
          logStep("Document compliance check", { 
            required: requiredDocs.length, 
            uploaded: uploadedDocs.length,
            allApproved,
            isInstantBook
          });
          
          if (allApproved) {
            // For Instant Book: auto-confirm the booking
            if (isInstantBook && booking.status === 'pending') {
              logStep("All documents approved for Instant Book - auto-confirming booking");
              
              const confirmResult = await confirmInstantBookBooking(supabaseClient, booking);
              
              if (confirmResult.success) {
                // Send confirmation email to renter
                if (renter?.email) {
                  emails.push({
                    to: renter.email,
                    idempotencyKey: `instant-book-confirmed-${booking_id}`,
                    payload: {
                      preview: `Booking confirmed — ${listingTitle}`,
                      kicker: "Booking confirmed",
                      heading: "Booking confirmed 🎉",
                      greeting: `Hi ${renter.full_name || "there"},`,
                      paragraphs: [
                        `All your documents have been approved and your Instant Book for ${listingTitle} is now confirmed.`,
                        "Your reservation is all set.",
                      ],
                      details: [
                        { label: "Listing", value: listingTitle },
                        { label: "Dates", value: `${startDate} – ${endDate}` },
                        { label: "Total paid", value: `$${booking.total_price.toFixed(2)}` },
                      ],
                      alert: {
                        tone: "success",
                        title: "Confirmed",
                        body: "Your reservation is locked in.",
                      },
                      ctaLabel: "View booking details",
                      ctaUrl: DASHBOARD_URL,
                      footnote: "Need help? Call (725) 755-9598 or email support@vendibook.com.",
                    },
                  });
                }

                // Create notification for renter
                await supabaseClient.from("notifications").insert({
                  user_id: booking.shopper_id,
                  type: "booking",
                  title: "Booking Confirmed! 🎉",
                  message: `Your Instant Book for "${listingTitle}" is confirmed! All documents approved.`,
                  link: "/dashboard",
                });
              }
            }
            
            logStep("All documents approved - sending host notification");
            
            // Send the "all_approved" notification to host
            if (host?.email) {
              emails.push({
                to: host.email,
                idempotencyKey: `doc-all-approved-host-checkall-${booking_id}`,
                payload: {
                  preview: `All documents approved — ${listingTitle}`,
                  kicker: "Documents verified",
                  heading: "All documents verified 🎉",
                  greeting: `Hi ${host.full_name || "there"},`,
                  paragraphs: [
                    `All required documents for ${renter?.full_name || "your renter"}'s booking of ${listingTitle} have been verified and approved.`,
                    isInstantBook
                      ? "⚡ Instant Book: this booking has been automatically confirmed."
                      : "The booking is now fully compliant with all documentation requirements.",
                  ],
                  details: [
                    { label: "Renter", value: renter?.full_name || "N/A" },
                    { label: "Listing", value: listingTitle },
                    { label: "Booking dates", value: `${startDate} – ${endDate}` },
                  ],
                  alert: {
                    tone: "success",
                    title: "Documents complete",
                    body: "All required documents have been submitted and approved.",
                  },
                  ctaLabel: "View dashboard",
                  ctaUrl: DASHBOARD_URL,
                  footnote: "Need help? Call (725) 755-9598 or email support@vendibook.com.",
                },
              });
            }
            
            // Create in-app notification for host
            try {
              await supabaseClient.from("notifications").insert({
                user_id: booking.host_id,
                type: "document",
                title: "All Documents Approved",
                message: `All required documents for ${renter?.full_name || 'your renter'}'s booking of "${listingTitle}" have been verified and approved.`,
                link: "/dashboard",
              });
              logStep("In-app notification created for host");
            } catch (notifError: any) {
              logStep("Failed to create in-app notification", { error: notifError.message });
            }
          }
        }
      }
    }
    const results: { success: boolean; to: string; error?: string }[] = [];
    for (const email of emails) {
      try {
        const { error } = await supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "generic-notice",
            recipientEmail: email.to,
            idempotencyKey: email.idempotencyKey,
            templateData: email.payload,
          },
        });
        if (error) throw error;
        logStep("Email enqueued via Lovable Emails", { to: email.to });
        results.push({ success: true, to: email.to });
      } catch (emailError: any) {
        logStep("Failed to enqueue email", { to: email.to, error: emailError.message });
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
