// Deno edge function — initiate a Vendibook Protected Sale for an existing sale_transaction.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROTECTION_FEE_BPS = 490;
const PROTECTION_FEE_MIN = 499_00;
const PROTECTION_FEE_MAX = 3_000_00;
const DEPOSIT_BPS = 1_000;
const DEPOSIT_MIN = 500_00;

function round(n: number) {
  return n >= 0 ? Math.floor(n + 0.5) : -Math.floor(-n + 0.5);
}

function computeAmounts(salePriceCents: number) {
  const rawFee = round((salePriceCents * PROTECTION_FEE_BPS) / 10_000);
  const protectionFeeCents = Math.min(PROTECTION_FEE_MAX, Math.max(PROTECTION_FEE_MIN, rawFee));
  const rawDeposit = round((salePriceCents * DEPOSIT_BPS) / 10_000);
  const depositCents = Math.min(salePriceCents, Math.max(DEPOSIT_MIN, rawDeposit));
  const balanceCents = Math.max(0, salePriceCents - depositCents);
  return { protectionFeeCents, depositCents, balanceCents };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sale_transaction_id } = await req.json();
    if (!sale_transaction_id) {
      return new Response(JSON.stringify({ error: "sale_transaction_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for privileged reads/writes.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: tx, error: txErr } = await admin
      .from("sale_transactions")
      .select("id, listing_id, buyer_id, seller_id, price_cents, status")
      .eq("id", sale_transaction_id)
      .maybeSingle();

    if (txErr || !tx) {
      return new Response(JSON.stringify({ error: "transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user.id !== tx.buyer_id && user.id !== tx.seller_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tx.price_cents || tx.price_cents < PROTECTION_FEE_MIN) {
      return new Response(JSON.stringify({ error: "sale not eligible for protection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amounts = computeAmounts(tx.price_cents);

    // Upsert protected_sales row keyed on sale_transaction_id.
    const { data: existing } = await admin
      .from("protected_sales")
      .select("id, status")
      .eq("sale_transaction_id", tx.id)
      .maybeSingle();

    let protectedSaleId = existing?.id as string | undefined;
    if (!protectedSaleId) {
      const { data: inserted, error: insErr } = await admin
        .from("protected_sales")
        .insert({
          sale_transaction_id: tx.id,
          listing_id: tx.listing_id,
          buyer_id: tx.buyer_id,
          seller_id: tx.seller_id,
          sale_price_cents: tx.price_cents,
          protection_fee_cents: amounts.protectionFeeCents,
          deposit_cents: amounts.depositCents,
          balance_cents: amounts.balanceCents,
          status: "initiated",
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        return new Response(JSON.stringify({ error: insErr?.message ?? "insert failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      protectedSaleId = inserted.id;

      await admin.from("protected_sale_events").insert({
        protected_sale_id: protectedSaleId,
        event: "initiated",
        actor_id: user.id,
        actor_role: user.id === tx.buyer_id ? "buyer" : "seller",
        payload: amounts,
      });
    }

    return new Response(
      JSON.stringify({ protected_sale_id: protectedSaleId, ...amounts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
