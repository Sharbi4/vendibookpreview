import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";
import { getCaller, isBackendCaller, serviceRoleClient } from "../_shared/callerGuard.ts";
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
// Browser callers can only raise alerts for records that were already saved.
// Signed-in types still require a verified session; public form types
// (newsletter, freight quote) are rebuilt from the saved row server-side, so
// a request body can never choose the email content, and each saved record
// alerts the team at most once.
const SIGNED_IN_TYPES: Record<string, Set<string>> = {
  new_listing: keys("listing_id", "listing_title", "title", "category", "mode", "price", "city", "state",
    "host_email", "host_name", "user_id", "published_at", "listing_url", "price_daily", "price_sale",
    "address", "host_id", "source"),
  new_user: keys("email", "full_name", "first_name", "last_name", "phone_number", "role", "provider", "user_id", "source"),
};
const RECORD_TYPES = new Set(["newsletter_signup", "freight_quote_request"]);
const RECENT_MS = 30 * 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSavedRecord(type: string, input: Record<string, any>): Promise<{ data: Record<string, any>; dedupe: string } | null> {
  const db = serviceRoleClient();
  const since = new Date(Date.now() - RECENT_MS).toISOString();
  if (type === "newsletter_signup") {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 320) : "";
    if (!email) return null;
    const { data: row } = await db.from("newsletter_subscribers")
      .select("id, email, source, created_at")
      .ilike("email", email.replace(/[%_\\]/g, (c) => `\\${c}`))
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return null;
    return { data: { email: row.email, source: row.source ?? "" }, dedupe: `newsletter-${row.id}` };
  }
  if (type === "freight_quote_request") {
    const id = typeof input.freight_request_id === "string" ? input.freight_request_id.trim() : "";
    if (!UUID_RE.test(id)) return null;
    const { data: r } = await db.from("freight_requests").select("*").eq("id", id).gte("created_at", since).maybeSingle();
    if (!r) return null;
    const dims = [r.length_ft && `${r.length_ft} ft L`, r.width_ft && `${r.width_ft} ft W`, r.height_ft && `${r.height_ft} ft H`]
      .filter(Boolean).join(" × ");
    return {
      data: {
        contact_name: r.contact_name, contact_email: r.contact_email, contact_phone: r.contact_phone,
        account: r.user_id ? `Signed in (${r.user_id})` : "Guest (not signed in)",
        pickup_location: [r.pickup_street, r.pickup_city, r.pickup_state, r.pickup_zip].filter(Boolean).join(", ") || r.pickup_location,
        pickup_property: r.pickup_property_type,
        delivery_location: [r.delivery_street, r.delivery_city, r.delivery_state, r.delivery_zip].filter(Boolean).join(", ") || r.delivery_location,
        delivery_property: r.delivery_property_type,
        transport: r.transport_type,
        equipment_type: r.equipment_type, year: r.year, dimensions: dims,
        weight: r.weight_lbs ? `${r.weight_lbs} lbs` : "", runs_and_drives: r.runs_and_drives,
        preferred_pickup: r.pickup_date, deliver_by: r.deliver_by_date, notes: r.notes,
        source_page: r.source_page, freight_request_id: r.id,
      },
      dedupe: `freight-${r.id}`,
    };
  }
  return null;
}
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
    let dedupeKey: string | null = null;
    if (!(await isBackendCaller(req))) {
      if (RECORD_TYPES.has(type)) {
        const saved = await loadSavedRecord(type, data);
        if (!saved) return deny(403);
        data = saved.data;
        dedupeKey = saved.dedupe;
      } else {
        const allowed = SIGNED_IN_TYPES[type];
        if (!allowed) return deny(403);
        if (!(await getCaller(req))) return deny(401);
        data = Object.fromEntries(
          Object.entries(data)
            .filter(([k, v]) => allowed.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
            .map(([k, v]) => [k, String(v).slice(0, 500)]),
        );
      }
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
        idempotencyKey: dedupeKey ? `admin-notify-${dedupeKey}-${recipient}` : `admin-notify-${type}-${recipient}-${Date.now()}`,
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
