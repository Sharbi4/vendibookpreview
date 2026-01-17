import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentNotificationRequest {
  booking_id: string;
  document_type: string;
  event_type: "uploaded" | "approved" | "rejected" | "all_approved";
  rejection_reason?: string;
  check_all_approved?: boolean;
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
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("Cannot process refund - STRIPE_SECRET_KEY not set");
    return { success: false, error: "Stripe key not configured" };
  }

  if (!booking.payment_intent_id) {
    logStep("Cannot process refund - no payment intent found");
    return { success: false, error: "No payment intent found" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Create full refund
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        booking_id: booking.id,
        reason: 'instant_book_document_rejected',
        rejection_reason: rejectionReason,
      },
    });

    logStep("Instant Book refund created", { refundId: refund.id, amount: refund.amount });

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

    const { booking_id, document_type, event_type, rejection_reason, check_all_approved }: DocumentNotificationRequest = await req.json();
    logStep("Request received", { booking_id, document_type, event_type, check_all_approved });

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
    const documentLabel = DOCUMENT_TYPE_LABELS[document_type] || document_type?.replace(/_/g, ' ') || 'Document';
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
            <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Document Submitted for Review 📄</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${host.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  <strong>${renter?.full_name || 'A renter'}</strong> has uploaded a document for their ${isInstantBook ? '<strong>Instant Book</strong>' : ''} booking of <strong>${listingTitle}</strong>.
                </p>
                
                ${isInstantBook ? `
                <div style="background: #fef3c7; border-radius: 8px; padding: 12px; border: 1px solid #fcd34d; margin: 0 0 16px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    ⚡ <strong>Instant Book:</strong> Payment has been collected. If documents are approved, booking will be auto-confirmed. If rejected, payment will be refunded.
                  </p>
                </div>
                ` : ''}
                
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
                <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
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
            <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Document Approved! ✅</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${renter.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Great news! Your document has been approved for your booking of <strong>${listingTitle}</strong>.
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
                <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    } else if (event_type === "rejected") {
      // For Instant Book: if document is rejected, cancel booking and refund payment
      if (isInstantBook && booking.payment_status === 'paid') {
        logStep("Instant Book document rejected - initiating refund");
        
        const refundResult = await processInstantBookRefund(
          supabaseClient,
          booking,
          listingTitle,
          rejection_reason || 'Document rejected'
        );

        if (refundResult.success) {
          // Send refund notification to renter
          if (renter?.email) {
            emails.push({
              to: renter.email,
              subject: `❌ Booking Cancelled & Refunded - ${listingTitle}`,
              html: `
                <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">Booking Cancelled & Refunded</h1>
                  </div>
                  
                  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi ${renter.full_name || 'there'},
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Unfortunately, your Instant Book booking for <strong>${listingTitle}</strong> has been cancelled because your document was not approved.
                    </p>
                    
                    <div style="background: #fee2e2; border-radius: 8px; padding: 16px; border: 1px solid #fecaca; margin: 0 0 20px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #991b1b;">Document:</td>
                          <td style="padding: 8px 0; font-weight: 600; color: #991b1b;">${documentLabel}</td>
                        </tr>
                        ${rejection_reason ? `
                        <tr>
                          <td style="padding: 8px 0; color: #991b1b;">Reason:</td>
                          <td style="padding: 8px 0; color: #991b1b;">${rejection_reason}</td>
                        </tr>
                        ` : ''}
                      </table>
                    </div>
                    
                    <div style="background: #dcfce7; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0; margin: 0 0 20px 0; text-align: center;">
                      <p style="margin: 0 0 4px 0; font-weight: 600; color: #166534; font-size: 18px;">💳 Full Refund Issued</p>
                      <p style="margin: 0; color: #15803d; font-size: 14px;">Your payment of $${booking.total_price.toFixed(2)} will be refunded to your original payment method within 5-10 business days.</p>
                    </div>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      You're welcome to book again with the correct documents. We're here to help if you have questions!
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/listing/${booking.listing_id}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Book Again</a>
                    </div>
                  </div>
                  
                  <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
                  </div>
                </div>
              `,
            });
          }

          // Notify host about the cancellation
          if (host?.email) {
            emails.push({
              to: host.email,
              subject: `ℹ️ Instant Book Cancelled - ${listingTitle}`,
              html: `
                <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">Instant Book Cancelled</h1>
                  </div>
                  
                  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                      Hi ${host.full_name || 'there'},
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      An Instant Book booking for <strong>${listingTitle}</strong> has been automatically cancelled because the renter's documents did not pass review.
                    </p>
                    
                    <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Renter:</td>
                          <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${renter?.full_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Rejected Document:</td>
                          <td style="padding: 8px 0; color: #1f2937;">${documentLabel}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Booking Dates:</td>
                          <td style="padding: 8px 0; color: #1f2937;">${startDate} - ${endDate}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      The renter has been refunded. Your listing is now available for other bookings.
                    </p>
                  </div>
                  
                  <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
                  </div>
                </div>
              `,
            });
          }

          // Create notifications
          await supabaseClient.from("notifications").insert([
            {
              user_id: booking.shopper_id,
              type: "refund",
              title: "Booking Cancelled & Refunded",
              message: `Your Instant Book for "${listingTitle}" was cancelled due to document rejection. Full refund issued.`,
              link: "/dashboard",
            },
            {
              user_id: booking.host_id,
              type: "booking",
              title: "Instant Book Cancelled",
              message: `An Instant Book for "${listingTitle}" was cancelled due to document rejection.`,
              link: "/dashboard",
            },
          ]);
        }
      } else {
        // Regular rejection flow (non-instant book)
        if (renter?.email) {
          emails.push({
            to: renter.email,
            subject: `⚠️ Document Needs Attention - ${listingTitle}`,
            html: `
              <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
                  <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                  <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
                </div>
              </div>
            `,
          });
        }
      }
    } else if (event_type === "all_approved") {
      // Notify host that all required documents have been approved
      if (host?.email) {
        emails.push({
          to: host.email,
          subject: `✅ All Documents Approved - ${listingTitle}`,
          html: `
            <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">All Documents Verified! 🎉</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${host.full_name || 'there'},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Great news! All required documents for <strong>${renter?.full_name || 'your renter'}</strong>'s booking of <strong>${listingTitle}</strong> have been verified and approved.
                </p>
                
                ${isInstantBook ? `
                <div style="background: #dbeafe; border-radius: 8px; padding: 12px; border: 1px solid #93c5fd; margin: 0 0 16px 0;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    ⚡ <strong>Instant Book:</strong> This booking has been automatically confirmed. Payment has already been collected.
                  </p>
                </div>
                ` : ''}
                
                <div style="background: #dcfce7; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0; margin: 0 0 20px 0;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #22c55e; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 24px;">✓</span>
                    </div>
                    <div>
                      <p style="margin: 0 0 4px 0; font-weight: 600; color: #166534; font-size: 16px;">Documents Complete</p>
                      <p style="margin: 0; color: #15803d; font-size: 14px;">All required documents have been submitted and approved</p>
                    </div>
                  </div>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Renter:</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${renter?.full_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Booking Dates:</td>
                      <td style="padding: 8px 0; color: #1f2937;">${startDate} - ${endDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Listing:</td>
                      <td style="padding: 8px 0; color: #1f2937;">${listingTitle}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  The booking is now fully compliant with all documentation requirements. You can proceed with confidence!
                </p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
                </div>
              </div>
              
              <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }

      // Also create an in-app notification for the host
      try {
        await supabaseClient.from("notifications").insert({
          user_id: booking.host_id,
          type: "document",
          title: "All Documents Approved",
          message: `All required documents for ${renter?.full_name || 'your renter'}'s booking of "${listingTitle}" have been verified and approved.`,
          link: "/dashboard",
        });
        logStep("In-app notification created for host", { host_id: booking.host_id });
      } catch (notifError: any) {
        logStep("Failed to create in-app notification", { error: notifError.message });
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
                    subject: `🎉 Booking Confirmed! - ${listingTitle}`,
                    html: `
                      <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                          <h1 style="color: white; margin: 0; font-size: 22px;">Booking Confirmed! 🎉</h1>
                        </div>
                        
                        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                            Hi ${renter.full_name || 'there'},
                          </p>
                          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Great news! All your documents have been approved and your Instant Book for <strong>${listingTitle}</strong> is now confirmed!
                          </p>
                          
                          <div style="background: #dcfce7; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0; margin: 0 0 20px 0; text-align: center;">
                            <p style="margin: 0 0 4px 0; font-weight: 600; color: #166534; font-size: 18px;">✓ Booking Confirmed</p>
                            <p style="margin: 0; color: #15803d; font-size: 14px;">Your reservation is all set!</p>
                          </div>
                          
                          <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Listing:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${listingTitle}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Dates:</td>
                                <td style="padding: 8px 0; color: #1f2937;">${startDate} - ${endDate}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Total Paid:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">$${booking.total_price.toFixed(2)}</td>
                              </tr>
                            </table>
                          </div>
                          
                          <div style="text-align: center;">
                            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Booking Details</a>
                          </div>
                        </div>
                        
                        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                          <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                          <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
                        </div>
                      </div>
                    `,
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
                subject: `✅ All Documents Approved - ${listingTitle}`,
                html: `
                  <div style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 22px;">All Documents Verified! 🎉</h1>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                        Hi ${host.full_name || 'there'},
                      </p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Great news! All required documents for <strong>${renter?.full_name || 'your renter'}</strong>'s booking of <strong>${listingTitle}</strong> have been verified and approved.
                      </p>
                      
                      ${isInstantBook ? `
                      <div style="background: #dbeafe; border-radius: 8px; padding: 12px; border: 1px solid #93c5fd; margin: 0 0 16px 0;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                          ⚡ <strong>Instant Book:</strong> This booking has been automatically confirmed.
                        </p>
                      </div>
                      ` : ''}
                      
                      <div style="background: #dcfce7; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0; margin: 0 0 20px 0; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-weight: 600; color: #166534; font-size: 18px;">✓ Documents Complete</p>
                        <p style="margin: 0; color: #15803d; font-size: 14px;">All required documents have been submitted and approved</p>
                      </div>
                      
                      <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin: 0 0 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Renter:</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${renter?.full_name || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Booking Dates:</td>
                            <td style="padding: 8px 0; color: #1f2937;">${startDate} - ${endDate}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Listing:</td>
                            <td style="padding: 8px 0; color: #1f2937;">${listingTitle}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        The booking is now fully compliant with all documentation requirements.
                      </p>
                      
                      <div style="text-align: center;">
                        <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
                      </div>
                    </div>
                    
                    <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                      <p style="margin: 0 0 8px 0;">Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a></p>
                      <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
                    </div>
                  </div>
                `,
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
            from: "VendiBook <noreply@updates.vendibook.com>",
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
