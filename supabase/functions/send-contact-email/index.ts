import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { getCaller } from "../_shared/callerGuard.ts";

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
    const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const name = clip(body.name, 200);
    const email = clip(body.email, 320);
    const phone = clip(body.phone, 40);
    const subject = clip(body.subject, 300);
    const message = clip(body.message, 5000);
    const pageUrl = clip((body as any).page_url, 500) || req.headers.get("referer")?.slice(0, 500) || null;
    if (!email || !name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const firstName = name.split(/\s+/)[0];

    // Store every submission so it can be traced in Admin → Support
    let reference = "";
    const { data: ticket, error: ticketError } = await admin.from("support_tickets").insert({
      source: "email",
      feature_area: "other",
      category: "contact_form",
      title: subject || "Contact form message",
      description: message,
      customer_name: name,
      customer_email: email,
      reply_email: email,
      callback_phone_display: phone || null,
      page_url: pageUrl,
      browser_info: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    }).select("id, reference_code").single();
    if (ticketError || !ticket) {
      // Fail closed: without a persisted ticket we must not acknowledge or notify.
      console.error("contact ticket insert failed", ticketError?.message ?? "no row returned");
      return new Response(JSON.stringify({ error: "Unable to submit your message. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    reference = ticket.reference_code;

    // Confirmation to the user
    await invokeTransactionalEmail({
        templateName: "support-reply",
        recipientEmail: email,
        idempotencyKey: `contact-confirm-${ticket?.id ?? `${email}-${Date.now()}`}`,
        templateData: {
          firstName,
          subject: subject || "Your message to Vendibook",
          ticketNumber: reference || undefined,
          bodyParagraphs: [
            "Thanks for reaching out. We received your message and our team will get back to you shortly.",
          ],
        },
      });

    // Notify support (also silently forwarded to owner)
    for (const adminTo of ["support@vendibook.com"]) {
      await invokeTransactionalEmail({
          templateName: "support-reply",
          recipientEmail: adminTo,
          idempotencyKey: `contact-internal-${ticket?.id ?? `${email}-${Date.now()}`}-${adminTo}`,
          templateData: {
            firstName: "Vendibook Support",
            subject: `New contact form: ${subject || "(no subject)"}`,
            ticketNumber: reference || undefined,
            signedBy: "Vendibook contact form",
            signedTitle: "Automatic notice",
            bodyParagraphs: [
              `From: ${name} <${email}>${phone ? ` · ${phone}` : ""}`,
              `Subject: ${subject || "(no subject)"}`,
              ...(pageUrl ? [`Page: ${pageUrl}`] : []),
              "Message:",
              ...message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
            ],
          },
        });
    }

    // Trigger Vapi outbound callback if phone provided
    // Automatic callbacks only for signed-in members; signed-out visitors'
    // numbers still reach support in the email above for a manual follow-up.
    const caller = body.phone ? await getCaller(req) : null;
    if (body.phone && caller) {
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
