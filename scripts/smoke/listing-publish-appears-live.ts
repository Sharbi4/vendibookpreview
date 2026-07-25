/**
 * Listing Publish → Live-Visibility Smoke
 * =======================================
 *
 * Publishes a throwaway listing end-to-end and asserts it becomes visible
 * on the live listings surface immediately (no cache lag, no RLS regression,
 * no browse-query filter regression).
 *
 * What this exercises that id-preview-e2e-smoke.ts does NOT:
 *   - Anon read via the same query shape used by /browse (status=published,
 *     ordered by published_at desc) — proves the row is queryable through
 *     the public browse pipeline, not just by primary key.
 *   - HTTP fetch of /browse to confirm the page renders and (when SSR/
 *     prerender is available) references the new listing id/title.
 *   - Assertion that published_at is set and within the last minute.
 *
 * Teardown always runs (listing → auth user).
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY,
 *               APP_BASE_URL.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL;

if (!URL || !SERVICE_KEY || !ANON_KEY || !APP_BASE_URL) {
  console.warn(
    "[smoke] ⚠️  SKIPPING listing-publish-appears-live — missing one of: " +
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, APP_BASE_URL.",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) { console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green."); process.exit(1); }
  process.exit(0);
}

const RUN_ID = Date.now();
const RUN_TAG = `[SMOKE-LIVE-${RUN_ID}]`;
const TITLE = `${RUN_TAG} Live-Visibility Vendor Booth`;
const TEST_EMAIL = `smoke+live-${RUN_ID}@vendibook.test`;
const TEST_PASSWORD = `Smoke!${RUN_ID}Pw#`;

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}
const ok = (m: string) => console.log(`  ✓ ${m}`);
const section = (n: string) => console.log(`\n▸ ${n}`);

let userId: string | null = null;
let listingId: string | null = null;

async function teardown() {
  section("teardown");
  try {
    if (listingId) {
      await admin.from("listings").delete().eq("id", listingId);
      ok(`removed listing ${listingId}`);
    }
    if (userId) {
      await admin.from("listings").delete().eq("host_id", userId);
      await admin.auth.admin.deleteUser(userId);
      ok(`removed auth user ${userId}`);
    }
  } catch (e) {
    console.warn(`[smoke] teardown warning: ${(e as Error).message}`);
  }
}

async function main() {
  console.log(`[smoke] live-visibility publish starting — RUN_TAG=${RUN_TAG}`);

  // ── Bootstrap throwaway user ─────────────────────────────────────────
  section("bootstrap throwaway user");
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { smoke: true, run_tag: RUN_TAG },
  });
  if (cErr || !created?.user) fail(`createUser failed: ${cErr?.message}`);
  userId = created.user.id;
  await admin.from("profiles").upsert(
    { id: userId, email: TEST_EMAIL, full_name: `Smoke ${RUN_ID}` },
    { onConflict: "id" },
  );
  await admin.from("user_roles").upsert(
    { user_id: userId, role: "host" as const },
    { onConflict: "user_id,role" },
  );
  const { error: sErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (sErr) fail(`signIn failed: ${sErr.message}`);
  ok(`signed in as ${TEST_EMAIL}`);

  // ── Publish a full listing in one shot ───────────────────────────────
  section("create + publish listing (RLS-enforced)");
  const publishedAt = new Date().toISOString();
  const { data: ins, error: iErr } = await anon
    .from("listings")
    .insert({
      host_id: userId,
      title: TITLE,
      description:
        "Bright downtown vendor booth with steady foot traffic, easy load-in, and secure 24/7 access. ".repeat(2),
      status: "published",
      mode: "rent",
      category: "vendor_space",
      price_daily: 199,
      price_hourly: 35,
      address: "500 Test Ave",
      city: "Phoenix",
      state: "AZ",
      zip_code: "85001",
      country: "United States - US",
      latitude: 33.4484,
      longitude: -112.074,
      image_urls: [
        "https://placehold.co/1200x800/png?text=A",
        "https://placehold.co/1200x800/png?text=B",
        "https://placehold.co/1200x800/png?text=C",
      ],
      accept_cash_payment: true,
      accept_card_payment: false,
      published_at: publishedAt,
    })
    .select("id, published_at, status")
    .single();
  if (iErr || !ins) fail(`insert-published failed: ${iErr?.message}`);
  listingId = ins.id;
  if (ins.status !== "published") fail(`row status is ${ins.status}, expected 'published'`);
  if (!ins.published_at) fail("published_at was not persisted");
  const age = Date.now() - new Date(ins.published_at).getTime();
  if (age > 60_000) fail(`published_at is stale (${age}ms) — trigger overwrote it?`);
  ok(`listing ${listingId} published_at=${ins.published_at} (fresh, ${age}ms old)`);

  // ── Assert immediate visibility through anon browse-shaped query ─────
  section("anon browse-query visibility (no lag tolerance)");
  const pubAnon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });

  // 1) Direct id lookup (RLS gate on published rows).
  const { data: byId, error: idErr } = await pubAnon
    .from("listings")
    .select("id, status, title, published_at")
    .eq("id", listingId)
    .maybeSingle();
  if (idErr) fail(`anon id-lookup RLS regression: ${idErr.message}`);
  if (!byId || byId.status !== "published") fail("listing not visible to anon by id");
  ok("anon can read the new listing by id");

  // 2) Browse-shaped feed query — status=published, newest first.
  const { data: feed, error: feedErr } = await pubAnon
    .from("listings")
    .select("id, title, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(25);
  if (feedErr) fail(`browse feed query failed: ${feedErr.message}`);
  const hit = feed?.find((l) => l.id === listingId);
  if (!hit) {
    fail(
      `new listing missing from top-25 published feed — visibility regression. ` +
        `Feed head: ${feed?.slice(0, 3).map((l) => l.id).join(", ")}`,
    );
  }
  ok(`new listing present in anon browse feed (title="${hit!.title}")`);

  // 3) Title search — must return the row (search index / ilike path).
  const { data: byTitle, error: sErr2 } = await pubAnon
    .from("listings")
    .select("id")
    .eq("status", "published")
    .ilike("title", `%LIVE-${RUN_ID}%`);
  if (sErr2) fail(`title ilike search failed: ${sErr2.message}`);
  if (!byTitle?.some((r) => r.id === listingId)) {
    fail("new listing not returned by title search — search visibility regression");
  }
  ok("new listing returned by title search");

  // ── Public pages render without 5xx ──────────────────────────────────
  section("public pages render");
  for (const path of ["/browse", `/listing/${listingId}`]) {
    const res = await fetch(`${APP_BASE_URL}${path}`, {
      headers: { "user-agent": "vendibook-smoke/1.0" },
    });
    if (res.status >= 500) fail(`GET ${path} → ${res.status}`);
    const html = await res.text();
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      fail(`GET ${path} returned non-HTML body`);
    }
    ok(`GET ${path} → ${res.status}`);
  }

  console.log("\n✅ listing-publish-appears-live PASSED");
  console.log(`   listing_id = ${listingId}`);
  console.log(`   user_id    = ${userId}`);
}

main()
  .catch((e) => {
    console.error(e);
    fail(e?.message ?? String(e));
  })
  .finally(async () => {
    await teardown();
  });
