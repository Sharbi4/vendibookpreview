import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { getCaller } from "../_shared/callerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Paid speech tokens are for signed-in members only. Signed-out visitors
    // fall back to the browser's built-in speech recognition.
    const caller = await getCaller(req);
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Please sign in to use premium voice input." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const allowed = await checkRateLimit("elevenlabs_scribe_user", caller.id, 20, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many voice search requests. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs token error:", response.status, errorText);
      throw new Error(`Failed to get scribe token: ${response.status}`);
    }

    const { token } = await response.json();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scribe token error:", error);
    return new Response(
      JSON.stringify({ error: "Voice input is unavailable right now." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
