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
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json?.data ?? json?.web ?? []) as any[];
    return items.slice(0, limit).map((it) => ({
      url: it.url,
      title: it.title,
      description: it.description,
      markdown: typeof it.markdown === "string" ? it.markdown.slice(0, 3500) : undefined,
    }));
  } catch {
    return [];
  }
}

const STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

const STATE_NAMES: Record<string, string> = {
  AZ: 'Arizona', TX: 'Texas', CA: 'California', FL: 'Florida', NY: 'New York',
};

const businessTypeLabels: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  food_cart: "Food Cart / Pushcart",
  ghost_kitchen: "Ghost Kitchen / Commercial Shared Kitchen",
  vendor_lot: "Mobile Vendor / Street Vendor",
  catering: "Catering Business",
  cottage_food: "Cottage Food Operation",
};

// ---------- JSON parsing helpers ----------
function extractJson(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Try direct
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  // Find outermost braces
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    let inner = cleaned.substring(start, end + 1);
    try { return JSON.parse(inner); } catch { /* continue */ }
    // Strip control chars + trailing commas
    inner = inner.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, " ");
    try { return JSON.parse(inner); } catch { /* continue */ }
  }
  return null;
}

function isValidResult(r: any): boolean {
  return !!r && Array.isArray(r.categories) && r.categories.length > 0 &&
    r.categories.some((c: any) => Array.isArray(c?.items) && c.items.length > 0);
}

// ---------- Baseline fallback checklists ----------
function baselineChecklist(state: string, city: string, businessType: string): any {
  const stateName = STATE_NAMES[state] || state;
  const label = businessTypeLabels[businessType] || "Mobile Food Business";
  const loc = city ? `${city}, ${state}` : stateName;

  // Tucson/AZ-specific augmentation for food trucks
  const azTucsonFoodTruck = state === 'AZ' && businessType === 'food_truck';

  const businessReg = [
    {
      title: "Register your business entity (LLC or DBA)",
      issuer: `${stateName} Corporation Commission / Secretary of State`,
      level: "state",
      cost_estimate: "$50–$150 filing fee",
      timeline_estimate: "1–3 weeks",
      official_url: state === 'AZ' ? "https://ecorp.azcc.gov/" : "",
      why_it_matters: "Legally separates you and your business and is required before applying for most permits.",
      commonly_missed: false,
    },
    {
      title: "Apply for a Federal EIN",
      issuer: "IRS",
      level: "federal",
      cost_estimate: "Free",
      timeline_estimate: "Same day online",
      official_url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
      why_it_matters: "Required to open a business bank account, hire staff, and file taxes.",
      commonly_missed: false,
    },
    {
      title: "Register for state sales / transaction privilege tax (TPT)",
      issuer: state === 'AZ' ? "Arizona Department of Revenue" : `${stateName} Department of Revenue`,
      level: "state",
      cost_estimate: state === 'AZ' ? "$12 state TPT license" : "Verify with agency",
      timeline_estimate: "1–2 weeks",
      official_url: state === 'AZ' ? "https://azdor.gov/business" : "",
      why_it_matters: "You must collect and remit sales tax on prepared food in nearly every jurisdiction.",
      commonly_missed: true,
    },
  ];

  const foodSafety = [
    {
      title: "Food Handler Card (every employee)",
      issuer: azTucsonFoodTruck ? "Pima County Health Department (accredited training)" : `${stateName} accredited food handler program`,
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: "$8–$15 per person",
      timeline_estimate: "Same day online course",
      official_url: azTucsonFoodTruck ? "https://webcms.pima.gov/government/health_department/food_safety_environmental_services/food_employee_handler_information/" : "",
      why_it_matters: "Required by health code before any employee handles food. Pima and Maricopa counties require an accredited course.",
      commonly_missed: true,
    },
    {
      title: "Certified Food Protection Manager (ANSI-accredited)",
      issuer: "ServSafe / National Registry / Prometric",
      level: "federal",
      cost_estimate: "$100–$150",
      timeline_estimate: "1 day",
      official_url: "https://www.servsafe.com/",
      why_it_matters: "At least one manager per operation must hold an ANSI-accredited certification under the FDA Food Code adopted by most states.",
      commonly_missed: false,
    },
  ];

  const healthPermits = [
    {
      title: azTucsonFoodTruck ? "Pima County Mobile Food Permit + Plan Review" : `${stateName} Mobile Food Unit Health Permit`,
      issuer: azTucsonFoodTruck ? "Pima County Health Department, Consumer Health & Food Safety" : `${stateName} Health Department`,
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: azTucsonFoodTruck ? "$300–$700 (plan review + annual permit)" : "Verify with agency",
      timeline_estimate: "2–6 weeks (plan review + inspection)",
      official_url: azTucsonFoodTruck ? "https://webcms.pima.gov/government/health_department/food_safety_environmental_services/mobile_food_units/" : "",
      why_it_matters: "The core operating permit. No legal service of food without an approved unit, plan review, and on-site inspection.",
      commonly_missed: false,
    },
  ];

  const commissary = [
    {
      title: "Commissary / Base of Operations Agreement",
      issuer: azTucsonFoodTruck ? "Pima County–approved commissary" : "Local approved commissary",
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: "$400–$1,200 / month",
      timeline_estimate: "1–2 weeks to secure agreement",
      official_url: "",
      why_it_matters: "Most jurisdictions (including Pima County) require a written agreement with a permitted commissary for cleaning, water/waste, and overnight storage.",
      commonly_missed: true,
    },
  ];

  const fire = [
    {
      title: "Fire Inspection (LP-gas, suppression, exhaust hood)",
      issuer: city ? `${city} Fire Marshal` : `${stateName} Fire Marshal`,
      level: "city",
      cost_estimate: "$75–$250 per inspection",
      timeline_estimate: "1–3 weeks scheduling",
      official_url: "",
      why_it_matters: "Trucks with propane, fryers, or cooking equipment must pass a fire inspection — often required before the health permit is issued.",
      commonly_missed: true,
    },
  ];

  const local = [
    {
      title: city ? `${city} Business License` : `${stateName} Local Business License`,
      issuer: city ? `${city} City Clerk / Business Services` : "Local City Clerk",
      level: "city",
      cost_estimate: "$25–$200 / year",
      timeline_estimate: "1–2 weeks",
      official_url: state === 'AZ' && city?.toLowerCase().includes('tucson') ? "https://www.tucsonaz.gov/business-license" : "",
      why_it_matters: "Almost every city requires a business license to operate within city limits, separate from your state registration.",
      commonly_missed: false,
    },
    {
      title: "Vending / Right-of-Way Permit (if vending on public property)",
      issuer: city ? `${city} Transportation or Parks Department` : "Local Vending Authority",
      level: "city",
      cost_estimate: "Varies — verify with city",
      timeline_estimate: "1–4 weeks",
      official_url: "",
      why_it_matters: "Required if you sell from a public sidewalk, park, or street. Private property events usually do not require this.",
      commonly_missed: true,
    },
  ];

  const insurance = [
    {
      title: "General Liability Insurance ($1M minimum)",
      issuer: "Private insurer (FLIP, Insure My Food Truck, Next, etc.)",
      level: "federal",
      cost_estimate: "$500–$1,500 / year",
      timeline_estimate: "Same day to bind",
      official_url: "https://www.fliprogram.com/",
      why_it_matters: "Required by most event organizers, commissaries, and city permits. Protects against customer injury and food-related claims.",
      commonly_missed: false,
    },
    {
      title: "Commercial Auto Insurance",
      issuer: "Private commercial auto insurer",
      level: "state",
      cost_estimate: "$1,200–$3,000 / year",
      timeline_estimate: "Same day to bind",
      official_url: "",
      why_it_matters: "A personal auto policy will not cover a vehicle used commercially. Required to register the truck for business use.",
      commonly_missed: true,
    },
  ];

  let recent_law_alert: string | null = null;
  if (state === 'TX') {
    recent_law_alert = "Texas HB 2844 ('Food Truck Freedom Bill') takes full effect July 1, 2026 — a single statewide DSHS license will replace separate city/county permits. SB 1008 (effective Sept 1, 2025) already bars cities from regulating food trucks more strictly than the state.";
  } else if (state === 'AZ') {
    recent_law_alert = "Arizona regulates mobile food vendors at the county level. In Pima County (Tucson), you need a county mobile food permit plus an accredited food handler card — the statewide license you may have read about does not exist here.";
  }

  const categories = [
    { name: "Business Registration", items: businessReg },
    { name: "Food Safety Certifications", items: foodSafety },
    { name: "Health Permits", items: healthPermits },
    { name: "Commissary / Base of Operations", items: commissary },
    { name: "Fire & Equipment", items: fire },
    { name: "Local & City-Specific", items: local },
    { name: "Insurance", items: insurance },
  ];

  return {
    location: { city, state, stateAbbreviation: state, business_type: label },
    businessType: label,
    overview: `Baseline ${label.toLowerCase()} compliance checklist for ${loc}. Verify each item with the issuing agency before applying.`,
    recent_law_alert,
    estimated_total_cost: { low: 1500, high: 4500, display: "$1,500–$4,500" },
    estimated_setup_weeks: { low: 4, high: 10, display: "4–10 weeks" },
    categories,
    sources: [],
    verify_note: "Showing the baseline checklist for this business type. Live research was unavailable — confirm every item with the issuing agency before applying.",
    fallback: true,
  };
}

async function callAi(systemPrompt: string, userPrompt: string, key: string, strictRetry = false): Promise<string | null> {
  const sys = strictRetry
    ? systemPrompt + "\n\nRESPOND WITH RAW JSON ONLY. No markdown fences. No prose. The first character of your response must be '{' and the last must be '}'."
    : systemPrompt;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429 || res.status === 402) {
      const err = new Error(res.status === 429 ? "rate_limit" : "credits");
      (err as any).code = res.status;
      throw err;
    }
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { city, state, businessType } = await req.json().catch(() => ({}));

    const stateRaw = typeof state === "string" ? state.trim().toUpperCase() : "";
    if (!stateRaw || !STATE_CODES.has(stateRaw)) {
      return new Response(JSON.stringify({ error: "Please pick a valid U.S. state." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const trimmedBusinessType = typeof businessType === "string" ? businessType.trim() : "food_truck";
    if (!businessTypeLabels[trimmedBusinessType]) {
      return new Response(JSON.stringify({ error: "That business type isn't supported yet. Pick one from the list." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const cityRaw = typeof city === "string" ? city.trim() : "";
    if (cityRaw.length > 80 || (cityRaw && !/^[A-Za-zÀ-ÿ0-9 .'\-]+$/.test(cityRaw))) {
      return new Response(JSON.stringify({ error: "City name has unsupported characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const trimmedCity = cityRaw.slice(0, 80);
    const trimmedState = stateRaw;
    const businessLabel = businessTypeLabels[trimmedBusinessType];
    const locationText = trimmedCity ? `${trimmedCity}, ${trimmedState}` : trimmedState;
    const currentYear = new Date().getUTCFullYear();
    const today = new Date().toISOString().slice(0, 10);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // No AI key — return baseline immediately
      return new Response(JSON.stringify({ result: baselineChecklist(trimmedState, trimmedCity, trimmedBusinessType) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("PermitPath research:", locationText, businessLabel);

    // Live grounding (best effort, time-budgeted)
    const queries = [
      `${trimmedState} mobile food unit permit requirements ${currentYear} site:.gov`,
      `${locationText} ${businessLabel} health department permit ${currentYear}`,
      `${locationText} food truck business license fire inspection commissary ${currentYear}`,
      `${trimmedState} food truck law changes ${currentYear - 1} ${currentYear}`,
    ];
    if (trimmedCity) {
      queries.push(`${trimmedCity} ${trimmedState} mobile vendor license fire marshal ${currentYear} site:.gov`);
    }

    const searchPromise = Promise.all(queries.map((q) => firecrawlSearch(q, 4)));
    // 20s budget for search; otherwise proceed without sources
    const searchBatches = await Promise.race([
      searchPromise,
      new Promise<FirecrawlResult[][]>((resolve) => setTimeout(() => resolve([]), 20000)),
    ]);

    const seen = new Set<string>();
    const sources: FirecrawlResult[] = [];
    for (const batch of searchBatches as FirecrawlResult[][]) {
      for (const r of batch) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push(r);
        if (sources.length >= 12) break;
      }
      if (sources.length >= 12) break;
    }

    const sourceContext = sources.length
      ? sources.map((s, i) =>
          `[Source ${i + 1}] ${s.title || s.url}\nURL: ${s.url}\n${s.description ? `Summary: ${s.description}\n` : ""}${s.markdown ? `Excerpt:\n${s.markdown}\n` : ""}`,
        ).join("\n---\n")
      : "(No live sources retrieved — rely on most current verified knowledge and mark unverified fees as 'verify with [agency]'.)";

    const systemPrompt = `You are PermitPath, a compliance research engine for mobile food businesses (food trucks, trailers, carts, shared kitchens, cottage food) in the United States. Today is ${today}.

Given STATE, optional CITY, and BUSINESS TYPE, return a complete, current checklist of every permit, license, certification, and inspection needed to legally operate there.

CRITICAL: Always return a complete result. Never return empty. If you are unsure of a specific fee or URL, include the item anyway and use "verify with [agency]". A vendor must always leave with a usable checklist.

RESEARCH RULES
- Prioritize official .gov sources: state health departments, city/county clerk and health offices, state business portals, fire marshal offices.
- Separate STATE-level from CITY/COUNTY-level — they stack.
- Surface law changes from the last 12 months prominently in "recent_law_alert".
- Never invent a permit, fee, or link. Use "verify with [agency]" when unverified.

KNOWN RECENT CHANGES (verify current at lookup time)
- ARIZONA: Mobile food vendors are regulated at the COUNTY health department level. Pima County (Tucson) requires a county mobile food permit + plan review, a commissary/base-of-operations agreement, an accredited Food Handler card (Pima/Maricopa accept only accredited training), and a City of Tucson business license. There is NO statewide AZ mobile food license.
- TEXAS: HB 2844 ("Food Truck Freedom Bill"), full effect July 1, 2026 — single statewide DSHS license replaces city/county permits; no commissary required; tiered fees. SB 1008 (Sept 1, 2025) bars stricter local rules.
- FDA FOOD CODE: 2022 edition is current model code; 2026 update expected. Adoption varies by state/county.
- COTTAGE FOOD: FL cap $250k; MI $50k + online/delivery (Mar 2026); ND interstate shipping; MN $30 fee + 3-yr training (Aug 2027).

OUTPUT — return JSON ONLY in this exact shape (no prose, no markdown fences):
{
  "location": { "city": string, "state": string, "stateAbbreviation": string, "business_type": string },
  "businessType": string,
  "overview": string,
  "recent_law_alert": string | null,
  "estimated_total_cost": { "low": number, "high": number, "display": string },
  "estimated_setup_weeks": { "low": number, "high": number, "display": string },
  "categories": [
    {
      "name": "Business Registration" | "Food Safety Certifications" | "Health Permits" | "Mobile Vendor License" | "Fire & Equipment" | "Commissary / Base of Operations" | "Local & City-Specific" | "Insurance",
      "items": [
        {
          "title": string,
          "issuer": string,
          "level": "state" | "county" | "city" | "federal",
          "cost_estimate": string,
          "timeline_estimate": string,
          "official_url": string,
          "why_it_matters": string,
          "pro_tip": string,
          "commonly_missed": boolean
        }
      ]
    }
  ],
  "sources": [{ "index": number, "title": string, "url": string, "agency": string }],
  "verify_note": "Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying."
}

TONE: Authoritative, plain-language, practical — like an experienced operator who has done this, not a legal textbook.`;

    const userPrompt = `Build a complete ${currentYear} PermitPath checklist for a ${businessLabel} operating in ${locationText}.

Cover, where applicable: business entity registration (LLC/DBA, EIN, sales tax), food handler / manager certification (ANSI), state mobile food unit license, county/city health permit, fire marshal inspection (LP-gas / suppression), commissary agreement (if the jurisdiction requires it), vehicle registration, zoning / vending district / parking permits, and insurance (general liability, auto, workers comp where applicable).

Prefer URLs that appear in the Source Material; if none cover an item, leave official_url as "". Populate "sources" with every source you used.

SOURCE MATERIAL (live web results, ${today}):
${sourceContext}`;

    let result: any = null;
    try {
      // Attempt 1
      const content1 = await callAi(systemPrompt, userPrompt, LOVABLE_API_KEY, false);
      if (content1) result = extractJson(content1);

      // Attempt 2 (strict)
      if (!isValidResult(result)) {
        console.warn("PermitPath: first attempt invalid, retrying strict");
        const content2 = await callAi(systemPrompt, userPrompt, LOVABLE_API_KEY, true);
        if (content2) result = extractJson(content2);
      }
    } catch (e: any) {
      if (e?.code === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (e?.code === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("PermitPath AI error:", e);
    }

    if (!isValidResult(result)) {
      console.warn("PermitPath: returning baseline fallback");
      result = baselineChecklist(trimmedState, trimmedCity, trimmedBusinessType);
    } else {
      // Backfill sources
      if ((!Array.isArray(result.sources) || result.sources.length === 0) && sources.length) {
        result.sources = sources.map((s, i) => {
          let agency = "";
          try { agency = new URL(s.url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
          return { index: i + 1, title: s.title || s.url, url: s.url, agency };
        });
      }
      if (!result.verify_note) {
        result.verify_note = "Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying.";
      }
      if (!result.location) result.location = { city: trimmedCity, state: trimmedState, stateAbbreviation: trimmedState, business_type: businessLabel };
      if (!result.businessType) result.businessType = businessLabel;
    }
    result.lastUpdated = today;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PermitPath fatal error:", error);
    // Last-resort: return a generic food_truck baseline so the UI never breaks
    try {
      const body = await req.clone().json().catch(() => ({}));
      const fb = baselineChecklist(
        (typeof body.state === 'string' ? body.state.toUpperCase() : 'AZ'),
        (typeof body.city === 'string' ? body.city : ''),
        (typeof body.businessType === 'string' ? body.businessType : 'food_truck'),
      );
      return new Response(JSON.stringify({ result: fb }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Unknown error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});
