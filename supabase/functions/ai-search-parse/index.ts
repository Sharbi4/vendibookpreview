import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query required" }), {
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
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content: `You parse natural language marketplace queries into structured search filters for a food truck/kitchen/vendor space marketplace.

Extract these fields from the user query:
- location: city, state, or zip code mentioned
- mode: "rent" or "sale" (default "rent" if ambiguous)
- category: one of "food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space" or null
- dateHint: any date/time mentioned (e.g. "this weekend", "next month") or null

Always respond with valid JSON only. No explanation.`,
          },
          { role: "user", content: query.trim().substring(0, 500) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_search",
              description: "Parse a natural language search into structured filters",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string", description: "City, state, or zip" },
                  mode: { type: "string", enum: ["rent", "sale"] },
                  category: {
                    type: "string",
                    enum: ["food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space"],
                  },
                  dateHint: { type: "string", description: "Date/time reference" },
                },
                required: ["mode"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_search" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ location: "", mode: "rent", category: null, dateHint: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search-parse error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
