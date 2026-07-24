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

// "sage" reads as a warmer, more human narrator than alloy for long-form
// marketing copy. Keep alloy as a safe fallback.
const DEFAULT_VOICE = "sage";

// Richer steering — asks the model for actual narrator behavior (breaths,
// slight emphasis on key nouns, downward inflection at sentence ends) rather
// than a vague "friendly" vibe. Short enough not to eat the token budget.
const INSTRUCTIONS = [
  "Voice: warm, confident brand narrator — think polished fintech or",
  "travel-marketplace explainer, not a corporate IVR.",
  "Pacing: unhurried and conversational. Take a real breath at every period.",
  "Add a subtle pause after commas and em-dashes; a longer pause at paragraph",
  "breaks. Never rush lists — a light beat between each item.",
  "Emphasis: gently stress concrete nouns (food truck, trailer, calendar,",
  "dashboard, payment, payout, Stripe, Affirm, Vendibook) and action verbs",
  "(review, approve, confirm, track). Do not over-articulate.",
  "Melody: natural, mostly downward inflection at the end of statements;",
  "small upward lift only on genuine questions or offers.",
  "Say the brand as one word, capital V: 'Vendibook'. Say Stripe and Affirm",
  "naturally, as ordinary company names.",
  "Avoid: robotic cadence, sing-song cheerfulness, salesy over-emphasis,",
  "swallowed word endings.",
].join(" ");

/**
 * Light-touch prosody shaping: nudges the TTS toward more natural pauses
 * without changing wording. We only insert punctuation the model already
 * understands as pause hints (commas, em-dashes, ellipses, period+newline).
 */
function shapeForNarration(input: string): string {
  let t = input.replace(/\s+/g, " ").trim();

  // Give the model a real breath at paragraph-scale sentence breaks. A
  // period followed by two newlines produces the longest natural pause.
  t = t.replace(/\. +(?=[A-Z])/g, ".\n\n");

  // Micro-pause before list intros and clarifiers that otherwise get rushed.
  const clarifiers = [
    "such as",
    "including",
    "for example",
    "for instance",
    "so you can",
    "so that",
    "which means",
    "meaning",
    "and any",
    "and the",
  ];
  for (const phrase of clarifiers) {
    const re = new RegExp(`(?<![,—-])\\s+${phrase}\\b`, "gi");
    t = t.replace(re, `, ${phrase}`);
  }

  // Slight lift + pause around key product nouns the first time they land in
  // a sentence — em-dash produces a fuller pause than a comma.
  t = t.replace(
    /\b(booking calendar|host dashboard|buyer dashboard|renter dashboard|seller dashboard|purchase dashboard|sale dashboard|payout timeline|payment status|next action|next required action|transaction timeline|handoff confirmation|handoff confirmations)\b/g,
    "— $1 —",
  );

  // Softer pause before disclosures / conditional language.
  t = t.replace(/\bsubject to eligibility and approval\b/gi,
    "… subject to eligibility and approval");

  // Emphasize the brand every time — TTS models handle Title-cased,
  // isolated words with a small natural stress.
  t = t.replace(/\bvendibook\b/g, "Vendibook");

  // Ensure ellipses are the three-dot form the model treats as a soft pause,
  // not a run-on with variable spacing.
  t = t.replace(/\.{3,}/g, "…");

  // Collapse any doubled commas we may have introduced.
  t = t.replace(/,\s*,/g, ",");

  return t;
}

async function synthesize(text: string, voice: string): Promise<Response> {
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const shaped = shapeForNarration(text);

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: shaped,
      voice,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
      // Slightly slower than default gives real narrator cadence. 0.94 keeps
      // the total run close to the 80s scene budget without sounding sluggish.
      speed: 0.94,
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
      // Aggressive cache — transcripts are static per deploy. Bump the key
      // by touching this comment when tuning voice/prosody so users get the
      // new mix without waiting for a natural TTL expiry.
      // narration-tune: v3-sage-shaped
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
