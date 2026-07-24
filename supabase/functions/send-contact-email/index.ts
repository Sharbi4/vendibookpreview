import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website?: string; // honeypot
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body: ContactRequest = await req.json();
    if (body.website && body.website.trim() !== "") {
      // honeypot triggered — silently accept
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (!body.email || !body.name || !body.message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Confirmation to the user
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "support-reply",
        recipientEmail: body.email,
        idempotencyKey: `contact-confirm-${body.email}-${Date.now()}`,
        templateData: {
          name: body.name,
          subject: body.subject || "Your message to Vendibook",
          message: "Thanks for reaching out. Our team will get back to you shortly.",
        },
      },
    });

    // Notify support (also silently forwarded to owner)
    for (const adminTo of ["support@vendibook.com"]) {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "support-reply",
          recipientEmail: adminTo,
          idempotencyKey: `contact-internal-${body.email}-${adminTo}-${Date.now()}`,
          templateData: {
            name: "Vendibook Support",
            subject: `New contact form: ${body.subject || "(no subject)"}`,
            message: `From: ${body.name} <${body.email}>${body.phone ? ` (${body.phone})` : ""}\n\n${body.message}`,
          },
        },
      });
    }

    // Trigger Vapi outbound callback if phone provided
    if (body.phone) {
      admin.functions.invoke("vapi-outbound-call", {
        body: { name: body.name, phone: body.phone },
      }).catch((e) => console.error("vapi-outbound-call failed", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-contact-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
