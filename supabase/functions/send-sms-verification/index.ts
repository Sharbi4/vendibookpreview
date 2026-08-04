// Sends a 6-digit OTP via Twilio to verify a user's phone number.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(p: string): string {
  const digits = p.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { phone_number } = await req.json();
    if (!phone_number || typeof phone_number !== "string") {
      return new Response(JSON.stringify({ error: "phone_number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(phone_number);
    if (!/^\+\d{10,15}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "invalid_phone_format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Resend rate limits: 60s between sends, max 5 per rolling hour ----
    const RESEND_COOLDOWN_SECONDS = 60;
    const MAX_PER_HOUR = 5;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("sms_verification_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", hourAgo)
      .order("created_at", { ascending: false });

    const sends = recent ?? [];
    if (sends.length > 0) {
      const lastMs = new Date(sends[0].created_at as string).getTime();
      const sinceLast = Math.floor((Date.now() - lastMs) / 1000);
      if (sinceLast < RESEND_COOLDOWN_SECONDS) {
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            reason: "cooldown",
            retry_after_seconds: RESEND_COOLDOWN_SECONDS - sinceLast,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    if (sends.length >= MAX_PER_HOUR) {
      const oldestMs = new Date(sends[sends.length - 1].created_at as string).getTime();
      const retry = Math.max(1, Math.ceil((oldestMs + 60 * 60 * 1000 - Date.now()) / 1000));
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          reason: "hourly_limit",
          retry_after_seconds: retry,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(`${user.id}:${code}`);

    // Upsert subscription row (unverified) so we have phone + opt_in saved
    await admin.from("sms_subscriptions").upsert({
      user_id: user.id,
      phone_number: phone,
      opted_in: true,
      verified: false,
      accepts_transactional: true,
      accepts_alerts: true,
    }, { onConflict: "user_id" });

    // Store new code (overwrite previous unused)
    await admin.from("sms_verification_codes").insert({
      user_id: user.id,
      phone_number: phone,
      code_hash,
    });

    // Send via Twilio gateway
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
      console.error("twilio_config_missing", { hasLovable: !!LOVABLE_API_KEY, hasTwilio: !!TWILIO_API_KEY, hasFrom: !!TWILIO_FROM });
      return new Response(JSON.stringify({ error: "twilio_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = `Your Vendibook verification code is ${code}. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`;
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;
    const twResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM,
        Body: body,
        StatusCallback: statusCallbackUrl,
      }),
    });
    const twData = await twResp.json();
    if (!twResp.ok) {
      console.error("twilio_error", twData);
      return new Response(JSON.stringify({ error: "twilio_failed", details: twData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      sid: twData.sid,
      phone,
      resend_available_in: RESEND_COOLDOWN_SECONDS,
      sends_remaining_this_hour: Math.max(0, MAX_PER_HOUR - (sends.length + 1)),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
