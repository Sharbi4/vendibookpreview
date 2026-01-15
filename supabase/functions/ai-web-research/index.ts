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
    const { query, category } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedQuery = query.trim().slice(0, 500);
    const trimmedCategory = category?.trim() || "general";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryContext: Record<string, string> = {
      equipment: "commercial kitchen equipment, food truck equipment, food service machinery",
      maintenance: "equipment maintenance, cleaning procedures, repair guides",
      safety: "food safety, fire safety, health codes, OSHA regulations",
      business: "food truck business, mobile food business, restaurant industry",
      marketing: "food truck marketing, social media, customer engagement",
      regulations: "food service regulations, permits, licensing, compliance",
      recipes: "commercial recipes, menu development, food preparation",
      general: "food truck and mobile food business industry",
    };

    const contextHint = categoryContext[trimmedCategory] || categoryContext.general;

    const systemPrompt = `You are an expert research assistant specializing in the mobile food industry, commercial kitchens, food trucks, and food service businesses. You provide comprehensive, well-researched answers with practical insights.

Your responses should:
- Be thorough and well-organized
- Include practical, actionable information
- Reference industry best practices
- Provide tips from experienced operators
- Include relevant statistics or data when applicable
- Be formatted for easy reading

Always respond with valid JSON in this exact format:
{
  "query": "The search query",
  "title": "A clear title for the results",
  "summary": "A concise summary of findings (2-3 sentences)",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed content for this section",
      "keyPoints": ["key point 1", "key point 2"]
    }
  ],
  "quickFacts": [
    {
      "label": "Fact label",
      "value": "Fact value"
    }
  ],
  "actionItems": ["Action 1", "Action 2"],
  "relatedTopics": ["Related topic 1", "Related topic 2"],
  "sources": ["Suggested source types to verify information"],
  "expertTips": ["Pro tip 1", "Pro tip 2"]
}`;

    const userPrompt = `Research and provide comprehensive information about:

"${trimmedQuery}"

Context: This is related to ${contextHint}.

Provide detailed, practical information that would help a food truck operator, commercial kitchen manager, or mobile food business owner. Include best practices, industry insights, and actionable recommendations.`;

    console.log("Generating web research for:", trimmedQuery);

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
      throw new Error("Failed to generate research");
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

    console.log("Web research generated successfully");

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-web-research function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
