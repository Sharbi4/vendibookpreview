import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generates a 15s social-ready promo "video" using Lovable AI image gen.
 *
 * Strategy: We use the Gemini image preview model to render a single 16:9
 * keyframe with the listing's title + cover photo composed into a branded
 * promo card. The browser then animates the still in <PromoVideoPlayer />
 * (Ken Burns + audio narration) for a true ~15s clip. This avoids running
 * ffmpeg in the edge runtime while still giving a "video-feel" deliverable.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: listing, error } = await supabase
      .from("listings")
      .select("id,title,description,category,mode,city,state,cover_image_url,image_urls,price_daily,price_weekly,price_sale,host_id")
      .eq("id", listing_id)
      .maybeSingle();

    if (error || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const photos: string[] = (listing.image_urls && listing.image_urls.length
      ? listing.image_urls
      : listing.cover_image_url
      ? [listing.cover_image_url]
      : []
    ).slice(0, 5);

    if (photos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Listing has no photos to generate video from" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate a branded poster frame via Lovable AI image generation
    const cat =
      listing.category === "food_truck"
        ? "Food Truck"
        : listing.category === "food_trailer"
        ? "Food Trailer"
        : listing.category === "ghost_kitchen"
        ? "Shared Kitchen"
        : "Vendor Space";
    const mode = listing.mode === "rent" ? "FOR RENT" : "FOR SALE";

    const posterPrompt = `A premium 16:9 social media promo title card for a ${cat} ${mode}.
Bold modern typography. Dark editorial background with subtle warm gradient.
Headline text: "${listing.title.slice(0, 60)}".
Subheadline: "${cat} • ${mode}${listing.city ? ` • ${listing.city}` : ""}".
Small "Vendibook" wordmark in lower right corner. Cinematic, high contrast.`;

    let posterUrl: string | null = null;
    try {
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: posterPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResp.ok) {
        const j = await imgResp.json();
        const b64 =
          j.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
          j.choices?.[0]?.message?.images?.[0]?.url ??
          null;
        if (b64) posterUrl = b64; // already a data URL
      }
    } catch (e) {
      console.error("poster gen error:", e);
    }

    // Compose the "clip" descriptor — the client renders this via
    // PromoVideoPlayer. We persist it as JSON in listing_ai_media.url so the
    // host can re-watch / re-share without re-paying for AI.
    const clip = {
      version: 1,
      title: listing.title,
      category_label: cat,
      mode_label: mode,
      city: listing.city,
      state: listing.state,
      poster: posterUrl,
      photos,
      duration_seconds: 15,
    };

    const dataUrl =
      "data:application/json;base64," +
      btoa(unescape(encodeURIComponent(JSON.stringify(clip))));

    // Upsert into listing_ai_media for re-use
    await supabase.from("listing_ai_media").insert({
      listing_id,
      media_type: "promo_video",
      url: dataUrl,
      duration_seconds: 15,
    });

    return new Response(JSON.stringify({ clip, url: dataUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing-video error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
