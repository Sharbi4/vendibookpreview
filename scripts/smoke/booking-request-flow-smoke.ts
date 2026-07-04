/**
 * End-to-end smoke test: Rental booking request state machine.
 *
 * Verifies the four visible transitions of `booking_requests.status`:
 *
 *   (a) insert          →  status = 'pending'          (request submitted)
 *   (b) pending         →  status = 'pending'          (still awaiting host, no-op update)
 *   (c) pending         →  status = 'approved'         (host approves)
 *   (d) pending         →  status = 'declined'         (host declines, separate row)
 *
 * For each transition we assert:
 *   • The row persists (no duplicate insert during status update)
 *   • `status` lands on the expected enum value
 *   • `responded_at` is set when the host responds (approved/declined)
 *   • Triggers (`on_booking_status_change`, `validate_booking_availability`)
 *     don't reject or duplicate the row
 *
 * Runs against the live project with SERVICE_ROLE; provisions a synthetic
 * host + shopper + listing and tears them down. Exits non-zero on failure
 * so the pre-deploy gate blocks ship.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke/booking-request-flow-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING booking-request-flow smoke — SUPABASE_URL and/or " +
      "SUPABASE_SERVICE_ROLE_KEY not configured as GitHub Action secrets.",
  );
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const SMOKE_HOST_ID = "00000000-0000-4000-8000-00000000bb10";
const SMOKE_SHOPPER_ID = "00000000-0000-4000-8000-00000000bb11";
const RUN_TAG = `[SMOKE-BOOKING-${Date.now()}]`;

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

// Future dates far enough out that they won't collide with real bookings.
function futureDateRange(offsetDays: number): { start: string; end: string } {
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() + 5);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function ensureAuthUser(id: string, email: string) {
  // Idempotent create via admin API; ignore "already registered" errors.
  const { error } = await supabase.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
    user_metadata: { smoke: true },
  } as never);
  if (error && !/already|exists|registered/i.test(error.message)) {
    fail(`ensureAuthUser(${email}) failed: ${error.message}`);
  }
}

async function cleanup(listingId: string | null) {
  if (listingId) {
    await supabase.from("booking_requests").delete().eq("listing_id", listingId);
    await supabase.from("listings").delete().eq("id", listingId);
  }
  await supabase.from("booking_requests").delete().eq("host_id", SMOKE_HOST_ID);
  await supabase.from("listings").delete().eq("host_id", SMOKE_HOST_ID);
}


async function createRequest(
  listingId: string,
  offsetDays: number,
): Promise<{ id: string; status: string }> {
  const { start, end } = futureDateRange(offsetDays);
  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      listing_id: listingId,
      shopper_id: SMOKE_SHOPPER_ID,
      host_id: SMOKE_HOST_ID,
      start_date: start,
      end_date: end,
      total_price: 300,
      status: "pending",
      message: `${RUN_TAG} request`,
      fulfillment_selected: "pickup",
      payment_status: "unpaid",
    })
    .select("id, status")
    .single();
  if (error || !data) fail(`request insert failed: ${error?.message}`);
  return data;
}

async function readRequest(id: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("id, status, responded_at, host_response, updated_at")
    .eq("id", id)
    .single();
  if (error || !data) fail(`re-read failed: ${error?.message}`);
  return data;
}

async function countRequestsForListing(listingId: string): Promise<number> {
  const { count, error } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if (error) fail(`count failed: ${error.message}`);
  return count ?? 0;
}

async function run() {
  console.log("[smoke] starting booking-request-flow (pending → approved / declined)…");

  await cleanup(null);
  await supabase.from("profiles").upsert(
    [
      { id: SMOKE_HOST_ID, email: "smoke+booking-host@vendibook.com", full_name: "Smoke Booking Host" },
      { id: SMOKE_SHOPPER_ID, email: "smoke+booking-shopper@vendibook.com", full_name: "Smoke Shopper" },
    ],
    { onConflict: "id" },
  );

  // Provision a published listing owned by the synthetic host.
  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .insert({
      host_id: SMOKE_HOST_ID,
      title: `${RUN_TAG} Vendor Space`,
      status: "published",
      published_at: new Date().toISOString(),
      mode: "rent",
      category: "vendor_space",
      description: "Smoke booking flow listing.".repeat(4),
      price_daily: 150,
      address: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip_code: "85001",
      country: "United States - US",
      latitude: 33.4484,
      longitude: -112.074,
      image_urls: ["https://example.com/a.jpg"],
      accept_cash_payment: true,
      accept_card_payment: false,
    })
    .select("id")
    .single();
  if (listErr || !listing) fail(`listing insert failed: ${listErr?.message}`);
  const listingId = listing.id;

  try {
    // ── (a) REQUEST SUBMITTED ─────────────────────────────────────────────
    const approvalReq = await createRequest(listingId, 10);
    if (approvalReq.status !== "pending") {
      fail(`(a) new request should be 'pending', got '${approvalReq.status}'`);
    }
    let approvalRow = await readRequest(approvalReq.id);
    if (approvalRow.responded_at) fail("(a) responded_at must be null on submit");
    console.log(`[smoke] (a) request submitted → pending  id=${approvalReq.id}`);

    // ── (b) PENDING (no-op host view; row must remain single & pending) ───
    // Simulates host opening the request in the dashboard without acting.
    const { error: touchErr } = await supabase
      .from("booking_requests")
      .update({ host_nudge_sent_at: new Date().toISOString() })
      .eq("id", approvalReq.id);
    if (touchErr) fail(`(b) touch update failed: ${touchErr.message}`);
    approvalRow = await readRequest(approvalReq.id);
    if (approvalRow.status !== "pending") {
      fail(`(b) status flipped unexpectedly to '${approvalRow.status}'`);
    }
    let listingCount = await countRequestsForListing(listingId);
    if (listingCount !== 1) fail(`(b) expected 1 request row, got ${listingCount}`);
    console.log("[smoke] (b) still pending after host preview  ✓");

    // ── (c) HOST APPROVES ─────────────────────────────────────────────────
    const approveAt = new Date().toISOString();
    const { error: approveErr } = await supabase
      .from("booking_requests")
      .update({
        status: "approved",
        host_response: `${RUN_TAG} looks good — approved`,
        responded_at: approveAt,
      })
      .eq("id", approvalReq.id);
    if (approveErr) fail(`(c) approve update failed: ${approveErr.message}`);
    approvalRow = await readRequest(approvalReq.id);
    if (approvalRow.status !== "approved") {
      fail(`(c) expected 'approved', got '${approvalRow.status}'`);
    }
    if (!approvalRow.responded_at) fail("(c) responded_at must be set on approve");
    if (!approvalRow.host_response?.startsWith(RUN_TAG)) {
      fail(`(c) host_response not persisted: ${approvalRow.host_response}`);
    }
    listingCount = await countRequestsForListing(listingId);
    if (listingCount !== 1) fail(`(c) row duplicated on approve: ${listingCount}`);
    console.log("[smoke] (c) host approved  ✓");

    // ── (d) HOST DECLINES (separate request for a different date range) ───
    const declineReq = await createRequest(listingId, 30);
    if (declineReq.status !== "pending") {
      fail(`(d) new decline-request should be 'pending', got '${declineReq.status}'`);
    }
    const declineAt = new Date().toISOString();
    const { error: declineErr } = await supabase
      .from("booking_requests")
      .update({
        status: "declined",
        host_response: `${RUN_TAG} unavailable — declined`,
        responded_at: declineAt,
      })
      .eq("id", declineReq.id);
    if (declineErr) fail(`(d) decline update failed: ${declineErr.message}`);
    const declineRow = await readRequest(declineReq.id);
    if (declineRow.status !== "declined") {
      fail(`(d) expected 'declined', got '${declineRow.status}'`);
    }
    if (!declineRow.responded_at) fail("(d) responded_at must be set on decline");
    if (!declineRow.host_response?.startsWith(RUN_TAG)) {
      fail(`(d) host_response not persisted: ${declineRow.host_response}`);
    }
    listingCount = await countRequestsForListing(listingId);
    if (listingCount !== 2) {
      fail(`(d) expected exactly 2 request rows (approved + declined), got ${listingCount}`);
    }
    console.log("[smoke] (d) host declined  ✓");

    // ── Final integrity check: enum whitelist, no orphans ─────────────────
    const { data: allRows, error: allErr } = await supabase
      .from("booking_requests")
      .select("id, status")
      .eq("listing_id", listingId);
    if (allErr || !allRows) fail(`final read failed: ${allErr?.message}`);
    const statuses = allRows.map((r) => r.status).sort();
    if (JSON.stringify(statuses) !== JSON.stringify(["approved", "declined"])) {
      fail(`final statuses unexpected: ${JSON.stringify(statuses)}`);
    }

    console.log("\n[smoke] ✅ booking-request-flow PASSED");
    console.log(`        approved id = ${approvalReq.id}`);
    console.log(`        declined id = ${declineReq.id}`);
  } finally {
    await cleanup(listingId);
    console.log("[smoke] cleanup complete");
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
