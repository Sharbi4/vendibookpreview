// Temporary self-test: sends one sample support ticket through the exact
// same server-side forwarding helper used by vapi-create-support-ticket.
// Recipient addresses are resolved server-side only and are never returned.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { forwardTicketToTawk } from "../_shared/tawkForward.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  if (url.searchParams.get("mode") === "domains") {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}` },
    });
    const body = await r.text();
    return new Response(body, { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const stamp = new Date().toISOString();
  const result = await forwardTicketToTawk({
    referenceCode: "VB-TEST-SELFCHECK",
    ticketId: "00000000-0000-0000-0000-000000000000",
    subject: "Test ticket — Vapi support ticket email delivery check",
    priority: "normal",
    category: "other",
    featureArea: "other",
    source: "vapi_callback",
    customerName: "Vendibook Test Caller",
    customerEmail: "test-caller@example.com",
    emailVerified: false,
    callbackPhone: "(866) 690-6227 (+18666906227)",
    bodyText: [
      "This is an automated TEST ticket generated to verify that Vapi-created",
      "support tickets are emailed to the private internal support inbox.",
      "",
      "No customer action is required. You can ignore or delete this message.",
      "",
      `Generated at: ${stamp}`,
    ].join("\n"),
    context: { test: true, generated_at: stamp, path: "vapi-create-support-ticket -> tawkForward" },
    callId: "test-call-selfcheck",
    callSummary: "Automated delivery self-test. No real caller involved.",
    replyTo: null,
  });

  // Deliberately returns status only — no recipient address, no provider body.
  return new Response(
    JSON.stringify({ status: result.status, provider_message_id: result.providerMessageId ?? null, error: result.error ?? null }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
