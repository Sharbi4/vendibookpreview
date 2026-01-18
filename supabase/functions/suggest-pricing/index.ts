import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PricingRequest {
  title: string;
  category: string;
  location?: string;
  mode: "rent" | "sale";
  description?: string;
  amenities?: string[];
  highlights?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      category, 
      location, 
      mode,
      description,
      amenities,
      highlights,
      dimensions
    }: PricingRequest = await req.json();
    
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

    // Build dynamic context from all available listing data
    const listingDetails: string[] = [];
    
    if (description) {
      listingDetails.push(`Description: "${description.slice(0, 500)}"`);
    }
    
    if (amenities && amenities.length > 0) {
      listingDetails.push(`Equipment/Amenities: ${amenities.join(", ")}`);
    }
    
    if (highlights && highlights.length > 0) {
      listingDetails.push(`Key Features: ${highlights.join(", ")}`);
    }
    
    if (dimensions) {
      const dimParts: string[] = [];
      if (dimensions.length) dimParts.push(`${dimensions.length}" length`);
      if (dimensions.width) dimParts.push(`${dimensions.width}" width`);
      if (dimensions.height) dimParts.push(`${dimensions.height}" height`);
      if (dimensions.weight) dimParts.push(`${dimensions.weight} lbs`);
      if (dimParts.length > 0) {
        listingDetails.push(`Dimensions: ${dimParts.join(", ")}`);
      }
    }

    const additionalContext = listingDetails.length > 0 
      ? `\n\nAdditional Details:\n${listingDetails.join("\n")}`
      : "";

    const systemPrompt = `You are an expert pricing advisor for VendiBook, a mobile food business marketplace. You help hosts set competitive prices for their ${categoryLabel} listings.

Your pricing should be data-driven and consider:
- Equipment quality and included amenities (more equipment = higher value)
- Size and capacity of the unit
- Location/market factors (urban areas typically command higher prices)
- Condition indicators from the description
- Comparable market rates for the food service industry

Be realistic and specific in your reasoning. Reference actual details from the listing when explaining your suggestions.`;

    const userPrompt = isRental
      ? `Analyze this rental listing and suggest competitive pricing:

LISTING DETAILS:
- Title: "${title}"
- Category: ${categoryLabel}
- Location: ${location || "Not specified"}
- Type: Rental${additionalContext}

PRICING GUIDELINES:
- Daily rates for ${categoryLabel}s typically range from $150-$500+ depending on equipment
- Weekly rates should offer 15-25% discount vs 7x daily rate
- Premium equipment, commercial-grade appliances, and turnkey setups command higher prices
- Location in high-traffic urban areas justifies 10-20% premium

Respond with ONLY this JSON format (no markdown):
{
  "daily_low": number,
  "daily_suggested": number,
  "daily_high": number,
  "weekly_low": number,
  "weekly_suggested": number,
  "weekly_high": number,
  "reasoning": "2-3 sentence explanation referencing specific listing details that influenced pricing",
  "confidence": "low" | "medium" | "high",
  "factors": ["factor1", "factor2", "factor3"]
}`
      : `Analyze this sale listing and suggest competitive pricing:

LISTING DETAILS:
- Title: "${title}"
- Category: ${categoryLabel}
- Location: ${location || "Not specified"}
- Type: Sale${additionalContext}

PRICING GUIDELINES:
- ${categoryLabel} sale prices vary widely based on age, condition, and equipment
- Entry-level/older units: $15,000-$40,000
- Mid-range/good condition: $40,000-$80,000
- Premium/turnkey operations: $80,000-$150,000+
- Custom builds and specialized equipment can exceed these ranges

Respond with ONLY this JSON format (no markdown):
{
  "sale_low": number,
  "sale_suggested": number,
  "sale_high": number,
  "reasoning": "2-3 sentence explanation referencing specific listing details that influenced pricing",
  "confidence": "low" | "medium" | "high",
  "factors": ["factor1", "factor2", "factor3"]
}`;

    console.log("Generating pricing suggestions for:", { title, category, location, mode, hasDescription: !!description, amenitiesCount: amenities?.length || 0 });

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
    
    console.log("Pricing suggestions generated:", { 
      mode, 
      confidence: suggestions.confidence,
      factors: suggestions.factors 
    });

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