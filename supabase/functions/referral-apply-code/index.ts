// Validates a referral code entered at checkout. Returns referrer first name for "Credited to X" UX.
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
    const { code, program_type } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalized = code.trim().toUpperCase();

    // Identify caller (optional)
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Honor global program flag
    const { data: flag } = await admin
      .from("app_feature_flags").select("enabled").eq("key", "referral_program_enabled").maybeSingle();
    if (flag && flag.enabled === false) {
      return new Response(JSON.stringify({ ok: false, error: "program_disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: normalized });
    const ref = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!ref) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId && ref.owner_id === userId) {
      return new Response(JSON.stringify({ ok: false, error: "cannot_self_refer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check program is active
    if (program_type) {
      const { data: cfg } = await admin
        .from("referral_program_config")
        .select("is_active")
        .eq("program_type", program_type)
        .maybeSingle();
      if (!cfg?.is_active) {
        return new Response(JSON.stringify({ ok: false, error: "program_inactive" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, display_name, referral_suspended")
      .eq("id", ref.owner_id)
      .maybeSingle();

    if (profile?.referral_suspended) {
      return new Response(JSON.stringify({ ok: false, error: "referrer_suspended" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      code: normalized,
      referrer_first_name: profile?.first_name || profile?.display_name?.split(" ")[0] || "your referrer",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
