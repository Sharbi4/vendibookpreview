// Predictive Booking Insights: analyze host's booking patterns → revenue opportunity recommendations.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Pull host's bookings (last 90 days)
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: bookings }, { data: listings }] = await Promise.all([
      supabase
        .from("booking_requests")
        .select("id, listing_id, start_date, end_date, created_at, total_price, status, is_hourly_booking")
        .eq("host_id", user.id)
        .gte("created_at", since)
        .in("status", ["approved", "completed"])
        .limit(500),
      supabase
        .from("listings")
        .select("id, title, category, price_daily, price_hourly, total_slots")
        .eq("host_id", user.id)
        .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear"),
    ]);

    // Compute booking lead time (days between created_at and start_date)
    const leadTimes = (bookings || [])
      .map((b: any) => {
        const created = new Date(b.created_at).getTime();
        const start = new Date(b.start_date).getTime();
        return Math.round((start - created) / 86400000);
      })
      .filter((n) => n >= 0 && n < 180);
    const avgLeadDays = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;

    // Day-of-week distribution
    const dowCounts = new Array(7).fill(0);
    (bookings || []).forEach((b: any) => {
      const day = new Date(b.start_date).getDay();
      dowCounts[day]++;
    });
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const peakDays = dowCounts
      .map((c, i) => ({ day: dowNames[i], count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const totalRevenue = (bookings || []).reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
    const avgBookingValue = bookings && bookings.length ? Math.round(totalRevenue / bookings.length) : 0;
    const monthlyRevenue = Math.round(totalRevenue / 3);

    const context = {
      total_bookings_90d: bookings?.length ?? 0,
      avg_lead_time_days: avgLeadDays,
      peak_days: peakDays,
      avg_booking_value: avgBookingValue,
      monthly_revenue: monthlyRevenue,
      total_listings: listings?.length ?? 0,
      categories: [...new Set((listings || []).map((l: any) => l.category))],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a booking optimization analyst for food-truck/kitchen/vendor-space hosts. Generate 3-5 SHORT predictive insights (one sentence each) with concrete revenue opportunities. Use the data — never invent numbers beyond what's provided. If data is sparse, give starter guidance. Estimate revenue uplift conservatively in USD/month.`,
          },
          { role: "user", content: `Booking analytics: ${JSON.stringify(context)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "predictive_insights",
              description: "Booking predictions + opportunity recommendations.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "One-line summary, e.g. 'You typically get booked 14 days out'." },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["lead_time", "weekend_demand", "pricing", "capacity", "category", "general"] },
                        title: { type: "string", description: "5-9 word insight title." },
                        recommendation: { type: "string", description: "One concrete action, 15-25 words." },
                        revenue_uplift_monthly: { type: "number", description: "Estimated USD/month if acted on. 0 if unknown." },
                        priority: { type: "number", minimum: 1, maximum: 3 },
                      },
                      required: ["type", "title", "recommendation", "revenue_uplift_monthly", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["headline", "insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "predictive_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${response.status}`);
    }

    const data = await response.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No insights generated");
    const result = JSON.parse(tc.function.arguments);

    return new Response(JSON.stringify({ ...result, context }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("predictive-booking-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
