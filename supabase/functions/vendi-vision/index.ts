// Vendi Vision: Snap-a-photo → AI extracts category, condition, suggested title/description, est. value.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl required (data URL or https URL)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Vendi Vision — an expert food-truck/trailer/kitchen/vendor-space appraiser. Analyze a single photo and infer listing details. If the photo is unclear or unrelated, return your best guess but lower confidence. Be concise. US market pricing in USD.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this asset for a marketplace listing. Extract category, condition, title, description, estimated value range, and 3-5 amenities/highlights." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_listing",
              description: "Structured listing data extracted from a photo of a food truck, trailer, kitchen, or vendor space.",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: ["food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space", "other"],
                  },
                  mode_suggestion: { type: "string", enum: ["rent", "sale"], description: "Best guess: typically trucks/trailers are sold; kitchens/spaces rented." },
                  condition: { type: "string", enum: ["new", "excellent", "good", "fair", "needs_work"] },
                  suggested_title: { type: "string", description: "Compelling 4-8 word listing title." },
                  suggested_description: { type: "string", description: "60-120 word marketplace description highlighting visible features." },
                  estimated_value_min: { type: "number", description: "Low USD estimate. For rentals, daily rate. For sales, total price." },
                  estimated_value_max: { type: "number", description: "High USD estimate." },
                  amenities: { type: "array", items: { type: "string" }, description: "3-5 short amenity/feature labels visible in photo." },
                  confidence: { type: "number", description: "0-1 confidence in extraction.", minimum: 0, maximum: 1 },
                  notes: { type: "string", description: "One-line caveat or recommendation for the host." },
                },
                required: ["category", "mode_suggestion", "condition", "suggested_title", "suggested_description", "estimated_value_min", "estimated_value_max", "amenities", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_listing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — top up at Settings > Workspace > Usage" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("vendi-vision gateway error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Could not analyze image" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vendi-vision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
