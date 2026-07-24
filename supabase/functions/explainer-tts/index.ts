// Explainer voiceover — high-quality TTS via ElevenLabs.
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

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

// Default voice: Sarah — warm, neutral, conversational brand narrator.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

/**
 * Light-touch prosody shaping: nudges the TTS toward more natural pauses
 * without changing wording. We only insert punctuation the model already
 * understands as pause hints (commas, em-dashes, ellipses, period+newline).
 */
function shapeForNarration(input: string): string {
  let t = input.replace(/\s+/g, " ").trim();

  // Real breath at paragraph-scale sentence breaks.
  t = t.replace(/\. +(?=[A-Z])/g, ".\n\n");

  // Micro-pause before list intros and clarifiers that otherwise get rushed.
  const clarifiers = [
    "such as", "including", "for example", "for instance",
    "so you can", "so that", "which means", "meaning",
    "and any", "and the",
  ];
  for (const phrase of clarifiers) {
    const re = new RegExp(`(?<![,—-])\\s+${phrase}\\b`, "gi");
    t = t.replace(re, `, ${phrase}`);
  }

  // Slight lift + pause around key product nouns.
  t = t.replace(
    /\b(booking calendar|host dashboard|buyer dashboard|renter dashboard|seller dashboard|purchase dashboard|sale dashboard|payout timeline|payment status|next action|next required action|transaction timeline|handoff confirmation|handoff confirmations)\b/g,
    "— $1 —",
  );

  // Softer pause before disclosures / conditional language.
  t = t.replace(/\bsubject to eligibility and approval\b/gi,
    "… subject to eligibility and approval");

  // Emphasize the brand every time.
  t = t.replace(/\bvendibook\b/g, "Vendibook");

  // Normalize ellipses.
  t = t.replace(/\.{3,}/g, "…");
  // Collapse doubled commas.
  t = t.replace(/,\s*,/g, ",");

  return t;
}

async function synthesize(text: string, voice: string): Promise<Response> {
  if (!ELEVENLABS_API_KEY) {
    console.error("explainer-tts: ELEVENLABS_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const shaped = shapeForNarration(text);

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: shaped,
        // eleven_multilingual_v2 — highest-quality narration, great prosody
        // for long marketing copy.
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
          speed: 0.98,
        },
      }),
    },
  );

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
      // narration-tune: v4-elevenlabs-sarah
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
