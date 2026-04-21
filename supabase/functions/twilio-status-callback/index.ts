// Twilio StatusCallback webhook — updates sms_send_log with delivery state.
// Twilio POSTs application/x-www-form-urlencoded with MessageSid, MessageStatus, ErrorCode, etc.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const form = await req.formData();
    const sid = String(form.get("MessageSid") || "");
    const status = String(form.get("MessageStatus") || ""); // queued, sent, delivered, undelivered, failed
    const errorCode = form.get("ErrorCode") ? String(form.get("ErrorCode")) : null;
    const errorMessage = form.get("ErrorMessage") ? String(form.get("ErrorMessage")) : null;
    const to = String(form.get("To") || "");

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
