// Redeems a referral code for the calling user (must be called post-signup, before any qualifying event)
// Honors the global `referral_program_enabled` feature flag.
// Stores both the manually entered code AND the cookie code for admin audit; manual entry wins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function isProgramEnabled(admin: ReturnType<typeof createClient>) {
  const { data } = await admin
    .from("app_feature_flags")
    .select("enabled")
    .eq("key", "referral_program_enabled")
    .maybeSingle();
  // Default to enabled if flag row missing (fail-open for the program existing today).
  return data ? !!data.enabled : true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    // Backward-compatible: accept `code` (legacy) OR `manual_code`/`cookie_code`.
    const manualCode: string | undefined = body.manual_code || body.code;
    const cookieCode: string | undefined = body.cookie_code;
    const effectiveCode = (manualCode || cookieCode || "").toString().trim().toUpperCase();

    if (!effectiveCode) {
      return new Response(JSON.stringify({ error: "code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!(await isProgramEnabled(admin))) {
      return new Response(JSON.stringify({ ok: false, error: "program_disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: effectiveCode });
    const ref = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!ref) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ref.owner_id === user.id) {
      return new Response(JSON.stringify({ error: "cannot_self_refer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent insert (referred_user_id is unique)
    const { data: existing } = await admin
      .from("referrals")
      .select("id, status")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, referral_id: existing.id, status: existing.status, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attributionSource = manualCode ? "manual" : "cookie";

    const { data: created, error: insErr } = await admin
      .from("referrals")
      .insert({
        referrer_id: ref.owner_id,
        referred_user_id: user.id,
        code: ref.code,
        referrer_reward_amount: ref.give_amount,
        referred_reward_amount: ref.get_amount,
        manual_attribution_code: manualCode ? manualCode.trim().toUpperCase() : null,
        cookie_attribution_code: cookieCode ? cookieCode.trim().toUpperCase() : null,
        attribution_source: attributionSource,
        status: "signed_up",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Atomic counter bump
    await admin.rpc("increment_referral_counter", { p_owner_id: ref.owner_id });

    // Log status set
    await admin.rpc("log_referral_status_change", {
      p_referral_id: created.id,
      p_new_status: "signed_up",
      p_source: "system",
      p_note: `Attribution: ${attributionSource}` +
        (manualCode && cookieCode && manualCode.toUpperCase() !== cookieCode.toUpperCase()
          ? ` (manual=${manualCode.toUpperCase()} overrode cookie=${cookieCode.toUpperCase()})`
          : ""),
    });

    return new Response(JSON.stringify({ ok: true, referral_id: created.id, status: "signed_up" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
