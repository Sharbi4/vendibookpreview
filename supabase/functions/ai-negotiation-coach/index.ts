// AI Negotiation Coach: suggests counter-offer ranges + script using market context.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveHostTier, tierAtLeast, tierRequiredBody } from "../_shared/resolveHostTier.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { offerId } = await req.json();
    if (!offerId) {
      return new Response(JSON.stringify({ error: "offerId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gate: Negotiation Coach is a Growth+ feature.
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const authClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user } } = await authClient.auth.getUser();
        if (user?.id) {
          const tier = await resolveHostTier(user.id);
          if (!tierAtLeast(tier, "pro")) {
            return new Response(
              JSON.stringify({ ...tierRequiredBody("pro", tier), feature: "negotiation-coach" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "auth_required", code: "auth_required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (gateErr) {
        console.error("negotiation-coach gate error:", gateErr);
      }
    } else {
      return new Response(
        JSON.stringify({ error: "auth_required", code: "auth_required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Load offer + listing
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select("id, offer_amount, message, created_at, listing_id, seller_id, buyer_id")
      .eq("id", offerId)
      .maybeSingle();
    if (offerErr || !offer) throw new Error("Offer not found");

    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, category, price_sale, created_at, view_count, city, state, host_id")
      .eq("id", offer.listing_id)
      .maybeSingle();

    // Comparable listings (same category, similar location)
    const { data: comps } = await supabase
      .from("listings")
      .select("price_sale, view_count, city")
      .eq("category", listing?.category || "")
      .eq("status", "published")
      .neq("id", offer.listing_id)
      .not("price_sale", "is", null)
      .limit(20);

    // Seller history (acceptance pattern)
    const { data: priorOffers } = await supabase
      .from("offers")
      .select("offer_amount, status, counter_amount, listing_id")
      .eq("seller_id", offer.seller_id)
      .neq("id", offerId)
      .limit(50);

    const ask = listing?.price_sale ?? null;
    const offerPct = ask ? Math.round((offer.offer_amount / ask) * 100) : null;
    const listingAgeDays = listing?.created_at
      ? Math.round((Date.now() - new Date(listing.created_at).getTime()) / 86400000)
      : 0;
    const compPrices = (comps || []).map((c: any) => Number(c.price_sale)).filter((n) => n > 0);
    const compMedian = compPrices.length
      ? compPrices.sort((a, b) => a - b)[Math.floor(compPrices.length / 2)]
      : null;
    const acceptedRate = priorOffers && priorOffers.length
      ? Math.round((priorOffers.filter((o: any) => o.status === "accepted").length / priorOffers.length) * 100)
      : null;

    const context = {
      asking_price: ask,
      buyer_offer: offer.offer_amount,
      buyer_offer_percent_of_ask: offerPct,
      listing_age_days: listingAgeDays,
      view_count: listing?.view_count ?? 0,
      comparable_median_price: compMedian,
      seller_acceptance_rate_percent: acceptedRate,
      buyer_message: offer.message || "",
      category: listing?.category,
      market: `${listing?.city || ""}, ${listing?.state || ""}`.trim(),
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert deal negotiation coach for a food-truck/equipment marketplace. Recommend a strategic counter-offer in USD with a 3-tier range (aggressive / balanced / quick-close) and a short reply script. Be data-driven and concise. Never recommend below buyer's offer.`,
          },
          { role: "user", content: `Negotiation context: ${JSON.stringify(context)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "negotiation_advice",
              description: "Counter-offer strategy and script.",
              parameters: {
                type: "object",
                properties: {
                  recommended_counter: { type: "number", description: "Single best-fit counter price USD." },
                  range_aggressive: { type: "number", description: "Higher counter — maximize profit, slower close." },
                  range_balanced: { type: "number", description: "Mid counter — fair compromise." },
                  range_quick_close: { type: "number", description: "Lower counter — close fast." },
                  signal: { type: "string", enum: ["accept", "counter", "decline"], description: "Top-line action recommendation." },
                  reasoning: { type: "string", description: "1-2 sentence rationale citing the data." },
                  reply_script: { type: "string", description: "60-100 word friendly script the seller can paste." },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["recommended_counter", "range_aggressive", "range_balanced", "range_quick_close", "signal", "reasoning", "reply_script", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "negotiation_advice" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${response.status}`);
    }

    const data = await response.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No advice generated");
    const advice = JSON.parse(tc.function.arguments);

    return new Response(JSON.stringify({ advice, context }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-negotiation-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
