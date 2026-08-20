import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { formatUsd } from "../_shared/adminPaymentAlert.ts";
import { notifyUser } from "../_shared/notify.ts";

/**
 * Pre-renewal heads-up: emails + in-app notification a few days before a
 * recurring membership bills, showing the expected charge and billing method.
 *
 * Reporting only — it never charges, cancels, or mutates billing state.
 * Idempotency is claimed in `edge_action_idempotency` keyed by subscription +
 * renewal timestamp, so re-running the cron never double-sends.
 */

const LEAD_DAYS = 3;

const fmtDate = (iso?: string | null) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Window: renewals landing between now and LEAD_DAYS ahead. Anything sooner
    // than "now" already billed or failed and is handled by the webhook.
    const now = new Date();
    const windowEnd = new Date(now.getTime() + LEAD_DAYS * 24 * 60 * 60 * 1000);

    const { data: subs, error } = await admin
      .from("paypal_subscriptions")
      .select(
        "id, user_id, tier, billing_interval, recurring_amount_cents, currency, next_billing_time, paypal_subscription_id, status",
      )
      .eq("status", "active")
      .not("next_billing_time", "is", null)
      .gte("next_billing_time", now.toISOString())
      .lte("next_billing_time", windowEnd.toISOString())
      .limit(500);

    if (error) throw new Error(error.message);

    let sent = 0;
    let skipped = 0;

    for (const sub of subs ?? []) {
      if (!sub.user_id || !sub.paypal_subscription_id) continue;

      // Skip members who already scheduled a cancellation for this period.
      const { data: hostSub } = await admin
        .from("host_subscriptions")
        .select("cancel_at_period_end")
        .eq("user_id", sub.user_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (hostSub?.cancel_at_period_end) { skipped++; continue; }

      const idempotency_key =
        `renewal-reminder:${sub.paypal_subscription_id}:${sub.next_billing_time}`;
      const { error: claimErr } = await admin.from("edge_action_idempotency").insert({
        idempotency_key,
        action: "renewal_reminder",
        user_id: sub.user_id,
        response: { next_billing_time: sub.next_billing_time },
      });
      if (claimErr) { skipped++; continue; } // already reminded for this period

      // Price source of truth: the subscription row, falling back to catalog.
      let amountCents: number | null = sub.recurring_amount_cents ?? null;
      if (!amountCents && sub.tier) {
        const { data: product } = await admin.from("monetization_products")
          .select("price_cents").eq("slug", sub.tier).eq("is_active", true).maybeSingle();
        amountCents = product?.price_cents ?? null;
      }
      const amount = amountCents ? formatUsd(amountCents) : "your plan amount";
      const interval = sub.billing_interval === "year" ? "year" : "month";
      const renewalDate = fmtDate(sub.next_billing_time);
      const daysUntil = Math.max(
        1,
        Math.round(
          (new Date(sub.next_billing_time!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      );

      const { data: product } = await admin.from("monetization_products")
        .select("name").eq("slug", sub.tier ?? "").maybeSingle();
      const planName = product?.name ?? "Vendibook membership";

      const { data: profile } = await admin.from("profiles")
        .select("email, first_name").eq("id", sub.user_id).maybeSingle();

      if (profile?.email) {
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "pro-membership-renewal-reminder",
              recipientEmail: profile.email,
              idempotencyKey: idempotency_key,
              templateData: {
                firstName: profile.first_name ?? undefined,
                planName,
                amount,
                interval,
                renewalDate,
                daysUntil,
                paymentMethod: "PayPal",
              },
            },
          });
        } catch (err) {
          console.error("[send-renewal-reminders] email failed", sub.paypal_subscription_id, err);
        }
      }

      await notifyUser(admin, {
        userId: sub.user_id,
        type: "subscription_renewal_upcoming",
        title: `${planName} renews in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        message:
          `We'll charge ${amount} to your PayPal billing agreement${renewalDate ? ` on ${renewalDate}` : ""}. Cancel anytime before then to avoid the charge.`,
        link: "/account/subscription",
        dedupeKey: idempotency_key,
      });

      sent++;
    }

    return jsonResponse(200, { success: true, sent, skipped, lead_days: LEAD_DAYS });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
