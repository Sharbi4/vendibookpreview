import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, category, location, mode } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryLabels: Record<string, string> = {
      food_truck: "Food Truck",
      food_trailer: "Food Trailer",
      ghost_kitchen: "Ghost Kitchen",
      vendor_lot: "Vendor Lot/Space",
    };

    const categoryLabel = categoryLabels[category] || category;
    const isRental = mode === "rent";

    const systemPrompt = `You are an expert pricing advisor for the mobile food business marketplace. You help hosts set competitive prices for their ${categoryLabel} listings based on market data and location insights.

Always respond with a valid JSON object containing pricing suggestions. Be realistic and base suggestions on typical market rates for the food service industry.`;

    const userPrompt = isRental
      ? `Suggest rental pricing for this listing:
- Title: "${title}"
- Category: ${categoryLabel}
- Location: ${location || "Not specified"}
- Type: Rental

Provide realistic daily and weekly rental rates. Consider that weekly rates typically offer a 10-20% discount compared to 7x daily rate.

Respond with ONLY this JSON format (no markdown, no explanation):
{
  "daily_low": number,
  "daily_suggested": number,
  "daily_high": number,
  "weekly_low": number,
  "weekly_suggested": number,
  "weekly_high": number,
  "reasoning": "Brief explanation of pricing factors"
}`
      : `Suggest sale pricing for this listing:
- Title: "${title}"
- Category: ${categoryLabel}
- Location: ${location || "Not specified"}
- Type: Sale

Provide realistic sale price ranges based on typical market values.

Respond with ONLY this JSON format (no markdown, no explanation):
{
  "sale_low": number,
  "sale_suggested": number,
  "sale_high": number,
  "reasoning": "Brief explanation of pricing factors"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get pricing suggestions");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-pricing function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
