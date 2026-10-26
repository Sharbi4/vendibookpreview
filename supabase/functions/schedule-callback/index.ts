import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { getCaller } from "../_shared/callerGuard.ts";
import { adminAlertEmails, adminNoticeKey } from "../_shared/adminRecipients.ts";

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

    const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const name = clip(data.name, 200);
    const phone = clip(data.phone, 40);
    const email = clip(data.email, 320);
    const pageUrl = clip((data as any).page_url, 500) || req.headers.get("referer")?.slice(0, 500) || null;
    const lines = [
      `Name: ${name}`,
      phone && `Phone: ${phone}`,
      email && `Email: ${email}`,
      data.restaurantName && `Business: ${clip(data.restaurantName, 200)}`,
      data.scheduledDate && `Date: ${clip(data.scheduledDate, 60)}`,
      data.scheduledTime && `Time: ${clip(data.scheduledTime, 60)}`,
      data.preferredTime && `Preferred time: ${clip(data.preferredTime, 120)}`,
      data.preferredContact && `Preferred contact: ${clip(data.preferredContact, 20)}`,
      data.source && `Source: ${clip(data.source, 120)}`,
      pageUrl && `Page: ${pageUrl}`,
    ].filter(Boolean) as string[];

    // Save every request FIRST so details are never lost, even if email fails.
    const { data: ticket, error: ticketError } = await admin.from("support_tickets").insert({
      source: "system",
      submission_channel: "callback_form",
      feature_area: "other",
      category: "callback_request",
      priority: "high",
      title: `Callback request from ${name}`,
      description: lines.join("\n"),
      customer_name: name,
      customer_email: email || null,
      reply_email: email || null,
      callback_phone_display: phone || null,
      callback_phone_source: "website_form",
      page_url: pageUrl,
      browser_info: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    }).select("id, reference_code").single();
    if (ticketError || !ticket) {
      console.error("callback ticket insert failed", ticketError?.message ?? "no row");
      return new Response(JSON.stringify({ error: "Unable to submit your request. Please try again or call us." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Alert inboxes that actually receive mail (support@ alone is suppressed).
    for (const adminTo of adminAlertEmails()) {
      try {
        await invokeTransactionalEmail({
          templateName: "support-reply",
          recipientEmail: adminTo,
          idempotencyKey: adminNoticeKey(`callback-internal-${ticket.id}`, adminTo),
          templateData: {
            firstName: "Vendibook Support",
            subject: `Callback request from ${name}`,
            ticketNumber: ticket.reference_code,
            signedBy: "Vendibook callback form",
            signedTitle: "Automatic notice",
            bodyParagraphs: lines,
          },
        });
      } catch (e) {
        console.error("callback admin alert failed", e);
      }
    }

    // Confirmation emails and automatic calls only for signed-in members;
    // signed-out requests are handled by support from the alert above.
    const caller = await getCaller(req);

    // Confirm to requester if email provided
    if (data.email && caller) {
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
    if (data.phone && caller) {
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
