import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";
import { getCaller, isBackendCaller } from "../_shared/callerGuard.ts";
import { adminAlertEmails } from "../_shared/adminRecipients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface NotificationRequest {
  type: string;
  data: Record<string, any>;
}

const ADMIN_EMAILS = adminAlertEmails();

const keys = (...k: string[]) => new Set(k);
const BROWSER_TYPES: Record<string, { signedIn: boolean; keys: Set<string> }> = {
  newsletter_signup: { signedIn: false, keys: keys("email", "first_name", "source_page", "source") },
  freight_quote_request: {
    signedIn: false,
    keys: keys("pickup_location", "delivery_location", "equipment_type", "year", "dimensions", "weight",
      "runs_and_drives", "preferred_pickup", "deliver_by", "contact_name", "contact_email", "contact_phone",
      "account", "notes", "source_page"),
  },
  new_listing: {
    signedIn: true,
    keys: keys("listing_id", "listing_title", "title", "category", "mode", "price", "city", "state",
      "host_email", "host_name", "user_id", "published_at", "listing_url", "price_daily", "price_sale",
      "address", "host_id", "source"),
  },
  new_user: {
    signedIn: true,
    keys: keys("email", "full_name", "first_name", "last_name", "phone_number", "role", "provider", "user_id", "source"),
  },
};
const deny = (status: number) =>
  new Response(JSON.stringify({ error: status === 401 ? "Unauthorized" : "Forbidden" }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed: NotificationRequest = await req.json();
    let type = typeof parsed?.type === "string" ? parsed.type : "";
    let data: Record<string, any> = parsed?.data && typeof parsed.data === "object" ? parsed.data : {};

    // Backend services and DB triggers (service role or x-cron-secret) may
    // send any alert. Browser callers are limited to the site forms that
    // legitimately raise alerts, with bounded, allowlisted fields.
    if (!(await isBackendCaller(req))) {
      const rule = BROWSER_TYPES[type];
      if (!rule) return deny(403);
      if (rule.signedIn && !(await getCaller(req))) return deny(401);
      data = Object.fromEntries(
        Object.entries(data)
          .filter(([k, v]) => rule.keys.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
          .map(([k, v]) => [k, String(v).slice(0, 500)]),
      );
    }

    const subjectMap: Record<string, string> = {
      new_user: "New Vendibook user signed up",
      new_booking: "New booking request",
      booking_paid: "Booking payment received",
      sale_payment: "Sale payment received",
      newsletter_signup: "New newsletter signup",
      new_listing: "New Vendibook listing published",
      featured_purchase: "Featured listing purchased ⭐",
      addon_purchase: "Add-on / upgrade purchased 💳",
      subscription_started: "New membership subscription 🎉",
      subscription_renewed: "Membership renewed 🔁",
      freight_quote_request: "New Vendibook Freight quote request 🚚",
      message_risk: "High-risk message flagged — review now",
      payments_alert: "Payment needs admin action",
      handoff_issue: "Handoff issue reported — review now",
    };

    const labelMap: Record<string, string> = {
      email: "Email",
      full_name: "Name",
      first_name: "First name",
      last_name: "Last name",
      phone_number: "Phone",
      role: "Role",
      provider: "Signup method",
      user_id: "User ID",
      listing_id: "Listing ID",
      listing_title: "Listing",
      listing_url: "Listing URL",
      title: "Title",
      category: "Category",
      mode: "Mode",
      price: "Price",
      city: "City",
      state: "State",
      host_email: "Owner email",
      host_name: "Owner name",
      published_at: "Published at",
      amount: "Amount paid",
      package: "Package",
      start_date: "Start date",
      end_date: "End date",
      stripe_payment_id: "Stripe payment ID",
      featured_source: "Source",
      product_name: "Product",
      product_slug: "Product slug",
      promo_type: "Promotion",
      duration_days: "Duration (days)",
      purchase_id: "Purchase ID",
      tier: "Membership tier",
      billing_interval: "Billing interval",
      paypal_subscription_id: "PayPal subscription ID",
      paypal_order_id: "PayPal order ID",
      provider: "Payment provider",
      next_billing_time: "Next billing",
      pickup_location: "Pickup",
      delivery_location: "Delivery",
      equipment_type: "Equipment",
      year: "Year",
      dimensions: "Dimensions",
      weight: "Approx. weight",
      runs_and_drives: "Runs and drives",
      preferred_pickup: "Preferred pickup",
      deliver_by: "Deliver by",
      contact_name: "Contact name",
      contact_email: "Contact email",
      contact_phone: "Contact phone",
      account: "Account",
      notes: "Notes",
      source_page: "Source page",
    };

    const details = Object.entries(data || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => ({
        label: labelMap[k] || k.replace(/_/g, " "),
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
        mono: k.endsWith("_id") || k === "email" || k === "host_email" || k === "contact_email",
      }));

    const results = await Promise.all(ADMIN_EMAILS.map(async (recipient) => {
      const r = await sendTransactionalEmailInternal({
        templateName: "generic-notice",
        recipientEmail: recipient,
        idempotencyKey: `admin-notify-${type}-${recipient}-${Date.now()}`,
        templateData: {
          subject: subjectMap[type] || `Admin notification: ${type}`,
          preview: subjectMap[type] || type,
          kicker: "Admin alert",
          heading: subjectMap[type] || type,
          paragraphs: ["This is a real-time Vendibook event notification."],
          details,
          ctaLabel: "Open admin",
          ctaUrl:
            type === "freight_quote_request"
              ? "https://vendibook.com/admin/freight"
              : "https://vendibook.com/admin",
        },
      });
      if (!r.ok) {
        throw new Error(`transactional email send failed for ${recipient} (${r.status}): ${r.body}`);
      }
    }));


    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-admin-notification error", e);
    return new Response(JSON.stringify({ error: "Notification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
