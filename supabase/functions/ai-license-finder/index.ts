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

// ---------- Vendor profile ----------
interface VendorProfile {
  alcohol?: 'yes' | 'no';
  frying?: 'yes' | 'no';
  multi_jurisdiction?: 'yes' | 'no';
  employees?: 'yes' | 'no';
  commissary?: 'yes' | 'no' | 'unsure';
  prep_style?: 'prepackaged' | 'cook_to_order';
}

function profileSummary(p: VendorProfile): string {
  const parts: string[] = [];
  if (p.alcohol) parts.push(`Serves alcohol: ${p.alcohol}`);
  if (p.frying) parts.push(`Fries / cooks with grease: ${p.frying}`);
  if (p.multi_jurisdiction) parts.push(`Operates in multiple cities/counties: ${p.multi_jurisdiction}`);
  if (p.employees) parts.push(`Hires employees: ${p.employees}`);
  if (p.commissary) parts.push(`Has a commissary already: ${p.commissary}`);
  if (p.prep_style) parts.push(`Prep style: ${p.prep_style === 'cook_to_order' ? 'cooked-to-order' : 'prepackaged'}`);
  return parts.length ? parts.join("; ") : "Not provided — assume the safer/stricter requirement.";
}

// ---------- Baseline fallback checklists ----------
function baselineChecklist(state: string, city: string, businessType: string, profile: VendorProfile = {}): any {
  const stateName = STATE_NAMES[state] || state;
  const label = businessTypeLabels[businessType] || "Mobile Food Business";
  const loc = city ? `${city}, ${state}` : stateName;

  // Tucson/AZ-specific augmentation for food trucks
  const azTucsonFoodTruck = state === 'AZ' && businessType === 'food_truck';

  const businessReg: any[] = [
    {
      title: "Register your business entity (LLC or DBA)",
      issuer: `${stateName} Corporation Commission / Secretary of State`,
      level: "state",
      cost_estimate: "$50–$150 filing fee",
      timeline_estimate: "1–3 weeks",
      official_url: state === 'AZ' ? "https://ecorp.azcc.gov/" : "",
      why_it_matters: "Legally separates you and your business and is required before applying for most permits.",
      commonly_missed: false,
      requirement_status: "required",
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
      requirement_status: "required",
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
      requirement_status: "required",
    },
  ];

  // Employees branching
  if (profile.employees === 'yes') {
    businessReg.push({
      title: "Workers' Compensation Insurance",
      issuer: `${stateName} Industrial Commission / private carrier`,
      level: "state",
      cost_estimate: "$500–$2,000 / year",
      timeline_estimate: "Same week to bind",
      official_url: "",
      why_it_matters: "Required in nearly every state the moment you hire your first employee.",
      commonly_missed: true,
      requirement_status: "required",
    });
    businessReg.push({
      title: "State payroll & unemployment tax registration",
      issuer: `${stateName} Department of Revenue + Labor`,
      level: "state",
      cost_estimate: "Free to register",
      timeline_estimate: "1–2 weeks",
      official_url: "",
      why_it_matters: "Required to legally run payroll, withhold income tax, and pay unemployment insurance.",
      commonly_missed: true,
      requirement_status: "required",
    });
  }

  const foodSafety: any[] = [
    {
      title: "Food Handler Card (every employee)",
      issuer: azTucsonFoodTruck ? "Pima County Health Department (accredited training)" : `${stateName} accredited food handler program`,
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: "$8–$15 per person",
      timeline_estimate: "Same day online course",
      official_url: azTucsonFoodTruck ? "https://webcms.pima.gov/government/health_department/food_safety_environmental_services/food_employee_handler_information/" : "",
      why_it_matters: "Required by health code before any employee handles food. Pima and Maricopa counties require an accredited course.",
      commonly_missed: true,
      requirement_status: "required",
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
      requirement_status: "required",
    },
  ];

  if (profile.alcohol === 'yes') {
    foodSafety.push({
      title: "ServSafe Alcohol / state TIPS-equivalent training",
      issuer: state === 'TX' ? "TABC Seller-Server" : "State alcohol regulatory body",
      level: "state",
      cost_estimate: "$30–$60 per server",
      timeline_estimate: "Same day online",
      official_url: state === 'TX' ? "https://www.tabc.texas.gov/" : "",
      why_it_matters: "Required for anyone serving alcohol. Without it your liquor license can be denied or suspended.",
      commonly_missed: true,
      requirement_status: "conditional",
      requirement_trigger: "Only if serving alcohol",
    });
  }

  // Health permits — prepackaged tier softens, cook-to-order keeps standard
  const isPrepackaged = profile.prep_style === 'prepackaged';
  const healthPermits: any[] = [
    {
      title: azTucsonFoodTruck
        ? "Pima County Mobile Food Permit + Plan Review"
        : `${stateName} Mobile Food Unit Health Permit${isPrepackaged ? ' (prepackaged tier)' : ''}`,
      issuer: azTucsonFoodTruck ? "Pima County Health Department, Consumer Health & Food Safety" : `${stateName} Health Department`,
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: azTucsonFoodTruck
        ? (isPrepackaged ? "$150–$400 (lower-risk tier)" : "$300–$700 (plan review + annual permit)")
        : "Verify with agency",
      timeline_estimate: isPrepackaged ? "1–3 weeks" : "2–6 weeks (plan review + inspection)",
      official_url: azTucsonFoodTruck ? "https://webcms.pima.gov/government/health_department/food_safety_environmental_services/mobile_food_units/" : "",
      why_it_matters: isPrepackaged
        ? "Even prepackaged operations need a health permit, but plan review and fees are usually lower because the risk profile is smaller."
        : "The core operating permit. No legal service of food without an approved unit, plan review, and on-site inspection.",
      commonly_missed: false,
      requirement_status: "required",
    },
  ];

  // Commissary — skipped if vendor already has one
  const commissary: any[] = [];
  if (profile.commissary !== 'yes') {
    commissary.push({
      title: profile.commissary === 'no'
        ? "Commissary / Base of Operations Agreement (CRITICAL — not secured yet)"
        : "Commissary / Base of Operations Agreement",
      issuer: azTucsonFoodTruck ? "Pima County–approved commissary" : "Local approved commissary",
      level: azTucsonFoodTruck ? "county" : "state",
      cost_estimate: "$400–$1,200 / month",
      timeline_estimate: "1–2 weeks to secure agreement",
      official_url: "",
      why_it_matters: "Most jurisdictions require a written agreement with a permitted commissary for cleaning, water/waste, and overnight storage. Without it, your health permit cannot be issued.",
      commonly_missed: true,
      requirement_status: "required",
    });
  }

  // Fire & equipment — frying upgrades to Type I hood requirements
  const fire: any[] = [
    {
      title: profile.frying === 'yes'
        ? "Fire Inspection + Type I Hood & Suppression (frying / open flame)"
        : "Fire Inspection (LP-gas, exhaust hood)",
      issuer: city ? `${city} Fire Marshal` : `${stateName} Fire Marshal`,
      level: "city",
      cost_estimate: profile.frying === 'yes' ? "$150–$400 inspection + $2k–$5k hood/suppression install" : "$75–$250 per inspection",
      timeline_estimate: profile.frying === 'yes' ? "2–4 weeks (install + inspection)" : "1–3 weeks scheduling",
      official_url: "",
      why_it_matters: profile.frying === 'yes'
        ? "Fryers and grease-producing equipment require a Type I hood with UL-300 suppression. Most first inspections fail here — budget time for a re-inspection."
        : "Trucks with propane or cooking equipment must pass a fire inspection — often required before the health permit is issued.",
      commonly_missed: true,
      requirement_status: "required",
    },
  ];
  if (profile.frying === 'yes') {
    fire.push({
      title: "Grease trap / used cooking oil disposal contract",
      issuer: "Licensed grease hauler",
      level: "city",
      cost_estimate: "$30–$100 / month",
      timeline_estimate: "Same week",
      official_url: "",
      why_it_matters: "Frying = grease waste. Most cities require a documented disposal contract — health inspectors ask for proof.",
      commonly_missed: true,
      requirement_status: "conditional",
      requirement_trigger: "Only if frying or producing grease waste",
    });
  }

  // Local & city — alcohol adds liquor license; multi-jurisdiction note
  const local: any[] = [
    {
      title: city ? `${city} Business License` : `${stateName} Local Business License`,
      issuer: city ? `${city} City Clerk / Business Services` : "Local City Clerk",
      level: "city",
      cost_estimate: "$25–$200 / year",
      timeline_estimate: "1–2 weeks",
      official_url: state === 'AZ' && city?.toLowerCase().includes('tucson') ? "https://www.tucsonaz.gov/business-license" : "",
      why_it_matters: "Almost every city requires a business license to operate within city limits, separate from your state registration.",
      commonly_missed: false,
      requirement_status: "required",
    },
    {
      title: "Vending / Right-of-Way Permit",
      issuer: city ? `${city} Transportation or Parks Department` : "Local Vending Authority",
      level: "city",
      cost_estimate: "Varies — verify with city",
      timeline_estimate: "1–4 weeks",
      official_url: "",
      why_it_matters: "Required if you sell from a public sidewalk, park, or street. Private property events usually do not require this.",
      commonly_missed: true,
      requirement_status: "conditional",
      requirement_trigger: "Only if vending on public sidewalk, park, or street",
    },
  ];

  if (profile.alcohol === 'yes') {
    local.push({
      title: "Liquor License (mobile / catering endorsement)",
      issuer: state === 'TX' ? "TABC" : `${stateName} Alcohol Beverage Control`,
      level: "state",
      cost_estimate: "$300–$1,500+ (state varies widely)",
      timeline_estimate: "4–12 weeks",
      official_url: state === 'TX' ? "https://www.tabc.texas.gov/" : "",
      why_it_matters: "Serving any alcohol requires a state-issued license. This is typically the slowest permit and often gates your launch.",
      commonly_missed: false,
      requirement_status: "conditional",
      requirement_trigger: "Only if serving alcohol",
    });
  }

  if (profile.multi_jurisdiction === 'yes') {
    local.push({
      title: "Additional business licenses for each city/county you operate in",
      issuer: "Each local jurisdiction",
      level: "city",
      cost_estimate: "$25–$200 each",
      timeline_estimate: "1–3 weeks each",
      official_url: "",
      why_it_matters: "Permits don't stack across borders — each city or county where you regularly operate generally requires its own business license. Some health permits transfer; many do not.",
      commonly_missed: true,
      requirement_status: "conditional",
      requirement_trigger: "Only if operating in multiple cities/counties",
    });
  }

  const insurance: any[] = [
    {
      title: "General Liability Insurance ($1M minimum)",
      issuer: "Private insurer (FLIP, Insure My Food Truck, Next, etc.)",
      level: "federal",
      cost_estimate: "$500–$1,500 / year",
      timeline_estimate: "Same day to bind",
      official_url: "https://www.fliprogram.com/",
      why_it_matters: "Required by most event organizers, commissaries, and city permits. Protects against customer injury and food-related claims.",
      commonly_missed: false,
      requirement_status: "required",
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
      requirement_status: "required",
    },
  ];

  let recent_law_alert: string | null = null;
  if (state === 'TX') {
    recent_law_alert = "Texas HB 2844 ('Food Truck Freedom Bill') takes full effect July 1, 2026 — a single statewide DSHS license will replace separate city/county permits. SB 1008 (effective Sept 1, 2025) already bars cities from regulating food trucks more strictly than the state.";
  } else if (state === 'AZ') {
    recent_law_alert = "Arizona regulates mobile food vendors at the county level. In Pima County (Tucson), you need a county mobile food permit plus an accredited food handler card — the statewide license you may have read about does not exist here.";
  }

  // Display order = OPERATING PRIORITY (what gates legal service first).
  // Routine business-entity paperwork goes LAST.
  const categories = [
    { name: "Health Permits", items: healthPermits },
    { name: "Local & City-Specific", items: local },
    ...(commissary.length ? [{ name: "Commissary / Base of Operations", items: commissary }] : []),
    { name: "Fire & Equipment", items: fire },
    { name: "Food Safety Certifications", items: foodSafety },
    { name: "Insurance", items: insurance },
    { name: "Business Registration", items: businessReg },
  ];

  // Critical path reasoning
  const bottleneck = profile.alcohol === 'yes'
    ? "Liquor license issuance"
    : profile.frying === 'yes'
      ? "Fire inspection + hood install"
      : "Health department plan review + inspection";
  const weeksToOpen = profile.alcohol === 'yes' ? "8–12 weeks"
    : profile.frying === 'yes' ? "5–8 weeks"
    : profile.commissary === 'no' ? "5–8 weeks"
    : "4–6 weeks";

  const risks: Array<{ title: string; why: string }> = [];
  if (profile.frying === 'yes') {
    risks.push({ title: "Fire suppression failure on first inspection", why: "Frying triggers UL-300 hood requirements — the single most common first-inspection failure. Budget time for a re-inspection." });
  }
  if (profile.commissary === 'no') {
    risks.push({ title: "Commissary not secured yet", why: "Without a signed commissary agreement, your health permit cannot be issued. This is your most urgent blocker." });
  }
  if (profile.alcohol === 'yes') {
    risks.push({ title: "Liquor license timeline", why: "State alcohol licensing can take 8–12 weeks and often delays launch. Submit it first, in parallel with everything else." });
  }
  if (profile.multi_jurisdiction === 'yes') {
    risks.push({ title: "Permit stacking across cities", why: "Each jurisdiction typically wants its own business license and may not honor another city's fire/health inspection." });
  }
  if (risks.length === 0) {
    risks.push({ title: "Underestimating health inspection scheduling", why: "Most operators assume 1 week — real-world scheduling is often 2–4 weeks. Start it the day your commissary is signed." });
  }

  const insights: Array<{ title: string; detail: string }> = [];
  if (state === 'AZ' && city?.toLowerCase().includes('tucson')) {
    insights.push({ title: "Operating outside Tucson city limits", detail: "Pima County unincorporated areas may not require a separate City of Tucson business license — could save ~$200/year and a permit cycle. Verify with Pima County." });
  }
  if (profile.alcohol === 'yes') {
    insights.push({ title: "Dropping alcohol service", detail: "Skipping alcohol saves ~$300–$1,500 in licensing and shortens your timeline by 4–8 weeks. Worth modeling if margins don't depend on it." });
  }
  if (profile.commissary === 'no') {
    insights.push({ title: "Shared commissary vs. dedicated rental", detail: "A shared commissary often runs $400–$600/mo vs. $1,000+ for dedicated space. Same compliance value." });
  }

  return {
    location: { city, state, stateAbbreviation: state, business_type: label },
    businessType: label,
    overview: `Baseline ${label.toLowerCase()} compliance checklist for ${loc}, branched to your answers. Verify each item with the issuing agency before applying.`,
    recent_law_alert,
    estimated_total_cost: { low: 1500, high: 4500, display: "$1,500–$4,500" },
    estimated_setup_weeks: { low: 4, high: 10, display: "4–10 weeks" },
    critical_path: {
      weeks_to_open: weeksToOpen,
      bottleneck,
      rationale: "Computed from the longest dependent step in your roadmap, not the sum of all items running in parallel.",
    },
    risks,
    insights,
    categories,
    sources: [],
    verify_note: "Showing the baseline checklist for this business type and profile. Live research was unavailable — confirm every item with the issuing agency before applying.",
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
    const { city, state, businessType, profile: rawProfile } = await req.json().catch(() => ({}));
    const profile: VendorProfile = (rawProfile && typeof rawProfile === 'object') ? rawProfile as VendorProfile : {};

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
      return new Response(JSON.stringify({ result: baselineChecklist(trimmedState, trimmedCity, trimmedBusinessType, profile) }),
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

ADVANCED REASONING (this is what makes PermitPath different from a generic checklist):
1. BRANCH on the vendor profile. Two vendors with different answers MUST get different checklists.
   - alcohol=yes → add liquor license + ServSafe Alcohol / TIPS / TABC-equivalent + a separate alcohol inspection.
   - frying=yes → add Type I hood + UL-300 fire suppression + grease disposal/trap contract + stricter fire inspection. Note the high re-inspection rate.
   - multi_jurisdiction=yes → flag that business licenses (and often health/fire permits) duplicate per city/county.
   - employees=yes → add workers' comp, state payroll/unemployment registration, EIN clarified.
   - commissary=no or unsure → elevate commissary to CRITICAL first blocker (health permit cannot issue without it).
   - prep_style=prepackaged → drop the health permit to the lower-risk tier where the jurisdiction offers one.
2. CRITICAL PATH. Compute realistic weeks_to_open from the LONGEST dependent chain, NOT the sum of all timelines (items run in parallel). Identify the bottleneck (long pole) — typically health inspection scheduling, liquor licensing, or fire/hood install.
3. RISKS. Surface the 1–3 places THIS specific vendor is most likely to fail or overspend. One sentence each.
4. INSIGHTS. Where a nearby jurisdiction or scope change (e.g. operating just outside city limits, dropping alcohol, shared vs dedicated commissary) would meaningfully cut cost or time, note it as an optional insight that ends with "verify with [agency]".

REQUIREMENT CLASSIFICATION (MANDATORY — accuracy is the priority):
For EVERY item, set "requirement_status" to one of: "required", "conditional", or "optional".
- "required": legally mandatory to operate this business type at this state/county/city. Operating without it risks fines or shutdown.
- "conditional": only required if a specific factor applies to this vendor. ALWAYS state the trigger in "requirement_trigger" (e.g. "Only if serving alcohol", "Only if frying / using a Type I hood", "Only if hiring employees", "Only if vending on public property").
- "optional": genuinely not legally required, but recommended; explain the benefit in why_it_matters and do NOT imply it's mandatory.

ACCURACY RULES (do not violate):
- Base "required" only on the actual law/regulation for that state, county, and city. Do not assume.
- If a permit's necessity depends on a factor you don't know about this vendor, mark it "conditional" and name the trigger — do NOT default it to optional.
- If you cannot verify whether something is required for that specific jurisdiction, set requirement_status to "required" and append " – verify with [agency]" to the title rather than calling it optional. ERR TOWARD CAUTION so a vendor never skips something mandatory based on our tool.
- Never label a core operating permit (health permit, mobile food license, required local business license, fire inspection where required, commercial auto, workers' comp when employees=yes, liquor when alcohol=yes) as optional.
- When a recent law changed a requirement (e.g. removed a city permit, created a single state license), reflect the CURRENT status and note the change in why_it_matters.

OUTPUT — return JSON ONLY in this exact shape (no prose, no markdown fences):
{
  "location": { "city": string, "state": string, "stateAbbreviation": string, "business_type": string },
  "businessType": string,
  "overview": string,
  "recent_law_alert": string | null,
  "estimated_total_cost": { "low": number, "high": number, "display": string },
  "estimated_setup_weeks": { "low": number, "high": number, "display": string },
  "critical_path": { "weeks_to_open": string, "bottleneck": string, "rationale": string },
  "risks": [ { "title": string, "why": string } ],
  "insights": [ { "title": string, "detail": string } ],
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
          "commonly_missed": boolean,
          "requirement_status": "required" | "conditional" | "optional",
          "requirement_trigger": string
        }
      ]
    }
  ],
  "sources": [{ "index": number, "title": string, "url": string, "agency": string }],
  "verify_note": "Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying."
}

TONE: Authoritative, plain-language, practical — like an experienced operator who has done this, not a legal textbook.`;

    const userPrompt = `Build a complete ${currentYear} PermitPath roadmap for a ${businessLabel} operating in ${locationText}.

VENDOR PROFILE: ${profileSummary(profile)}

Branch your checklist based on the profile above. Compute critical_path realistically (longest dependent chain, not sum). Surface 1–3 risks specific to THIS vendor. Add 1–3 money- or time-saving insights when applicable.

Cover, where applicable: business entity registration (LLC/DBA, EIN, sales tax), food handler / manager certification (ANSI), state mobile food unit license, county/city health permit, fire marshal inspection (LP-gas / suppression / hood if frying), commissary agreement (if the jurisdiction requires it), vehicle registration, zoning / vending district / parking permits, insurance (general liability, auto, workers comp if employees), and alcohol licensing if applicable.

DISPLAY ORDER — order the "categories" array by OPERATING PRIORITY, not alphabetically or by dependency. Lead with the permits and local rules that legally gate food service and where vendors get shut down: (1) Health Permits, (2) Mobile Vendor License, (3) Local & City-Specific (city business license, zoning, vending/parking rules, local fire), (4) Commissary / Base of Operations, (5) Fire & Equipment, (6) Food Safety Certifications, (7) Insurance, and put (8) Business Registration LAST. Still flag prerequisites inside why_it_matters, but the array order is by urgency to operate.

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
      result = baselineChecklist(trimmedState, trimmedCity, trimmedBusinessType, profile);
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

      // Backfill reasoning fields from a baseline if the model omitted them
      if (!result.critical_path || !result.risks || !result.insights) {
        const bl = baselineChecklist(trimmedState, trimmedCity, trimmedBusinessType, profile);
        if (!result.critical_path) result.critical_path = bl.critical_path;
        if (!Array.isArray(result.risks) || result.risks.length === 0) result.risks = bl.risks;
        if (!Array.isArray(result.insights) || result.insights.length === 0) result.insights = bl.insights;
      }
    }
    // Normalize requirement_status across every item — err toward caution.
    // If the model omitted it, treat it as "required – verify" rather than optional.
    if (Array.isArray(result.categories)) {
      for (const cat of result.categories) {
        if (!Array.isArray(cat.items)) continue;
        for (const it of cat.items) {
          const raw = typeof it.requirement_status === 'string' ? it.requirement_status.toLowerCase().trim() : '';
          if (raw === 'required' || raw === 'conditional' || raw === 'optional') {
            it.requirement_status = raw;
          } else {
            it.requirement_status = 'required';
            if (typeof it.title === 'string' && !/verify with/i.test(it.title)) {
              it.title = it.title + ' – verify with issuing agency';
            }
          }
          if (it.requirement_status !== 'conditional') {
            // Strip stray trigger on non-conditional items
            if (typeof it.requirement_trigger !== 'string' || !it.requirement_trigger.trim()) {
              delete it.requirement_trigger;
            }
          } else if (typeof it.requirement_trigger !== 'string' || !it.requirement_trigger.trim()) {
            it.requirement_trigger = 'Only if it applies to your operation — verify with issuing agency';
          }
        }
      }
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
        (body.profile && typeof body.profile === 'object') ? body.profile : {},
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
