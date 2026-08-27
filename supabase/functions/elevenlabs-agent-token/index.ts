import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Mints a short-lived WebRTC conversation token for the Vendi Voice
 * conversational agent. The ElevenLabs API key never leaves the server.
 * Requires an authenticated caller (verify_jwt = true).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "voice_unavailable", message: "Voice agent is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allowed = await checkRateLimit("elevenlabs_agent_ip", clientIp(req), 20, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limited", message: "Too many voice sessions. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let agentId = "agent_0101kdmd2dn7exys7w22pnscqasf";
    try {
      const body = await req.json();
      if (typeof body?.agentId === "string" && /^agent_[A-Za-z0-9]+$/.test(body.agentId)) {
        agentId = body.agentId;
      }
    } catch {
      // no body — use the default agent
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error(`ElevenLabs agent token failed [${response.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: "token_failed", status: response.status, details }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { token } = await response.json();
    return new Response(JSON.stringify({ token, agentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Agent token error:", error);
    return new Response(
      JSON.stringify({ error: "unexpected", message: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
