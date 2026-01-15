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
    const { city, state, businessType } = await req.json();

    if (!state || state.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "State is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedCity = city?.trim().slice(0, 100) || "";
    const trimmedState = state.trim().slice(0, 50);
    const trimmedBusinessType = businessType?.trim() || "food_truck";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const businessTypeLabels: Record<string, string> = {
      food_truck: "Food Truck",
      food_trailer: "Food Trailer", 
      ghost_kitchen: "Ghost Kitchen / Commercial Kitchen",
      vendor_lot: "Mobile Vendor / Street Vendor",
      catering: "Catering Business",
    };

    const businessLabel = businessTypeLabels[trimmedBusinessType] || "Food Business";

    const systemPrompt = `You are an expert in food service licensing, permits, and regulatory compliance across the United States. You provide comprehensive, accurate information about the licenses and permits required to operate mobile food businesses.

Your responses should include:
- State-level requirements
- Local/city requirements when applicable
- Federal requirements
- Health department requirements
- Fire safety requirements
- Business registration requirements
- Insurance requirements
- Typical costs and timelines
- Links or references to official sources when possible

IMPORTANT: Always include a disclaimer that requirements change and users should verify with local authorities.

Always respond with valid JSON in this exact format:
{
  "location": {
    "city": "City name or empty",
    "state": "State name",
    "stateAbbreviation": "XX"
  },
  "businessType": "Business type",
  "overview": "Brief overview of licensing landscape in this area",
  "disclaimer": "Standard disclaimer about verifying with authorities",
  "licenses": [
    {
      "name": "License/Permit name",
      "category": "state|city|federal|health|fire|other",
      "description": "What this license is for",
      "issuingAuthority": "Who issues this",
      "estimatedCost": "Cost range",
      "renewalPeriod": "Annual, etc.",
      "processingTime": "Typical time to obtain",
      "requirements": ["requirement 1", "requirement 2"],
      "websiteHint": "Search term or typical government URL pattern",
      "priority": "required|recommended|optional"
    }
  ],
  "insuranceRequirements": [
    {
      "type": "Insurance type",
      "minimumCoverage": "Typical minimum",
      "description": "Why needed"
    }
  ],
  "inspectionRequirements": [
    {
      "type": "Inspection type",
      "frequency": "How often",
      "authority": "Who inspects"
    }
  ],
  "estimatedTotalCost": "Total estimated startup licensing costs",
  "estimatedTimeline": "Time to get fully licensed",
  "tips": ["Helpful tip 1", "Helpful tip 2"],
  "commonMistakes": ["Mistake to avoid 1", "Mistake to avoid 2"],
  "helpfulResources": [
    {
      "name": "Resource name",
      "description": "What it helps with",
      "searchTerm": "How to find it"
    }
  ]
}`;

    const locationText = trimmedCity ? `${trimmedCity}, ${trimmedState}` : trimmedState;

    const userPrompt = `Provide a comprehensive guide to all licenses, permits, and regulatory requirements needed to operate a ${businessLabel} in ${locationText}.

Include:
1. All required state-level licenses and permits
2. Typical city/local requirements${trimmedCity ? ` specifically for ${trimmedCity}` : ""}
3. Health department permits and food handler requirements
4. Fire safety and equipment certifications
5. Business registration and tax requirements
6. Vehicle-specific requirements (if applicable)
7. Insurance requirements
8. Inspection schedules
9. Estimated costs and timelines
10. Tips for navigating the licensing process

Be thorough and practical - this information helps entrepreneurs plan their business launch.`;

    console.log("Generating license guide for:", locationText, businessLabel);

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
      throw new Error("Failed to generate license guide");
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

    const result = JSON.parse(jsonMatch[0]);

    console.log("License guide generated successfully");

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-license-finder function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
