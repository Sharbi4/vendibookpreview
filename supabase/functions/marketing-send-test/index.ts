// marketing-send-test — Renders and sends a single test email to MARKETING_TEST_EMAIL
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { renderVendibookReport, DEFAULT_TOOLS } from "../_shared/marketing-templates/vendibook-report.ts";
import {
  FROM_EMAIL, FROM_NAME, REPLY_TO_EMAIL, LOGO_DARK_URL, LOGO_LIGHT_URL,
  MAILING_ADDRESS, VENDIBOOK_BASE_URL, FEEDBACK_REDIRECT_URL, UNSUBSCRIBE_URL_BASE,
} from "../_shared/marketing-templates/constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dateLabel(d = new Date()): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sendId } = await req.json();
    if (!sendId) throw new Error("sendId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: send, error } = await supabase
      .from("email_sends").select("*").eq("id", sendId).maybeSingle();
    if (error || !send) throw new Error("Send draft not found");

    const payload = send.composed_payload ?? {};
    const testEmail = Deno.env.get("MARKETING_TEST_EMAIL");
    if (!testEmail) throw new Error("MARKETING_TEST_EMAIL not configured");

    const html = renderVendibookReport({
      issueNumber: send.issue_number,
      dateLabel: dateLabel(),
      heroHeadline: send.hero_headline,
      saleListings: payload.saleListings ?? [],
      featuredRental: payload.featuredRental ?? null,
      referralRotation: (send.referral_rotation ?? "purchase") as any,
      tools: (payload.tools && payload.tools.length >= 3 ? payload.tools : DEFAULT_TOOLS.slice(0, 6)),
      insightTitle: payload.insight?.title ?? "",
      insightPullQuote: payload.insight?.pullQuote ?? "",
      insightBody: payload.insight?.body ?? "",
      saleSectionLabel: payload.sectionLabelSale ?? send.section_label_sale ?? undefined,
      rentalSectionLabel: payload.sectionLabelRental ?? send.section_label_rental ?? undefined,
      listingsReplacement: payload.listingsReplacement ?? null,
      rentalReplacement: payload.rentalReplacement ?? null,
      expandTools: !!payload.meta?.bothThin,
      recipientEmail: testEmail,
      sendId: send.id,
      unsubscribeUrl: `${UNSUBSCRIBE_URL_BASE}?e=${encodeURIComponent(testEmail)}`,
      feedbackBaseUrl: FEEDBACK_REDIRECT_URL,
      logoLightUrl: LOGO_LIGHT_URL,
      logoDarkUrl: LOGO_DARK_URL,
      baseUrl: VENDIBOOK_BASE_URL,
      mailingAddress: MAILING_ADDRESS,
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const subject = `[TEST] ${send.subject_line}`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [testEmail],
        subject,
        html,
        reply_to: REPLY_TO_EMAIL,
        tags: [
          { name: "type", value: "marketing_test" },
          { name: "edition", value: String(send.issue_number) },
        ],
      }),
    });
    const result = await r.json();
    if (!r.ok) {
      console.error("Resend test send failed", result);
      throw new Error(result?.message || "Resend error");
    }

    await supabase.from("email_test_sends").insert({
      send_id: sendId,
      recipient_email: testEmail,
    });
    await supabase.from("email_sends").update({
      status: "test_sent",
      test_message_id: result.id ?? null,
    }).eq("id", sendId);

    return new Response(JSON.stringify({ ok: true, recipient: testEmail, resendId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-send-test error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
