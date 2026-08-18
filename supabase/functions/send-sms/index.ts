import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCaller, internalOnlyResponse } from "../_shared/internalAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

interface SendSmsRequest {
  user_id?: string;
  to_phone?: string; // optional override (used for verification flows)
  template_name: string;
  body: string;
  category?: "transactional" | "marketing" | "alerts";
  metadata?: Record<string, unknown>;
  bypass_quiet_hours?: boolean;
}

function isWithinQuietHours(start: string, end: string, tz: string): boolean {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    const cur = hour * 60 + minute;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    if (s === e) return false;
    if (s < e) return cur >= s && cur < e;
    return cur >= s || cur < e; // overnight window
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isInternalCaller(req)) {
    return internalOnlyResponse(corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload = (await req.json()) as SendSmsRequest;
    const { user_id, to_phone, template_name, body, category = "transactional", metadata, bypass_quiet_hours } = payload;

    if (!template_name || !body) {
      return new Response(JSON.stringify({ error: "template_name and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipient = to_phone;
    let resolvedUserId = user_id;

    // Resolve recipient via user subscription if user_id provided
    if (user_id && !to_phone) {
      const { data: sub } = await supabase
        .from("sms_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!sub || !sub.opted_in || !sub.verified) {
        await supabase.from("sms_send_log").insert({
          user_id,
          recipient_phone: "",
          template_name,
          message_body: body,
          status: "skipped_not_subscribed",
          metadata,
        });
        return new Response(JSON.stringify({ skipped: "not_subscribed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Category gate
      const allowed =
        (category === "transactional" && sub.accepts_transactional) ||
        (category === "marketing" && sub.accepts_marketing) ||
        (category === "alerts" && sub.accepts_alerts);

      if (!allowed) {
        await supabase.from("sms_send_log").insert({
          user_id,
          recipient_phone: sub.phone_number,
          template_name,
          message_body: body,
          status: "skipped_category_disabled",
          metadata,
        });
        return new Response(JSON.stringify({ skipped: "category_disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      recipient = sub.phone_number;

      // Quiet hours (skip for transactional + bypass)
      if (!bypass_quiet_hours && category !== "transactional") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("quiet_hours_start,quiet_hours_end,quiet_hours_timezone")
          .eq("id", user_id)
          .maybeSingle();

        if (
          profile?.quiet_hours_start &&
          profile?.quiet_hours_end &&
          profile?.quiet_hours_timezone &&
          isWithinQuietHours(profile.quiet_hours_start, profile.quiet_hours_end, profile.quiet_hours_timezone)
        ) {
          await supabase.from("sms_send_log").insert({
            user_id,
            recipient_phone: recipient,
            template_name,
            message_body: body,
            status: "skipped_quiet_hours",
            metadata,
          });
          return new Response(JSON.stringify({ skipped: "quiet_hours" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!recipient) {
      return new Response(JSON.stringify({ error: "no recipient resolved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Twilio gateway with delivery status callback
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;
    const twilioResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipient,
        From: TWILIO_FROM_NUMBER,
        Body: body,
        StatusCallback: statusCallbackUrl,
      }),
    });

    const twilioData = await twilioResp.json();

    if (!twilioResp.ok) {
      await supabase.from("sms_send_log").insert({
        user_id: resolvedUserId,
        recipient_phone: recipient,
        template_name,
        message_body: body,
        status: "failed",
        error_message: JSON.stringify(twilioData),
        metadata,
      });
      return new Response(JSON.stringify({ error: "twilio_failed", details: twilioData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("sms_send_log").insert({
      user_id: resolvedUserId,
      recipient_phone: recipient,
      template_name,
      message_body: body,
      twilio_message_sid: twilioData.sid,
      status: "sent",
      metadata,
    });

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-sms error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
