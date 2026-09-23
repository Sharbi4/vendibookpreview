import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return reply(401, { error: "Sign in to verify your phone." });
    const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply(401, { error: "Sign in to verify your phone." });
    const body = await req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone) || body.security_sms_consent !== true) {
      return reply(400, { error: "Enter a valid mobile number and request a verification text." });
    }
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const from = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!lovableKey || !twilioKey || !from) return reply(503, { error: "Text verification is temporarily unavailable. Please try again later." });

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Rejection sampling avoids modulo bias and never uses Math.random for a security code.
    let random: number;
    do { random = crypto.getRandomValues(new Uint32Array(1))[0]; } while (random >= 4294000000);
    const code = String(random % 1000000).padStart(6, "0");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user.id + ":" + phone + ":" + code));
    const hashedCode = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    const { data: challenge, error: reserveError } = await admin.rpc("reserve_signup_phone_code", { actor: user.id, phone, hashed_code: hashedCode });
    if (reserveError || !challenge) return reply(429, { error: reserveError?.message || "Unable to request a code.", retry_after: 60 });

    let response: Response;
    try {
      response = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: { "Authorization": "Bearer " + lovableKey, "X-Connection-Api-Key": twilioKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          To: phone, From: from,
          Body: "Vendibook: Your account verification code is " + code + ". It expires in 10 minutes. Never share this code. Reply STOP to opt out, HELP for help. Msg & data rates may apply.",
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      await admin.from("signup_phone_challenges").update({ delivery_state: "failed" }).eq("id", challenge);
      return reply(502, { error: "We could not send your code. Please wait a minute and try again." });
    }
    if (!response.ok) {
      await admin.from("signup_phone_challenges").update({ delivery_state: "failed" }).eq("id", challenge);
      return reply(502, { error: "We could not send a text to that number. Check it or try another mobile number." });
    }
    const result = await response.json();
    if (!result.sid || ["failed", "undelivered", "canceled"].includes(result.status)) {
      await admin.from("signup_phone_challenges").update({ delivery_state: "failed" }).eq("id", challenge);
      return reply(502, { error: "The text provider could not accept your verification message." });
    }
    const { error: saveError } = await admin.from("signup_phone_challenges").update({ delivery_state: "sent" }).eq("id", challenge);
    if (saveError) return reply(500, { error: "We could not prepare verification. Please request a new code in a minute." });
    // No subscription, marketing, or alert preferences are changed by account verification.
    return reply(200, { ok: true, retry_after: 60 });
  } catch {
    return reply(500, { error: "Text verification is temporarily unavailable. Please try again." });
  }
});
