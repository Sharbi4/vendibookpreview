/**
 * End-to-end smoke test: Full publish flow from /list to `published`.
 *
 * Exercises the exact DB sequence a real user drives when they:
 *   1. Land on /list and complete QuickStartWizard  →  ONE listings.insert (status='draft')
 *   2. Progress through PublishWizard steps         →  N listings.update calls (still 1 row)
 *   3. Click "Publish"                              →  final listings.update -> status='published'
 *
 * PLUS three real-world blocked scenarios (added 2026-07-25):
 *   5a. Card-payment sale — asserts the DB fixture the client-side Stripe
 *       gate reads (accept_card_payment=true) is what the app sees, so a
 *       silent flip to cash-only in the DB layer cannot mask the gate.
 *   5b. Unverified-identity host — asserts profiles.identity_verified=false
 *       persists (the client gate depends on this exact value).
 *   5c. Host at active-listing limit — attempts an (N+1)th publish and
 *       expects trg_enforce_listing_publish_limit to raise
 *       'listing_publish_limit_reached'. This is the ONLY server-enforced
 *       gate of the three; scenarios 5a/5b are client gates and only their
 *       data contract can be smoked here.
 *
 * Guardrails asserted:
 *   • Exactly ONE listings row exists for the synthetic host at the end
 *   • Row transitions draft → published with `published_at` set
 *   • Wizard step-updates never create sibling rows
 *
 * Runs against the live project with SERVICE_ROLE; creates & tears down
 * fully isolated synthetic rows. Exits non-zero on failure so pre-deploy
 * gate blocks ship.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke/publish-flow-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  // GitHub Actions annotation → yellow warning banner in the run UI, so an
  // unconfigured secret can't be mistaken for a passing gate at a glance.
  console.log(
    "::warning title=publish-flow smoke SKIPPED::" +
      "SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set. " +
      "Add them under repo Settings → Secrets and variables → Actions " +
      "to enable this pre-deploy gate.",
  );
  console.log("\n============================================================");
  console.log("  [smoke] ⚠️  publish-flow SKIPPED — secrets not configured");
  console.log("  This job is GREEN but did NOT execute any assertions.");
  console.log("  Required repo secrets:");
  console.log("    • SUPABASE_URL");
  console.log("    • SUPABASE_SERVICE_ROLE_KEY");
  console.log("============================================================\n");
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// Synthetic hosts — will not collide with real users.
const SMOKE_HOST_ID = "00000000-0000-4000-8000-00000000bb02";
const CARD_HOST_ID = "00000000-0000-4000-8000-00000000bb03";
const UNVERIFIED_HOST_ID = "00000000-0000-4000-8000-00000000bb04";
const LIMIT_HOST_ID = "00000000-0000-4000-8000-00000000bb05";
const RUN_TAG = `[SMOKE-PUBLISH-${Date.now()}]`;

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function countHostListings(hostId = SMOKE_HOST_ID): Promise<number> {
  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("host_id", hostId);
  if (error) fail(`count query failed: ${error.message}`);
  return count ?? 0;
}

async function cleanupHost(hostId: string) {
  await supabase.from("listings").delete().eq("host_id", hostId);
}

async function ensureProfile(id: string, email: string, patch: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id, email, full_name: "Smoke Publish Host", ...patch }, { onConflict: "id" });
  if (error) fail(`profile upsert failed for ${id}: ${error.message}`);
}

// ── Main duplicate-row + happy-path guard ──────────────────────────────
async function runHappyPath() {
  console.log("[smoke] scenario: happy path (list → published, no dup rows)");

  await cleanupHost(SMOKE_HOST_ID);
  await ensureProfile(SMOKE_HOST_ID, "smoke+publish@vendibook.com", { identity_verified: true });
  const baselineCount = await countHostListings();
  if (baselineCount !== 0) fail(`baseline not clean: ${baselineCount} pre-existing rows`);

  let listingId: string | null = null;

  try {
    const { data: draft, error: draftErr } = await supabase
      .from("listings")
      .insert({
        host_id: SMOKE_HOST_ID,
        title: `${RUN_TAG} Vendor Space`,
        status: "draft",
        mode: "rent",
        category: "vendor_space",
      })
      .select("id")
      .single();
    if (draftErr || !draft) fail(`draft insert failed: ${draftErr?.message}`);
    listingId = draft.id;

    let count = await countHostListings();
    if (count !== 1) fail(`after draft insert expected 1 row, got ${count}`);

    const stepUpdates = [
      { description: "Beautiful downtown vendor space with high foot traffic and easy load-in.".repeat(3) },
      { price_daily: 150, price_hourly: 25 },
      {
        address: "123 Main St",
        city: "Phoenix",
        state: "AZ",
        zip_code: "85001",
        country: "United States - US",
        latitude: 33.4484,
        longitude: -112.074,
      },
      { image_urls: ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"] },
      { accept_cash_payment: true, accept_card_payment: false },
    ];

    for (const [i, patch] of stepUpdates.entries()) {
      const { error: stepErr } = await supabase.from("listings").update(patch).eq("id", listingId);
      if (stepErr) fail(`step ${i + 1} update failed: ${stepErr.message}`);
      count = await countHostListings();
      if (count !== 1) fail(`after step ${i + 1} expected 1 row, got ${count} — wizard duplicated the listing`);
    }

    const { error: pubErr } = await supabase
      .from("listings")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", listingId);
    if (pubErr) fail(`publish update failed: ${pubErr.message}`);

    const finalCount = await countHostListings();
    if (finalCount !== 1) {
      fail(`DUPLICATE ROW REGRESSION: host has ${finalCount} listings after publish; expected 1.`);
    }

    const { data: rows } = await supabase
      .from("listings")
      .select("id, status, published_at, title")
      .eq("host_id", SMOKE_HOST_ID);
    const row = rows?.[0];
    if (!row) fail("published listing missing");
    if (row.status !== "published") fail(`status not published: ${row.status}`);
    if (!row.published_at) fail("published_at not set after publish");

    console.log("[smoke] ✅ happy-path PASSED");
  } finally {
    if (listingId) await supabase.from("listings").delete().eq("id", listingId);
    await cleanupHost(SMOKE_HOST_ID);
  }
}

// ── 5a. Card-payment fixture ──────────────────────────────────────────
async function runCardPaymentFixture() {
  console.log("[smoke] scenario 5a: card-payment sale — client Stripe gate data contract");
  await cleanupHost(CARD_HOST_ID);
  await ensureProfile(CARD_HOST_ID, "smoke+card@vendibook.com", {
    identity_verified: true,
    stripe_account_id: null,
    stripe_charges_enabled: false,
  });

  const { data: row, error } = await supabase
    .from("listings")
    .insert({
      host_id: CARD_HOST_ID,
      title: `${RUN_TAG} Card Sale`,
      status: "draft",
      mode: "sale",
      category: "food_truck",
      accept_card_payment: true,
      accept_cash_payment: false,
      price_sale: 55000,
    })
    .select("accept_card_payment, accept_cash_payment")
    .single();
  if (error || !row) fail(`5a insert failed: ${error?.message}`);
  if (row.accept_card_payment !== true) fail("5a: accept_card_payment did not persist as true");
  if (row.accept_cash_payment !== false) fail("5a: accept_cash_payment did not persist as false");

  // Verify the client-side Stripe gate condition: requiresStripe && !isOnboardingComplete.
  const { data: prof } = await supabase
    .from("profiles")
    .select("stripe_charges_enabled")
    .eq("id", CARD_HOST_ID)
    .maybeSingle();
  const isOnboardingComplete = !!(prof as any)?.stripe_charges_enabled;
  const requiresStripe = row.accept_card_payment === true;
  if (!(requiresStripe && !isOnboardingComplete)) {
    fail("5a: Stripe gate would NOT trigger — client would let the user publish without Stripe onboarded");
  }
  console.log("[smoke] ✅ 5a PASSED — Stripe gate data contract holds");
  await cleanupHost(CARD_HOST_ID);
}

// ── 5b. Unverified identity fixture ───────────────────────────────────
async function runUnverifiedFixture() {
  console.log("[smoke] scenario 5b: unverified-identity host");
  await cleanupHost(UNVERIFIED_HOST_ID);
  await ensureProfile(UNVERIFIED_HOST_ID, "smoke+unverified@vendibook.com", {
    identity_verified: false,
  });
  const { data: prof } = await supabase
    .from("profiles")
    .select("identity_verified")
    .eq("id", UNVERIFIED_HOST_ID)
    .maybeSingle();
  if ((prof as any)?.identity_verified !== false) {
    fail("5b: profiles.identity_verified did not persist as false — identity gate would silently pass");
  }
  console.log("[smoke] ✅ 5b PASSED — identity gate data contract holds");
}

// ── 5c. Publish-limit trigger ─────────────────────────────────────────
async function runLimitTrigger() {
  console.log("[smoke] scenario 5c: publish-limit trigger blocks (N+1)th listing on free tier");
  await cleanupHost(LIMIT_HOST_ID);
  await ensureProfile(LIMIT_HOST_ID, "smoke+limit@vendibook.com", {
    identity_verified: true,
    grandfathered_listings: false,
  });

  // Free tier quota is 2. Create 2 published listings, then try a 3rd.
  const rows = [1, 2].map((n) => ({
    host_id: LIMIT_HOST_ID,
    title: `${RUN_TAG} Limit ${n}`,
    status: "published" as const,
    published_at: new Date().toISOString(),
    mode: "rent" as const,
    category: "vendor_space" as const,
  }));
  const { error: seedErr } = await supabase.from("listings").insert(rows);
  if (seedErr) fail(`5c seed insert failed: ${seedErr.message}`);

  const { data: draft, error: draftErr } = await supabase
    .from("listings")
    .insert({
      host_id: LIMIT_HOST_ID,
      title: `${RUN_TAG} Limit 3 draft`,
      status: "draft",
      mode: "rent",
      category: "vendor_space",
    })
    .select("id")
    .single();
  if (draftErr || !draft) fail(`5c draft insert failed: ${draftErr?.message}`);

  const { error: pubErr } = await supabase
    .from("listings")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", draft.id);

  if (!pubErr) {
    // Not necessarily a fail: if this host is grandfathered or promoted to
    // paid tier via test data, the limit doesn't apply. Only fail if we can
    // confirm the tier is 'free' AND grandfathered is false.
    fail(
      "5c: publish beyond limit succeeded — trg_enforce_listing_publish_limit " +
        "did not fire. Users on the free tier would silently exceed their quota.",
    );
  } else if (!/listing_publish_limit_reached/i.test(pubErr.message)) {
    fail(`5c: publish blocked but with the wrong error: ${pubErr.message}`);
  } else {
    console.log("[smoke] ✅ 5c PASSED — limit trigger raised listing_publish_limit_reached");
  }

  await cleanupHost(LIMIT_HOST_ID);
}

async function run() {
  console.log("[smoke] starting publish-flow (list → published)…");
  await runHappyPath();
  await runCardPaymentFixture();
  await runUnverifiedFixture();
  await runLimitTrigger();
  console.log("\n[smoke] ✅ ALL publish-flow scenarios PASSED\n");
}

run().catch((e) => fail(e?.message ?? String(e)));
