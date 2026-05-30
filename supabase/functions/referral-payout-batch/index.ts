// Weekly batch payout (called by pg_cron Mondays).
// Selects all referrers with $50+ qualified, past hold, with Stripe Connect + W-9 (if YTD>=500).
// Creates Stripe transfers, writes referral_payouts, updates referral status to paid.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-08-27.basil" });

    const { data: payables } = await admin.rpc("list_payable_referrers", { p_min_payout: 50 });

    const results: any[] = [];
    for (const p of (payables ?? []) as Array<{ referrer_id: string; total_owed: number; referral_ids: string[] }>) {
      try {
        const { data: profile } = await admin
          .from("profiles")
          .select("stripe_account_id, referral_ytd_earnings")
          .eq("id", p.referrer_id)
          .single();
        if (!profile?.stripe_account_id) {
          results.push({ referrer_id: p.referrer_id, skipped: "no_stripe_account" });
          continue;
        }

        const amountCents = Math.round(Number(p.total_owed) * 100);

        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: "usd",
          destination: profile.stripe_account_id,
          description: `Vendibook referral payout (${p.referral_ids.length} referrals)`,
          metadata: {
            purpose: "referral_payout",
            referrer_id: p.referrer_id,
            referral_count: String(p.referral_ids.length),
          },
        });

        // Stripe Connect transfer fee ~ $0.25 flat
        const stripeFee = 0.25;
        const net = Number(p.total_owed) - stripeFee;

        const { data: payoutRow } = await admin.from("referral_payouts").insert({
          referrer_id: p.referrer_id,
          amount_gross: p.total_owed,
          stripe_fee: stripeFee,
          amount_net: net,
          stripe_transfer_id: transfer.id,
          status: "sent",
          referral_ids: p.referral_ids,
          completed_at: new Date().toISOString(),
        }).select().single();

        // Mark referrals paid
        for (const refId of p.referral_ids) {
          await admin.rpc("log_referral_status_change", {
            p_referral_id: refId,
            p_new_status: "paid",
            p_source: "system",
            p_note: `Stripe transfer ${transfer.id}`,
          });
        }

        // Update YTD earnings
        await admin
          .from("profiles")
          .update({ referral_ytd_earnings: Number(profile.referral_ytd_earnings ?? 0) + Number(p.total_owed) })
          .eq("id", p.referrer_id);

        // Notify referrer
        await admin.from("notifications").insert({
          user_id: p.referrer_id,
          type: "referral_payout",
          title: `$${p.total_owed} referral payout sent 🎉`,
          message: `Your referral payout for ${p.referral_ids.length} qualifying referrals is on its way.`,
          link: "/referral/dashboard",
        });

        results.push({ referrer_id: p.referrer_id, payout_id: payoutRow?.id, amount: p.total_owed });
      } catch (err) {
        await admin.from("referral_payouts").insert({
          referrer_id: p.referrer_id,
          amount_gross: p.total_owed,
          amount_net: p.total_owed,
          status: "failed",
          failure_reason: String(err).slice(0, 500),
          referral_ids: p.referral_ids,
        });
        results.push({ referrer_id: p.referrer_id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
