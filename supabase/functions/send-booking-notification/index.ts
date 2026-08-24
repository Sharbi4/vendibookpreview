// Routes booking-event notifications through the Lovable Emails queue using the
// premium Satin Lux `generic-notice` template. No direct Resend usage.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  booking_id: string;
  event_type: "submitted" | "approved" | "declined" | "hold_released" | "hold_expired" | "paid";
  host_response?: string;
  reason?: string;
}

const SITE_URL = "https://vendibook.com";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[BOOKING-NOTIFICATION] ${step}${detailsStr}`);
};

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
interface QueuedEmail {
  to: string;
  subject: string;
  payload: {
    subject: string;
    kicker?: string;
    heading?: string;
    greeting?: string;
    paragraphs?: string[];
    details?: { label: string; value: string; mono?: boolean }[];
    alert?: { tone?: Tone; title?: string; body: string };
    ctaLabel?: string;
    ctaUrl?: string;
  };
  idempotencyKey: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { booking_id, event_type, host_response, reason }: NotificationRequest = await req.json();
    logStep("Request received", { booking_id, event_type });
    if (!booking_id || !event_type) throw new Error("Missing booking_id or event_type");

    const { data: booking, error: bookingError } = await supabase
      .from("booking_requests").select("*").eq("id", booking_id).single();
    if (bookingError || !booking) throw new Error(`Failed to fetch booking: ${bookingError?.message}`);

    const { data: listing } = await supabase
      .from("listings").select("title, address, fulfillment_type").eq("id", booking.listing_id).single();
    const { data: shopper } = await supabase
      .from("profiles").select("email, full_name").eq("id", booking.shopper_id).single();
    const { data: host } = await supabase
      .from("profiles").select("email, full_name").eq("id", booking.host_id).single();

    const listingTitle = listing?.title || "your listing";
    const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const startDate = fmt(booking.start_date);
    const endDate = fmt(booking.end_date);
    const bookingRef = booking.id.substring(0, 8).toUpperCase();

    const { data: hostPrefs } = await supabase
      .from("notification_preferences").select("*").eq("user_id", booking.host_id).maybeSingle();
    const { data: shopperPrefs } = await supabase
      .from("notification_preferences").select("*").eq("user_id", booking.shopper_id).maybeSingle();

    const hostWantsRequest = hostPrefs?.booking_request_email !== false;
    const shopperWantsRequest = shopperPrefs?.booking_request_email !== false;
    const hostWantsInapp = hostPrefs?.booking_request_inapp !== false;
    const shopperWantsInapp = shopperPrefs?.booking_response_inapp !== false;

    const emails: QueuedEmail[] = [];
    const inApp: { user_id: string; type: string; title: string; message: string; link: string }[] = [];

    const baseDetails = [
      { label: "Booking", value: `#${bookingRef}`, mono: true },
      { label: "Listing", value: listingTitle },
      { label: "Dates", value: `${startDate} → ${endDate}` },
    ];

    if (event_type === "submitted") {
      if (host?.email && hostWantsRequest) {
        emails.push({
          to: host.email,
          subject: `New booking request · ${listingTitle} · #${bookingRef}`,
          payload: {
            subject: `New booking request · #${bookingRef}`,
            kicker: "New request",
            heading: "You have a new booking request.",
            greeting: `From ${shopper?.full_name || "a guest"}`,
            paragraphs: ["Please review and respond within 24 hours to keep your response rate high."],
            details: [
              ...baseDetails,
              { label: "Total", value: `$${Number(booking.total_price).toFixed(2)}` },
              ...(booking.message ? [{ label: "Message", value: booking.message }] : []),
            ],
            ctaLabel: "Review request",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-submitted-host`,
        });
      }
      if (hostWantsInapp) {
        inApp.push({
          user_id: booking.host_id, type: "booking_request",
          title: `New Booking Request #${bookingRef}`,
          message: `${shopper?.full_name || "Someone"} requested ${listingTitle} from ${startDate} to ${endDate}`,
          link: "/dashboard",
        });
      }
      if (shopper?.email && shopperWantsRequest) {
        emails.push({
          to: shopper.email,
          subject: `Booking request submitted · #${bookingRef}`,
          payload: {
            subject: `Booking request submitted · #${bookingRef}`,
            kicker: "Request submitted",
            heading: "We sent your request to the host.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`Your request for ${listingTitle} is in. You'll get an email the moment the host responds.`],
            details: [...baseDetails, { label: "Total", value: `$${Number(booking.total_price).toFixed(2)}` }],
            ctaLabel: "View status",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-submitted-guest`,
        });
      }
    } else if (event_type === "approved") {
      const depositAmount = booking.deposit_amount || 0;
      const totalDue = Number(booking.total_price) + Number(depositAmount);
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Approved — complete payment · #${bookingRef}`,
          payload: {
            subject: `Approved — complete payment · #${bookingRef}`,
            kicker: "Approved",
            heading: "Your booking is approved — pay to confirm.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`The host approved ${listingTitle}. Complete payment now to lock in your dates.`],
            details: [
              ...baseDetails,
              { label: "Rental total", value: `$${Number(booking.total_price).toFixed(2)}` },
              ...(depositAmount > 0 ? [{ label: "Refundable deposit", value: `$${Number(depositAmount).toFixed(2)}` }] : []),
              { label: "Due now", value: `$${totalDue.toFixed(2)}` },
            ],
            alert: host_response
              ? { tone: "info", title: "Message from host", body: host_response }
              : { tone: "warning", title: "Action required", body: "Your dates are not held until payment is received." },
            ctaLabel: `Complete payment · $${totalDue.toFixed(2)}`,
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-approved-guest`,
        });
      }
      if (host?.email && hostWantsRequest) {
        emails.push({
          to: host.email,
          subject: `You approved a booking · #${bookingRef}`,
          payload: {
            subject: `You approved a booking · #${bookingRef}`,
            kicker: "Approval sent",
            heading: "Approval sent to the guest.",
            paragraphs: [`${shopper?.full_name || "The guest"} now has a payment link for ${listingTitle}. We'll email you the moment payment clears and the dates are locked in.`],
            details: [
              ...baseDetails,
              { label: "Guest", value: shopper?.full_name || "A shopper" },
              { label: "Rental total", value: `$${Number(booking.total_price).toFixed(2)}` },
            ],
            alert: { tone: "info", title: "Dates not yet locked", body: "The calendar holds these dates until the guest completes payment." },
            ctaLabel: "View booking",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-approved-host`,
        });
      }
      inApp.push({
        user_id: booking.shopper_id, type: "booking_approved",
        title: `💳 Booking #${bookingRef} Approved — Payment Required`,
        message: `Your booking for ${listingTitle} has been approved. Complete payment to confirm.`,
        link: "/dashboard",
      });

    } else if (event_type === "declined") {
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Booking update · #${bookingRef}`,
          payload: {
            subject: `Booking update · #${bookingRef}`,
            kicker: "Update",
            heading: "Your booking wasn't approved this time.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`The host could not approve your request for ${listingTitle} for ${startDate} → ${endDate}. Your card was not charged.`],
            ...(host_response ? { alert: { tone: "info" as Tone, title: "Message from host", body: host_response } } : {}),
            ctaLabel: "Browse similar listings",
            ctaUrl: `${SITE_URL}/search`,
          },
          idempotencyKey: `booking-${booking_id}-declined-guest`,
        });
      }
      if (host?.email && hostWantsRequest) {
        emails.push({
          to: host.email,
          subject: `You declined a request · #${bookingRef}`,
          payload: {
            subject: `Request declined · #${bookingRef}`,
            kicker: "Declined",
            heading: "You declined this booking request.",
            paragraphs: [`We let ${shopper?.full_name || "the guest"} know their request for ${listingTitle} (${startDate} → ${endDate}) wasn't approved. No charge was made.`],
            details: baseDetails,
            ...(host_response ? { alert: { tone: "info" as Tone, title: "Message you sent", body: host_response } } : {}),
            ctaLabel: "Manage calendar",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-declined-host`,
        });
      }
      inApp.push({
        user_id: booking.shopper_id, type: "booking_declined",
        title: `Booking #${bookingRef} Declined`,
        message: `Your booking request for ${listingTitle} was not approved${host_response ? `: "${host_response}"` : ""}`,
        link: "/dashboard",
      });

    } else if (event_type === "hold_released") {
      const releaseReason = reason || host_response || "The host was unable to approve your booking.";
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Payment hold released · #${bookingRef}`,
          payload: {
            subject: `Payment hold released · #${bookingRef}`,
            kicker: "Hold released",
            heading: "Your card will not be charged.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`The authorization hold for ${listingTitle} has been released. Any pending charge will disappear from your statement within 3–5 business days.`],
            details: [{ label: "Booking", value: `#${bookingRef}`, mono: true }, { label: "Reason", value: releaseReason }],
            alert: { tone: "success", title: "No charge", body: "The pending authorization has been voided." },
            ctaLabel: "Browse other listings",
            ctaUrl: `${SITE_URL}/search`,
          },
          idempotencyKey: `booking-${booking_id}-hold-released`,
        });
      }
      inApp.push({
        user_id: booking.shopper_id, type: "payment_released",
        title: `Payment Hold Released — Booking #${bookingRef}`,
        message: `Your payment hold for ${listingTitle} has been released.`,
        link: "/dashboard",
      });
    } else if (event_type === "hold_expired") {
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Request expired — hold released · #${bookingRef}`,
          payload: {
            subject: `Request expired · #${bookingRef}`,
            kicker: "Expired",
            heading: "Your request expired without a host response.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`The host didn't respond in time, so the authorization hold for ${listingTitle} was released. Your card was not charged.`],
            details: baseDetails,
            alert: { tone: "success", title: "No charge", body: "Any pending hold will clear within 3–5 business days." },
            ctaLabel: "Find another listing",
            ctaUrl: `${SITE_URL}/search`,
          },
          idempotencyKey: `booking-${booking_id}-expired-guest`,
        });
      }
      if (host?.email) {
        emails.push({
          to: host.email,
          subject: `Booking request expired · #${bookingRef}`,
          payload: {
            subject: `Booking request expired · #${bookingRef}`,
            kicker: "Expired",
            heading: "A request expired before you could respond.",
            paragraphs: [`The request for ${listingTitle} from ${shopper?.full_name || "a guest"} timed out.`],
            details: baseDetails,
            alert: { tone: "warning", title: "Tip", body: "Responding within 24 hours protects your response rate and ranking." },
            ctaLabel: "Go to dashboard",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-expired-host`,
        });
      }
      inApp.push(
        { user_id: booking.shopper_id, type: "booking_expired", title: `Booking #${bookingRef} Expired`, message: `Your request for ${listingTitle} expired. Hold released.`, link: "/dashboard" },
        { user_id: booking.host_id, type: "booking_expired", title: `Request #${bookingRef} Expired`, message: `A request for ${listingTitle} expired without a response.`, link: "/dashboard" }
      );
    } else if (event_type === "paid") {
      if (host?.email && hostWantsRequest) {
        emails.push({
          to: host.email,
          subject: `Payment received — booking confirmed · #${bookingRef}`,
          payload: {
            subject: `Payment received · #${bookingRef}`,
            kicker: "Payment received",
            heading: "The booking is fully confirmed.",
            paragraphs: [`Payment came through for ${listingTitle}. Your payout will be released 24 hours after the rental concludes.`],
            details: [
              ...baseDetails,
              { label: "Guest", value: shopper?.full_name || "A shopper" },
              { label: "Amount paid", value: `$${Number(booking.total_price).toFixed(2)}` },
            ],
            alert: { tone: "success", title: "Locked in", body: "You're all set — just deliver an amazing experience." },
            ctaLabel: "View booking",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-paid-host`,
        });
      }
      if (hostWantsInapp) {
        inApp.push({
          user_id: booking.host_id, type: "booking_paid",
          title: `💰 Payment Received — Booking #${bookingRef}`,
          message: `${shopper?.full_name || "A guest"} paid $${booking.total_price} for ${listingTitle}.`,
          link: "/dashboard",
        });
      }
      if (shopper?.email && shopperWantsRequest) {

        emails.push({
          to: shopper.email,
          subject: `Booking confirmed · ${listingTitle} · #${bookingRef}`,
          payload: {
            subject: `Booking confirmed · #${bookingRef}`,
            kicker: "Confirmed",
            heading: "Your dates are locked in.",
            greeting: `Hi ${shopper.full_name?.split(" ")[0] || "there"},`,
            paragraphs: [`Payment received for ${listingTitle}. The host has been notified and your booking is fully confirmed.`],
            details: [
              ...baseDetails,
              { label: "Host", value: host?.full_name || "Your host" },
              { label: "Amount paid", value: `$${Number(booking.total_price).toFixed(2)}` },
            ],
            alert: { tone: "success", title: "You're all set", body: "We'll send a reminder 24 hours before your rental starts." },
            ctaLabel: "View booking",
            ctaUrl: `${SITE_URL}/dashboard`,
          },
          idempotencyKey: `booking-${booking_id}-paid-guest`,
        });
      }
      if (shopperWantsInapp) {
        inApp.push({
          user_id: booking.shopper_id, type: "booking_confirmed",
          title: `✅ Booking #${bookingRef} Confirmed`,
          message: `Your booking for ${listingTitle} (${startDate} → ${endDate}) is confirmed.`,
          link: "/dashboard",
        });
      }
    }


    // In-app notifications + push
    for (const notif of inApp) {
      try {
        await supabase.from("notifications").insert(notif);
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ user_id: notif.user_id, title: notif.title, body: notif.message, url: notif.link, tag: `booking-${booking_id}` }),
        }).catch(() => {});
      } catch (e: any) { logStep("In-app notif failed", { error: e.message }); }
    }

    // Send all emails through the Lovable Emails queue
    const results: { to: string; success: boolean; error?: string }[] = [];
    for (const e of emails) {
      try {
        const { error } = await invokeTransactionalEmail({
            templateName: "generic-notice",
            recipientEmail: e.to,
            idempotencyKey: e.idempotencyKey,
            templateData: e.payload,
          });
        if (error) throw error;
        results.push({ to: e.to, success: true });
        logStep("Queued via Lovable Emails", { to: e.to, subject: e.subject });
      } catch (err: any) {
        results.push({ to: e.to, success: false, error: err.message });
        logStep("Queue failed", { to: e.to, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
