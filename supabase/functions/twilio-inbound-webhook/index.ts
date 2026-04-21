import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio webhook posts application/x-www-form-urlencoded
Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const from = String(formData.get("From") || "");
    const to = String(formData.get("To") || "");
    const body = String(formData.get("Body") || "").trim();
    const sid = String(formData.get("MessageSid") || "");

    const upper = body.toUpperCase();
    let action: string | null = null;
    let reply: string | null = null;

    // Find user by phone
    const { data: sub } = await supabase
      .from("sms_subscriptions")
      .select("*")
      .eq("phone_number", from)
      .maybeSingle();

    if (upper === "STOP" || upper === "UNSUBSCRIBE" || upper === "CANCEL" || upper === "END" || upper === "QUIT") {
      action = "opt_out";
      reply = "You've been unsubscribed from VendiBook SMS. Reply START to opt back in.";
      if (sub) {
        await supabase
          .from("sms_subscriptions")
          .update({ opted_in: false, opted_out_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    } else if (upper === "START" || upper === "UNSTOP" || upper === "YES") {
      action = "opt_in";
      reply = "Welcome back to VendiBook SMS. Reply STOP anytime to unsubscribe.";
      if (sub) {
        await supabase
          .from("sms_subscriptions")
          .update({ opted_in: true, opted_out_at: null })
          .eq("id", sub.id);
      }
    } else if (upper === "HELP" || upper === "INFO") {
      action = "help";
      reply = "VendiBook: rentals & sales near you. Msg & data rates may apply. Reply STOP to unsubscribe. Help: support@vendibook.com";
    }

    await supabase.from("sms_inbound_messages").insert({
      from_phone: from,
      to_phone: to,
      body,
      twilio_message_sid: sid || null,
      matched_user_id: sub?.user_id ?? null,
      action_taken: action,
      raw_payload: Object.fromEntries(formData.entries()),
    });

    // Reply via TwiML
    const twiml = reply
      ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`
      : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;

    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (e: any) {
    console.error("twilio-inbound-webhook error:", e);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
      headers: { "Content-Type": "text/xml" },
    });
  }
});
