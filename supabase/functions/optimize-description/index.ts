import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);
const STARTER_TIERS = new Set([
  "starter", "pro", "premium",
  "host_starter", "host_growth", "host_operator",
  "seller_plus",
]);
const UNLOCK_SLUGS = new Set(["tool_listing_studio", "host_starter", "host_growth", "host_operator"]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTier(raw: string | null | undefined): string {
  if (!raw) return "free";
  return raw.toLowerCase().replace(/_annual$/, "").replace(/_monthly$/, "");
}

async function resolveEntitlement(admin: any, userId: string): Promise<boolean> {
  // 1) Active subscription at starter+
  const { data: sub } = await admin
    .from("host_subscriptions")
    .select("tier,status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sub && ACTIVE_SUB_STATUSES.has(sub.status ?? "") && STARTER_TIERS.has(normalizeTier(sub.tier))) {
    return true;
  }
  // 2) Time-boxed pass granting a tier
  const nowIso = new Date().toISOString();
  const { data: pass } = await admin
    .from("monetization_purchases")
    .select("access_ends_at, monetization_products!inner(metadata,slug)")
    .eq("user_id", userId)
    .gt("access_ends_at", nowIso)
    .in("status", ["paid", "fulfilled"])
    .neq("fulfillment_status", "expired")
    .limit(1)
    .maybeSingle();
  const grantsTier = (pass as any)?.monetization_products?.metadata?.grants_tier;
  if (grantsTier && STARTER_TIERS.has(String(grantsTier).toLowerCase())) return true;

  // 3) Listing Studio / tier one-time unlock purchase
  const { data: purchase } = await admin
    .from("monetization_purchases")
    .select("id, monetization_products!inner(slug)")
    .eq("user_id", userId)
    .in("status", ["paid", "fulfilled"])
    .in("monetization_products.slug", Array.from(UNLOCK_SLUGS))
    .limit(1)
    .maybeSingle();
  if (purchase) return true;

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawDescription, category, mode, title } = await req.json();

    if (!rawDescription || rawDescription.trim().length < 10) {
      return json(400, { error: "Please provide a description with at least 10 characters", code: "input_too_short" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json(500, { error: "AI service is not configured. Please contact support.", code: "missing_api_key" });
    }

    // ---- Auth + entitlement ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return json(401, { error: "Sign in to use the AI writing assistant.", code: "auth_required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json(401, { error: "Session expired. Sign in and try again.", code: "auth_invalid" });
    }
    const userId = userRes.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    const entitled = await resolveEntitlement(admin, userId);
    let isSample = false;

    if (!entitled) {
      // One free sample per account
      const { data: prof } = await admin
        .from("profiles")
        .select("ai_writing_sample_used_at")
        .eq("id", userId)
        .maybeSingle();
      if (prof?.ai_writing_sample_used_at) {
        return json(403, {
          error: "The AI Writing Assistant is included with Starter and above — upgrade to unlock unlimited generations.",
          code: "entitlement_required",
          feature: "ai-description",
          requires: "starter",
          upgrade_url: "/pricing",
        });
      }
      isSample = true;
    }

    const categoryLabel = category?.replace(/_/g, " ") || "mobile food asset";
    const modeLabel = mode === "sale" ? "for sale" : "for rent";

    const systemPrompt = `You are an expert copywriter specializing in mobile food business marketplace listings. Transform rough descriptions into compelling, professional listing copy.

Guidelines:
- Friendly but professional tone
- Highlight key selling points and unique features
- Sensory language for food equipment
- Cover condition, capabilities, included features
- 150-300 words, short paragraphs
- No bullet points in the main description
- Never invent features not mentioned
- No pricing
- Honest and accurate

Listing: ${categoryLabel} ${modeLabel}${title ? ` titled "${title}"` : ""}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Rewrite and optimize this listing description:\n\n"${rawDescription}"\n\nMake it professional, engaging, and marketplace-optimized.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json(429, { error: "Too many requests. Please try again in a moment.", code: "rate_limited" });
      }
      if (response.status === 402) {
        return json(402, { error: "AI service temporarily unavailable. Please try again later.", code: "credits_exhausted" });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return json(502, { error: "AI provider error. Please try again.", code: "upstream_error" });
    }

    const data = await response.json();
    const optimizedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedDescription) {
      return json(502, { error: "AI returned no output. Please try again.", code: "empty_output" });
    }

    // Mark sample as used (only after successful generation)
    if (isSample) {
      await admin
        .from("profiles")
        .update({ ai_writing_sample_used_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return json(200, {
      optimizedDescription,
      is_sample: isSample,
      sample_notice: isSample
        ? "This is a one-time free sample. Upgrade to Starter or higher to generate unlimited AI-optimized descriptions."
        : null,
    });
  } catch (error) {
    console.error("Error optimizing description:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Failed to optimize description",
      code: "unknown_error",
    });
  }
});
