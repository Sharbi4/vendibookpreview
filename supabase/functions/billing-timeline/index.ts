import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

/**
 * Read-only billing timeline for the signed-in member: subscription payments,
 * one-time purchases, and subscription state changes over the last 3 months,
 * plus the next billing date. No money logic — reporting only.
 */

type Entry = {
  id: string;
  at: string;
  kind: "payment" | "purchase" | "state";
  title: string;
  detail?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  status?: string | null;
};

const STATE_LABELS: Record<string, string> = {
  "BILLING.SUBSCRIPTION.CREATED": "Membership created",
  "BILLING.SUBSCRIPTION.ACTIVATED": "Membership activated",
  "BILLING.SUBSCRIPTION.UPDATED": "Membership updated",
  "BILLING.SUBSCRIPTION.SUSPENDED": "Membership suspended",
  "BILLING.SUBSCRIPTION.CANCELLED": "Membership cancelled",
  "BILLING.SUBSCRIPTION.EXPIRED": "Membership expired",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "Payment failed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const since = new Date(Date.now() - 92 * 24 * 60 * 60 * 1000).toISOString();
    const entries: Entry[] = [];

    // --- Subscriptions owned by this member ---
    const { data: subs } = await admin
      .from("paypal_subscriptions")
      .select("paypal_subscription_id, status, plan_name, next_billing_at, last_payment_at, cancelled_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const subIds = (subs ?? []).map((s) => s.paypal_subscription_id).filter(Boolean) as string[];

    const { data: hostSub } = await admin
      .from("host_subscriptions")
      .select("tier, status, current_period_start, current_period_end, cancel_at_period_end, paypal_subscription_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // --- Webhook-derived payments + state changes for those subscriptions ---
    if (subIds.length) {
      const { data: events } = await admin
        .from("paypal_webhook_events")
        .select("id, event_type, resource_id, received_at, raw_event")
        .gte("received_at", since)
        .order("received_at", { ascending: false })
        .limit(500);

      for (const ev of events ?? []) {
        const raw = (ev.raw_event ?? {}) as Record<string, any>;
        const resource = (raw.resource ?? {}) as Record<string, any>;
        const agreementId = resource.billing_agreement_id ?? resource.id ?? ev.resource_id;
        if (!subIds.includes(String(agreementId))) continue;

        if (ev.event_type === "PAYMENT.SALE.COMPLETED") {
          const total = resource?.amount?.total ?? resource?.amount?.value;
          entries.push({
            id: `ev-${ev.id}`,
            at: ev.received_at,
            kind: "payment",
            title: "Membership payment",
            detail: "PayPal recurring billing",
            amount_cents: total ? Math.round(Number(total) * 100) : null,
            currency: resource?.amount?.currency ?? resource?.amount?.currency_code ?? "USD",
            status: "paid",
          });
        } else if (STATE_LABELS[ev.event_type]) {
          entries.push({
            id: `ev-${ev.id}`,
            at: ev.received_at,
            kind: "state",
            title: STATE_LABELS[ev.event_type],
            detail: resource?.status ? `Status: ${String(resource.status).toLowerCase()}` : null,
          });
        }
      }
    }

    // --- One-time purchases (boosts, pro listings, concierge, etc.) ---
    const { data: purchases } = await admin
      .from("monetization_purchases")
      .select("id, amount_cents, currency, status, created_at, paid_at, product_id, metadata")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);

    const productIds = [...new Set((purchases ?? []).map((p) => p.product_id).filter(Boolean))] as string[];
    const productNames = new Map<string, string>();
    if (productIds.length) {
      const { data: products } = await admin
        .from("monetization_products")
        .select("id, name")
        .in("id", productIds);
      for (const p of products ?? []) productNames.set(p.id, p.name);
    }

    for (const p of purchases ?? []) {
      if (p.status === "pending" || p.status === "failed" || p.status === "cancelled") continue;
      entries.push({
        id: `mp-${p.id}`,
        at: p.paid_at ?? p.created_at,
        kind: "purchase",
        title: productNames.get(p.product_id ?? "") ?? "Vendibook purchase",
        detail: p.status === "refunded" ? "Refunded" : "One-time purchase",
        amount_cents: p.amount_cents,
        currency: p.currency ?? "USD",
        status: p.status,
      });
    }

    entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const activeSub = (subs ?? []).find((s) => ["active", "suspended", "past_due"].includes(String(s.status)))
      ?? (subs ?? [])[0] ?? null;

    return jsonResponse(200, {
      since,
      entries,
      subscription: activeSub
        ? {
          id: activeSub.paypal_subscription_id,
          status: activeSub.status,
          plan_name: activeSub.plan_name ?? null,
          next_billing_at: activeSub.next_billing_at ?? hostSub?.current_period_end ?? null,
          last_payment_at: activeSub.last_payment_at ?? null,
          cancel_at_period_end: hostSub?.cancel_at_period_end ?? false,
          tier: hostSub?.tier ?? null,
        }
        : null,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
