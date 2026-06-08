import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_user" | "new_booking" | "booking_paid" | "sale_payment" | "newsletter_signup" | "new_listing";
  data: Record<string, any>;
}

const ADMIN_EMAILS = ["atlasmom421@gmail.com", "support@vendibook.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { type, data }: NotificationRequest = await req.json();

    const subjectMap: Record<string, string> = {
      new_user: "New user signed up",
      new_booking: "New booking request",
      booking_paid: "Booking payment received",
      sale_payment: "Sale payment received",
      newsletter_signup: "New newsletter signup",
      new_listing: "New listing published",
    };

    const lines = Object.entries(data || {})
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const results = await Promise.all(ADMIN_EMAILS.map(async (recipient) => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          templateName: "admin-daily-digest",
          recipientEmail: recipient,
          idempotencyKey: `admin-notify-${type}-${recipient}-${Date.now()}`,
          templateData: {
            subject: subjectMap[type] || `Admin notification: ${type}`,
            summary: subjectMap[type] || type,
            details: lines,
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
