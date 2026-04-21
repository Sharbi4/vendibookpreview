import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Default voice (Sarah — warm, neutral, conversational)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "food truck",
  food_trailer: "food trailer",
  ghost_kitchen: "shared commercial kitchen",
  vendor_lot: "vendor space",
  vendor_space: "vendor space",
};

async function buildNarrationScript(listing: any): Promise<string> {
  const cat = CATEGORY_LABEL[listing.category] ?? "listing";
  const mode = listing.mode === "rent" ? "available for rent" : "for sale";
  const loc =
    listing.city && listing.state
      ? `in ${listing.city}, ${listing.state}`
      : listing.city ?? "";
  const price =
    listing.mode === "rent"
      ? listing.price_daily
        ? `Rentals start at $${listing.price_daily} per day.`
        : listing.price_weekly
        ? `Rentals start at $${listing.price_weekly} per week.`
        : ""
      : listing.price_sale
      ? `Asking price is $${Number(listing.price_sale).toLocaleString()}.`
      : "";

  // Use Lovable AI to rewrite the description into 60-90s of natural narration
  try {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write short, warm, conversational audio scripts for a food-truck and commercial-kitchen marketplace called Vendibook. Write in second person, no headings, no markdown, no emojis. 90-130 words. Sound like a friendly real-estate audio tour, not an ad. End with a soft call to inquire.",
          },
          {
            role: "user",
            content: `Write a narration for this ${cat} ${mode} ${loc}.

Title: ${listing.title}
${price}
Description: ${listing.description?.slice(0, 1500) ?? ""}`,
          },
        ],
      }),
    });
    if (aiResp.ok) {
      const j = await aiResp.json();
      const txt = j.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 50) return txt;
    }
  } catch (e) {
    console.error("AI script error:", e);
  }

  // Fallback: stitched template
  return `${listing.title}. This ${cat} is ${mode} ${loc}. ${price} ${(
    listing.description ?? ""
  ).slice(0, 600)} Reach out today to learn more on Vendibook.`;
}

async function tts(text: string, voiceId: string): Promise<ArrayBuffer> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!r.ok) throw new Error(`TTS failed: ${r.status} ${await r.text()}`);
  return r.arrayBuffer();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { listing_id, voice_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: listing, error } = await supabase
      .from("listings")
      .select("id,title,description,category,mode,city,state,price_daily,price_weekly,price_sale")
      .eq("id", listing_id)
      .maybeSingle();

    if (error || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voice = voice_id || DEFAULT_VOICE_ID;
    const script = await buildNarrationScript(listing);
    const audio = await tts(script, voice);

    // Stream raw MP3 back. On-demand, no cache (per user request).
    return new Response(audio, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e) {
    console.error("listing-narration error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
