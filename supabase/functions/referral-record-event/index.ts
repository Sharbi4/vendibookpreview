// Records a qualifying event for a referral.
// Called server-side only (service-role JWT).
//
// Callers:
//  - stripe-webhook: program=purchase (sale_transactions.paid) and program=supply (first sale on a referred host's listing)
//  - complete-ended-bookings: program=rental (booking_requests.completed)
//
// Always idempotent: pass `idempotency_key` (e.g. stripe-event-${event.id}) so retries don't double-log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Program = "supply" | "purchase" | "rental";

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ignoreDup = (err: { code?: string } | null) => (err && err.code !== "23505" ? err : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      program_type,
      referred_user_id,
      transaction_id,
      transaction_value,
      referral_code,
      seller_id,        // OPTIONAL: for purchase/supply fraud check (referrer cannot be the seller)
      listing_id,       // OPTIONAL: for supply 30/90 day window enforcement
      idempotency_key,  // OPTIONAL but recommended: stripe event id, booking id, etc.
      source_ip_hash,   // OPTIONAL: hashed IP for click-velocity fraud check
    } = body as {
      program_type: Program;
      referred_user_id: string;
      transaction_id?: string;
      transaction_value?: number;
      referral_code?: string;
      seller_id?: string;
      listing_id?: string;
      idempotency_key?: string;
      source_ip_hash?: string;
    };

    if (!program_type || !referred_user_id) {
      return new Response(JSON.stringify({ error: "program_type and referred_user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Honor global program flag
    const { data: progFlag } = await admin
      .from("app_feature_flags").select("enabled").eq("key", "referral_program_enabled").maybeSingle();
    if (progFlag && progFlag.enabled === false) {
      return ok({ skipped: "program_disabled" });
    }

    // Load program config
    const { data: cfg } = await admin
      .from("referral_program_config")
      .select("*")
      .eq("program_type", program_type)
      .maybeSingle();
    if (!cfg || !cfg.is_active) {
      return ok({ skipped: "program_inactive" });
    }
    if (transaction_value != null && Number(transaction_value) < Number(cfg.min_transaction_value)) {
      return ok({ skipped: "below_min_transaction_value" });
    }

    // Resolve referral row: explicit code wins, else existing row for the referred user
    let referralId: string | null = null;
    let referrerId: string | null = null;

    if (referral_code) {
      const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: referral_code.toUpperCase() });
      const ref = Array.isArray(lookup) ? lookup[0] : lookup;
      if (ref && ref.owner_id !== referred_user_id) {
        referrerId = ref.owner_id;
        const { data: existing } = await admin
          .from("referrals")
          .select("id")
          .eq("referred_user_id", referred_user_id)
          .eq("referrer_id", referrerId)
          .maybeSingle();
        referralId = existing?.id ?? null;
      }
    }

    if (!referralId) {
      const { data: existing } = await admin
        .from("referrals")
        .select("id, referrer_id, program_type, listing_id, listing_published_at, supply_first_txn_at, status")
        .eq("referred_user_id", referred_user_id)
        .maybeSingle();
      if (existing) {
        referralId = existing.id;
        referrerId = existing.referrer_id;
      }
    }

    if (!referralId || !referrerId) return ok({ skipped: "no_referral_attribution" });

    // Self-referral
    if (referrerId === referred_user_id) return ok({ skipped: "self_referral" });

    // Referrer suspended? — short-circuit
    const { data: referrerProfile } = await admin
      .from("profiles")
      .select("id, email, phone_number, referral_suspended")
      .eq("id", referrerId)
      .maybeSingle();
    if (referrerProfile?.referral_suspended) {
      return ok({ skipped: "referrer_suspended" });
    }

    // Monthly cap for purchase
    if (program_type === "purchase" && cfg.monthly_cap) {
      const { data: count } = await admin.rpc("count_purchase_referrals_this_month", { p_referrer_id: referrerId });
      if ((count ?? 0) >= cfg.monthly_cap) return ok({ skipped: "monthly_cap_reached" });
    }

    // Supply: 30-day good-standing + 90-day first-transaction window
    if (program_type === "supply" && listing_id) {
      const { data: refRow } = await admin
        .from("referrals")
        .select("listing_published_at, supply_first_txn_at")
        .eq("id", referralId)
        .maybeSingle();
      const publishedAt = refRow?.listing_published_at ? new Date(refRow.listing_published_at) : null;
      if (!publishedAt) return ok({ skipped: "supply_not_published_yet" });
      const ageMs = Date.now() - publishedAt.getTime();
      const days = ageMs / (24 * 60 * 60 * 1000);
      if (days < 30) return ok({ skipped: "supply_30day_window_not_met", days });
      if (days > 90) {
        await admin.rpc("log_referral_status_change", {
          p_referral_id: referralId,
          p_new_status: "expired",
          p_source: "system",
          p_note: `Supply 90-day window expired (listing ${listing_id}, age ${Math.round(days)}d)`,
          p_idempotency_key: idempotency_key ?? null,
          p_action_type: "supply_expire",
        });
        return ok({ skipped: "supply_90day_window_exceeded", days });
      }
      if (refRow?.supply_first_txn_at) return ok({ skipped: "supply_already_qualified" });
    }

    // ============ FRAUD AUTO-FLAGS (do not block; admin review required) ============
    const fraudFlags: Array<{ flag_type: string; severity: string; details: Record<string, unknown> }> = [];

    // 1) Seller === referrer for purchase/supply
    if (seller_id && seller_id === referrerId) {
      fraudFlags.push({
        flag_type: "referrer_is_seller",
        severity: "high",
        details: { seller_id, program_type, transaction_id },
      });
    }

    // 2) Same email / phone as referrer (potential duplicate account)
    if (referrerProfile?.email || referrerProfile?.phone_number) {
      const { data: referredProfile } = await admin
        .from("profiles")
        .select("email, phone_number")
        .eq("id", referred_user_id)
        .maybeSingle();
      if (
        referredProfile?.email &&
        referrerProfile.email &&
        referredProfile.email.toLowerCase() === referrerProfile.email.toLowerCase()
      ) {
        fraudFlags.push({ flag_type: "duplicate_email", severity: "high", details: {} });
      }
      if (
        referredProfile?.phone_number &&
        referrerProfile.phone_number &&
        referredProfile.phone_number === referrerProfile.phone_number
      ) {
        fraudFlags.push({ flag_type: "duplicate_phone", severity: "high", details: {} });
      }
    }

    // 3) IP velocity (>10 clicks from same hashed IP in last hour)
    if (source_ip_hash) {
      const { count: ipCount } = await admin
        .from("referral_clicks")
        .select("*", { count: "exact", head: true })
        .eq("hashed_ip", source_ip_hash)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
      if ((ipCount ?? 0) > 10) {
        fraudFlags.push({
          flag_type: "ip_velocity",
          severity: "medium",
          details: { hashed_ip: source_ip_hash, clicks_last_hour: ipCount },
        });
      }
    }

    for (const f of fraudFlags) {
      const { error: flagErr } = await admin.from("referral_fraud_flags").insert({
        referral_id: referralId,
        flag_type: f.flag_type,
        severity: f.severity,
        details: { ...f.details, source: "referral-record-event" },
        idempotency_key: idempotency_key ?? null,
        action_type: f.flag_type,
      });
      if (ignoreDup(flagErr)) {
        console.error("[referral-record-event] failed to insert fraud flag", flagErr);
      }
    }

    // ============ UPDATE REFERRAL ROW ============
    const holdUntil = cfg.hold_days > 0
      ? new Date(Date.now() + cfg.hold_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const targetStatus = "pending_review";
    const nowIso = new Date().toISOString();

    const updates: Record<string, unknown> = {
      program_type,
      reward_amount: cfg.reward_amount,
      transaction_id: transaction_id ?? null,
      on_hold_until: holdUntil,
      qualifying_event: program_type,
      pending_review_at: nowIso,
    };
    if (program_type === "supply") {
      updates.supply_first_txn_at = nowIso;
      if (listing_id) updates.listing_id = listing_id;
    }

    await admin.from("referrals").update(updates).eq("id", referralId);

    await admin.rpc("log_referral_status_change", {
      p_referral_id: referralId,
      p_new_status: targetStatus,
      p_source: "system",
      p_note:
        `Qualifying ${program_type} event recorded` +
        (transaction_value ? ` ($${transaction_value})` : "") +
        (fraudFlags.length ? ` — ${fraudFlags.length} fraud flag(s) raised` : "") +
        "; awaiting admin review",
      p_idempotency_key: idempotency_key ?? null,
      p_action_type: `qualify_${program_type}`,
    });

    // Admin notification when fraud flagged
    if (fraudFlags.length) {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      for (const a of admins ?? []) {
        await admin.from("notifications").insert({
          user_id: a.user_id,
          type: "referral_fraud",
          title: "Referral flagged for review",
          message: `${program_type} referral flagged (${fraudFlags.map((f) => f.flag_type).join(", ")})`,
          link: "/referral/admin",
        });
      }
    }

    return ok({ ok: true, referral_id: referralId, status: targetStatus, fraud_flags: fraudFlags.length });
  } catch (e) {
    console.error("[referral-record-event] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
