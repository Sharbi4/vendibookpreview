import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) =>
  console.log(`[MONETIZATION-WEBHOOK] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_MONETIZATION_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Missing Stripe config", { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let event: Stripe.Event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("signature verification failed", { msg });
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
  }

  // Idempotency — never process the same Stripe event twice.
  const { error: idemErr } = await supabase
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: event.id, event_type: event.type, payload: event as unknown as Record<string, unknown> });
  if (idemErr) {
    // Unique violation = already processed. Return 200 so Stripe stops retrying.
    if ((idemErr as { code?: string }).code === "23505") {
      log("duplicate event ignored", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("idempotency insert error", { msg: idemErr.message });
    return new Response(JSON.stringify({ error: idemErr.message }), { status: 500, headers: corsHeaders });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefunded(supabase, charge);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from("monetization_purchases")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      default:
        log("unhandled event", { type: event.type });
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("handler error", { type: event.type, msg });
    // Record the failure but still 200 so Stripe doesn't loop indefinitely once we've persisted the event.
    await supabase
      .from("stripe_webhook_events")
      .update({ status: "error", error_message: msg })
      .eq("stripe_event_id", event.id);
    return new Response(JSON.stringify({ received: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== "paid") {
    log("session not paid — skipping", { id: session.id, status: session.payment_status });
    return;
  }

  const { data: purchase, error: findErr } = await supabase
    .from("monetization_purchases")
    .select("*, product:monetization_products(*)")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (findErr) throw findErr;
  if (!purchase) {
    log("no purchase row for session — logging", { id: session.id });
    return;
  }
  if (purchase.status === "paid" || purchase.status === "fulfilled") {
    log("purchase already paid", { id: purchase.id });
    return;
  }

  // Mark paid
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await supabase
    .from("monetization_purchases")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);

  // Bump discount usage
  if (purchase.discount_code_id) {
    // deno-lint-ignore no-explicit-any
    await (supabase as any).rpc("increment_discount_uses", { code_id: purchase.discount_code_id }).catch(() => {
      // fallback: raw update
      supabase
        .from("discount_codes")
        .select("uses")
        .eq("id", purchase.discount_code_id!)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from("discount_codes")
              .update({ uses: (data.uses ?? 0) + 1 })
              .eq("id", purchase.discount_code_id!);
          }
        });
    });
    await supabase
      .from("discount_code_redemptions")
      .insert({
        code_id: purchase.discount_code_id,
        user_id: purchase.user_id,
        purchase_id: purchase.id,
      })
      .then(() => {}, () => {});
  }

  // Activate listing promotion if applicable
  // deno-lint-ignore no-explicit-any
  const product: any = (purchase as any).product;
  if (purchase.listing_id && product?.promo_type && product?.duration_days) {
    const starts = new Date();
    const ends = new Date(starts.getTime() + product.duration_days * 24 * 60 * 60 * 1000);
    const { error: promoErr } = await supabase.from("listing_promotions").insert({
      listing_id: purchase.listing_id,
      product_id: product.id,
      purchase_id: purchase.id,
      promo_type: product.promo_type,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      active: true,
    });
    if (promoErr && (promoErr as { code?: string }).code !== "23505") throw promoErr;

    await supabase
      .from("monetization_purchases")
      .update({ status: "fulfilled", fulfillment_status: "active" })
      .eq("id", purchase.id);
  }

  // In-app notification for the buyer
  if (purchase.user_id) {
    await supabase.from("notifications").insert({
      user_id: purchase.user_id,
      type: "purchase",
      title: "Upgrade Purchased ✅",
      message: `${product?.name ?? "Your upgrade"} is now active on your account.`,
      link: purchase.listing_id ? `/listing/${purchase.listing_id}` : "/dashboard",
    });
  }

  log("purchase fulfilled", { id: purchase.id });
}

async function handleRefunded(supabase: ReturnType<typeof createClient>, charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const refundAmount = charge.amount_refunded ?? 0;
  const fullyRefunded = refundAmount >= charge.amount;

  const { data: purchase } = await supabase
    .from("monetization_purchases")
    .select("id, listing_id, user_id, product_id")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!purchase) return;

  await supabase
    .from("monetization_purchases")
    .update({
      status: fullyRefunded ? "refunded" : "paid",
      refund_status: fullyRefunded ? "full" : "partial",
      refund_amount_cents: refundAmount,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);

  if (fullyRefunded) {
    await supabase
      .from("listing_promotions")
      .update({ active: false })
      .eq("purchase_id", purchase.id);

    if (purchase.user_id) {
      await supabase.from("notifications").insert({
        user_id: purchase.user_id,
        type: "purchase",
        title: "Refund Issued 💳",
        message: "A refund has been issued for your recent purchase.",
        link: "/dashboard",
      });
    }
  }
}
