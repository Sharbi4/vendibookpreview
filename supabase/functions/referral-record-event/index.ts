// Records a qualifying event for a referral. Called from:
//  - stripe-webhook (after a sale clears) → program=purchase, status=on_hold for hold_days
//  - complete-ended-bookings (after rental finishes) → program=rental
//  - listing publish + first transaction (admin or scheduled job) → program=supply
// Requires service-role JWT (called server-side only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Program = "supply" | "purchase" | "rental";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      program_type,
      referred_user_id,
      transaction_id,
      transaction_value,
      referral_code, // optional explicit code (manual entry wins)
    } = body as {
      program_type: Program;
      referred_user_id: string;
      transaction_id?: string;
      transaction_value?: number;
      referral_code?: string;
    };

    if (!program_type || !referred_user_id) {
      return new Response(JSON.stringify({ error: "program_type and referred_user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load program config
    const { data: cfg } = await admin
      .from("referral_program_config")
      .select("*")
      .eq("program_type", program_type)
      .maybeSingle();
    if (!cfg || !cfg.is_active) {
      return new Response(JSON.stringify({ skipped: "program_inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (transaction_value != null && Number(transaction_value) < Number(cfg.min_transaction_value)) {
      return new Response(JSON.stringify({ skipped: "below_min_transaction_value" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve referral row: either explicit code, or the existing referrals row for this user
    let referralId: string | null = null;
    let referrerId: string | null = null;

    if (referral_code) {
      const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: referral_code.toUpperCase() });
      const ref = Array.isArray(lookup) ? lookup[0] : lookup;
      if (ref && ref.owner_id !== referred_user_id) {
        referrerId = ref.owner_id;
        // Look for existing row matching referrer
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
        .select("id, referrer_id")
        .eq("referred_user_id", referred_user_id)
        .maybeSingle();
      if (existing) {
        referralId = existing.id;
        referrerId = existing.referrer_id;
      }
    }

    if (!referralId || !referrerId) {
      return new Response(JSON.stringify({ skipped: "no_referral_attribution" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Self-referral guard
    if (referrerId === referred_user_id) {
      return new Response(JSON.stringify({ skipped: "self_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Suspended / unverified host of purchase listing? (purchase only: cannot be seller)
    // Skipping seller==referrer check here; caller (stripe-webhook) should pre-filter.

    // Monthly cap for purchase
    if (program_type === "purchase" && cfg.monthly_cap) {
      const { data: count } = await admin.rpc("count_purchase_referrals_this_month", { p_referrer_id: referrerId });
      if ((count ?? 0) >= cfg.monthly_cap) {
        return new Response(JSON.stringify({ skipped: "monthly_cap_reached" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update referral row with program-specific data
    const holdUntil = cfg.hold_days > 0
      ? new Date(Date.now() + cfg.hold_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const targetStatus = holdUntil ? "on_hold" : "qualified";

    await admin
      .from("referrals")
      .update({
        program_type,
        reward_amount: cfg.reward_amount,
        transaction_id: transaction_id ?? null,
        on_hold_until: holdUntil,
        qualifying_event: program_type,
      })
      .eq("id", referralId);

    await admin.rpc("log_referral_status_change", {
      p_referral_id: referralId,
      p_new_status: targetStatus,
      p_source: "system",
      p_note: `Qualifying ${program_type} event recorded${transaction_value ? ` ($${transaction_value})` : ""}`,
    });

    return new Response(JSON.stringify({ ok: true, referral_id: referralId, status: targetStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
