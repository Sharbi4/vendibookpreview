import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  tool: "pricing" | "description" | "business-idea";
  data: Record<string, string>;
}

const getSystemPrompt = (tool: string): string => {
  switch (tool) {
    case "pricing":
      return `You are an expert pricing consultant for the mobile food industry. Given details about a food truck, trailer, ghost kitchen, or vendor lot, suggest competitive daily and weekly rental rates or sale prices.

Consider factors like:
- Location/market rates
- Equipment included
- Condition and age
- Seasonality
- Competition

Respond in this exact JSON format:
{
  "dailyRate": number or null,
  "weeklyRate": number or null,
  "salePrice": number or null,
  "reasoning": "Brief explanation of the pricing strategy",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Only include relevant pricing (rental rates for rentals, sale price for sales).`;

    case "description":
      return `You are a professional copywriter specializing in mobile food business listings. Write compelling, detailed descriptions that highlight key features and benefits.

Guidelines:
- Start with a hook that grabs attention
- Highlight unique features and equipment
- Mention practical benefits (size, capacity, efficiency)
- Include a call-to-action
- Keep it between 150-250 words
- Use professional but approachable tone
- Avoid clichés and generic phrases

Respond in this exact JSON format:
{
  "description": "The full listing description",
  "headline": "A catchy one-line headline",
  "highlights": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}`;

    case "business-idea":
      return `You are a mobile food business consultant. Generate creative, viable business ideas for food trucks, trailers, and ghost kitchens.

Consider:
- Current food trends
- Target demographics
- Operational feasibility
- Startup costs and profitability
- Unique selling propositions
- Location opportunities

Respond in this exact JSON format:
{
  "ideas": [
    {
      "name": "Business concept name",
      "concept": "Brief description of the concept",
      "targetMarket": "Who the customers are",
      "menuHighlights": ["Item 1", "Item 2", "Item 3"],
      "estimatedStartup": "Low/Medium/High",
      "uniqueAngle": "What makes this stand out"
    }
  ]
}

Generate 3 diverse, creative ideas.`;

    default:
      return "You are a helpful assistant.";
  }
};

const getUserPrompt = (tool: string, data: Record<string, string>): string => {
  switch (tool) {
    case "pricing":
      return `Generate pricing for this listing:
Category: ${data.category || "Food Truck"}
Location: ${data.location || "Not specified"}
Mode: ${data.mode || "Rental"}
Equipment/Features: ${data.features || "Standard equipment"}
Condition: ${data.condition || "Good"}
Additional Info: ${data.additional || "None"}`;

    case "description":
      return `Write a listing description for:
Title: ${data.title || "Mobile Kitchen"}
Category: ${data.category || "Food Truck"}
Key Features: ${data.features || "Standard equipment"}
Location: ${data.location || "Not specified"}
Condition: ${data.condition || "Good"}
What makes it special: ${data.unique || "Not specified"}`;

    case "business-idea":
      return `Generate food business ideas based on:
Preferred cuisine/style: ${data.cuisine || "Open to suggestions"}
Target location type: ${data.locationType || "Urban areas"}
Budget level: ${data.budget || "Medium"}
Experience level: ${data.experience || "Beginner"}
Interests/passions: ${data.interests || "General food service"}`;

    default:
      return data.prompt || "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, data }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(tool) },
          { role: "user", content: getUserPrompt(tool, data) },
        ],
        temperature: 0.7,
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
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from the response
    let parsed;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      // If parsing fails, return raw content
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI tools error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
