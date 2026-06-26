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

async function firecrawlSearch(query: string, limit = 4): Promise<FirecrawlResult[]> {
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
      console.warn("Firecrawl search failed:", res.status);
      return [];
    }
    const json = await res.json();
    const items = (json?.data ?? json?.web ?? []) as any[];
    return items.slice(0, limit).map((it) => ({
      url: it.url,
      title: it.title,
      description: it.description,
      markdown: typeof it.markdown === "string" ? it.markdown.slice(0, 3500) : undefined,
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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const businessTypeLabels: Record<string, string> = {
      food_truck: "Food Truck",
      food_trailer: "Food Trailer",
      food_cart: "Food Cart / Pushcart",
      ghost_kitchen: "Ghost Kitchen / Commercial Shared Kitchen",
      vendor_lot: "Mobile Vendor / Street Vendor",
      catering: "Catering Business",
      cottage_food: "Cottage Food Operation",
    };
    const businessLabel = businessTypeLabels[trimmedBusinessType] || "Mobile Food Business";

    const locationText = trimmedCity ? `${trimmedCity}, ${trimmedState}` : trimmedState;
    const currentYear = new Date().getUTCFullYear();
    const today = new Date().toISOString().slice(0, 10);

    console.log("PermitPath research:", locationText, businessLabel);

    // Expanded grounding — state, city/county, fire, cottage food, recent law.
    const queries = [
      `${trimmedState} mobile food unit permit requirements ${currentYear} site:.gov`,
      `${locationText} ${businessLabel} health department permit ${currentYear}`,
      `${locationText} food truck business license fire inspection commissary ${currentYear}`,
      `${trimmedState} cottage food law ${currentYear}`,
      `${trimmedState} food truck law changes ${currentYear - 1} ${currentYear}`,
    ];
    if (trimmedCity) {
      queries.push(`${trimmedCity} ${trimmedState} mobile vendor license fire marshal ${currentYear} site:.gov`);
    }

    const searchBatches = await Promise.all(queries.map((q) => firecrawlSearch(q, 4)));
    const seen = new Set<string>();
    const sources: FirecrawlResult[] = [];
    for (const batch of searchBatches) {
      for (const r of batch) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push(r);
        if (sources.length >= 12) break;
      }
      if (sources.length >= 12) break;
    }

    const sourceContext = sources.length
      ? sources
          .map(
            (s, i) =>
              `[Source ${i + 1}] ${s.title || s.url}\nURL: ${s.url}\n${s.description ? `Summary: ${s.description}\n` : ""}${s.markdown ? `Excerpt:\n${s.markdown}\n` : ""}`
          )
          .join("\n---\n")
      : "(No live sources retrieved — rely on most current verified knowledge and clearly mark unverified fields with 'verify with [agency]'.)";

    const systemPrompt = `You are PermitPath, a compliance research engine for mobile food businesses (food trucks, trailers, carts, shared kitchens, cottage food) in the United States. Today is ${today}.

Given a STATE, optional CITY, and BUSINESS TYPE, return a complete, accurate, current checklist of every permit, license, certification, and inspection needed to legally operate at that location.

RESEARCH RULES
- Prioritize official .gov sources: state health departments, city/county clerk and health offices, state business registration portals, fire marshal offices.
- Cross-check anything that may have changed in the last 12 months. Surface recent law changes prominently in "recent_law_alert".
- Never invent a permit, fee, or URL. If a fee or link is not in the Source Material, say "verify with [agency]" for cost_estimate and leave official_url as "".
- Distinguish STATE-level from CITY/COUNTY-level — they stack.

KNOWN RECENT CHANGES (verify each is still current at lookup time using the Source Material)
- TEXAS: HB 2844 ("Food Truck Freedom Bill"), signed Jun 20, 2025, full effect Jul 1, 2026 — single statewide DSHS license replaces separate city/county permits, no commissary required. Tiered fees (Type I/II/III); a typical Type II truck ≈ $600 application + $400 pre-licensing inspection, then ~$400/yr. SB 1008 (effective Sep 1, 2025) bars cities from regulating food trucks more strictly than the state; local parking/hours/noise rules still apply.
- FDA FOOD CODE: 2022 edition is current model code (stronger allergen + manager-accountability rules); updated edition expected 2026. Each state/county adopts independently — many still on 2013/2017.
- COTTAGE FOOD: Florida cap now $250,000/yr. Michigan now $50,000 with online sales + third-party delivery (Mar 2026). North Dakota allows interstate shipping. Minnesota cut fees to $30, training valid 3 yrs (effective Aug 2027).

OUTPUT — return JSON ONLY in this exact shape (no prose):
{
  "location": { "city": string, "state": string, "stateAbbreviation": string, "business_type": string },
  "businessType": string,
  "overview": string,
  "recent_law_alert": string | null,
  "estimated_total_cost": { "low": number, "high": number, "display": string },
  "estimated_setup_weeks": { "low": number, "high": number, "display": string },
  "categories": [
    {
      "name": "Business Registration" | "Food Safety Certifications" | "Health Permits" | "Mobile Vendor License" | "Fire & Equipment" | "Local & City-Specific" | "Insurance",
      "items": [
        {
          "title": string,
          "issuer": string,
          "level": "state" | "county" | "city" | "federal",
          "cost_estimate": string,
          "timeline_estimate": string,
          "official_url": string,
          "why_it_matters": string,
          "commonly_missed": boolean
        }
      ]
    }
  ],
  "sources": [{ "index": number, "title": string, "url": string, "agency": string }],
  "verify_note": "Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying."
}

TONE: Authoritative, plain-language, practical. "why_it_matters" must be one clear sentence a first-time vendor understands.`;

    const userPrompt = `Build a complete ${currentYear} PermitPath checklist for a ${businessLabel} operating in ${locationText}.

Cover, where applicable: business entity registration (LLC/DBA, EIN, sales tax), food handler / manager certification (ANSI), state mobile food unit license, county/city health permit, fire marshal inspection (LP-gas / suppression), commissary agreement (only if the state requires it), vehicle registration, zoning / vending district / parking permits, and insurance (general liability, auto, workers comp where applicable).

Use only URLs that appear in the Source Material. Populate "sources" with every source you used.

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
      throw new Error("Failed to generate permit checklist");
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
    if (!result.verify_note) {
      result.verify_note = "Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying.";
    }

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
