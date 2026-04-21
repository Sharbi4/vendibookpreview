// Generates AI share captions for a listing across channels
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { listing_id, channels = ["facebook", "x", "sms", "email"], variant = "default" } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check cache
    const { data: cached } = await admin
      .from("share_templates")
      .select("*")
      .eq("listing_id", listing_id)
      .eq("variant", variant)
      .in("channel", channels);

    const cachedChannels = new Set((cached || []).map((c: any) => c.channel));
    const missingChannels = channels.filter((c: string) => !cachedChannels.has(c));

    if (missingChannels.length === 0) {
      return new Response(JSON.stringify({ templates: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch listing
    const { data: listing } = await admin
      .from("listings")
      .select("title, description, category, city, state, price_daily, price_hourly, price_sale, mode")
      .eq("id", listing_id)
      .maybeSingle();

    if (!listing) {
      return new Response(JSON.stringify({ error: "listing not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate per channel via Lovable AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You write punchy, share-worthy social captions for the Vendibook marketplace. Match each channel's voice. Variant "${variant}" — default = balanced; hype = energetic; professional = polished; casual = friendly.`,
          },
          {
            role: "user",
            content: `Listing: ${listing.title}\nCategory: ${listing.category} (${listing.mode})\nLocation: ${listing.city}, ${listing.state}\nDescription: ${(listing.description || "").slice(0, 400)}\n\nGenerate captions for: ${missingChannels.join(", ")}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "compose_share_captions",
            description: "Compose share captions for the requested channels",
            parameters: {
              type: "object",
              properties: {
                captions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      channel: { type: "string" },
                      caption: { type: "string", description: "Channel-appropriate caption (X: <240 chars; SMS: <140; Facebook/email: longer ok)" },
                      hashtags: { type: "array", items: { type: "string" } },
                      cta_text: { type: "string" },
                    },
                    required: ["channel", "caption"],
                  },
                },
              },
              required: ["captions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compose_share_captions" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { captions: [] };

    // Save templates
    const rows = (args.captions || []).map((c: any) => ({
      listing_id,
      channel: c.channel,
      variant,
      caption: c.caption,
      hashtags: c.hashtags || [],
      cta_text: c.cta_text,
      generated_by_model: "google/gemini-2.5-flash",
    }));

    if (rows.length > 0) {
      await admin.from("share_templates").insert(rows);
    }

    const { data: all } = await admin
      .from("share_templates")
      .select("*")
      .eq("listing_id", listing_id)
      .eq("variant", variant)
      .in("channel", channels);

    return new Response(JSON.stringify({ templates: all }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
