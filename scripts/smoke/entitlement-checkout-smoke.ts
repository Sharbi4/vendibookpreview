/**
 * Entitlement Checkout E2E Smoke
 *
 * Verifies the server-side entitlement guard in `create-monetization-checkout`:
 * Stripe is NEVER touched (no checkout session, no pending purchase row) when
 * the buyer already has equal-or-better access. Covers three paths:
 *
 *   1. PURCHASE HAPPY PATH — a fresh free user buying `host_starter`
 *      (recurring) reaches Stripe → response has a checkout URL and a
 *      `monetization_purchases` row lands in status='pending'.
 *
 *   2. ALREADY-ENTITLED SHORT-CIRCUIT (direct DB provisioning) — insert an
 *      active `host_subscriptions` row for tier=pro, then request checkout
 *      for `host_growth` (pro). Must return 409 `already_entitled`, no
 *      Stripe URL, and NO new `monetization_purchases` row.
 *
 *   3. WEBHOOK-PROVISIONED ENTITLEMENT — fresh user, deliver a signed
 *      `customer.subscription.created` event to `monetization-webhook`,
 *      confirm the row lands, then call checkout for that same tier and
 *      assert the 409 short-circuit still fires. Proves the guard reads
 *      the same source of truth the webhook writes.
 *
 * Every synthetic row (auth user, subscriptions, purchases, consents,
 * webhook events) is torn down in a finally block.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     SUPABASE_ANON_KEY=... \
 *     STRIPE_MONETIZATION_WEBHOOK_SECRET=whsec_test_... \
 *     bun scripts/smoke/entitlement-checkout-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

const URL_ = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const WHSEC = process.env.STRIPE_MONETIZATION_WEBHOOK_SECRET;

if (!URL_ || !SERVICE_KEY || !ANON_KEY || !WHSEC) {
  console.warn(
    "[smoke] ⚠️  SKIPPING entitlement-checkout smoke — need SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, and " +
      "STRIPE_MONETIZATION_WEBHOOK_SECRET (test-mode).",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) { console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green."); process.exit(1); }
  process.exit(0);
}

const CHECKOUT_URL = `${URL_}/functions/v1/create-monetization-checkout`;
const WEBHOOK_URL = `${URL_}/functions/v1/monetization-webhook`;

const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- result plumbing --------------------------------------------------

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
function record(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(name: string, cond: unknown, detail?: string) {
  record(name, !!cond, cond ? undefined : detail);
}

// ---------- Stripe signature -------------------------------------------------

function signStripeBody(body: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${v1}`;
}

// ---------- helpers ----------------------------------------------------------

const RUN = randomUUID().slice(0, 8);
const EMAIL = `smoke+ent-${RUN}@vendibook.com`;
const PASSWORD = `Vendi-Smoke-${RUN}!AA1`;
const SUB_ID = `sub_smoke_ent_${RUN}`;
const CUSTOMER_ID = `cus_smoke_ent_${RUN}`;
const nowUnix = () => Math.floor(Date.now() / 1000);

async function callCheckout(token: string, body: Record<string, unknown>) {
  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY!,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body: json };
}

async function insertConsent(userId: string, productSlug: string): Promise<string> {
  const { data, error } = await admin
    .from("user_consents")
    .insert({
      user_id: userId,
      document_type: "subscription_terms",
      document_version: "1.0",
      trigger_action: "subscription_start",
      acceptance_text: "smoke test acceptance",
      method: "checkbox",
      environment: "test",
      related_ids: { product_slug: productSlug },
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`consent insert failed: ${error?.message}`);
  return data.id;
}

async function pendingPurchaseCount(userId: string): Promise<number> {
  const { count } = await admin
    .from("monetization_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

// ---------- teardown ---------------------------------------------------------

async function teardown(userId: string | null) {
  if (!userId) return;
  await admin.from("monetization_purchases").delete().eq("user_id", userId);
  await admin.from("host_subscriptions").delete().eq("user_id", userId);
  await admin.from("host_subscriptions").delete().eq("stripe_subscription_id", SUB_ID);
  await admin.from("user_consents").delete().eq("user_id", userId);
  await admin.from("stripe_webhook_events").delete().like("stripe_event_id", `evt_smoke_ent_${RUN}%`);
  await admin.from("notifications").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

// ---------- main -------------------------------------------------------------

async function run() {
  console.log(`[smoke] entitlement-checkout against ${URL_}`);
  console.log(`[smoke] run=${RUN} user=${EMAIL}`);

  // Provision a fresh auth user + sign in to get a bearer token.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error(`❌ could not create smoke user: ${createErr?.message}`);
    process.exit(1);
  }
  const userId = created.user.id;

  const anonClient = createClient(URL_, ANON_KEY!, { auth: { persistSession: false } });
  const { data: signed, error: signErr } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signErr || !signed.session) {
    await teardown(userId);
    console.error(`❌ sign-in failed: ${signErr?.message}`);
    process.exit(1);
  }
  const token = signed.session.access_token;

  try {
    // ─────────────────────────────────────────────────────────────────────
    console.log("\n[1] Purchase happy path (host_starter, free user)");
    // ─────────────────────────────────────────────────────────────────────
    const consent1 = await insertConsent(userId, "host_starter");
    const before1 = await pendingPurchaseCount(userId);
    const r1 = await callCheckout(token, { product_slug: "host_starter", consent_id: consent1 });
    assert("checkout returns 200", r1.status === 200, `status=${r1.status} body=${JSON.stringify(r1.body).slice(0, 200)}`);
    assert("response has Stripe checkout URL", typeof r1.body?.url === "string" && r1.body.url.includes("stripe.com"), `url=${r1.body?.url}`);
    assert("pending purchase row created", (await pendingPurchaseCount(userId)) === before1 + 1);

    // ─────────────────────────────────────────────────────────────────────
    console.log("\n[2] Already-entitled short-circuit (DB-provisioned pro sub)");
    // ─────────────────────────────────────────────────────────────────────
    // Clean the pending purchase from step 1 so we can assert "no new row".
    await admin.from("monetization_purchases").delete().eq("user_id", userId);
    // Seed an active pro subscription directly.
    const { error: subErr } = await admin.from("host_subscriptions").insert({
      user_id: userId,
      stripe_subscription_id: `${SUB_ID}_direct`,
      stripe_customer_id: `${CUSTOMER_ID}_direct`,
      status: "active",
      tier: "pro",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    });
    assert("seed active pro sub", !subErr, subErr?.message);

    const consent2 = await insertConsent(userId, "host_growth");
    const before2 = await pendingPurchaseCount(userId);
    const r2 = await callCheckout(token, { product_slug: "host_growth", consent_id: consent2 });
    assert("checkout returns 409 already_entitled", r2.status === 409, `status=${r2.status}`);
    assert("response code = already_entitled", r2.body?.code === "already_entitled", `code=${r2.body?.code}`);
    assert("no Stripe URL in response", !r2.body?.url, `url=${r2.body?.url}`);
    assert("no new pending purchase row (Stripe untouched)", (await pendingPurchaseCount(userId)) === before2);

    // Also: downgrade attempt (pro user → starter) must also short-circuit.
    const consent2b = await insertConsent(userId, "host_starter");
    const r2b = await callCheckout(token, { product_slug: "host_starter", consent_id: consent2b });
    assert("downgrade attempt also 409", r2b.status === 409, `status=${r2b.status}`);
    assert("downgrade response code = already_entitled", r2b.body?.code === "already_entitled");

    // Reset for step 3.
    await admin.from("host_subscriptions").delete().eq("user_id", userId);
    await admin.from("monetization_purchases").delete().eq("user_id", userId);

    // ─────────────────────────────────────────────────────────────────────
    console.log("\n[3] Webhook-provisioned entitlement short-circuits Stripe");
    // ─────────────────────────────────────────────────────────────────────
    const periodStart = nowUnix();
    const periodEnd = periodStart + 30 * 86400;
    const evtId = `evt_smoke_ent_${RUN}_created`;
    const event = {
      id: evtId,
      object: "event",
      api_version: "2025-08-27.basil",
      type: "customer.subscription.created",
      created: nowUnix(),
      data: {
        object: {
          id: SUB_ID,
          object: "subscription",
          customer: CUSTOMER_ID,
          status: "active",
          cancel_at_period_end: false,
          cancel_at: null,
          metadata: { user_id: userId, tier: "pro" },
          current_period_start: periodStart,
          current_period_end: periodEnd,
          trial_end: null,
          items: {
            data: [
              {
                id: `si_smoke_ent_${RUN}`,
                current_period_start: periodStart,
                current_period_end: periodEnd,
                price: {
                  id: `price_smoke_ent_${RUN}`,
                  unit_amount: 8900,
                  currency: "usd",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
        },
        previous_attributes: {},
      },
    };
    const body = JSON.stringify(event);
    const whRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signStripeBody(body, WHSEC!),
      },
      body,
    });
    await whRes.text();
    assert("webhook accepts subscription.created (200)", whRes.status === 200, `status=${whRes.status}`);

    const { data: seededSub } = await admin
      .from("host_subscriptions")
      .select("status, tier")
      .eq("stripe_subscription_id", SUB_ID)
      .maybeSingle();
    assert("webhook wrote active pro sub", seededSub?.status === "active" && seededSub?.tier === "pro",
      `got status=${seededSub?.status ?? "null"} tier=${seededSub?.tier ?? "null"}`);

    const consent3 = await insertConsent(userId, "host_growth");
    const before3 = await pendingPurchaseCount(userId);
    const r3 = await callCheckout(token, { product_slug: "host_growth", consent_id: consent3 });
    assert("post-webhook checkout returns 409", r3.status === 409, `status=${r3.status} body=${JSON.stringify(r3.body).slice(0, 200)}`);
    assert("post-webhook code = already_entitled", r3.body?.code === "already_entitled");
    assert("post-webhook no Stripe URL", !r3.body?.url);
    assert("post-webhook no new purchase row", (await pendingPurchaseCount(userId)) === before3);
  } finally {
    await teardown(userId);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[smoke] ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`\n❌ entitlement-checkout smoke FAIL (${failed.length} check${failed.length === 1 ? "" : "s"})`);
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log("\n✅ entitlement-checkout smoke PASSED");
}

run().catch((e) => {
  console.error(`\n❌ SMOKE FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
