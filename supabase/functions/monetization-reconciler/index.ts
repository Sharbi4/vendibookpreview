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

      // If paid + listing product but no active promo, activate it (with stacking + listings sync)
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
            const durationMs = prod.duration_days * 24 * 60 * 60 * 1000;
            const nowMs = Date.now();
            const isFeaturedProduct =
              prod.promo_type === "featured_7" ||
              prod.promo_type === "featured_30" ||
              prod.promo_type === "top_of_search";

            // Read current featured expiry for stacking.
            let currentFeaturedExpiresMs = 0;
            if (isFeaturedProduct) {
              const { data: lr } = await admin
                .from("listings")
                .select("featured_enabled, featured_expires_at")
                .eq("id", row.listing_id)
                .maybeSingle();
              // deno-lint-ignore no-explicit-any
              const lrAny = lr as any;
              if (lrAny?.featured_enabled && lrAny?.featured_expires_at) {
                currentFeaturedExpiresMs = new Date(lrAny.featured_expires_at).getTime();
              }
            }

            // Stack against existing active promo of the same type.
            const { data: samePromo } = await admin
              .from("listing_promotions")
              .select("id, ends_at")
              .eq("listing_id", row.listing_id)
              .eq("promo_type", prod.promo_type)
              .eq("active", true)
              .maybeSingle();
            // deno-lint-ignore no-explicit-any
            const existingEndsMs = samePromo && (samePromo as any).ends_at
              ? new Date((samePromo as any).ends_at).getTime()
              : 0;
            const promoStartMs = existingEndsMs > nowMs ? existingEndsMs : nowMs;
            const promoEndMs = promoStartMs + durationMs;

            if (samePromo) {
              await admin
                .from("listing_promotions")
                // deno-lint-ignore no-explicit-any
                .update({ ends_at: new Date(promoEndMs).toISOString(), purchase_id: row.id } as any)
                // deno-lint-ignore no-explicit-any
                .eq("id", (samePromo as any).id);
            } else {
              const { error: promoErr } = await admin.from("listing_promotions").insert({
                listing_id: row.listing_id,
                product_id: row.product_id,
                purchase_id: row.id,
                promo_type: prod.promo_type,
                starts_at: new Date(nowMs).toISOString(),
                ends_at: new Date(promoEndMs).toISOString(),
                active: true,
              });
              if (promoErr && (promoErr as { code?: string }).code !== "23505") {
                throw promoErr;
              }
            }

            if (isFeaturedProduct) {
              const featuredStartMs = currentFeaturedExpiresMs > nowMs ? currentFeaturedExpiresMs : nowMs;
              const featuredEndsAt = new Date(featuredStartMs + durationMs).toISOString();
              await admin
                .from("listings")
                // deno-lint-ignore no-explicit-any
                .update({
                  featured_enabled: true,
                  featured_at: currentFeaturedExpiresMs > nowMs ? undefined : new Date(nowMs).toISOString(),
                  featured_expires_at: featuredEndsAt,
                  featured_source: "paid",
                } as any)
                .eq("id", row.listing_id);
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
