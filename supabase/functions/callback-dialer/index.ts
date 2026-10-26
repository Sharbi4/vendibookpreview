// Admin-only human browser callback dialer (one customer, one call, caller ID fixed to (866) 690-6227).
// JSON actions (admin session required): readiness, token, intent, history.
// Twilio webhooks (X-Twilio-Signature required): /voice, /status.
// Never touches the inbound number configuration. Recording is always off.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { z } from "npm:zod@3.25.76";
import { getCaller, isAdminUser, serviceRoleClient } from "../_shared/callerGuard.ts";
import {
  BUSINESS_CALLER_ID, INTENT_TTL_SECONDS, MAX_INTENTS_PER_HOUR, dialTwiml, identityForUser, parseVoiceConfig,
  rejectTwiml, signIntent, userIdFromClient, validateDestination, verifyIntent, verifyTwilioSignature, voiceAccessToken,
} from "../_shared/callbackDialer.ts";

const FN_BASE = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/callback-dialer`;
const intentSecret = () => Deno.env.get("SERVICE_TOKEN_SIGNING_SECRET") ?? "";
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const twiml = (body: string) => new Response(body, { headers: { "Content-Type": "text/xml" } });

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("readiness") }),
  z.object({ action: z.literal("token") }),
  z.object({ action: z.literal("intent"), to: z.string().max(20) }),
  z.object({ action: z.literal("history") }),
]);

async function twilioForm(req: Request, path: string) {
  const { config } = parseVoiceConfig(Deno.env.get("TWILIO_VOICE_CONFIG"));
  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;
  const url = FN_BASE + path + new URL(req.url).search;
  const ok = !!config && await verifyTwilioSignature(config.authToken, url, params, req.headers.get("X-Twilio-Signature"));
  return { ok, params, config, query: new URL(req.url).searchParams };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const path = new URL(req.url).pathname.replace(/^.*\/callback-dialer/, "");
  const db = serviceRoleClient();

  // ---- Twilio voice webhook: browser call leg asks where to dial ----
  if (path === "/voice") {
    if (req.method !== "POST") return twiml(rejectTwiml());
    const { ok, params, config } = await twilioForm(req, "/voice");
    if (!ok || !config || params.AccountSid !== config.accountSid || params.ApplicationSid !== config.appSid) {
      console.warn("callback-dialer voice rejected: signature/account");
      return twiml(rejectTwiml());
    }
    const uid = userIdFromClient(params.From);
    const v = await verifyIntent(params.intent, intentSecret());
    if (!uid || !v.ok || v.intent.uid !== uid || params.To !== v.intent.to || !(await isAdminUser(uid))) {
      console.warn("callback-dialer voice rejected:", v.ok ? "identity/destination" : v.reason);
      return twiml(rejectTwiml());
    }
    const { data, error } = await db.from("callback_dialer_calls")
      .update({ used_at: new Date().toISOString(), status: "dialing", twilio_call_sid: params.CallSid ?? null, updated_at: new Date().toISOString() })
      .eq("id", v.intent.id).eq("admin_user_id", uid).eq("to_number", v.intent.to)
      .is("used_at", null).gt("expires_at", new Date().toISOString()).select("id");
    if (error || !data?.length) {
      console.warn("callback-dialer voice rejected: replay or expired");
      return twiml(rejectTwiml());
    }
    return twiml(dialTwiml(v.intent.to, `${FN_BASE}/status?intent_id=${v.intent.id}`));
  }

  // ---- Twilio status callback for the customer leg ----
  if (path === "/status") {
    const { ok, params, config, query } = await twilioForm(req, "/status");
    const id = query.get("intent_id") ?? "";
    if (!ok || !config || params.AccountSid !== config.accountSid || !/^[0-9a-f-]{36}$/.test(id)) return new Response("forbidden", { status: 403 });
    const status = (params.CallStatus ?? "").replace(/[^a-z-]/g, "").slice(0, 20) || "unknown";
    const duration = Number.parseInt(params.CallDuration ?? "", 10);
    await db.from("callback_dialer_calls").update({
      status, updated_at: new Date().toISOString(), ...(Number.isFinite(duration) ? { duration_seconds: duration } : {}),
    }).eq("id", id).not("used_at", "is", null);
    return new Response("", { status: 204 });
  }

  // ---- Admin JSON actions ----
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const caller = await getCaller(req);
  if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Administrator access required" }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const b = parsed.data;
  const { config, missing } = parseVoiceConfig(Deno.env.get("TWILIO_VOICE_CONFIG"));

  try {
    if (b.action === "readiness") {
      return json({ ready: !!config && !!intentSecret(), missing, caller_id: BUSINESS_CALLER_ID, recording: "off", voice_url: `${FN_BASE}/voice` });
    }
    if (b.action === "history") {
      const { data, error } = await db.from("callback_dialer_calls")
        .select("id,to_number,status,duration_seconds,created_at,used_at").eq("admin_user_id", caller.id)
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw new Error("History unavailable");
      return json({ calls: data ?? [] });
    }
    if (!config) return json({ error: "Browser calling isn't set up in Twilio yet.", missing }, 503);
    if (b.action === "token") {
      const token = await voiceAccessToken({ ...config, identity: identityForUser(caller.id) });
      return json({ token, identity: identityForUser(caller.id), ttl_seconds: 600 });
    }
    // intent
    const v = validateDestination(b.to);
    if (!v.ok) return json({ error: v.reason }, 400);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: cErr } = await db.from("callback_dialer_calls").select("id", { count: "exact", head: true })
      .eq("admin_user_id", caller.id).gt("created_at", since);
    if (cErr) throw new Error("Rate check unavailable");
    if ((count ?? 0) >= MAX_INTENTS_PER_HOUR) return json({ error: "Too many call attempts this hour. Try again later." }, 429);
    const exp = Math.floor(Date.now() / 1000) + INTENT_TTL_SECONDS;
    const { data: row, error } = await db.from("callback_dialer_calls")
      .insert({ admin_user_id: caller.id, to_number: v.number, expires_at: new Date(exp * 1000).toISOString() })
      .select("id").single();
    if (error || !row) throw new Error("Could not record the call");
    const intent = await signIntent({ id: row.id, uid: caller.id, to: v.number, exp }, intentSecret());
    return json({ intent, to: v.number, expires_in: INTENT_TTL_SECONDS });
  } catch (e) {
    console.error("callback-dialer error:", e instanceof Error ? e.message : "unknown");
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
