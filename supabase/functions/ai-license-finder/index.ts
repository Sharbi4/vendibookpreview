import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FirecrawlResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

async function firecrawlSearch(query: string, limit = 5): Promise<FirecrawlResult[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) {
      console.warn("Firecrawl search failed:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const json = await res.json();
    const items = (json?.data ?? json?.web ?? []) as any[];
    return items.slice(0, limit).map((it) => ({
      url: it.url,
      title: it.title,
      description: it.description,
      markdown: typeof it.markdown === "string" ? it.markdown.slice(0, 4000) : undefined,
    }));
  } catch (e) {
    console.warn("Firecrawl error:", e);
    return [];
  }
}

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
      food_cart: "Food Cart / Pushcart",
      ghost_kitchen: "Ghost Kitchen / Commercial Shared Kitchen",
      vendor_lot: "Mobile Vendor / Street Vendor",
      catering: "Catering Business",
    };
    const businessLabel = businessTypeLabels[trimmedBusinessType] || "Mobile Food Business";

    const locationText = trimmedCity ? `${trimmedCity}, ${trimmedState}` : trimmedState;
    const currentYear = new Date().getUTCFullYear();
    const today = new Date().toISOString().slice(0, 10);

    // 1) Live web research for current official sources (grounding).
    console.log("PermitPath research:", locationText, businessLabel);
    const queries = [
      `${locationText} mobile food unit permit requirements ${currentYear} site:.gov`,
      `${locationText} ${businessLabel} health department permit ${currentYear}`,
      `${locationText} food truck business license fire inspection commissary ${currentYear}`,
    ];
    const searchBatches = await Promise.all(queries.map((q) => firecrawlSearch(q, 4)));
    const seen = new Set<string>();
    const sources: FirecrawlResult[] = [];
    for (const batch of searchBatches) {
      for (const r of batch) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push(r);
        if (sources.length >= 10) break;
      }
      if (sources.length >= 10) break;
    }

    const sourceContext = sources.length
      ? sources
          .map(
            (s, i) =>
              `[Source ${i + 1}] ${s.title || s.url}\nURL: ${s.url}\n${s.description ? `Summary: ${s.description}\n` : ""}${s.markdown ? `Excerpt:\n${s.markdown}\n` : ""}`
          )
          .join("\n---\n")
      : "(No live sources retrieved — rely on your most current training knowledge and clearly mark fields as 'verify locally'.)";

    const systemPrompt = `You are a regulatory compliance researcher for the U.S. mobile food industry. Today is ${today}. You synthesize official, current information about every license, permit, inspection, insurance and tax requirement needed to operate a mobile food business in a specific U.S. jurisdiction.

Rules:
- Ground every fact in the Source Material provided. If a fact is not supported by sources, fall back to general state-level guidance and mark estimatedCost / processingTime / renewalPeriod with "Verify with authority".
- Never invent specific dollar amounts, form numbers, or URLs. Only cite URLs that appear in the Source Material.
- Prefer .gov, county health department, state agriculture / health department, fire marshal, and municipal clerk sources.
- Include city, county, state, and federal layers where applicable.
- Be specific to ${businessLabel}: cite vehicle/cart classifications, commissary rules, water/wastewater, propane/fire, and tax registration as relevant.
- Output ONLY valid JSON matching the schema. No prose.

JSON schema:
{
  "location": { "city": string, "state": string, "stateAbbreviation": string },
  "businessType": string,
  "overview": string,
  "disclaimer": string,
  "lastUpdated": "YYYY-MM-DD",
  "licenses": [{
    "name": string,
    "category": "state"|"city"|"county"|"federal"|"health"|"fire"|"tax"|"other",
    "description": string,
    "issuingAuthority": string,
    "estimatedCost": string,
    "renewalPeriod": string,
    "processingTime": string,
    "requirements": string[],
    "officialUrl": string,
    "sourceIndex": number | null,
    "priority": "required"|"recommended"|"optional"
  }],
  "insuranceRequirements": [{ "type": string, "minimumCoverage": string, "description": string }],
  "inspectionRequirements": [{ "type": string, "frequency": string, "authority": string }],
  "estimatedTotalCost": string,
  "estimatedTimeline": string,
  "tips": string[],
  "commonMistakes": string[],
  "sources": [{ "index": number, "title": string, "url": string, "agency": string }],
  "helpfulResources": [{ "name": string, "description": string, "url": string }]
}`;

    const userPrompt = `Build a complete ${currentYear} permit & licensing guide for a ${businessLabel} operating in ${locationText}.

Cover: state license, local/city business license, county/city health permit (mobile food unit), food handler / manager certification (ANSI), fire marshal inspection (LP-gas / suppression), commissary agreement, vehicle registration & weights where applicable, sales tax / EIN, zoning & vending district rules, and parking/right-of-way permits.

For each license you list, set "officialUrl" to a URL that actually appears in the Source Material below (or "" if none); set "sourceIndex" to the matching [Source N] number (or null). Populate "sources" with every source you used.

SOURCE MATERIAL (live web results, ${today}):
${sourceContext}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errorText);
      throw new Error("Failed to generate license guide");
    }

    const data = await aiRes.json();
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

    // Backfill sources if model didn't echo them
    if ((!Array.isArray(result.sources) || result.sources.length === 0) && sources.length) {
      result.sources = sources.map((s, i) => {
        let agency = "";
        try {
          agency = new URL(s.url).hostname.replace(/^www\./, "");
        } catch { /* ignore */ }
        return { index: i + 1, title: s.title || s.url, url: s.url, agency };
      });
    }
    if (!result.lastUpdated) result.lastUpdated = today;

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
