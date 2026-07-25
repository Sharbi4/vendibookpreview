// Homepage explainer voiceover — high-quality TTS via ElevenLabs with
// storage-backed caching. Each unique (explainer_id + script hash + voice)
// pair is generated exactly once, then served from the private
// `explainer-audio` bucket via a short-lived signed URL. Repeat plays are
// instant and free.
//
// POST { explainer_id: string, script: string, voice?: string }
//   -> { audio_url: string, cached: boolean, duration_hint_seconds?: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Sarah — warm, neutral, conversational brand narrator.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
// Tuning tag — bump this to invalidate every cached file at once.
const TUNING_TAG = "v1-marketing-vo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function shapeForNarration(input: string): string {
  let t = input.replace(/\s+/g, " ").trim();
  t = t.replace(/\. +(?=[A-Z])/g, ".\n\n");
  t = t.replace(/\bvendibook\b/gi, "Vendibook");
  return t;
}

async function synthesize(text: string, voice: string): Promise<Uint8Array> {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");
  const shaped = shapeForNarration(text);
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: shaped,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.32,
          similarity_boost: 0.8,
          style: 0.72,
          use_speaker_boost: true,
          speed: 0.94,
        },
      }),
    },
  );
  if (!r.ok) {
    const details = await r.text().catch(() => "");
    throw new Error(`ElevenLabs [${r.status}]: ${details}`);
  }
  return new Uint8Array(await r.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const explainerId = String(body.explainer_id ?? "").trim();
    const script = String(body.script ?? "").trim();
    const voice = String(body.voice ?? DEFAULT_VOICE);

    if (!explainerId || !/^[a-z0-9_-]{2,64}$/i.test(explainerId)) {
      return new Response(JSON.stringify({ error: "explainer_id required (alphanumeric)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!script || script.length < 20 || script.length > 4000) {
      return new Response(JSON.stringify({ error: "script must be 20-4000 chars" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = (await sha256Hex(`${TUNING_TAG}|${voice}|${script}`)).slice(0, 16);
    const key = `${explainerId}/${hash}.mp3`;

    // Cache check.
    const existing = await supabase.storage.from("explainer-audio").list(explainerId, {
      limit: 100,
      search: `${hash}.mp3`,
    });
    let cached = !!existing.data?.some((f) => f.name === `${hash}.mp3`);

    if (!cached) {
      const audio = await synthesize(script, voice);
      const up = await supabase.storage
        .from("explainer-audio")
        .upload(key, audio, {
          contentType: "audio/mpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
    }

    // Long-lived signed URL — bucket is private, but the audio itself is
    // public-safe marketing narration, so a 24h window is fine.
    const signed = await supabase.storage
      .from("explainer-audio")
      .createSignedUrl(key, 60 * 60 * 24);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(`Sign failed: ${signed.error?.message ?? "unknown"}`);
    }

    return new Response(
      JSON.stringify({ audio_url: signed.data.signedUrl, cached }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("explainer-tts error", err);
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
