// marketing-resend-webhook — receives Resend delivery events.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const payload = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const type: string = payload.type ?? "";
    const data = payload.data ?? {};
    const recipient: string | undefined = Array.isArray(data.to) ? data.to[0] : data.to;
    const tags: any[] = data.tags ?? [];
    const isMarketing = tags.some((t) => t.name === "type" && (t.value === "marketing" || t.value === "marketing_test"));
    if (!isMarketing) return new Response("ignored", { status: 200 });

    // Map Resend event types → our enum
    const map: Record<string, string> = {
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };
    const eventType = map[type];
    if (!eventType) return new Response("ok", { status: 200 });

    await supabase.from("email_events").insert({
      recipient_email: recipient,
      event_type: eventType,
      metadata: { resend_event: type, resend_data: data },
    });

    if (recipient && (eventType === "bounced" || eventType === "complained")) {
      await supabase.from("email_unsubscribes").upsert(
        { email: recipient.toLowerCase(), reason: eventType, unsubscribed_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 });
  }
});
