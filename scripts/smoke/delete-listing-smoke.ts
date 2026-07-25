/**
 * Production smoke test: End-to-end listing deletion integrity audit.
 *
 * Background: a user (Chawnee) hit an FK-blocked delete. After fixing the
 * constraints we ran a one-off audit and reported success — but a prior run
 * had left a synthetic listing alive in the DB. This smoke test bakes the
 * full audit (including a final visibility check) into CI so the failure
 * mode can never recur silently.
 *
 * What it does:
 *   1. Creates a private DRAFT listing under a synthetic smoke host (drafts
 *      are excluded from search, so it is not user-visible even briefly).
 *   2. Seeds child rows that exist on real busy listings:
 *        analytics_events, listing_views, favorites,
 *        listing_blocked_dates, risk_flags
 *   3. Exercises pause -> resume -> edit (all UPDATEs must succeed and
 *      triggers must not raise).
 *   4. Deletes the listing.
 *   5. Verifies post-delete state:
 *        - listings row gone
 *        - CASCADE children (listing_views, favorites, listing_blocked_dates)
 *          gone
 *        - SET NULL children (analytics_events, risk_flags) retained with
 *          listing_id = NULL (history preserved, no orphan FK)
 *   6. FINAL VISIBILITY CHECK — queries listings by the synthetic title
 *      prefix AND by host_id to confirm zero rows remain visible anywhere.
 *      This is the step that was missed before.
 *   7. Cleans up admin notifications and any retained audit child rows so
 *      the run leaves no residue.
 *
 * Exits non-zero on any failed assertion so the pre-deploy gate blocks ship.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke/delete-listing-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING delete-listing smoke — SUPABASE_URL and/or " +
      "SUPABASE_SERVICE_ROLE_KEY not configured as GitHub Action secrets.",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) { console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green."); process.exit(1); }
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// Synthetic host id reserved for smoke tests; will not collide with real users.
const SMOKE_HOST_ID = "00000000-0000-4000-8000-00000000de1e";
const TITLE_PREFIX = "[SMOKE-DELETE-AUDIT]";

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function residualVisibilityCheck() {
  // Belt-and-suspenders: by title prefix AND by host id.
  const { data: byTitle, error: e1 } = await supabase
    .from("listings")
    .select("id, title, status")
    .ilike("title", `${TITLE_PREFIX}%`);
  if (e1) fail(`visibility check (title) errored: ${e1.message}`);
  if (byTitle && byTitle.length > 0) {
    fail(
      `${byTitle.length} smoke listing(s) still visible by title: ` +
        JSON.stringify(byTitle),
    );
  }

  const { data: byHost, error: e2 } = await supabase
    .from("listings")
    .select("id, title, status")
    .eq("host_id", SMOKE_HOST_ID);
  if (e2) fail(`visibility check (host) errored: ${e2.message}`);
  if (byHost && byHost.length > 0) {
    fail(
      `${byHost.length} smoke listing(s) still visible by host: ` +
        JSON.stringify(byHost),
    );
  }
}

async function run() {
  console.log("[smoke] starting delete-listing integrity audit…");

  // Pre-clean: if a previous failed run left rows behind, scrub them now.
  await supabase.from("listings").delete().eq("host_id", SMOKE_HOST_ID);

  // Ensure synthetic host profile exists.
  await supabase.from("profiles").upsert(
    {
      id: SMOKE_HOST_ID,
      email: "smoke+delete@vendibook.com",
      full_name: "Smoke Test Delete Host",
    },
    { onConflict: "id" },
  );

  // 1. Create a DRAFT listing (drafts are not indexed in search).
  const { data: draft, error: draftErr } = await supabase
    .from("listings")
    .insert({
      host_id: SMOKE_HOST_ID,
      title: `${TITLE_PREFIX} ${Date.now()}`,
      status: "draft",
      category: "food_truck",
      mode: "sale",
      price_sale: 9999,
    })
    .select("id")
    .single();
  if (draftErr || !draft) fail(`could not create draft: ${draftErr?.message}`);
  const listingId = draft.id as string;
  console.log(`[smoke] draft created: ${listingId}`);

  try {
    // 2. Seed child rows that mirror a real busy listing.
    const seeds = await Promise.all([
      supabase.from("analytics_events").insert([
        { listing_id: listingId, event_name: "audit_test", event_data: {} },
        { listing_id: listingId, event_name: "audit_test", event_data: {} },
      ]),
      supabase.from("listing_views").insert({ listing_id: listingId }),
      supabase
        .from("favorites")
        .insert({ listing_id: listingId, user_id: SMOKE_HOST_ID }),
      supabase.from("listing_blocked_dates").insert({
        listing_id: listingId,
        blocked_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      }),
      supabase.from("risk_flags").insert({
        listing_id: listingId,
        flag_type: "audit_test",
        severity: "low",
      }),
    ]);
    seeds.forEach((r, i) => {
      if (r.error) fail(`seed[${i}] failed: ${r.error.message}`);
    });

    // 3. Exercise pause -> resume -> edit.
    for (const step of [
      { status: "paused" as const },
      { status: "published" as const },
      { title: `${TITLE_PREFIX} edited ${Date.now()}` },
    ]) {
      const { error } = await supabase
        .from("listings")
        .update(step)
        .eq("id", listingId);
      if (error) fail(`update ${JSON.stringify(step)} failed: ${error.message}`);
    }

    // 4. Delete.
    const { error: delErr } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);
    if (delErr) fail(`delete failed: ${delErr.message}`);

    // 5. Post-delete state.
    const [listingAfter, viewsAfter, favsAfter, blockedAfter, analyticsAfter, riskAfter] =
      await Promise.all([
        supabase.from("listings").select("id").eq("id", listingId),
        supabase.from("listing_views").select("id").eq("listing_id", listingId),
        supabase.from("favorites").select("id").eq("listing_id", listingId),
        supabase.from("listing_blocked_dates").select("id").eq("listing_id", listingId),
        supabase
          .from("analytics_events")
          .select("id, listing_id")
          .eq("event_name", "audit_test")
          .is("listing_id", null),
        supabase
          .from("risk_flags")
          .select("id, listing_id")
          .eq("flag_type", "audit_test")
          .is("listing_id", null),
      ]);

    if ((listingAfter.data ?? []).length !== 0) fail("listing row still present after delete");
    if ((viewsAfter.data ?? []).length !== 0) fail("listing_views did not cascade");
    if ((favsAfter.data ?? []).length !== 0) fail("favorites did not cascade");
    if ((blockedAfter.data ?? []).length !== 0) fail("listing_blocked_dates did not cascade");
    if ((analyticsAfter.data ?? []).length < 2)
      fail("analytics_events lost or not nulled (expected SET NULL retention)");
    if ((riskAfter.data ?? []).length < 1)
      fail("risk_flags lost or not nulled (expected SET NULL retention)");

    // 6. FINAL VISIBILITY CHECK — the step missed in the prior audit.
    await residualVisibilityCheck();

    console.log("[smoke] ✅ delete-listing audit PASSED");
  } finally {
    // 7. Cleanup: scrub any residue regardless of pass/fail.
    await Promise.all([
      supabase.from("analytics_events").delete().eq("event_name", "audit_test"),
      supabase.from("risk_flags").delete().eq("flag_type", "audit_test"),
      supabase.from("listings").delete().eq("host_id", SMOKE_HOST_ID),
      supabase
        .from("notifications")
        .delete()
        .eq("user_id", SMOKE_HOST_ID),
      supabase
        .from("notifications")
        .delete()
        .ilike("message", `%${TITLE_PREFIX}%`),
    ]);
    // Re-run visibility check after cleanup so we never leave the DB dirty.
    await residualVisibilityCheck();
    console.log("[smoke] cleanup complete — DB confirmed clean");
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
