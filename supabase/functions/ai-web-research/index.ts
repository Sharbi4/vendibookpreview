import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  gatherSources,
  formatSourceContext,
  sourcesToCitations,
  todayISO,
} from "../_shared/firecrawl-research.ts";
import { gateToolAccess } from "../_shared/gateToolAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TODAY = todayISO();
const YEAR = new Date().getUTCFullYear();

const CATEGORY_CONTEXT: Record<string, string> = {
  equipment: "commercial kitchen equipment, food truck equipment, food service machinery",
  maintenance: "equipment maintenance, cleaning procedures, repair guides",
  safety: "food safety, fire safety, health codes, OSHA regulations",
  business: "food truck business, mobile food business, restaurant industry",
  marketing: "food truck marketing, social media, customer engagement",
  regulations: "food service regulations, permits, licensing, compliance",
  recipes: "commercial recipes, menu development, food preparation",
  general: "food truck and mobile food business industry",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const gate = await gateToolAccess(req, "market-radar", corsHeaders);
    if (gate.response) return gate.response;
    const { query, category } = await req.json();
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedQuery = query.trim().slice(0, 500);
    const trimmedCategory = category?.trim() || "general";
    const contextHint = CATEGORY_CONTEXT[trimmedCategory] || CATEGORY_CONTEXT.general;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1) Live grounding — pull current sources for the query.
    const sources = await gatherSources(
      [
        `${trimmedQuery} ${YEAR}`,
        `${trimmedQuery} ${contextHint} ${YEAR}`,
        `${trimmedQuery} best practices ${YEAR}`,
      ],
      4,
      10,
    );
    const sourceContext = formatSourceContext(sources);

    const systemPrompt = `You are an expert research analyst for the mobile food industry. Today is ${TODAY}. Synthesize grounded, current answers from the SOURCE MATERIAL provided.

Rules:
- Ground every specific fact, statistic, or rule in the sources. Cite inline with [N] markers matching the Source numbers.
- If a claim is not in the sources, mark it "(general guidance — verify locally)".
- Prefer .gov, industry associations, and reputable trade publications over forum posts.
- Be specific, actionable, and operator-focused — not generic.

Respond ONLY with valid JSON:
{
  "query": "the original query",
  "title": "clear result title",
  "summary": "2-3 sentence executive summary with [N] citations",
  "sections": [
    { "heading": "section heading", "content": "detail with [N] citations", "keyPoints": ["point 1", "point 2"] }
  ],
  "quickFacts": [{ "label": "fact label", "value": "fact value" }],
  "actionItems": ["action 1", "action 2"],
  "relatedTopics": ["topic 1", "topic 2"],
  "expertTips": ["tip 1", "tip 2"],
  "lastUpdated": "${TODAY}"
}`;

    const userPrompt = `Research and answer comprehensively:

"${trimmedQuery}"

Context category: ${contextHint}.

Tailor for a food truck operator, commercial kitchen manager, or mobile food business owner. Include current best practices, industry data, and actionable recommendations.

SOURCE MATERIAL (live web results, ${TODAY}):
${sourceContext}`;

    console.log("ai-web-research grounded query:", trimmedQuery, `(${sources.length} sources)`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
    if (!content) throw new Error("No content in AI response");

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse AI response");
      result = JSON.parse(m[0]);
    }

    result.sources = sourcesToCitations(sources);
    if (!result.lastUpdated) result.lastUpdated = TODAY;

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
