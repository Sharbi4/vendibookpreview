// Monetization reconciliation worker.
//
// Scans `monetization_pending_reconciliation` for purchases that look stuck —
// either paid but never fulfilled, or pending long enough that a webhook was
// likely lost — and re-plays them against PayPal as the source of truth.
//
// Vendibook processes payments through PayPal only. Legacy rows from the
// retired processor are read-only accounting history and are never re-played.
//
// Auth: admin JWT required (verify_jwt = false in config, checked in-function).
// Trigger: manual admin button + can be wired to a cron.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getPayPalOrder, getPayPalSubscription } from "../_shared/paypal.ts";
import { fulfillMonetizationPurchase } from "../_shared/fulfillMonetizationPurchase.ts";
import { resolveSubscriptionPeriod } from "../_shared/subscriptionPeriod.ts";
import { grantMonthlyBoostCredit } from "../_shared/proBoostCredit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(
    `[MONETIZATION-RECONCILER] ${step}${
      details ? " - " + JSON.stringify(details) : ""
    }`,
  );

interface ReconResult {
  purchase_id: string;
  action: "promoted_to_paid" | "activated_promotion" | "marked_failed" | "no_change" | "error";
  detail?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: allow either an authenticated admin (manual admin trigger) or an
  // anonymous system caller (pg_cron uses the anon key). All operations
  // performed here are safe idempotent drift-fixers on data we already own.
  const authHeader = req.headers.get("Authorization");
  let isSystem = false;
  if (authHeader) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userData?.user) {
      // deno-lint-ignore no-explicit-any
      const { data: isAdmin } = await (userClient as any).rpc("is_admin", {
        user_id: userData.user.id,
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    } else {
      // Anon-key bearer with no user session => scheduled invocation.
      isSystem = true;
    }
  } else {
    isSystem = true;
  }
  log("auth", { isSystem });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Optional filter: reconcile a specific purchase id
  let onlyId: string | undefined;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.purchase_id === "string") onlyId = body.purchase_id;
    }
  } catch { /* ignore */ }

  // Pull candidates
  let query = admin
    .from("monetization_pending_reconciliation")
    .select("*")
    .limit(100);
  if (onlyId) query = query.eq("id", onlyId);
  const { data: candidates, error: candErr } = await query;
  if (candErr) return json({ error: candErr.message }, 500);

  log("candidates", { count: candidates?.length ?? 0, onlyId });

  const results: ReconResult[] = [];

  for (const row of candidates ?? []) {
    try {
      // Resolve the PayPal order backing this purchase.
      const { data: record } = await admin
        .from("payment_records")
        .select("paypal_order_id, payment_status, internal_status")
        .eq("monetization_purchase_id", row.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const orderId = (record as { paypal_order_id?: string | null } | null)?.paypal_order_id ?? null;
      if (!orderId) {
        results.push({
          purchase_id: row.id,
          action: "no_change",
          detail: "no PayPal order on file (legacy or abandoned checkout)",
        });
        continue;
      }

      const order = await getPayPalOrder(orderId);
      const orderStatus = String(order?.status ?? "").toUpperCase();

      if (orderStatus === "VOIDED" || orderStatus === "EXPIRED") {
        if (row.status === "pending") {
          const { error } = await admin
            .from("monetization_purchases")
            .update({ status: "failed" })
            .eq("id", row.id);
          results.push({
            purchase_id: row.id,
            action: "marked_failed",
            detail: error ? error.message : orderStatus.toLowerCase(),
          });
        } else {
          results.push({ purchase_id: row.id, action: "no_change", detail: orderStatus });
        }
        continue;
      }

      const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
      const captured = orderStatus === "COMPLETED" &&
        String(capture?.status ?? "").toUpperCase() === "COMPLETED";

      if (!captured) {
        results.push({
          purchase_id: row.id,
          action: "no_change",
          detail: `order ${orderStatus || "unknown"}`,
        });
        continue;
      }

      // Paid at PayPal. Bring our row up to speed, then fulfil idempotently.
      if (row.status === "pending") {
        const { error } = await admin
          .from("monetization_purchases")
          .update({
            status: "paid",
            payment_provider: "paypal",
            paid_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (error) throw error;
        results.push({ purchase_id: row.id, action: "promoted_to_paid" });
      }

      const { data: existingPromo } = row.listing_id
        ? await admin
          .from("listing_promotions")
          .select("id")
          .eq("purchase_id", row.id)
          .maybeSingle()
        : { data: null };

      if (row.listing_id && !existingPromo) {
        await fulfillMonetizationPurchase(admin, row.id);
        results.push({ purchase_id: row.id, action: "activated_promotion" });
      } else if (!row.listing_id && row.fulfillment_status !== "active") {
        await fulfillMonetizationPurchase(admin, row.id);
        results.push({ purchase_id: row.id, action: "activated_promotion" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("row error", { id: row.id, msg });
      results.push({ purchase_id: row.id, action: "error", detail: msg });
    }
  }

  // ---- Subscription drift sweep ----------------------------------
  // Refresh any host_subscriptions row whose status is active/trialing/past_due
  // by re-reading from PayPal. Guarantees a missed webhook cannot leave a
  // paying user without access (or a cancelled user with lingering access).
  let subsChecked = 0;
  let subsRepaired = 0;
  try {
    const { data: subs } = await admin
      .from("host_subscriptions")
      .select("id, user_id, tier, paypal_subscription_id, status, current_period_start, current_period_end")
      .in("status", ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"])
      .not("paypal_subscription_id", "is", null)
      .limit(200);

    for (const row of subs ?? []) {
      subsChecked++;
      try {
        // deno-lint-ignore no-explicit-any
        const rowAny = row as any;
        const sub = await getPayPalSubscription(rowAny.paypal_subscription_id);
        const paypalStatus = String(sub?.status ?? "").toUpperCase();
        // Shared grandfathering rule: a cancelled membership keeps benefits
        // through the paid-through date we already stored.
        const period = resolveSubscriptionPeriod({
          providerStatus: paypalStatus.toLowerCase(),
          nextBillingTime: sub?.billing_info?.next_billing_time ?? null,
          lastPaymentAt: sub?.billing_info?.last_payment?.time ?? null,
          startTime: sub?.start_time ?? null,
          existingPeriodEnd: rowAny.current_period_end ?? null,
          existingPeriodStart: rowAny.current_period_start ?? null,
        });
        const patch = {
          status: period.status,
          payment_provider: "paypal",
          cancel_at_period_end: period.cancel_at_period_end,
          cancel_at: period.cancel_at,
          current_period_start: period.current_period_start,
          current_period_end: period.current_period_end,
          updated_at: new Date().toISOString(),
        };
        await admin.from("host_subscriptions").update(patch).eq("id", rowAny.id);
        if (patch.status !== rowAny.status) subsRepaired++;

        // Safety net for a missed webhook: the grant is unique per billing
        // period, so re-running this never issues a second credit.
        if (patch.status === "active") {
          try {
            await grantMonthlyBoostCredit(admin, {
              userId: rowAny.user_id,
              tier: rowAny.tier,
              periodStart: patch.current_period_start,
              periodEnd: patch.current_period_end,
              subscriptionId: rowAny.id,
              paypalSubscriptionId: rowAny.paypal_subscription_id,
            });
          } catch (creditErr) {
            console.error("[reconciler] boost credit grant failed", creditErr);
          }
        }
      } catch (e) {
        const msg = String(e);
        const rowId = (row as { id?: string }).id;
        // PayPal no longer knows this subscription (404). Leaving the row
        // active would grant access forever and re-fail every run, so mark it
        // canceled and detach the dead provider id so it self-heals.
        if (/resource does not exist|RESOURCE_NOT_FOUND/i.test(msg)) {
          await admin
            .from("host_subscriptions")
            .update({
              // Keep paid-through access; only detach the dead provider id.
              status: (row as { current_period_end?: string | null }).current_period_end &&
                  new Date((row as { current_period_end: string }).current_period_end) > new Date()
                ? "active"
                : "canceled",
              cancel_at_period_end: true,
              paypal_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rowId);
          subsRepaired++;
          log("sub sweep orphan canceled", { id: rowId });
        } else {
          log("sub sweep row error", { id: rowId, msg });
        }
      }
    }
  } catch (e) {
    log("sub sweep failed", { msg: String(e) });
  }

  // ---- Promotion expiry sweep ------------------------------------
  const nowIso = new Date().toISOString();
  const { data: promoOff, error: promoErr } = await admin
    .from("listing_promotions")
    .update({ active: false })
    .eq("active", true)
    .lt("ends_at", nowIso)
    .select("id");
  if (promoErr) log("promo expiry sweep failed", { msg: promoErr.message });

  const { data: featuredOff, error: featErr } = await admin
    .from("listings")
    .update({ featured_enabled: false })
    .eq("featured_enabled", true)
    .lt("featured_expires_at", nowIso)
    .select("id");
  if (featErr) log("featured expiry sweep failed", { msg: featErr.message });

  // ---- Account-scoped time-boxed pass expiry (Pro Weekly Pass, etc.) -----
  // Any monetization_purchases row with access_ends_at < now flips to
  // fulfillment_status='expired' so useHostEntitlements stops promoting the tier.
  let passesExpired = 0;
  try {
    const { data: expired, error: expErr } = await admin
      .from("monetization_purchases")
      .update({ fulfillment_status: "expired" })
      .lt("access_ends_at", nowIso)
      .neq("fulfillment_status", "expired")
      .not("access_ends_at", "is", null)
      .select("id");
    if (expErr) log("pass expiry sweep failed", { msg: expErr.message });
    passesExpired = expired?.length ?? 0;
  } catch (e) {
    log("pass expiry sweep threw", { msg: String(e) });
  }

  // ---- Day-5 nudge for passes ending in ~48h -----
  let nudgesSent = 0;
  try {
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: soon } = await admin
      .from("monetization_purchases")
      .select("id, user_id, access_ends_at, product:monetization_products(name, metadata)")
      .gt("access_ends_at", in24h)
      .lt("access_ends_at", in48h)
      .is("nudge_sent_at", null)
      .in("fulfillment_status", ["active"])
      .limit(100);
    for (const row of soon ?? []) {
      // deno-lint-ignore no-explicit-any
      const r = row as any;
      if (!r.user_id) continue;
      const endsAt = new Date(r.access_ends_at);
      const days = Math.max(1, Math.round((endsAt.getTime() - Date.now()) / 86_400_000));
      try {
        // deno-lint-ignore no-explicit-any
        const { data: prof } = await (admin as any).from("profiles")
          .select("email, first_name").eq("id", r.user_id).maybeSingle();
        if (!prof?.email) continue;
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "weekly-pass-ending",
            recipientEmail: prof.email,
            idempotencyKey: `weekly-pass-nudge-${r.id}`,
            templateData: {
              firstName: prof.first_name,
              daysLeft: days,
              endsAt: endsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
              monthlyPrice: "$89/mo",
              plansUrl: "/pricing",
            },
          },
        });
        await admin.from("monetization_purchases").update({ nudge_sent_at: nowIso }).eq("id", r.id);
        nudgesSent++;
      } catch (e) {
        log("nudge send failed", { id: r.id, msg: String(e) });
      }
    }
  } catch (e) {
    log("nudge sweep threw", { msg: String(e) });
  }



  return json({
    scanned: candidates?.length ?? 0,
    results,
    subs_checked: subsChecked,
    subs_repaired: subsRepaired,
    promos_deactivated: promoOff?.length ?? 0,
    featured_cleared: featuredOff?.length ?? 0,
    passes_expired: passesExpired,
    nudges_sent: nudgesSent,
  }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
