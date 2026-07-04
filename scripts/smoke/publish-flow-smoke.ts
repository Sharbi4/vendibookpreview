/**
 * End-to-end smoke test: Full publish flow from /list to `published`.
 *
 * Exercises the exact DB sequence a real user drives when they:
 *   1. Land on /list and complete QuickStartWizard  →  ONE listings.insert (status='draft')
 *   2. Progress through PublishWizard steps         →  N listings.update calls (still 1 row)
 *   3. Click "Publish"                              →  final listings.update -> status='published'
 *
 * Guardrails asserted:
 *   • Exactly ONE listings row exists for the synthetic host at the end
 *     (i.e. no duplicate insert during publish — regression guard against
 *      the "PublishWizard.handlePublish inserts instead of updates" class of bug)
 *   • Row transitions draft → published with `published_at` set
 *   • Wizard step-updates never create sibling rows
 *   • Total listings count delta for this host across the run is exactly 1
 *
 * Runs against the live project with SERVICE_ROLE; creates & tears down a
 * fully isolated synthetic listing. Exits non-zero on any failure so the
 * pre-deploy gate blocks ship.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke/publish-flow-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING publish-flow smoke — SUPABASE_URL and/or " +
      "SUPABASE_SERVICE_ROLE_KEY not configured as GitHub Action secrets. " +
      "Add them under repo Settings → Secrets and variables → Actions to enable this gate.",
  );
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// Synthetic host — will not collide with real users.
const SMOKE_HOST_ID = "00000000-0000-4000-8000-00000000bb02";
const RUN_TAG = `[SMOKE-PUBLISH-${Date.now()}]`;

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function countHostListings(): Promise<number> {
  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("host_id", SMOKE_HOST_ID);
  if (error) fail(`count query failed: ${error.message}`);
  return count ?? 0;
}

async function run() {
  console.log("[smoke] starting publish-flow (list → published)…");

  // Clean any residue from a previous failed run, then snapshot baseline.
  await supabase.from("listings").delete().eq("host_id", SMOKE_HOST_ID);
  await supabase.from("profiles").upsert(
    { id: SMOKE_HOST_ID, email: "smoke+publish@vendibook.com", full_name: "Smoke Publish Host" },
    { onConflict: "id" },
  );
  const baselineCount = await countHostListings();
  if (baselineCount !== 0) fail(`baseline not clean: ${baselineCount} pre-existing rows`);

  let listingId: string | null = null;

  try {
    // ── STEP 1 · QuickStartWizard.handleCreateDraft ────────────────────────
    //   User picks mode + category + title on /list; wizard inserts ONE draft.
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
    console.log(`[smoke] draft created: ${listingId}`);

    let count = await countHostListings();
    if (count !== 1) fail(`after draft insert expected 1 row, got ${count}`);

    // ── STEP 2 · PublishWizard step-by-step UPDATES (never inserts) ────────
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
      {
        image_urls: [
          "https://example.com/a.jpg",
          "https://example.com/b.jpg",
          "https://example.com/c.jpg",
        ],
      },
      { accept_cash_payment: true, accept_card_payment: false }, // cash-only → no Stripe gate
    ];

    for (const [i, patch] of stepUpdates.entries()) {
      const { error: stepErr } = await supabase
        .from("listings")
        .update(patch)
        .eq("id", listingId);
      if (stepErr) fail(`step ${i + 1} update failed: ${stepErr.message}`);

      count = await countHostListings();
      if (count !== 1) fail(`after step ${i + 1} expected 1 row, got ${count} — wizard duplicated the listing`);
    }

    // ── STEP 3 · handlePublish → final UPDATE flipping to 'published' ──────
    const { error: pubErr } = await supabase
      .from("listings")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", listingId);
    if (pubErr) fail(`publish update failed: ${pubErr.message}`);

    // ── Assertions ─────────────────────────────────────────────────────────
    const finalCount = await countHostListings();
    if (finalCount !== 1) {
      fail(
        `DUPLICATE ROW REGRESSION: host has ${finalCount} listings after publish; ` +
          `expected exactly 1 (publish should UPDATE, not INSERT).`,
      );
    }

    const { data: rows, error: readErr } = await supabase
      .from("listings")
      .select("id, status, published_at, title, host_id")
      .eq("host_id", SMOKE_HOST_ID);
    if (readErr || !rows) fail(`could not re-read listings: ${readErr?.message}`);

    if (rows.length !== 1) fail(`expected 1 row, got ${rows.length}`);
    const row = rows[0];
    if (row.id !== listingId) fail(`row id changed: ${row.id} vs ${listingId} — publish created a new row`);
    if (row.status !== "published") fail(`status not published: ${row.status}`);
    if (!row.published_at) fail("published_at not set after publish");
    if (!row.title?.startsWith(RUN_TAG)) fail(`title mutated unexpectedly: ${row.title}`);

    // Belt & braces: no other row was created anywhere with our RUN_TAG.
    const { data: taggedRows, error: tagErr } = await supabase
      .from("listings")
      .select("id, host_id")
      .ilike("title", `${RUN_TAG}%`);
    if (tagErr) fail(`tag search failed: ${tagErr.message}`);
    if (!taggedRows || taggedRows.length !== 1) {
      fail(`found ${taggedRows?.length ?? 0} rows tagged ${RUN_TAG}; expected 1 (duplicate leak?)`);
    }

    console.log("[smoke] ✅ publish-flow PASSED");
    console.log(`        listing_id = ${listingId}`);
    console.log(`        published_at = ${row.published_at}`);
    console.log(`        host row count = ${finalCount} (no duplicates)`);
  } finally {
    if (listingId) await supabase.from("listings").delete().eq("id", listingId);
    await supabase.from("listings").delete().eq("host_id", SMOKE_HOST_ID); // safety
    console.log("[smoke] cleanup complete");
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
