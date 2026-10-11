import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackRequest {
  name: string;
  phone?: string;
  email?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  restaurantName?: string;
  source?: string;
  preferredTime?: string;
  preferredContact?: "phone" | "email";
}

const SUPPORT_EMAILS = ["support@vendibook.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const data: CallbackRequest = await req.json();
    if (!data.name || (!data.phone && !data.email)) {
      return new Response(JSON.stringify({ error: "Name and contact method required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const summary = [
      `Name: ${data.name}`,
      data.phone && `Phone: ${data.phone}`,
      data.email && `Email: ${data.email}`,
      data.restaurantName && `Business: ${data.restaurantName}`,
      data.scheduledDate && `Date: ${data.scheduledDate}`,
      data.scheduledTime && `Time: ${data.scheduledTime}`,
      data.preferredTime && `Preferred time: ${data.preferredTime}`,
      data.preferredContact && `Preferred contact: ${data.preferredContact}`,
      data.source && `Source: ${data.source}`,
    ].filter(Boolean).join("\n");

    // Notify support team (silently forwarded to owner)
    for (const adminTo of SUPPORT_EMAILS) {
      await invokeTransactionalEmail({
          templateName: "support-reply",
          recipientEmail: adminTo,
          idempotencyKey: `callback-internal-${data.name}-${adminTo}-${Date.now()}`,
          templateData: {
            name: "Vendibook Support",
            subject: `Callback request from ${data.name}`,
            message: summary,
          },
        });
    }

    // Confirm to requester if email provided
    if (data.email) {
      await invokeTransactionalEmail({
          templateName: "support-reply",
          recipientEmail: data.email,
          idempotencyKey: `callback-confirm-${data.email}-${Date.now()}`,
          templateData: {
            name: data.name,
            subject: "We'll be in touch shortly",
            message: `Hi ${data.name}, we received your callback request and our team will reach out${data.scheduledTime ? ` around ${data.scheduledTime}` : " shortly"}.`,
          },
        });
    }

    // Outbound Vapi call if phone provided
    if (data.phone) {
      admin.functions.invoke("vapi-outbound-call", {
        body: { name: data.name, phone: data.phone },
      }).catch((e) => console.error("vapi-outbound-call failed", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("schedule-callback error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
