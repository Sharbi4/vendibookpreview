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

  // Idempotency — never process the same Stripe event twice at this endpoint.
  // The uniqueness constraint is (endpoint, stripe_event_id) so the parallel
  // stripe-webhook endpoint can also record the same event id without colliding.
  const ENDPOINT = "monetization-webhook";
  const { error: idemErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      endpoint: ENDPOINT,
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  if (idemErr) {
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
        await handleRefunded(supabase, charge, event.id);
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
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const prev = (event.data as any).previous_attributes ?? {};
        await handleSubscriptionChange(supabase, sub, event.type, prev);
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, stripe, inv);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, inv);
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

    // Transactional confirmation email (idempotent per session)
    await sendSubEmail(
      supabase,
      "upgrade-purchased",
      purchase.user_id,
      {
        productName: product?.name ?? "Your upgrade",
        amount: fmtMoney(purchase.amount_cents, purchase.currency ?? "usd"),
        listingId: purchase.listing_id ?? null,
        purchasesUrl: "/purchases",
      },
      `upgrade-purchased-${session.id}`,
    );
  }

  log("purchase fulfilled", { id: purchase.id });
}

async function handleRefunded(
  supabase: ReturnType<typeof createClient>,
  charge: Stripe.Charge,
  eventId: string,
) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const refundAmount = charge.amount_refunded ?? 0;
  const fullyRefunded = refundAmount >= charge.amount;
  const currency = (charge.currency ?? "usd").toLowerCase();

  const { data: purchase } = await supabase
    .from("monetization_purchases")
    .select("id, listing_id, user_id, product_id, status")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!purchase) return;

  // Immutable audit row — unique on stripe_event_id, so replays are safe.
  const latestRefund = charge.refunds?.data?.[0];
  const { error: auditErr } = await supabase.from("monetization_refund_events").insert({
    purchase_id: purchase.id,
    stripe_event_id: eventId,
    stripe_charge_id: charge.id,
    stripe_refund_id: latestRefund?.id ?? null,
    refund_amount_cents: refundAmount,
    refund_status: fullyRefunded ? "full" : "partial",
    currency,
    raw: { charge_id: charge.id, amount: charge.amount, amount_refunded: refundAmount },
  });
  if (auditErr && (auditErr as { code?: string }).code !== "23505") {
    log("refund audit insert failed", { msg: auditErr.message });
  }

  // Status transitions are enforced by trg_enforce_monetization_purchase_transition.
  // Only move to 'refunded' when fully refunded and current status permits it.
  const nextStatus = fullyRefunded ? "refunded" : purchase.status;
  await supabase
    .from("monetization_purchases")
    .update({
      status: nextStatus,
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
        link: "/purchases",
      });

      await sendSubEmail(
        supabase,
        "refund-issued",
        purchase.user_id,
        {
          amount: fmtMoney(refundAmount, currency),
          purchasesUrl: "/purchases",
        },
        `refund-issued-${eventId}`,
      );
    }
  }
}

// ----- Subscription lifecycle handlers -----

const TIER_NAMES: Record<string, string> = {
  starter: "Host Starter",
  pro: "Host Pro",
  premium: "Host Premium",
};

function planLabel(tier?: string | null, fallback?: string | null) {
  if (!tier) return fallback ?? "Host plan";
  return TIER_NAMES[tier] ?? `Host ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
}

function fmtMoney(cents?: number | null, currency = "usd") {
  if (typeof cents !== "number") return undefined;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function fmtDate(unix?: number | null) {
  if (!unix) return undefined;
  try {
    return new Date(unix * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return undefined;
  }
}

async function resolveRecipient(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
): Promise<{ email: string; firstName?: string } | null> {
  if (!userId) return null;
  // deno-lint-ignore no-explicit-any
  const { data: prof } = await (supabase as any)
    .from("profiles")
    .select("email, first_name, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.email) {
    return { email: prof.email as string, firstName: (prof.first_name as string) || (prof.full_name as string)?.split(" ")[0] };
  }
  // fallback: auth.users via admin API
  try {
    // deno-lint-ignore no-explicit-any
    const { data } = await (supabase as any).auth.admin.getUserById(userId);
    if (data?.user?.email) return { email: data.user.email as string };
  } catch {/* ignore */}
  return null;
}

async function sendSubEmail(
  supabase: ReturnType<typeof createClient>,
  templateName: string,
  userId: string | null,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  const to = await resolveRecipient(supabase, userId);
  if (!to?.email) {
    log("no email for subscription recipient", { userId, templateName });
    return;
  }
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: to.email,
        idempotencyKey,
        templateData: { firstName: to.firstName, ...templateData },
      },
    });
  } catch (err) {
    log("subscription email dispatch failed", { templateName, msg: err instanceof Error ? err.message : String(err) });
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
  eventType: string,
  previous: Record<string, unknown>,
) {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const priceId = price?.id ?? null;
  const amount = price?.unit_amount ?? null;
  const currency = price?.currency ?? "usd";
  const interval = price?.recurring?.interval ?? "month";

  // Look up existing row by subscription id, else by customer id
  // deno-lint-ignore no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("host_subscriptions")
    .select("*")
    .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer as string}`)
    .maybeSingle();

  const tier = (sub.metadata?.tier as string) || existing?.tier || null;
  const userId = (sub.metadata?.user_id as string) || existing?.user_id || null;

  const patch = {
    user_id: userId,
    tier,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("host_subscriptions").update(patch).eq("id", existing.id);
  } else {
    await supabase.from("host_subscriptions").insert(patch);
  }

  const planName = planLabel(tier, undefined);
  const amountStr = fmtMoney(amount, currency);

  // Route the correct lifecycle email
  if (eventType === "customer.subscription.created") {
    await sendSubEmail(supabase, "subscription-activated", userId, {
      planName,
      amount: amountStr,
      interval,
      nextBillingDate: fmtDate(sub.current_period_end),
      isRenewal: false,
    }, `sub-activated-${sub.id}`);
    return;
  }

  if (eventType === "customer.subscription.deleted") {
    await sendSubEmail(supabase, "subscription-cancelled", userId, {
      planName,
      accessEndsAt: fmtDate(sub.current_period_end),
      immediate: true,
    }, `sub-deleted-${sub.id}`);
    return;
  }

  // updated: detect plan change or cancel schedule
  const prevPriceId = ((previous as any)?.items?.data?.[0]?.price?.id) as string | undefined;
  const prevCancelFlag = (previous as any)?.cancel_at_period_end as boolean | undefined;

  if (prevPriceId && prevPriceId !== priceId) {
    const direction =
      typeof (existing?.stripe_price_id) === "string" && amount != null
        ? "change"
        : "change";
    await sendSubEmail(supabase, "subscription-updated", userId, {
      toPlan: planName,
      fromPlan: existing?.tier ? planLabel(existing.tier) : undefined,
      amount: amountStr,
      interval,
      direction,
      effectiveDate: fmtDate(sub.current_period_start),
    }, `sub-updated-${sub.id}-${priceId}`);
    return;
  }

  if (sub.cancel_at_period_end && prevCancelFlag === false) {
    await sendSubEmail(supabase, "subscription-cancelled", userId, {
      planName,
      accessEndsAt: fmtDate(sub.current_period_end),
      immediate: false,
    }, `sub-cancel-scheduled-${sub.id}-${sub.current_period_end}`);
  }
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof createClient>,
  _stripe: Stripe,
  invoice: Stripe.Invoice,
) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return; // one-off invoices ignored here
  // Only fire renewal email for cycle-continuation invoices, not the very first one (that's subscription.created).
  if (invoice.billing_reason && invoice.billing_reason !== "subscription_cycle") return;

  // deno-lint-ignore no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("host_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (!existing?.user_id) return;

  const line = invoice.lines?.data?.[0];
  const interval = line?.price?.recurring?.interval ?? "month";
  await sendSubEmail(supabase, "subscription-activated", existing.user_id, {
    planName: planLabel(existing.tier),
    amount: fmtMoney(invoice.amount_paid, invoice.currency ?? "usd"),
    interval,
    nextBillingDate: fmtDate(invoice.period_end),
    isRenewal: true,
  }, `sub-renewed-${invoice.id}`);
}

async function handleInvoiceFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  // deno-lint-ignore no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("host_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (!existing?.user_id) return;

  await supabase
    .from("host_subscriptions")
    .update({
      status: "past_due",
      last_error: {
        code: "invoice_payment_failed",
        invoice_id: invoice.id,
        at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  await sendSubEmail(supabase, "subscription-payment-failed", existing.user_id, {
    planName: planLabel(existing.tier),
    amount: fmtMoney(invoice.amount_due, invoice.currency ?? "usd"),
    nextRetryDate: fmtDate(invoice.next_payment_attempt),
    updatePaymentUrl: invoice.hosted_invoice_url ?? undefined,
    attemptNumber: (invoice.attempt_count ?? 0) + 1,
  }, `sub-payfail-${invoice.id}-${invoice.attempt_count ?? 0}`);
}
