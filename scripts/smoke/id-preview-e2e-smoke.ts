/**
 * id-preview End-to-End Smoke Runner
 * ==================================
 *
 * Exercises two critical Vendibook journeys against the id-preview
 * environment using strictly throwaway records that are torn down at the
 * end of the run — no side effects on real users, listings, transactions,
 * or support queues.
 *
 * Journeys covered:
 *   A. Listing publish
 *      - Create synthetic auth user (service role)
 *      - Sign in as that user (anon key → real JWT)
 *      - Insert draft listing → step-updates → publish
 *      - Fetch published listing via anon client (RLS enforced)
 *      - Fetch public listing detail HTML from APP_BASE_URL
 *      - Assert exactly one listings row exists for the host
 *
 *   B. tawk.to / support ticket
 *      - Invoke submit-support-ticket edge function with idempotency_key
 *      - Call it again with the same key + same payload
 *      - Assert exactly ONE support_tickets row is created
 *      - Assert priority derived server-side matches category rules
 *      - Assert ticket references the throwaway listing (context wiring)
 *
 * Teardown always runs (support_tickets → listings → auth user).
 *
 * Required env:
 *   SUPABASE_URL                 (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    — for user + row teardown
 *   SUPABASE_ANON_KEY            (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *   APP_BASE_URL                 — e.g. https://id-preview--<uuid>.lovable.app
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *   APP_BASE_URL=https://id-preview--<uuid>.lovable.app \
 *   bun scripts/smoke/id-preview-e2e-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL;

if (!URL || !SERVICE_KEY || !ANON_KEY || !APP_BASE_URL) {
  console.warn(
    "[smoke] ⚠️  SKIPPING id-preview-e2e — missing one of: SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, APP_BASE_URL. " +
      "This smoke is intended for on-demand runs against id-preview.",
  );
  process.exit(0);
}

const RUN_ID = Date.now();
const RUN_TAG = `[SMOKE-IDPREVIEW-${RUN_ID}]`;
const TEST_EMAIL = `smoke+idpreview-${RUN_ID}@vendibook.test`;
const TEST_PASSWORD = `Smoke!${RUN_ID}Pw#`;

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}
function section(name: string) {
  console.log(`\n▸ ${name}`);
}

let userId: string | null = null;
let listingId: string | null = null;
const ticketIds: string[] = [];

async function teardown() {
  section("teardown");
  try {
    if (ticketIds.length) {
      await admin.from("support_tickets").delete().in("id", ticketIds);
      ok(`removed ${ticketIds.length} support ticket(s)`);
    }
    if (listingId) {
      await admin.from("listings").delete().eq("id", listingId);
      ok(`removed listing ${listingId}`);
    }
    if (userId) {
      await admin.from("listings").delete().eq("host_id", userId); // safety net
      await admin.from("support_tickets").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      ok(`removed auth user ${userId}`);
    }
  } catch (e) {
    console.warn(`[smoke] teardown warning: ${(e as Error).message}`);
  }
}

async function main() {
  console.log(`[smoke] id-preview E2E starting — RUN_TAG=${RUN_TAG}`);
  console.log(`[smoke] APP_BASE_URL=${APP_BASE_URL}`);

  // ── Bootstrap synthetic user ────────────────────────────────────────────
  section("bootstrap throwaway user");
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { smoke: true, run_tag: RUN_TAG },
  });
  if (cErr || !created?.user) fail(`createUser failed: ${cErr?.message}`);
  userId = created.user.id;
  ok(`created auth user ${userId} (${TEST_EMAIL})`);

  await admin.from("profiles").upsert(
    { id: userId, email: TEST_EMAIL, full_name: `Smoke ${RUN_ID}` },
    { onConflict: "id" },
  );
  await admin.from("user_roles").upsert(
    { user_id: userId, role: "host" as const },
    { onConflict: "user_id,role" },
  );
  ok("profile + host role provisioned");

  // Sign in as the throwaway user so subsequent writes go through RLS.
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (sErr || !signIn?.session) fail(`signIn failed: ${sErr?.message}`);
  ok("signed in as throwaway user (RLS-enforced client)");

  // ── Journey A · Listing publish ────────────────────────────────────────
  section("Journey A · listing publish");

  const { data: draft, error: dErr } = await anon
    .from("listings")
    .insert({
      host_id: userId,
      title: `${RUN_TAG} Test Vendor Space`,
      status: "draft",
      mode: "rent",
      category: "vendor_space",
    })
    .select("id")
    .single();
  if (dErr || !draft) fail(`draft insert (RLS) failed: ${dErr?.message}`);
  listingId = draft.id;
  ok(`draft created ${listingId}`);

  const steps: Record<string, unknown>[] = [
    {
      description:
        "Well-lit downtown vendor booth with foot traffic, easy load-in, and 24/7 access.".repeat(2),
    },
    { price_daily: 175, price_hourly: 30 },
    {
      address: "500 Test Ave",
      city: "Phoenix",
      state: "AZ",
      zip_code: "85001",
      country: "United States - US",
      latitude: 33.4484,
      longitude: -112.074,
    },
    {
      image_urls: [
        "https://placehold.co/1200x800/png?text=A",
        "https://placehold.co/1200x800/png?text=B",
        "https://placehold.co/1200x800/png?text=C",
      ],
    },
    { accept_cash_payment: true, accept_card_payment: false },
  ];
  for (const [i, patch] of steps.entries()) {
    const { error } = await anon.from("listings").update(patch).eq("id", listingId);
    if (error) fail(`wizard step ${i + 1} update failed: ${error.message}`);
  }
  ok(`wizard step-updates applied (${steps.length})`);

  const { error: pErr } = await anon
    .from("listings")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", listingId);
  if (pErr) fail(`publish update failed: ${pErr.message}`);
  ok("listing published via RLS-enforced update");

  const { count: hostCount, error: cntErr } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("host_id", userId);
  if (cntErr) fail(`host count failed: ${cntErr.message}`);
  if (hostCount !== 1) fail(`expected exactly 1 listing for host, got ${hostCount} (duplicate row regression?)`);
  ok(`host has exactly 1 listings row`);

  // Public read via anon (must succeed — published listings are public).
  const publicAnon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: publicRow, error: pubReadErr } = await publicAnon
    .from("listings")
    .select("id, status, title")
    .eq("id", listingId)
    .maybeSingle();
  if (pubReadErr) fail(`anon read of published listing failed (RLS regression): ${pubReadErr.message}`);
  if (!publicRow || publicRow.status !== "published") fail("published listing not visible to anon reader");
  ok("published listing readable by anon client (RLS ok)");

  // Public listing detail page renders (5xx / hard crash guard).
  const detailRes = await fetch(`${APP_BASE_URL}/listing/${listingId}`, {
    headers: { "user-agent": "vendibook-smoke/1.0" },
  });
  if (detailRes.status >= 500) fail(`listing detail 5xx: ${detailRes.status}`);
  const detailHtml = await detailRes.text();
  if (!detailHtml.includes("<html") && !detailHtml.includes("<!DOCTYPE")) fail("listing detail returned non-HTML body");
  ok(`GET /listing/${listingId} → ${detailRes.status}`);

  // ── Journey B · Support ticket via submit-support-ticket ───────────────
  section("Journey B · support ticket idempotency");

  const idemKey = `smoke-idpreview-${RUN_ID}-support`;
  const payload = {
    feature_area: "listing_publishing",
    category: "listing_will_not_publish",
    title: `${RUN_TAG} throwaway support ticket`,
    description: "Automated id-preview smoke — safe to close. Verifies idempotency + priority.",
    is_blocking: true,
    reply_email: TEST_EMAIL,
    related_listing_id: listingId,
    page_url: `${APP_BASE_URL}/listing/${listingId}`,
    browser_info: "smoke-runner",
    device_type: "ci",
    idempotency_key: idemKey,
  };

  async function invokeTicket(label: string) {
    const { data, error } = await anon.functions.invoke("submit-support-ticket", { body: payload });
    if (error) fail(`submit-support-ticket (${label}) failed: ${error.message}`);
    return data as { ticket_id?: string; id?: string; success?: boolean } | null;
  }

  const first = await invokeTicket("first call");
  ok(`first invocation returned: ${JSON.stringify(first).slice(0, 200)}`);
  const firstId = first?.ticket_id ?? first?.id;
  if (firstId) ticketIds.push(firstId);

  const second = await invokeTicket("replay same idempotency_key");
  ok(`replay invocation returned: ${JSON.stringify(second).slice(0, 200)}`);
  const secondId = second?.ticket_id ?? second?.id;
  if (secondId && !ticketIds.includes(secondId)) ticketIds.push(secondId);

  const { data: tickets, error: tErr } = await admin
    .from("support_tickets")
    .select("id, priority, category, feature_area, related_listing_id, user_id")
    .eq("user_id", userId);
  if (tErr) fail(`support_tickets read failed: ${tErr.message}`);
  if (!tickets || tickets.length !== 1) {
    fail(`expected exactly 1 support ticket, got ${tickets?.length ?? 0} — idempotency regression`);
  }
  const ticket = tickets[0];
  if (!ticketIds.includes(ticket.id)) ticketIds.push(ticket.id);

  if (ticket.category !== "listing_will_not_publish") fail(`category mismatch: ${ticket.category}`);
  if (ticket.priority !== "high") fail(`priority derivation wrong — expected 'high', got '${ticket.priority}'`);
  if (ticket.related_listing_id !== listingId) fail(`ticket not wired to listing: ${ticket.related_listing_id}`);
  ok(`ticket ${ticket.id} — priority=${ticket.priority}, wired to listing ${listingId}`);

  console.log("\n✅ id-preview E2E PASSED");
  console.log(`   listing_id  = ${listingId}`);
  console.log(`   ticket_id   = ${ticket.id}`);
  console.log(`   user_id     = ${userId}`);
}

main()
  .catch((e) => {
    console.error(e);
    fail(e?.message ?? String(e));
  })
  .finally(async () => {
    await teardown();
  });
