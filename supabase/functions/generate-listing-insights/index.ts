import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveHostTier, tierAtLeast, tierRequiredBody } from "../_shared/resolveHostTier.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller owns the listing
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Listing insights = Growth+ feature.
    const tier = await resolveHostTier(callerId);
    if (!tierAtLeast(tier, "pro")) {
      return new Response(
        JSON.stringify({ ...tierRequiredBody("pro", tier), feature: "listing-insights" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();
    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (listing.host_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for cached insight (< 7 days old)
    const { data: cached } = await supabase
      .from("listing_ai_insights")
      .select("*")
      .eq("listing_id", listing_id)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ insight: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull comparable listings (same category + city)
    const { data: comparables } = await supabase
      .from("listings")
      .select("id, price_daily, price_weekly, price_sale, view_count, instant_book, image_urls")
      .eq("category", listing.category)
      .eq("city", listing.city || "")
      .eq("status", "published")
      .neq("id", listing_id)
      .limit(20);

    // Pull last 30 days analytics
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: analytics } = await supabase
      .from("analytics_events")
      .select("event_name, event_category")
      .eq("listing_id", listing_id)
      .gte("created_at", since.toISOString());

    const { count: viewCount } = await supabase
      .from("listing_views")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id)
      .gte("viewed_at", since.toISOString());

    const { count: bookingCount } = await supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id)
      .gte("created_at", since.toISOString());

    // Build context for the model
    const compStats = comparables && comparables.length > 0 ? {
      count: comparables.length,
      median_daily: median(comparables.map((c: any) => c.price_daily).filter(Boolean)),
      median_weekly: median(comparables.map((c: any) => c.price_weekly).filter(Boolean)),
      median_sale: median(comparables.map((c: any) => c.price_sale).filter(Boolean)),
      instant_book_pct: Math.round(
        (comparables.filter((c: any) => c.instant_book).length / comparables.length) * 100
      ),
      avg_image_count: Math.round(
        comparables.reduce((s: number, c: any) => s + (c.image_urls?.length || 0), 0) /
          comparables.length
      ),
    } : null;

    const context = {
      listing: {
        title: listing.title,
        category: listing.category,
        mode: listing.mode,
        city: listing.city,
        state: listing.state,
        price_daily: listing.price_daily,
        price_weekly: listing.price_weekly,
        price_sale: listing.price_sale,
        instant_book: listing.instant_book,
        image_count: listing.image_urls?.length || 0,
        description_length: listing.description?.length || 0,
        title_length: listing.title?.length || 0,
        amenities_count: listing.amenities?.length || 0,
        has_video: (listing.video_urls?.length || 0) > 0,
        fulfillment_type: listing.fulfillment_type,
      },
      market: compStats,
      performance_30d: {
        views: viewCount || 0,
        booking_requests: bookingCount || 0,
        conversion_rate: viewCount && viewCount > 0
          ? `${(((bookingCount || 0) / viewCount) * 100).toFixed(2)}%`
          : "N/A",
      },
    };

    const systemPrompt = `You are an expert marketplace listing optimizer for Vendibook (food truck, kitchen, vendor space rentals & sales).
Analyze the listing data and produce:
1. A health score 0-100 weighing: pricing competitiveness (30%), media quality (25%), copy completeness (20%), conversion performance (15%), feature adoption like instant book (10%).
2. 3-5 specific, actionable recommendations ranked by expected revenue impact.
Be specific to the actual data, not generic. Cite numbers when possible.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_insights",
          description: "Submit listing insights and recommendations",
          parameters: {
            type: "object",
            properties: {
              health_score: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                description: "Overall listing health 0-100",
              },
              summary: {
                type: "string",
                description: "1-2 sentence executive summary",
              },
              recommendations: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["pricing", "media", "copy", "availability", "features", "marketing"],
                    },
                    severity: {
                      type: "string",
                      enum: ["low", "medium", "high", "critical"],
                    },
                    title: { type: "string" },
                    action: { type: "string", description: "Concrete next step" },
                    expected_impact: { type: "string", description: "e.g. '+18% revenue' or '+30% inquiries'" },
                  },
                  required: ["type", "severity", "title", "action", "expected_impact"],
                  additionalProperties: false,
                },
              },
            },
            required: ["health_score", "summary", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze this listing:\n\n${JSON.stringify(context, null, 2)}`,
            },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "submit_insights" } },
        }),
      }
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    // Persist insight
    const { data: saved, error: saveErr } = await supabase
      .from("listing_ai_insights")
      .insert({
        listing_id,
        host_id: listing.host_id,
        health_score: parsed.health_score,
        recommendations: parsed.recommendations,
        competitor_summary: { summary: parsed.summary, market: compStats },
        model_used: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
    }

    return new Response(JSON.stringify({ insight: saved || parsed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function median(nums: number[]): number | null {
  const filtered = nums.filter((n) => typeof n === "number" && !isNaN(n));
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => a - b);
  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0
    ? (filtered[mid - 1] + filtered[mid]) / 2
    : filtered[mid];
}
