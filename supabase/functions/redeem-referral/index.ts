// Redeems a referral code for the calling user (must be called post-signup, before any qualifying event)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: code });
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

    const { data: created, error: insErr } = await admin
      .from("referrals")
      .insert({
        referrer_id: ref.owner_id,
        referred_user_id: user.id,
        code: ref.code,
        referrer_reward_amount: ref.give_amount,
        referred_reward_amount: ref.get_amount,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Atomic counter bump
    await admin.rpc("increment_referral_counter", { p_owner_id: ref.owner_id });

    return new Response(JSON.stringify({ ok: true, referral_id: created.id, status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
