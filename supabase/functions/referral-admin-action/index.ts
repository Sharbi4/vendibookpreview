// Admin actions for the referral program.
// Supported actions:
//   qualify, approve, reject, void, place_on_hold, mark_paid_manual,
//   add_note, suspend_referrer, update_program, set_flag
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

    const { action, referral_id, referrer_id, suspend, note, hold_until, payload } = await req.json();

    switch (action) {
      case "qualify":
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "qualified",
          p_source: "admin", p_note: note || "Admin moved to qualified",
        });
        break;

      case "approve":
        await admin.from("referrals").update({
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          admin_notes: note || null,
        }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "approved",
          p_source: "admin", p_note: note || "Admin approved for payout",
        });
        break;

      case "reject":
        await admin.from("referrals").update({
          void_reason: note || "admin rejected",
          admin_notes: note || null,
        }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "voided",
          p_source: "admin", p_note: note || "Admin rejected",
        });
        break;

      case "void":
        await admin.from("referrals").update({ void_reason: note || "admin voided" }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "voided",
          p_source: "admin", p_note: note || "Admin voided",
        });
        break;

      case "place_on_hold":
        await admin.from("referrals").update({
          on_hold_until: hold_until || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          admin_notes: note || null,
        }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "on_hold",
          p_source: "admin", p_note: note || "Admin placed on hold",
        });
        break;

      case "mark_paid_manual":
        if (!note || note.trim().length < 3) {
          return new Response(JSON.stringify({ error: "note required for manual payout" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await admin.from("referrals").update({
          admin_notes: note,
          payout_date: new Date().toISOString(),
        }).eq("id", referral_id);
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "paid",
          p_source: "admin", p_note: `MANUAL PAYOUT: ${note}`,
        });
        break;

      case "add_note":
        // Log-only — does not change status. Useful for audit trail without state change.
        await admin.from("referral_status_log").insert({
          referral_id,
          old_status: null,
          new_status: null,
          changed_by_source: "admin",
          changed_by_user_id: user.id,
          note: note || "(no note)",
        });
        if (note) {
          await admin.from("referrals").update({ admin_notes: note }).eq("id", referral_id);
        }
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

      case "set_flag":
        // payload = { key: string, enabled: boolean }
        if (!payload?.key || typeof payload.enabled !== "boolean") {
          return new Response(JSON.stringify({ error: "payload.key and payload.enabled required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await admin.from("app_feature_flags").upsert({
          key: payload.key,
          enabled: payload.enabled,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, { onConflict: "key" });
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
