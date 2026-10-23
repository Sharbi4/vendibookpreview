import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAtlasLimits, trustedClientIp } from "./limits.ts";
import { configuredAllisonAgentId } from '../_shared/allisonAgent.ts';

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
 * Mints a short-lived WebRTC token or signed text WebSocket URL for Atlas, the Vendibook
 * sales agent. Shoppers are usually signed out, so this is public and
 * rate-limited per IP. The ElevenLabs API key never leaves the server.
 * Secrets: ELEVENLABS_API_KEY, ATLAS_AGENT_ID.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const agent = body.agent ?? 'atlas';
  if (agent !== 'atlas' && agent !== 'allison') return json({ error: 'unknown_agent' }, 400);

  const key = Deno.env.get("ELEVENLABS_API_KEY");
  const agentId = agent === 'allison' ? configuredAllisonAgentId(Deno.env.get('ALLISON_AGENT_ID')) : (Deno.env.get("ATLAS_AGENT_ID") || "agent_1501m4rhvkz9fsbs5ce89zvk2k7b");
  if (!key || !agentId) return json({ error: "atlas_unavailable" }, 503);

  const ip = trustedClientIp(req);
  if (!ip) return json({ error: "atlas_unavailable" }, 503);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const limit = await checkAtlasLimits({
    count: async (scope, k, since) => {
      const { count, error } = await admin.from("rate_limit_events")
        .select("id", { count: "exact", head: true }).eq("scope", scope).eq("key", k).gte("created_at", since);
      return error ? null : (count ?? 0);
    },
    insert: async (scope, k) => !(await admin.from("rate_limit_events").insert({ scope, key: k })).error,
  }, ip, [
    { scope: "atlas_agent_ip_min", limit: 6, minutes: 1 },
    { scope: "atlas_agent_ip_day", limit: 40, minutes: 1440 },
  ]);
  if (limit === "unavailable") return json({ error: "atlas_unavailable" }, 503);
  if (limit === "limited") return json({ error: "rate_limited", message: "Too many conversations. Try again shortly." }, 429);

  try {
    const textOnly = body.mode === 'text';
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/${textOnly ? 'get-signed-url' : 'token'}?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) {
      console.error(`Atlas session handoff failed [${res.status}]`);
      return json({ error: "atlas_unavailable" }, 503);
    }
    const data = await res.json();
    if (textOnly) {
      if (typeof data.signed_url !== 'string' || !data.signed_url.startsWith('wss://api.elevenlabs.io/')) return json({ error: 'atlas_unavailable' }, 503);
      return json({ signedUrl: data.signed_url });
    }
    if (!data.token || typeof data.token !== "string") return json({ error: "atlas_unavailable" }, 503);
    return json({ token: data.token });
  } catch (error) {
    console.error("Atlas token error:", error);
    return json({ error: "atlas_unavailable" }, 503);
  }
});
