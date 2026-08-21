import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: string;
  data: Record<string, any>;
}

// Server-only recipient list. Override with the ADMIN_ALERT_EMAILS secret
// (comma separated). Never expose these addresses to the browser.
const DEFAULT_ADMIN_EMAILS = [
  "support@vendibook.com",
  "shawnnaharbin@vendibook.com",
  "atlasmom421@gmail.com",
];
const ADMIN_EMAILS = (() => {
  const raw = Deno.env.get("ADMIN_ALERT_EMAILS") ?? "";
  const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
  return [...new Set(list.length ? list : DEFAULT_ADMIN_EMAILS)];
})();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { type, data }: NotificationRequest = await req.json();

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
    };

    const details = Object.entries(data || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => ({
        label: labelMap[k] || k.replace(/_/g, " "),
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
        mono: k.endsWith("_id") || k === "email" || k === "host_email",
      }));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const results = await Promise.all(ADMIN_EMAILS.map(async (recipient) => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Internal server-to-server call: must be privileged so the
          // template allowlist gate in send-transactional-email passes.
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
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
            ctaUrl: "https://vendibook.com/admin",
          },
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`send-transactional-email failed for ${recipient} (${r.status}): ${errText}`);
      }
    }));


    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-admin-notification error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
