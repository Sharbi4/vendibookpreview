// Twilio StatusCallback webhook — updates sms_send_log with delivery state.
// Twilio POSTs application/x-www-form-urlencoded with MessageSid, MessageStatus, ErrorCode, etc.
// The X-Twilio-Signature header is verified so a forged POST cannot mark
// messages as failed/delivered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const SKIP_SIG_VERIFY =
  Deno.env.get("SMS_TEST_MODE") === "true" ||
  Deno.env.get("TWILIO_SKIP_SIGNATURE_VERIFY") === "true";

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  headerSig: string,
): Promise<boolean> {
  if (SKIP_SIG_VERIFY) return true;
  if (!TWILIO_AUTH_TOKEN || !headerSig) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = url + sortedKeys.map((k) => k + params[k]).join("");
  const expected = await hmacSha1Base64(TWILIO_AUTH_TOKEN, data);
  return expected === headerSig;
}

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) params[k] = String(v);

    // Verify the Twilio request signature before touching any state.
    const sig = req.headers.get("X-Twilio-Signature") ?? "";
    const valid = await verifyTwilioSignature(req.url, params, sig);
    if (!valid) {
      console.warn("twilio-status-callback: invalid signature");
      return new Response("invalid signature", { status: 403 });
    }

    const sid = params.MessageSid || "";
    const status = params.MessageStatus || ""; // queued, sent, delivered, undelivered, failed
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;
    const to = params.To || "";

    if (!sid) {
      return new Response("missing sid", { status: 400 });
    }

    // Map Twilio status to our log status
    // queued/sending/sent → keep "sent" (already logged); update only on terminal states
    let newStatus: string | null = null;
    if (status === "delivered") newStatus = "delivered";
    else if (status === "undelivered" || status === "failed") newStatus = "delivery_failed";

    if (newStatus) {
      const { error } = await supabase
        .from("sms_send_log")
        .update({
          status: newStatus,
          error_message: errorCode ? `${errorCode}: ${errorMessage || ""}`.trim() : null,
        })
        .eq("twilio_message_sid", sid);

      if (error) {
        console.error("sms_send_log update failed", { sid, error });
      }
    }

    console.log("twilio status callback", { sid, status, to, errorCode });
    return new Response("ok", { headers: { "Content-Type": "text/plain" } });
  } catch (e: any) {
    console.error("twilio-status-callback error:", e);
    return new Response("error", { status: 500 });
  }
});
