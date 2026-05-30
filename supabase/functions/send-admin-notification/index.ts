import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_user" | "new_booking" | "booking_paid" | "sale_payment" | "newsletter_signup" | "new_listing";
  data: Record<string, any>;
}

const ADMIN_EMAIL = "support@vendibook.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { type, data }: NotificationRequest = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-daily-digest",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `admin-notify-${type}-${Date.now()}`,
        templateData: {
          subject: subjectMap[type] || `Admin notification: ${type}`,
          summary: subjectMap[type] || type,
          details: lines,
        },
      },
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-admin-notification error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
