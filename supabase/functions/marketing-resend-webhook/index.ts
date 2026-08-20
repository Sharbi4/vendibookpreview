// marketing-resend-webhook — receives Resend delivery events (Svix-signed).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { decode as b64decode, encode as b64encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

async function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  try {
    const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = b64decode(secretB64);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const toSign = new TextEncoder().encode(`${id}.${ts}.${body}`);
    const sig = await crypto.subtle.sign("HMAC", key, toSign);
    const expected = b64encode(new Uint8Array(sig));
    // header format: "v1,<sig> v1,<sig>"
    return sigHeader.split(" ").some((s) => {
      const [, val] = s.split(",");
      return val === expected;
    });
  } catch (e) {
    console.error("svix verify error", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const raw = await req.text();
    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTs = req.headers.get("svix-timestamp") ?? "";
    const svixSig = req.headers.get("svix-signature") ?? "";
    if (!secret) {
      console.error("RESEND_WEBHOOK_SECRET not configured");
      return new Response("server not configured", { status: 500 });
    }
    if (!svixId || !svixTs || !svixSig) {
      return new Response("missing svix headers", { status: 400 });
    }
    const ok = await verifySvix(secret, svixId, svixTs, raw, svixSig);
    if (!ok) {
      return new Response("invalid signature", { status: 401 });
    }

    const payload = JSON.parse(raw);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const type: string = payload.type ?? "";
    const data = payload.data ?? {};
    const recipient: string | undefined = Array.isArray(data.to) ? data.to[0] : data.to;
    // Resend may send tags as an array of {name,value} OR as a plain object map {key: value}.
    // Normalize to an array of {name,value} so .some() always works.
    const rawTags = data.tags;
    const tags: Array<{ name: string; value: string }> = Array.isArray(rawTags)
      ? rawTags
      : rawTags && typeof rawTags === "object"
        ? Object.entries(rawTags).map(([name, value]) => ({ name, value: String(value) }))
        : [];
    const isMarketing = tags.some((t) => t?.name === "type" && (t?.value === "marketing" || t?.value === "marketing_test"));
    if (!isMarketing) return new Response("ignored", { status: 200 });

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
      const lower = recipient.toLowerCase();
      await supabase.from("email_unsubscribes").upsert(
        { email: lower, reason: eventType, unsubscribed_at: new Date().toISOString() },
        { onConflict: "email" }
      );
      // A hard bounce / spam complaint must also block essential email,
      // otherwise the address keeps receiving receipts it can never deliver.
      await supabase.from("suppressed_emails").upsert(
        { email: lower, reason: eventType === "bounced" ? "bounce" : "complaint", scope: "all" },
        { onConflict: "email" }
      );
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 });
  }
});
