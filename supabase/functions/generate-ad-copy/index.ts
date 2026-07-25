import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveHostTier, tierAtLeast, tierRequiredBody } from "../_shared/resolveHostTier.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id, channels = ["meta", "google", "instagram"] } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr("Unauthorized", 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) return jsonErr("Unauthorized", 401);

    // Ad copy generation is a Growth+ feature (Marketing Studio).
    const tier = await resolveHostTier(callerId);
    if (!tierAtLeast(tier, "pro")) {
      return new Response(
        JSON.stringify({ ...tierRequiredBody("pro", tier), feature: "marketing-studio" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();
    if (!listing) return jsonErr("Listing not found", 404);
    if (listing.host_id !== callerId) return jsonErr("Forbidden", 403);

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_ad_copy",
          description: "Submit platform-optimized ad copy variants",
          parameters: {
            type: "object",
            properties: {
              variants: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    channel: {
                      type: "string",
                      enum: ["meta", "google", "instagram", "facebook", "tiktok", "twitter", "email"],
                    },
                    headline: { type: "string", maxLength: 90 },
                    primary_text: { type: "string", maxLength: 280 },
                    cta: {
                      type: "string",
                      enum: ["Book Now", "Learn More", "Shop Now", "Get Quote", "Contact Us"],
                    },
                    hashtags: { type: "array", items: { type: "string" } },
                  },
                  required: ["channel", "headline", "primary_text", "cta"],
                  additionalProperties: false,
                },
              },
            },
            required: ["variants"],
            additionalProperties: false,
          },
        },
      },
    ];

    const context = {
      title: listing.title,
      description: listing.description?.slice(0, 600),
      category: listing.category,
      mode: listing.mode,
      city: listing.city,
      state: listing.state,
      price_daily: listing.price_daily,
      price_sale: listing.price_sale,
      instant_book: listing.instant_book,
      amenities: listing.amenities?.slice(0, 10),
    };

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a performance marketing copywriter for Vendibook listings (food trucks, kitchens, vendor spaces).
Generate one ad variant per requested channel. Optimize each for the channel's character limits and audience tone:
- Meta/Facebook: conversational, benefits-led, urgency
- Google: search intent, clear value prop, location keyword
- Instagram: visual, lifestyle, hashtags
- Email: subject + benefit hook
Always include the city in the headline when available.`,
            },
            {
              role: "user",
              content: `Generate ad copy variants for these channels: ${channels.join(", ")}.\n\nListing:\n${JSON.stringify(context, null, 2)}`,
            },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "submit_ad_copy" } },
        }),
      }
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonErr("Rate limited", 429);
      if (aiResp.status === 402) return jsonErr("AI credits exhausted", 402);
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return jsonErr("AI gateway error", 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonErr("Invalid AI response", 500);
    const parsed = JSON.parse(toolCall.function.arguments);

    // Save each variant as a promotion_asset
    const inserts = parsed.variants.map((v: any) => ({
      listing_id,
      host_id: listing.host_id,
      channel: v.channel,
      asset_type: "ad_copy",
      title: v.headline,
      content: v,
    }));

    const { data: saved, error: saveErr } = await supabase
      .from("promotion_assets")
      .insert(inserts)
      .select();
    if (saveErr) console.error("Save error:", saveErr);

    return new Response(JSON.stringify({ variants: saved || parsed.variants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ad-copy error:", e);
    return jsonErr(e instanceof Error ? e.message : "Unknown", 500);
  }
});

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
