import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { refundPayment } from "../_shared/paymentOps.ts";
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
      .select("id,user_id,status,amount_cents,currency,payment_provider")
      .eq("id", body.purchase_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!purchase) throw new Error("Purchase not found");
    if (!["paid", "fulfilled"].includes(purchase.status)) {
      throw new Error(`Cannot refund status=${purchase.status}`);
    }

    // Vendibook refunds through PayPal only. The capture reference lives on the
    // payment record written by the PayPal finalizer.
    const { data: paymentRecord } = await supabase
      .from("payment_records")
      .select("id,paypal_capture_id,currency")
      .eq("monetization_purchase_id", purchase.id)
      .not("paypal_capture_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const captureId = paymentRecord?.paypal_capture_id ?? null;
    if (!captureId) {
      return new Response(
        JSON.stringify({
          error:
            "This purchase has no PayPal capture on file. It predates PayPal and must be refunded manually.",
          manual: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requested = body.amount_cents ?? purchase.amount_cents ?? 0;
    if (requested <= 0) throw new Error("Refund amount must be > 0");
    if (purchase.amount_cents && requested > purchase.amount_cents) {
      throw new Error("Refund exceeds purchase amount");
    }

    log("Issuing refund", { purchase_id: purchase.id, captureId, requested });

    const refund = await refundPayment({
      paymentReference: captureId,
      provider: purchase.payment_provider ?? "paypal",
      amountCents: requested,
      currency: (purchase.currency ?? paymentRecord?.currency ?? "USD").toUpperCase(),
      reason: body.note || body.reason || "requested_by_customer",
      idempotencyKey: `admin-monetization-refund-${purchase.id}-${requested}`,
    });

    if (!refund.success) {
      log("Refund not completed", { error: refund.error, manual: refund.manual });
      return new Response(
        JSON.stringify({ error: refund.error, manual: refund.manual ?? false }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isFull = purchase.amount_cents && requested >= purchase.amount_cents;
    await supabase
      .from("monetization_purchases")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", purchase.id);

    // NOTE: the `stripe_*` columns are legacy names retained for accounting
    // history; they now hold PayPal refund/capture identifiers.
    await supabase.from("monetization_refund_events").insert({
      purchase_id: purchase.id,
      stripe_event_id: `admin_${refund.id}`,
      stripe_refund_id: refund.id ?? null,
      stripe_charge_id: captureId,
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
