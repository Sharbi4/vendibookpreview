// Logs frontend/backend non-2xx errors to public.error_events.
// - Generates a short "VB-xxxxxx" reference code for the user
// - Computes a fingerprint to dedupe repeated errors
// - Classifies HIGH priority for payment/boost/publish/upload/booking/support actions
// - On HIGH priority, sends one alert email per fingerprint per 30 minutes to support@vendibook.com
//
// IMPORTANT: routes admin alerts ONLY to support@vendibook.com per project rule.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// All error alerts route to the support inbox (owner override reverted 2026-07-24).
const ADMIN_EMAIL = "support@vendibook.com";
const ADMIN_CC_EMAIL = "support@vendibook.com";
const ALERT_COOLDOWN_MINUTES = 30;

const HIGH_PRIORITY_KEYWORDS = [
  "payment", "boost", "featured", "refund",
  "publish", "listing.publish", "visibility",
  "photo", "upload",
  "support", "escalation", "contact",
  "booking", "checkout",
];

function generateRefCode(): string {
  // VB-XXXXXX (6 chars, uppercase alphanumeric, ambiguous chars removed)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  for (const b of buf) s += alphabet[b % alphabet.length];
  return `VB-${s}`;
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function classifyPriority(action: string | null, endpoint: string | null, status: number | null): "high" | "normal" {
  const hay = `${action ?? ""} ${endpoint ?? ""}`.toLowerCase();
  if (HIGH_PRIORITY_KEYWORDS.some((k) => hay.includes(k))) return "high";
  if (status && status >= 500) return "high";
  return "normal";
}

function truncate(s: unknown, max = 2000): string | null {
  if (s == null) return null;
  const str = typeof s === "string" ? s : (() => { try { return JSON.stringify(s); } catch { return String(s); } })();
  return str.length > max ? str.slice(0, max) + "…[truncated]" : str;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const source = (body.source ?? "frontend") as string;
  const action = (body.action ?? null) as string | null;
  const endpoint = (body.endpoint ?? null) as string | null;
  const method = (body.method ?? null) as string | null;
  const statusCode = typeof body.status_code === "number" ? body.status_code : null;
  const errorType = (body.error_type ?? null) as string | null;
  const errorMessage = truncate(body.error_message);

  const priority = classifyPriority(action, endpoint, statusCode);

  // Fingerprint groups identical recurring errors for dedupe
  const fingerprint = await sha1Hex([
    source, action ?? "", endpoint ?? "", statusCode ?? "", errorType ?? "",
    (errorMessage ?? "").slice(0, 200),
  ].join("|"));

  const referenceCode = generateRefCode();

  // Pull user email if user_id provided
  let userEmail: string | null = body.user_email ?? null;
  if (!userEmail && body.user_id) {
    try {
      const { data } = await admin.from("profiles").select("email").eq("id", body.user_id).maybeSingle();
      if (data?.email) userEmail = data.email;
    } catch (_) { /* ignore */ }
  }

  const insertPayload = {
    reference_code: referenceCode,
    fingerprint,
    priority,
    source,
    action,
    endpoint,
    method,
    status_code: statusCode,
    page_url: body.page_url ?? null,
    user_id: body.user_id ?? null,
    user_email: userEmail,
    listing_id: body.listing_id ?? null,
    boost_id: body.boost_id ?? null,
    payment_id: body.payment_id ?? null,
    error_type: errorType,
    error_message: errorMessage,
    stack: truncate(body.stack, 4000),
    user_agent: truncate(body.user_agent, 500),
    session_id: body.session_id ?? null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  };

  const { data: inserted, error: insertErr } = await admin
    .from("error_events")
    .insert(insertPayload)
    .select("id, reference_code, fingerprint, priority")
    .single();

  if (insertErr) {
    console.error("[log-error-event] insert failed", insertErr);
    return new Response(JSON.stringify({ error: "insert_failed", details: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Alerting (HIGH only, dedupe by fingerprint + cooldown)
  let alertSent = false;
  if (priority === "high") {
    const cooldownStart = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60_000).toISOString();
    const { data: recent } = await admin
      .from("error_events")
      .select("id")
      .eq("fingerprint", fingerprint)
      .gte("alert_sent_at", cooldownStart)
      .limit(1);

    if (!recent || recent.length === 0) {
      const subject = `High Priority Vendibook Error: ${errorType ?? action ?? "unknown"}${userEmail ? ` for ${userEmail}` : ""}`;
      const details = [
        `Reference: ${referenceCode}`,
        `User: ${userEmail ?? "(unknown)"} ${body.user_id ? `[${body.user_id}]` : ""}`,
        `Listing: ${body.listing_id ?? "-"}`,
        `Payment/Boost: ${body.payment_id ?? body.boost_id ?? "-"}`,
        `Action: ${action ?? "-"}`,
        `Endpoint: ${method ?? ""} ${endpoint ?? "-"}`,
        `Status: ${statusCode ?? "-"}`,
        `Page: ${body.page_url ?? "-"}`,
        `When: ${new Date().toISOString()}`,
        ``,
        `Error: ${errorMessage ?? "-"}`,
        ``,
        `Admin dashboard: https://vendibook.com/admin/errors?ref=${referenceCode}`,
      ].join("\n");

      try {
        const idemBucket = Math.floor(Date.now() / (ALERT_COOLDOWN_MINUTES * 60_000));
        for (const recipient of Array.from(new Set([ADMIN_EMAIL, ADMIN_CC_EMAIL]))) {
          await invokeTransactionalEmail({
              templateName: "admin-daily-digest",
              recipientEmail: recipient,
              idempotencyKey: `error-alert-${fingerprint}-${idemBucket}-${recipient}`,
              templateData: { subject, summary: subject, details },
            });
        }
        alertSent = true;

        await admin.from("error_events")
          .update({ alert_sent_at: new Date().toISOString(), alert_count: 1 })
          .eq("id", inserted!.id);
      } catch (e) {
        console.error("[log-error-event] alert email failed", e);
      }
    } else {
      // Bump alert_count on the existing recent event (rate-limited, no email)
      await admin.rpc("noop"); // no-op placeholder; counting is best-effort
    }
  }

  return new Response(
    JSON.stringify({ ok: true, reference_code: referenceCode, priority, alert_sent: alertSent }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
