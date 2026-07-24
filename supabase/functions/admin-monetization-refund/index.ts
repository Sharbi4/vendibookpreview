import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(`[ADMIN-REFUND] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

interface Body {
  purchase_id: string;
  amount_cents?: number; // omit for full refund
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  note?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr) throw new Error(`Authentication error: ${uErr.message}`);
    const admin = userData.user;
    if (!admin) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: admin.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.purchase_id) throw new Error("purchase_id required");

    const { data: purchase, error: pErr } = await supabase
      .from("monetization_purchases")
      .select("id,user_id,status,amount_cents,currency,stripe_session_id,stripe_payment_intent_id")
      .eq("id", body.purchase_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!purchase) throw new Error("Purchase not found");
    if (!["paid", "fulfilled"].includes(purchase.status)) {
      throw new Error(`Cannot refund status=${purchase.status}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve payment_intent from purchase or checkout session
    let paymentIntentId: string | undefined = (purchase as any).stripe_payment_intent_id ?? undefined;
    if (!paymentIntentId && purchase.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id);
      paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    }
    if (!paymentIntentId) throw new Error("No payment_intent found on purchase");

    const requested = body.amount_cents ?? purchase.amount_cents ?? 0;
    if (requested <= 0) throw new Error("Refund amount must be > 0");
    if (purchase.amount_cents && requested > purchase.amount_cents) {
      throw new Error("Refund exceeds purchase amount");
    }

    log("Issuing refund", { purchase_id: purchase.id, paymentIntentId, requested });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: requested,
      reason: body.reason ?? "requested_by_customer",
      metadata: {
        purchase_id: purchase.id,
        admin_id: admin.id,
        note: body.note ?? "",
      },
    });

    const isFull = purchase.amount_cents && requested >= purchase.amount_cents;
    await supabase
      .from("monetization_purchases")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", purchase.id);

    await supabase.from("monetization_refund_events").insert({
      purchase_id: purchase.id,
      stripe_event_id: `admin_${refund.id}`,
      stripe_refund_id: refund.id,
      stripe_charge_id: typeof refund.charge === "string" ? refund.charge : refund.charge?.id ?? null,
      refund_amount_cents: requested,
      refund_status: isFull ? "full" : "partial",
      currency: purchase.currency ?? "usd",
      metadata: { source: "admin_refund", admin_id: admin.id, note: body.note ?? "" },
    });

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
