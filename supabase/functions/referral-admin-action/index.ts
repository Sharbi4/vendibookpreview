// Admin actions: approve, void, suspend referrer, trigger manual payout.
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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const { action, referral_id, referrer_id, suspend, note, payload } = await req.json();

    switch (action) {
      case "qualify":
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "qualified",
          p_source: "admin", p_note: note || "Admin approved",
        });
        break;
      case "void":
        await admin.from("referrals").update({ void_reason: note || "admin voided" }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "voided",
          p_source: "admin", p_note: note || "Admin voided",
        });
        break;
      case "suspend_referrer":
        await admin.from("profiles").update({ referral_suspended: !!suspend }).eq("id", referrer_id);
        break;
      case "update_program":
        await admin.rpc("admin_update_referral_config", {
          p_program_type: payload.program_type,
          p_reward_amount: payload.reward_amount,
          p_min_transaction_value: payload.min_transaction_value,
          p_hold_days: payload.hold_days,
          p_monthly_cap: payload.monthly_cap,
          p_is_active: payload.is_active,
        });
        break;
      default:
        return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
