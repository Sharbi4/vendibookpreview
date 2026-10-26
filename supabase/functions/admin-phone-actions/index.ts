// Lets a Vendibook admin reach a customer from the support line,
// +1 866 690 6227 (owner, 2026-10-25), without exposing a personal number.
//
// - call_back: Twilio rings the admin's own phone first; when they answer it
//   dials the customer with the support line as caller ID, so the customer
//   sees (866) 690-6227.
// - text: sends a customer-care text from the support line through the
//   guarded SMS path (consent, STOP suppression and logging all apply).
// - register_tool_secret: one-time setup. Writes the phone tools' shared
//   secret (_shared/phoneLine.ts) into the ElevenLabs workspace secret
//   PHONE_AGENT_TOOL_SECRET; returns only its id, never the value.
// - phone_line_status: which agent the 866 number is assigned to and whether
//   that workspace secret exists.
//
// Admin-only. US/Canada numbers only, so the line can't place toll calls.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCaller, isAdminUser } from "../_shared/callerGuard.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { normalizeNanpToE164 } from "../_shared/smsConsent.ts";
import { sendGuardedSms } from "../_shared/smsGuard.ts";
import { PHONE_LINE_NUMBER_ID, PHONE_TOOL_SECRET_NAME, phoneLineAgent, phoneToolSecret } from "../_shared/phoneLine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PHONE_LINE = Deno.env.get("PHONE_LINE_NUMBER") || "+18666906227";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const xml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

/** Places a Twilio call through the Lovable connector, or directly with account credentials. */
async function placeCall(params: Record<string, string>): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const connectorKey = Deno.env.get("TWILIO_API_KEY") ?? "";
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const viaGateway = !!lovableKey && !!connectorKey;
  if (!viaGateway && (!sid || !token)) return { ok: false, error: "Twilio is not configured." };
  const res = await fetch(
    viaGateway ? "https://connector-gateway.lovable.dev/twilio/Calls.json" : `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
    {
      method: "POST",
      headers: viaGateway
        ? { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectorKey, "Content-Type": "application/x-www-form-urlencoded" }
        : { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${String(data?.message ?? "call failed").slice(0, 200)}` };
  return { ok: true, sid: data?.sid };
}

async function elevenLabsSecrets(): Promise<Array<{ secret_id: string; name: string }> | null> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return null;
  const res = await fetch("https://api.elevenlabs.io/v1/convai/secrets", {
    headers: { "xi-api-key": key },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return ((await res.json())?.secrets ?? []) as Array<{ secret_id: string; name: string }>;
}

/** Writes the tool secret into the ElevenLabs workspace secret the webhook tools reference. The value never leaves the server. */
async function registerToolSecret() {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  const value = await phoneToolSecret();
  if (!key || !value) return { ok: false, error: "ELEVENLABS_API_KEY is not configured." };
  const secrets = await elevenLabsSecrets();
  if (!secrets) return { ok: false, error: "Could not read ElevenLabs workspace secrets." };
  const existing = secrets.find((s) => s.name === PHONE_TOOL_SECRET_NAME);
  const res = await fetch(
    existing ? `https://api.elevenlabs.io/v1/convai/secrets/${existing.secret_id}` : "https://api.elevenlabs.io/v1/convai/secrets",
    {
      method: existing ? "PATCH" : "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ type: existing ? "update" : "new", name: PHONE_TOOL_SECRET_NAME, value }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `ElevenLabs ${res.status}: ${String(data?.detail?.message ?? data?.detail ?? "request failed").slice(0, 200)}` };
  return { ok: true, secret_id: data?.secret_id ?? existing?.secret_id ?? null, name: PHONE_TOOL_SECRET_NAME, updated: !!existing };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const caller = await getCaller(req);
  if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "register_tool_secret") return json(await registerToolSecret());
    if (body.action === "phone_line_status") {
      const agent = await phoneLineAgent();
      const secrets = await elevenLabsSecrets();
      return json({
        number_id: PHONE_LINE_NUMBER_ID,
        assigned_agent_id: agent?.agent_id ?? null,
        assigned_agent_name: agent?.agent_name ?? null,
        tool_secret_registered: secrets ? secrets.some((s) => s.name === PHONE_TOOL_SECRET_NAME) : null,
      });
    }
    const ticketId = typeof body.ticket_id === "string" && UUID_RE.test(body.ticket_id) ? body.ticket_id : null;
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const { data: ticket } = ticketId
      ? await db.from("support_tickets").select("id, reference_code, customer_name, callback_phone_e164, user_id").eq("id", ticketId).maybeSingle()
      : { data: null };
    const customer = normalizeNanpToE164(typeof body.to_phone === "string" ? body.to_phone : ticket?.callback_phone_e164 ?? "");
    if (!customer) return json({ error: "Enter the customer's US phone number." }, 400);

    if (body.action === "call_back") {
      const agentPhone = normalizeNanpToE164(typeof body.agent_phone === "string" ? body.agent_phone : "");
      if (!agentPhone) return json({ error: "Enter the US phone number Twilio should ring you on." }, 400);
      if (agentPhone === customer) return json({ error: "Your number and the customer's number are the same." }, 400);
      if (!(await checkRateLimit("admin_phone_call", caller.id, 20, 60))) return json({ error: "Too many calls in the last hour." }, 429);
      const name = typeof body.customer_name === "string" && body.customer_name.trim()
        ? body.customer_name.trim().slice(0, 60)
        : ticket?.customer_name ?? "the customer";
      const reference = ticket?.reference_code ? ` about ticket ${ticket.reference_code.split("").join(" ")}` : "";
      const twiml = `<Response><Say>Vendibook call back to ${xml(name)}${xml(reference)}. Connecting now.</Say>`
        + `<Dial callerId="${PHONE_LINE}" answerOnBridge="true" timeout="30"><Number>${customer}</Number></Dial></Response>`;
      const result = await placeCall({ To: agentPhone, From: PHONE_LINE, Twiml: twiml });
      if (!result.ok) return json({ error: result.error }, 502);
      if (ticket) {
        await db.from("support_tickets").update({ status: "in_progress", first_response_at: new Date().toISOString() })
          .eq("id", ticket.id).is("first_response_at", null);
      }
      return json({ ok: true, call_sid: result.sid, message: `Ringing your phone now. When you answer, we connect you to ${customer} from ${PHONE_LINE}.` });
    }

    if (body.action === "text") {
      const raw = typeof body.message === "string" ? body.message.trim() : "";
      if (raw.length < 2 || raw.length > 600) return json({ error: "Write a text between 2 and 600 characters." }, 400);
      const text = /^vendibook/i.test(raw) ? raw : `Vendibook: ${raw}`;
      const result = await sendGuardedSms({
        recipientPhone: customer,
        category: "customer_care",
        templateId: "support_reply_freeform",
        businessPurpose: ticket ? `support_ticket:${ticket.id}` : "support_reply",
        body: /reply stop/i.test(text) ? text : `${text} Reply STOP to opt out.`,
        idempotencyKey: typeof body.idempotency_key === "string" ? body.idempotency_key.slice(0, 80) : crypto.randomUUID(),
      });
      if (!result.ok) {
        const why: Record<string, string> = {
          no_active_consent: "This number hasn't agreed to Vendibook texts. Call or email instead.",
          suppressed_number: "This number replied STOP, so it can't be texted.",
          invalid_phone_format: "That isn't a valid US phone number.",
          provider_not_configured: "Texting isn't configured.",
          test_mode: "Texting is in test mode; nothing was sent.",
        };
        return json({ error: why[result.reason] ?? `Text not sent (${result.reason}).` }, 422);
      }
      if (ticket) {
        await db.from("support_tickets").update({ status: "in_progress", first_response_at: new Date().toISOString() })
          .eq("id", ticket.id).is("first_response_at", null);
      }
      return json({ ok: true, message: "Text sent from the support line." });
    }

    return json({ error: "action must be call_back or text" }, 400);
  } catch (e) {
    console.error("[admin-phone-actions] error", e);
    return json({ error: "Could not complete that." }, 500);
  }
});
