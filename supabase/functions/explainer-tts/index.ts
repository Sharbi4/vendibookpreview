// Explainer voiceover — high-quality TTS via Lovable AI Gateway.
// Returns MP3 audio for the requested explainer transcript. Cached at the
// CDN edge so repeat plays are instant.
//
// POST { text: string, voice?: string }
// GET  ?text=...&voice=...   (used so <audio src="..."> can stream directly)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// A warm, natural voice — feels closer to a real narrator than the browser default.
const DEFAULT_VOICE = "alloy";

// Steers the model toward a smooth, unhurried, friendly delivery — the
// "vibe" the user asked for. Kept short so it doesn't dominate the tokens.
const INSTRUCTIONS =
  "Warm, friendly, confident brand narrator. Unhurried, conversational " +
  "pacing with natural breaths between sentences. Gentle upward inflection " +
  "on key phrases. Never robotic, never overly cheerful.";

async function synthesize(text: string, voice: string): Promise<Response> {
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
      speed: 0.96,
    }),
  });

  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "");
    console.error("explainer-tts upstream failed", upstream.status, details);
    return new Response(
      JSON.stringify({ error: "TTS failed", status: upstream.status, details }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      // Aggressive cache — transcripts are static per deploy.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let text = "";
    let voice = DEFAULT_VOICE;

    if (req.method === "GET") {
      const url = new URL(req.url);
      text = url.searchParams.get("text") ?? "";
      voice = url.searchParams.get("voice") ?? DEFAULT_VOICE;
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      text = String(body.text ?? "");
      voice = String(body.voice ?? DEFAULT_VOICE);
    } else {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    text = text.trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4000) text = text.slice(0, 4000);

    return await synthesize(text, voice);
  } catch (err) {
    console.error("explainer-tts error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
