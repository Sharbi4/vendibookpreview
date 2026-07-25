/**
 * Production smoke test: Boost-Publish flow (the Stephanie scenario)
 *
 * Verifies that when a draft listing has `pending_featured_payment`, flipping
 * status -> 'published' triggers `apply_pending_featured_on_publish` and:
 *   1. featured_enabled becomes true
 *   2. featured_expires_at lands ~30 days out
 *   3. A "Featured Boost Activated" notification is queued for the host
 *   4. `isListingFeatured()` returns true (front-page eligibility)
 *
 * Runs against the live Supabase project using SERVICE_ROLE. No real user is
 * modified — the test creates an isolated synthetic draft, exercises the
 * trigger, asserts, and tears down. Exits non-zero on any failure so CI/the
 * pre-deploy gate blocks ship.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke/boost-publish-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
import { isListingFeatured } from "../../src/lib/featured";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING boost-publish smoke — SUPABASE_URL and/or " +
      "SUPABASE_SERVICE_ROLE_KEY not configured as GitHub Action secrets. " +
      "Add them under repo Settings → Secrets and variables → Actions to enable this gate.",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) { console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green."); process.exit(1); }
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// Synthetic host id used for the smoke test. Will NOT collide with real users.
const SMOKE_HOST_ID = "00000000-0000-4000-8000-00000000bb01";

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function run() {
  console.log("[smoke] starting boost-publish flow…");

  // 1. Ensure synthetic host profile exists (idempotent)
  await supabase.from("profiles").upsert(
    { id: SMOKE_HOST_ID, email: "smoke+boost@vendibook.com", full_name: "Smoke Test Host" },
    { onConflict: "id" },
  );

  // 2. Create a draft listing with a pending_featured_payment credit
  const { data: draft, error: draftErr } = await supabase
    .from("listings")
    .insert({
      host_id: SMOKE_HOST_ID,
      title: `[SMOKE] Boost-publish test ${Date.now()}`,
      status: "draft",
      category: "food_truck",
      mode: "sale",
      price_sale: 12345,
      pending_featured_payment: {
        amount: "$30.00",
        granted_at: new Date().toISOString(),
        reason: "smoke_test_credit",
        source: "smoke_test",
      },
      featured_enabled: false,
    })
    .select("id")
    .single();
  if (draftErr || !draft) fail(`could not create draft: ${draftErr?.message}`);

  const listingId = draft.id;
  console.log(`[smoke] draft created: ${listingId}`);

  try {
    // 3. Flip to published — trigger should fire
    const { error: updErr } = await supabase
      .from("listings")
      .update({ status: "published" })
      .eq("id", listingId);
    if (updErr) fail(`publish update failed: ${updErr.message}`);

    // 4. Re-read and verify
    const { data: row, error: readErr } = await supabase
      .from("listings")
      .select("status, featured_enabled, featured_at, featured_expires_at, published_at, pending_featured_payment")
      .eq("id", listingId)
      .single();
    if (readErr || !row) fail(`could not re-read listing: ${readErr?.message}`);

    if (row.status !== "published") fail(`status not published: ${row.status}`);
    if (row.featured_enabled !== true) fail(`featured_enabled not true (got ${row.featured_enabled})`);
    if (!row.featured_expires_at) fail("featured_expires_at is null — trigger did not fire");

    const daysOut = (new Date(row.featured_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysOut < 29 || daysOut > 31) fail(`featured_expires_at not ~30 days out (got ${daysOut.toFixed(2)})`);

    if (!isListingFeatured(row as any)) fail("isListingFeatured() returned false — front-page sort would miss it");

    // 5. Verify host notification
    const { data: notifs } = await supabase
      .from("notifications")
      .select("title, link")
      .eq("user_id", SMOKE_HOST_ID)
      .ilike("title", "%featured boost activated%")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!notifs || notifs.length === 0) fail("no Featured Boost notification created for host");

    console.log("[smoke] ✅ boost-publish flow PASSED");
    console.log(`        featured_expires_at = ${row.featured_expires_at} (${daysOut.toFixed(1)} days)`);
    console.log(`        notification = "${notifs[0].title}"`);
  } finally {
    // Teardown
    await supabase.from("notifications").delete().eq("user_id", SMOKE_HOST_ID);
    await supabase.from("listings").delete().eq("id", listingId);
    console.log("[smoke] cleanup complete");
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
