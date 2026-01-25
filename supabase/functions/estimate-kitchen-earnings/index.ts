import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KitchenEstimateRequest {
  city: string;
  state?: string;
  kitchenType: "full_commercial" | "shared_space" | "prep_kitchen" | "commissary";
  squareFootage?: number;
  equipment?: string[];
  certifications?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      city, 
      state,
      kitchenType,
      squareFootage,
      equipment,
      certifications
    }: KitchenEstimateRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const kitchenTypeLabels: Record<string, string> = {
      full_commercial: "Full Commercial Kitchen",
      shared_space: "Shared Kitchen Space",
      prep_kitchen: "Prep Kitchen",
      commissary: "Commissary Kitchen",
    };

    const kitchenLabel = kitchenTypeLabels[kitchenType] || kitchenType;
    const locationText = state ? `${city}, ${state}` : city;

    // Build context from kitchen details
    const kitchenDetails: string[] = [];
    
    if (squareFootage) {
      kitchenDetails.push(`Size: ${squareFootage} square feet`);
    }
    
    if (equipment && equipment.length > 0) {
      kitchenDetails.push(`Equipment: ${equipment.join(", ")}`);
    }
    
    if (certifications && certifications.length > 0) {
      kitchenDetails.push(`Certifications: ${certifications.join(", ")}`);
    }

    const additionalContext = kitchenDetails.length > 0 
      ? `\n\nKitchen Details:\n${kitchenDetails.join("\n")}`
      : "";

    const systemPrompt = `You are an expert commercial kitchen rental market analyst for Vendibook. You help kitchen owners estimate potential rental income based on market data.

Your estimates should consider:
- Local market rates for commercial kitchen rentals
- Kitchen type and size
- Available equipment and certifications
- Urban vs suburban pricing differences
- Peak vs off-peak demand patterns
- Industry standard hourly/daily/weekly rates

Be realistic and provide actionable insights. Base your estimates on typical commercial kitchen rental markets.`;

    const userPrompt = `Estimate rental income potential for this commercial kitchen:

KITCHEN DETAILS:
- Type: ${kitchenLabel}
- Location: ${locationText}${additionalContext}

MARKET ANALYSIS REQUEST:
Analyze the commercial kitchen rental market for this area and provide earnings estimates.

Consider:
- Hourly rates typical for ${kitchenLabel}s in similar markets
- Daily rates (assuming 8-10 hour rentals)
- Weekly rates (with appropriate volume discount)
- Monthly rates (assuming 20-22 working days)
- Occupancy rate expectations (realistic %)

Respond with ONLY this JSON format (no markdown):
{
  "hourly_low": number,
  "hourly_suggested": number,
  "hourly_high": number,
  "daily_low": number,
  "daily_suggested": number,
  "daily_high": number,
  "weekly_low": number,
  "weekly_suggested": number,
  "weekly_high": number,
  "monthly_low": number,
  "monthly_suggested": number,
  "monthly_high": number,
  "expected_occupancy_percent": number,
  "annual_potential_low": number,
  "annual_potential_high": number,
  "reasoning": "2-3 sentence explanation of the market conditions and factors influencing these estimates",
  "confidence": "low" | "medium" | "high",
  "market_insights": ["insight1", "insight2", "insight3"],
  "tips": ["tip1", "tip2"]
}`;

    console.log("Generating kitchen earnings estimate for:", { city, state, kitchenType, squareFootage });

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
      throw new Error("Failed to get earnings estimate");
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

    const estimates = JSON.parse(jsonMatch[0]);
    
    console.log("Kitchen earnings estimate generated:", { 
      city,
      kitchenType,
      confidence: estimates.confidence,
      monthly_suggested: estimates.monthly_suggested
    });

    return new Response(JSON.stringify(estimates), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in estimate-kitchen-earnings function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
