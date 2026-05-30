// marketing-cron-tick — Automated Vendibook Report scheduler.
// Called by pg_cron Tue/Sat 13:00 UTC (send_test) and 13:15 UTC (verify_and_broadcast).
// Always sends *something* — never cancels a scheduled send when supply is thin.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { FROM_EMAIL, FROM_NAME, REPLY_TO_EMAIL } from "../_shared/marketing-templates/constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("MARKETING_TEST_EMAIL") || "support@vendibook.com";

async function invoke(path: string, body: unknown) {
  return await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
}

function dayLabel(): "tuesday" | "saturday" | "manual" {
  const d = new Date().getUTCDay();
  if (d === 2) return "tuesday";
  if (d === 6) return "saturday";
  return "manual";
}

function todayWindow(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(start.getTime() + 86400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function alertAdmin(supabase: any, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: `[Vendibook Report] ${subject}`,
        html,
        reply_to: REPLY_TO_EMAIL,
        tags: [{ name: "type", value: "ops_alert" }],
      }),
    });
  } catch (e) {
    console.error("alertAdmin failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action } = await req.json().catch(() => ({ action: "send_test" }));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

    const sendDay = dayLabel();
    const { start, end } = todayWindow();

    // ───────── ACTION 1: send_test ─────────
    if (action === "send_test") {
      // Skip if a test already exists today
      const { data: existing } = await supabase
        .from("email_sends")
        .select("id,status")
        .gte("created_at", start).lt("created_at", end)
        .eq("automation_source", "cron")
        .limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ ok: true, skipped: "already_created", id: existing[0].id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Fetch content with fallback logic
      const contentRes = await invoke("marketing-fetch-content", {});
      if (!contentRes.ok) throw new Error("fetch-content failed: " + (await contentRes.text()));
      const content = await contentRes.json();

      const subject = "This Week on Vendibook — Fresh Listings Inside";
      const hero = content.listingsReplacement
        ? "Fresh opportunities on Vendibook"
        : "This week on Vendibook";

      // 2. Create draft send with composed payload + fallback flags
      const { data: created, error: cErr } = await supabase
        .from("email_sends")
        .insert({
          subject_line: subject,
          hero_headline: hero,
          status: "draft",
          send_day: sendDay,
          automation_source: "cron",
          section_label_sale: content.sectionLabelSale ?? null,
          section_label_rental: content.sectionLabelRental ?? null,
          used_fallback_listings: !!content.meta?.usedFallbackListings,
          used_fallback_rental: !!content.meta?.usedFallbackRental,
          listings_section_replaced: !!content.meta?.listingsSectionReplaced,
          rental_section_replaced: !!content.meta?.rentalSectionReplaced,
          composed_payload: {
            saleListings: content.saleListings,
            featuredRental: content.featuredRental,
            sectionLabelSale: content.sectionLabelSale,
            sectionLabelRental: content.sectionLabelRental,
            listingsReplacement: content.listingsReplacement,
            rentalReplacement: content.rentalReplacement,
            meta: content.meta,
            insight: {
              title: "From the field",
              pullQuote: "Listings move fast — first to reach out usually wins.",
              body: "Whether you're hunting equipment to buy or a space to rent, the speed of your outreach is the single biggest factor in landing the deal.",
            },
          },
        })
        .select("*")
        .single();
      if (cErr) throw cErr;

      // 3. Send test email
      const testRes = await invoke("marketing-send-test", { sendId: created.id });
      if (!testRes.ok) {
        const errBody = await testRes.text();
        await supabase.from("email_sends").update({ status: "broadcast_failed" }).eq("id", created.id);
        await alertAdmin(supabase, "Test send failed", `<p>Cron test send failed.</p><pre>${errBody}</pre>`);
        throw new Error("send-test failed: " + errBody);
      }

      return new Response(JSON.stringify({ ok: true, sendId: created.id, fallbackFlags: content.meta }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───────── ACTION 2: verify_and_broadcast ─────────
    if (action === "verify_and_broadcast") {
      const { data: candidates } = await supabase
        .from("email_sends")
        .select("*")
        .gte("created_at", start).lt("created_at", end)
        .eq("automation_source", "cron")
        .eq("status", "test_sent");

      if (!candidates || candidates.length === 0) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_pending_send" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const send = candidates[0];

      // Verify the test message status via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      let delivered = false;
      let resendStatus = "unknown";
      if (send.test_message_id && RESEND_API_KEY) {
        try {
          const vr = await fetch(`https://api.resend.com/emails/${send.test_message_id}`, {
            headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
          });
          if (vr.ok) {
            const data = await vr.json();
            resendStatus = data.last_event ?? data.status ?? "unknown";
            // Resend reports "delivered" once accepted by recipient MX, otherwise "sent" within first minutes
            delivered = ["delivered", "sent", "queued"].includes(resendStatus) && resendStatus !== "bounced";
            if (resendStatus === "bounced" || resendStatus === "failed") delivered = false;
          }
        } catch (e) {
          console.warn("verify error", e);
        }
      } else {
        // If we can't verify, assume safe to send (better than going dark)
        delivered = true;
      }

      if (!delivered) {
        await supabase.from("email_sends").update({ status: "broadcast_failed" }).eq("id", send.id);
        await alertAdmin(supabase, "Broadcast halted — test bounced", `
          <p>The Vendibook Report test send did not deliver. Broadcast was halted.</p>
          <p>Send ID: <code>${send.id}</code><br/>Resend status: <code>${resendStatus}</code></p>
        `);
        return new Response(JSON.stringify({ ok: false, halted: true, resendStatus }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Approve + broadcast
      await supabase.from("email_sends").update({ status: "test_approved" }).eq("id", send.id);
      const bRes = await invoke("marketing-send-broadcast", { sendId: send.id });
      const bBody = await bRes.json().catch(() => ({}));
      if (!bRes.ok) {
        await supabase.from("email_sends").update({ status: "broadcast_failed" }).eq("id", send.id);
        await alertAdmin(supabase, "Broadcast failed", `<pre>${JSON.stringify(bBody)}</pre>`);
        return new Response(JSON.stringify({ ok: false, error: bBody }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, sendId: send.id, broadcast: bBody }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-cron-tick error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
