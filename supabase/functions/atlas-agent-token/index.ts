import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/**
 * Mints a short-lived WebRTC conversation token for Atlas, the Vendibook
 * sales agent. Shoppers are usually signed out, so this is public and
 * rate-limited per IP. The ElevenLabs API key never leaves the server.
 * Secrets: ELEVENLABS_API_KEY, ATLAS_AGENT_ID.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const key = Deno.env.get("ELEVENLABS_API_KEY");
  const agentId = Deno.env.get("ATLAS_AGENT_ID");
  if (!key || !agentId) return json({ error: "atlas_unavailable" }, 503);

  const ip = clientIp(req);
  const allowed = await checkRateLimit("atlas_agent_ip_min", ip, 6, 60)
    && await checkRateLimit("atlas_agent_ip_day", ip, 40, 86400);
  if (!allowed) return json({ error: "rate_limited", message: "Too many conversations. Try again shortly." }, 429);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) {
      console.error(`Atlas token failed [${res.status}]: ${await res.text()}`);
      return json({ error: "atlas_unavailable" }, 503);
    }
    const { token } = await res.json();
    if (!token || typeof token !== "string") return json({ error: "atlas_unavailable" }, 503);
    return json({ token });
  } catch (error) {
    console.error("Atlas token error:", error);
    return json({ error: "atlas_unavailable" }, 503);
  }
});
