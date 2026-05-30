// Admin actions for the referral program.
// Supported actions:
//   qualify, approve, reject, void, place_on_hold, mark_paid_manual,
//   add_note, flag_fraud, suspend_referrer, update_program, set_flag
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const fail = (err: any, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const body = await req.json();
    const { action, referral_id, referrer_id, suspend, note, hold_until, payload } = body;
    const idempotencyKey: string | undefined =
      req.headers.get("Idempotency-Key") ?? body?.idempotency_key ?? undefined;

    // Idempotency: if we've already processed this key, return the cached response.
    if (idempotencyKey) {
      const { data: existing } = await admin
        .from("admin_action_idempotency")
        .select("response")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing?.response) {
        return new Response(JSON.stringify({ ...existing.response, idempotent_replay: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Reserve the key up front so concurrent duplicates lose the race.
      const { error: reserveErr } = await admin.from("admin_action_idempotency").insert({
        idempotency_key: idempotencyKey,
        action,
        user_id: user.id,
        response: { ok: true, pending: true },
      });
      if (reserveErr && reserveErr.code === "23505") {
        // Lost the race — return the winning response.
        const { data: winner } = await admin
          .from("admin_action_idempotency")
          .select("response")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        return new Response(JSON.stringify({ ...(winner?.response ?? { ok: true }), idempotent_replay: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let lastError: any = null;


    // Helper: ignore PG unique-violation errors from idempotency indexes (23505)
    // so retries with the same key are silently deduped at the DB layer.
    const ignoreDup = (err: any) =>
      err && err.code !== "23505" ? err : null;

    switch (action) {
      case "qualify": {
        const { error } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "qualified",
          p_source: "admin", p_note: note || "Admin moved to qualified",
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = error;
        break;
      }

      case "approve": {
        const { error: e1 } = await admin.from("referrals").update({
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          admin_notes: note || null,
        }).eq("id", referral_id);
        const { error: e2 } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "approved",
          p_source: "admin", p_note: note || "Admin approved for payout",
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = e1 || e2;
        break;
      }

      case "reject": {
        if (!note || note.trim().length < 3) return fail("note required for reject", corsHeaders);
        const { error: e1 } = await admin.from("referrals").update({
          void_reason: note,
          admin_notes: note,
        }).eq("id", referral_id);
        const { error: e2 } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "voided",
          p_source: "admin", p_note: note,
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = e1 || e2;
        break;
      }

      case "void": {
        const { error: e1 } = await admin.from("referrals")
          .update({ void_reason: note || "admin voided" }).eq("id", referral_id);
        const { error: e2 } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "voided",
          p_source: "admin", p_note: note || "Admin voided",
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = e1 || e2;
        break;
      }

      case "place_on_hold": {
        const { error: e1 } = await admin.from("referrals").update({
          on_hold_until: hold_until || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          admin_notes: note || null,
        }).eq("id", referral_id);
        const { error: e2 } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "on_hold",
          p_source: "admin", p_note: note || "Admin placed on hold",
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = e1 || e2;
        break;
      }

      case "mark_paid_manual": {
        if (!note || note.trim().length < 3) return fail("note required for manual payout", corsHeaders);
        const { error: e1 } = await admin.from("referrals").update({
          admin_notes: note,
          payout_date: new Date().toISOString(),
        }).eq("id", referral_id);
        const { error: e2 } = await admin.rpc("log_referral_status_change", {
          p_referral_id: referral_id, p_new_status: "paid",
          p_source: "admin", p_note: `MANUAL PAYOUT: ${note}`,
          p_idempotency_key: idempotencyKey ?? null, p_action_type: action,
        });
        lastError = e1 || e2;
        break;
      }

      case "add_note": {
        if (!note || note.trim().length < 3) return fail("note required", corsHeaders);
        const { error: e1 } = await admin.from("referral_status_log").insert({
          referral_id,
          old_status: null,
          new_status: null,
          changed_by_source: "admin",
          changed_by_user_id: user.id,
          note,
          idempotency_key: idempotencyKey ?? null,
          action_type: action,
        });
        const { error: e2 } = await admin.from("referrals")
          .update({ admin_notes: note }).eq("id", referral_id);
        lastError = ignoreDup(e1) || e2;
        break;
      }

      case "flag_fraud": {
        if (!note || note.trim().length < 3) return fail("note required for fraud flag", corsHeaders);
        const severity = payload?.severity ?? "medium";
        if (!["low", "medium", "high"].includes(severity))
          return fail("invalid severity", corsHeaders);
        const { error: e1 } = await admin.from("referral_fraud_flags").insert({
          referral_id,
          flag_type: payload?.flag_type || "manual_admin_flag",
          severity,
          details: { note, flagged_by: user.id },
          idempotency_key: idempotencyKey ?? null,
          action_type: action,
        });
        // Log to status_log for audit trail without changing status
        const { error: e2 } = await admin.from("referral_status_log").insert({
          referral_id,
          old_status: null,
          new_status: null,
          changed_by_source: "admin",
          changed_by_user_id: user.id,
          note: `FRAUD FLAG (${severity}): ${note}`,
          idempotency_key: idempotencyKey ?? null,
          action_type: `${action}_log`,
        });
        lastError = ignoreDup(e1) || ignoreDup(e2);
        break;
      }

      case "suspend_referrer": {
        const { error } = await admin.from("profiles")
          .update({ referral_suspended: !!suspend }).eq("id", referrer_id);
        lastError = error;
        break;
      }

      case "update_program": {
        const { error } = await admin.rpc("admin_update_referral_config", {
          p_program_type: payload.program_type,
          p_reward_amount: payload.reward_amount,
          p_min_transaction_value: payload.min_transaction_value,
          p_hold_days: payload.hold_days,
          p_monthly_cap: payload.monthly_cap,
          p_is_active: payload.is_active,
        });
        lastError = error;
        break;
      }

      case "set_flag": {
        if (!payload?.key || typeof payload.enabled !== "boolean") {
          return fail("payload.key and payload.enabled required", corsHeaders);
        }
        const { error } = await admin.from("app_feature_flags").upsert({
          key: payload.key,
          enabled: payload.enabled,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, { onConflict: "key" });
        lastError = error;
        break;
      }

      default:
        return fail("unknown action", corsHeaders);
    }

    if (lastError) {
      console.error("[referral-admin-action]", action, lastError);
      // Roll back the reservation so the caller can retry with the same key after fixing the issue.
      if (idempotencyKey) {
        await admin.from("admin_action_idempotency").delete().eq("idempotency_key", idempotencyKey);
      }
      return fail(lastError, corsHeaders);
    }

    const successBody = { ok: true };
    if (idempotencyKey) {
      await admin
        .from("admin_action_idempotency")
        .update({ response: successBody })
        .eq("idempotency_key", idempotencyKey);
    }

    return new Response(JSON.stringify(successBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
