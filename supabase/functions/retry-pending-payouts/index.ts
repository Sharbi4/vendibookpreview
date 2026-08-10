// Retry pending seller payouts — manual settlement model.
//
// Vendibook records seller proceeds internally and administrators approve and
// record payouts by hand. This job does NOT move money: it sweeps completed
// sales whose payout has not been recorded, marks their payable rows eligible
// for release, and returns a report for the admin payouts queue.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RETRY-PENDING-PAYOUTS] ${step}${detailsStr}`);
};

// PAYOUT RULES:
// 1. SALES: eligible when BOTH buyer AND seller confirm, OR auto-release after 25 days
// 2. RENTALS: eligible 24 hours after booking end date
// Eligibility is recorded here; an administrator performs the actual transfer.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: pendingPayouts, error: fetchError } = await supabaseClient
      .from("sale_transactions")
      .select("id, seller_id, seller_payout, listing_id, message")
      .eq("status", "completed")
      .is("payout_completed_at", null)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch pending payouts: ${fetchError.message}`);
    }

    logStep("Found pending payouts", { count: pendingPayouts?.length || 0 });

    const nowIso = new Date().toISOString();
    const results: Array<{
      transactionId: string;
      sellerId: string | null;
      amount: number;
      status: "eligible" | "already_eligible" | "no_payable";
    }> = [];
    let markedEligible = 0;
    let totalPendingCents = 0;

    for (const transaction of pendingPayouts ?? []) {
      const amount = Number(transaction.seller_payout ?? 0);
      totalPendingCents += Math.round(amount * 100);

      const { data: payable } = await supabaseClient
        .from("seller_payables")
        .select("id, status, payout_eligible_at")
        .eq("seller_id", transaction.seller_id)
        .eq("listing_id", transaction.listing_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payable) {
        results.push({
          transactionId: transaction.id,
          sellerId: transaction.seller_id,
          amount,
          status: "no_payable",
        });
        continue;
      }

      if (payable.payout_eligible_at) {
        results.push({
          transactionId: transaction.id,
          sellerId: transaction.seller_id,
          amount,
          status: "already_eligible",
        });
        continue;
      }

      await supabaseClient
        .from("seller_payables")
        .update({ payout_eligible_at: nowIso })
        .eq("id", payable.id)
        .eq("status", "pending_release");

      markedEligible++;
      results.push({
        transactionId: transaction.id,
        sellerId: transaction.seller_id,
        amount,
        status: "eligible",
      });
    }

    logStep("Sweep complete", { markedEligible, scanned: results.length });

    return new Response(
      JSON.stringify({
        success: true,
        mode: "manual_settlement",
        message:
          "Payout eligibility refreshed. Administrators settle these payables manually.",
        scanned: results.length,
        markedEligible,
        totalPendingUsd: totalPendingCents / 100,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
