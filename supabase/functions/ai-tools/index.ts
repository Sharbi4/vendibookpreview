import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  gatherSources,
  formatSourceContext,
  sourcesToCitations,
  todayISO,
} from "../_shared/firecrawl-research.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  tool: "pricing" | "description" | "business-idea";
  data: Record<string, string>;
}

const TODAY = todayISO();
const YEAR = new Date().getUTCFullYear();

const getSystemPrompt = (tool: string, hasSources: boolean): string => {
  const groundingRule = hasSources
    ? `Ground every specific number, trend, or claim in the SOURCE MATERIAL provided. Cite source indexes inline like [1], [2] where used. If a fact is not in the sources, fall back to general industry knowledge and flag it with "(estimate — verify locally)".`
    : `Live web sources were unavailable. Use your most current training knowledge, mark any specific dollar amounts as approximate, and tell the user to verify locally.`;

  switch (tool) {
    case "pricing":
      return `You are a senior pricing strategist for the U.S. mobile food industry (food trucks, trailers, carts, ghost/commissary kitchens, vendor lots). Today is ${TODAY}. You produce data-grounded daily/weekly rental rates and sale prices based on local market comps.

${groundingRule}

Consider: regional market rates, equipment included, condition/age, seasonality, local competition, fuel/insurance overhead, and platform fees.

Respond ONLY in this JSON shape — no prose, no markdown fences:
{
  "dailyRate": number | null,
  "weeklyRate": number | null,
  "salePrice": number | null,
  "reasoning": "2-4 sentences citing the comps you used, with [N] source markers",
  "tips": ["actionable tip 1", "tip 2", "tip 3", "tip 4"],
  "marketSignals": ["short bullet on demand/seasonality", "short bullet on competition"],
  "lastUpdated": "${TODAY}",
  "sourcesUsed": [number]
}`;

    case "description":
      return `You are a professional copywriter specializing in mobile food business listings. Today is ${TODAY}. Write compelling, specific descriptions that convert browsers into renters or buyers.

Guidelines:
- Open with a hook tied to the asset's strongest feature
- Highlight equipment, capacity, condition, and turnkey readiness
- Mention practical benefits (events served, throughput, fuel efficiency)
- End with a clear CTA
- 150-250 words, confident but warm tone — avoid clichés and filler

Respond ONLY in this JSON shape:
{
  "description": "full listing description",
  "headline": "single catchy headline (max 80 chars)",
  "highlights": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "seoKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "lastUpdated": "${TODAY}"
}`;

    case "business-idea":
      return `You are a mobile food business consultant tracking ${YEAR} food and beverage trends. Today is ${TODAY}. Generate viable, differentiated concepts grounded in current consumer demand.

${groundingRule}

For each idea, weigh: trend momentum, target demographic, operational feasibility on a mobile unit, startup cost band, gross-margin potential, and a defensible angle.

Respond ONLY in this JSON shape:
{
  "ideas": [
    {
      "name": "concept name",
      "concept": "1-2 sentence pitch",
      "targetMarket": "primary customer",
      "menuHighlights": ["item 1", "item 2", "item 3", "item 4"],
      "estimatedStartup": "Low ($20-50k) | Medium ($50-120k) | High ($120k+)",
      "estimatedMargins": "e.g. 60-68% food margin",
      "uniqueAngle": "what makes this defensible",
      "trendSignal": "why this is rising in ${YEAR} (cite [N] if sourced)"
    }
  ],
  "marketContext": "2-3 sentence read on the current mobile food trend landscape",
  "lastUpdated": "${TODAY}",
  "sourcesUsed": [number]
}

Generate exactly 3 diverse, creative ideas.`;

    default:
      return "You are a helpful assistant. Respond with valid JSON.";
  }
};

const getUserPrompt = (tool: string, data: Record<string, string>, sourceContext: string): string => {
  const sourceBlock = `\n\nSOURCE MATERIAL (live web results, ${TODAY}):\n${sourceContext}`;
  switch (tool) {
    case "pricing":
      return `Generate pricing for this listing:
Category: ${data.category || "Food Truck"}
Location: ${data.location || "Not specified"}
Mode: ${data.mode || "Rental"}
Equipment/Features: ${data.features || "Standard equipment"}
Condition: ${data.condition || "Good"}
Additional Info: ${data.additional || "None"}${sourceBlock}`;

    case "description":
      return `Write a listing description for:
Title: ${data.title || "Mobile Kitchen"}
Category: ${data.category || "Food Truck"}
Key Features: ${data.features || "Standard equipment"}
Location: ${data.location || "Not specified"}
Condition: ${data.condition || "Good"}
What makes it special: ${data.unique || "Not specified"}`;

    case "business-idea":
      return `Generate 3 ${YEAR} food business ideas based on:
Preferred cuisine/style: ${data.cuisine || "Open to suggestions"}
Target location type: ${data.locationType || "Urban areas"}
Budget level: ${data.budget || "Medium"}
Experience level: ${data.experience || "Beginner"}
Interests/passions: ${data.interests || "General food service"}${sourceBlock}`;

    default:
      return data.prompt || "";
  }
};

function buildResearchQueries(tool: string, data: Record<string, string>): string[] {
  if (tool === "pricing") {
    const loc = data.location || "United States";
    const cat = data.category || "food truck";
    const mode = (data.mode || "rental").toLowerCase();
    if (mode.includes("sale") || mode.includes("sell")) {
      return [
        `${cat} for sale price ${loc} ${YEAR}`,
        `used ${cat} sale comps ${loc} ${YEAR}`,
        `${cat} marketplace listings price range ${YEAR}`,
      ];
    }
    return [
      `${cat} rental daily rate ${loc} ${YEAR}`,
      `${cat} weekly rental price ${loc} ${YEAR}`,
      `mobile food unit rental comps ${loc} ${YEAR}`,
    ];
  }
  if (tool === "business-idea") {
    const cuisine = data.cuisine || "food truck";
    return [
      `${cuisine} food truck trends ${YEAR}`,
      `mobile food business concepts rising ${YEAR}`,
      `food and beverage consumer trends ${YEAR}`,
    ];
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, data }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Live grounding for pricing + business-idea. Description is creative — skip search.
    const queries = buildResearchQueries(tool, data);
    const sources = queries.length ? await gatherSources(queries, 3, 8) : [];
    const sourceContext = formatSourceContext(sources);

    // Use Pro for grounded calls (better citation following); Flash for plain copywriting.
    const model = queries.length ? "google/gemini-3-pro-preview" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: getSystemPrompt(tool, sources.length > 0) },
          { role: "user", content: getUserPrompt(tool, data, sourceContext) },
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
          JSON.stringify({ error: "AI credits exhausted. Please top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { raw: content };
    }

    // Attach citations + freshness for the UI
    if (queries.length) {
      parsed.sources = sourcesToCitations(sources);
      if (!parsed.lastUpdated) parsed.lastUpdated = TODAY;
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
