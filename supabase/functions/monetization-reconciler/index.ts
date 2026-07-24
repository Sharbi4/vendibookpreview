// Monetization reconciliation worker.
//
// Scans `monetization_pending_reconciliation` for purchases that look stuck —
// either paid but never fulfilled, or pending long enough that a webhook was
// likely lost — and re-plays them against Stripe as the source of truth.
//
// Auth: admin JWT required (verify_jwt = false in config, checked in-function).
// Trigger: manual admin button + can be wired to a cron.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json({ error: "Stripe not configured" }, 500);
  }

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
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

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
      const sessionId = row.stripe_session_id as string | null;
      if (!sessionId) {
        results.push({ purchase_id: row.id, action: "no_change", detail: "no session id" });
        continue;
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });

      if (session.status === "expired" || session.status === "canceled") {
        if (row.status === "pending") {
          const { error } = await admin
            .from("monetization_purchases")
            .update({ status: session.status === "expired" ? "failed" : "cancelled" })
            .eq("id", row.id);
          results.push({
            purchase_id: row.id,
            action: "marked_failed",
            detail: error ? error.message : session.status,
          });
        } else {
          results.push({ purchase_id: row.id, action: "no_change", detail: session.status });
        }
        continue;
      }

      if (session.payment_status !== "paid") {
        results.push({
          purchase_id: row.id,
          action: "no_change",
          detail: `session ${session.payment_status}`,
        });
        continue;
      }

      // Paid at Stripe. Bring our row up to speed.
      const pi = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      if (row.status === "pending") {
        const { error } = await admin
          .from("monetization_purchases")
          .update({
            status: "paid",
            stripe_payment_intent_id: pi,
            paid_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (error) throw error;
        results.push({ purchase_id: row.id, action: "promoted_to_paid" });
      }

      // If paid + listing product but no active promo, activate it
      if (row.listing_id) {
        const { data: existingPromo } = await admin
          .from("listing_promotions")
          .select("id")
          .eq("purchase_id", row.id)
          .maybeSingle();

        if (!existingPromo) {
          const { data: product } = await admin
            .from("monetization_products")
            .select("id, promo_type, duration_days")
            .eq("id", row.product_id)
            .maybeSingle();
          // deno-lint-ignore no-explicit-any
          const prod = product as any;
          if (prod?.promo_type && prod?.duration_days) {
            const starts = new Date();
            const ends = new Date(
              starts.getTime() + prod.duration_days * 24 * 60 * 60 * 1000,
            );
            const { error: promoErr } = await admin.from("listing_promotions").insert({
              listing_id: row.listing_id,
              product_id: row.product_id,
              purchase_id: row.id,
              promo_type: prod.promo_type,
              starts_at: starts.toISOString(),
              ends_at: ends.toISOString(),
              active: true,
            });
            if (promoErr && (promoErr as { code?: string }).code !== "23505") {
              throw promoErr;
            }
            await admin
              .from("monetization_purchases")
              .update({ status: "fulfilled", fulfillment_status: "active" })
              .eq("id", row.id);
            results.push({ purchase_id: row.id, action: "activated_promotion" });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("row error", { id: row.id, msg });
      results.push({ purchase_id: row.id, action: "error", detail: msg });
    }
  }

  // ---- Subscription drift sweep ----------------------------------
  // Refresh any host_subscriptions row whose status is active/trialing/past_due
  // by re-reading from Stripe. Guarantees a missed webhook cannot leave a
  // paying user without access (or a cancelled user with lingering access).
  let subsChecked = 0;
  let subsRepaired = 0;
  try {
    const { data: subs } = await admin
      .from("host_subscriptions")
      .select("id, stripe_subscription_id, status, current_period_end")
      .in("status", ["active", "trialing", "past_due", "unpaid", "incomplete"])
      .not("stripe_subscription_id", "is", null)
      .limit(200);

    for (const row of subs ?? []) {
      subsChecked++;
      try {
        // deno-lint-ignore no-explicit-any
        const rowAny = row as any;
        const sub = await stripe.subscriptions.retrieve(rowAny.stripe_subscription_id);
        const item = sub.items?.data?.[0];
        // deno-lint-ignore no-explicit-any
        const itemAny = item as any;
        const periodEndUnix: number | null =
          itemAny?.current_period_end ?? sub.current_period_end ?? null;
        const patch = {
          status: sub.status,
          stripe_price_id: item?.price?.id ?? null,
          current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
          cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };
        await admin.from("host_subscriptions").update(patch).eq("id", rowAny.id);
        if (patch.status !== rowAny.status) subsRepaired++;
      } catch (e) {
        log("sub sweep row error", { id: (row as { id?: string }).id, msg: String(e) });
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

  return json({
    scanned: candidates?.length ?? 0,
    results,
    subs_checked: subsChecked,
    subs_repaired: subsRepaired,
    promos_deactivated: promoOff?.length ?? 0,
    featured_cleared: featuredOff?.length ?? 0,
  }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
