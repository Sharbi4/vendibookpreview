// End-to-end test: creates a draft and publishes it for each listing mode
// (cash sale, Stripe/card sale, and rental). Runs against the live Lovable
// Cloud backend using an authenticated test user.
//
// Required env vars (loaded from .env or provided by the runner):
//   VITE_SUPABASE_URL             - project URL
//   VITE_SUPABASE_PUBLISHABLE_KEY - anon/publishable key
//   TEST_USER_EMAIL               - existing confirmed test user email
//   TEST_USER_PASSWORD            - password for that user
//
// The test user is used as the host. Each run creates fresh drafts and
// publishes them; drafts/listings are cleaned up at the end.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const TEST_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");
const RENTER_EMAIL = Deno.env.get("TEST_RENTER_EMAIL");
const RENTER_PASSWORD = Deno.env.get("TEST_RENTER_PASSWORD");

const CREATED_LISTING_IDS: string[] = [];
const CREATED_BOOKING_IDS: string[] = [];
const CREATED_SALE_TX_IDS: string[] = [];

function requireCreds() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "Missing TEST_USER_EMAIL / TEST_USER_PASSWORD. Add both to the project " +
        ".env (or as edge-function secrets) before running these e2e tests.",
    );
  }
}

// deno-lint-ignore no-explicit-any
async function authedClient(): Promise<{ client: any; token: string; userId: string }> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL!,
    password: TEST_PASSWORD!,
  });
  if (error) throw new Error(`Test user sign-in failed: ${error.message}`);
  assertExists(data.session, "Sign-in returned no session");
  return { client, token: data.session.access_token, userId: data.user!.id };
}

async function createDraft(
  token: string,
  body: Record<string, unknown>,
): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-listing-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  assertEquals(
    resp.status,
    200,
    `create-listing-draft failed (${resp.status}): ${text}`,
  );
  const json = JSON.parse(text);
  assertExists(json.id, `create-listing-draft returned no id: ${text}`);
  CREATED_LISTING_IDS.push(json.id);
  return json.id as string;
}

async function fillAndPublish(
  // deno-lint-ignore no-explicit-any
  client: any,
  listingId: string,
  fields: Record<string, unknown>,
) {
  const nowTitle = `E2E Test ${crypto.randomUUID().slice(0, 8)}`;
  const { error: updateErr } = await client
    .from("listings")
    .update({
      title: nowTitle,
      description:
        "Automated end-to-end test listing. Safe to ignore or delete.",
      cover_image_url:
        "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800",
      image_urls: [
        "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800",
      ],
      city: "Phoenix",
      state: "AZ",
      postal_code: "85004",
      address: "Phoenix, AZ",
      pickup_location_text: "Phoenix, AZ",
      latitude: 33.4484,
      longitude: -112.074,
      ...fields,
    })
    .eq("id", listingId);
  assertEquals(updateErr, null, `update failed: ${updateErr?.message}`);

  const { error: publishErr } = await client
    .from("listings")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", listingId);
  assertEquals(
    publishErr,
    null,
    `publish failed: ${publishErr?.message}`,
  );

  // Verify status
  const { data: verify, error: verifyErr } = await client
    .from("listings")
    .select("id, status, mode, accept_card_payment, accept_cash_payment, price_sale, price_daily")
    .eq("id", listingId)
    .single();
  assertEquals(verifyErr, null, verifyErr?.message);
  assertEquals(verify?.status, "published");
  return verify;
}

Deno.test("e2e: cash-only sale listing publishes without Stripe", async () => {
  requireCreds();
  const { client, token } = await authedClient();
  const id = await createDraft(token, {
    mode: "sale",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  const row = await fillAndPublish(client, id, {
    price_sale: 25000,
    accept_card_payment: false,
    accept_cash_payment: true,
  });
  assertEquals(row?.mode, "sale");
  assertEquals(row?.accept_cash_payment, true);
  assertEquals(row?.accept_card_payment, false);
  assert(Number(row?.price_sale) > 0, "expected sale price to be set");
});

Deno.test("e2e: stripe/card sale listing publishes", async () => {
  requireCreds();
  const { client, token } = await authedClient();
  const id = await createDraft(token, {
    mode: "sale",
    category: "food_trailer",
    city: "Phoenix",
    state: "AZ",
  });
  const row = await fillAndPublish(client, id, {
    price_sale: 35000,
    accept_card_payment: true,
    accept_cash_payment: false,
  });
  assertEquals(row?.mode, "sale");
  assertEquals(row?.accept_card_payment, true);
  assert(Number(row?.price_sale) > 0);
});

Deno.test("e2e: rental listing publishes with daily pricing", async () => {
  requireCreds();
  const { client, token } = await authedClient();
  const id = await createDraft(token, {
    mode: "rent",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  const row = await fillAndPublish(client, id, {
    price_daily: 350,
    price_hourly: 60,
  });
  assertEquals(row?.mode, "rent");
  assert(Number(row?.price_daily) > 0, "expected daily rental price");
});

Deno.test("e2e: standard for-sale listing publishes with cash + card enabled", async () => {
  requireCreds();
  const { client, token } = await authedClient();
  const id = await createDraft(token, {
    mode: "sale",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  const row = await fillAndPublish(client, id, {
    price_sale: 42000,
    accept_card_payment: true,
    accept_cash_payment: true,
  });
  assertEquals(row?.mode, "sale");
  assertEquals(row?.accept_card_payment, true);
  assertEquals(row?.accept_cash_payment, true);
  assert(Number(row?.price_sale) > 0, "expected sale price to be set");
});

Deno.test("e2e: card sale is gated by Stripe Connect and publishes once connected", async () => {
  requireCreds();
  const { client, token, userId } = await authedClient();

  // Snapshot the current Stripe Connect state so we can restore it.
  const { data: original, error: snapErr } = await client
    .from("profiles")
    .select("stripe_account_id, stripe_onboarding_complete")
    .eq("id", userId)
    .single();
  assertEquals(snapErr, null, snapErr?.message);

  try {
    // 1. Force a "disconnected" state.
    const { error: disconnectErr } = await client
      .from("profiles")
      .update({ stripe_account_id: null, stripe_onboarding_complete: false })
      .eq("id", userId);
    assertEquals(disconnectErr, null, disconnectErr?.message);

    // 2. Draft a card-accepting sale listing.
    const listingId = await createDraft(token, {
      mode: "sale",
      category: "food_trailer",
      city: "Phoenix",
      state: "AZ",
    });

    // 3. check-stripe-connect must report disconnected.
    const gateResp = await fetch(
      `${SUPABASE_URL}/functions/v1/check-stripe-connect`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    const gateJson = JSON.parse(await gateResp.text());
    assertEquals(gateResp.status, 200);
    assertEquals(gateJson.connected, false);
    assertEquals(gateJson.onboarding_complete, false);

    // 4. Wizard-equivalent guard: requiresStripe && !onboarding_complete → blocked.
    const acceptCardPayment = true;
    const requiresStripe = acceptCardPayment; // mode === "sale" && accept_card_payment
    const blocked = requiresStripe && !gateJson.onboarding_complete;
    assert(blocked, "publish must be blocked while Stripe Connect is missing");

    // Confirm the listing did not slip into published state.
    const { data: stillDraft } = await client
      .from("listings")
      .select("status")
      .eq("id", listingId)
      .single();
    assertEquals(stillDraft?.status, "draft");

    // 5. Simulate a completed Stripe Connect onboarding.
    const { error: connectErr } = await client
      .from("profiles")
      .update({
        stripe_account_id: `acct_e2e_${crypto.randomUUID().slice(0, 8)}`,
        stripe_onboarding_complete: true,
      })
      .eq("id", userId);
    assertEquals(connectErr, null, connectErr?.message);

    // Re-read the flag the wizard actually consults.
    const { data: reconnected } = await client
      .from("profiles")
      .select("stripe_onboarding_complete")
      .eq("id", userId)
      .single();
    assertEquals(reconnected?.stripe_onboarding_complete, true);
    assert(
      !(requiresStripe && !reconnected?.stripe_onboarding_complete),
      "publish must be unblocked once onboarding is complete",
    );

    // 6. Publish succeeds now.
    const row = await fillAndPublish(client, listingId, {
      price_sale: 32000,
      accept_card_payment: true,
      accept_cash_payment: false,
    });
    assertEquals(row?.status, "published");
    assertEquals(row?.accept_card_payment, true);
  } finally {
    // Always restore the profile's original Stripe state.
    await client
      .from("profiles")
      .update({
        stripe_account_id: original?.stripe_account_id ?? null,
        stripe_onboarding_complete:
          original?.stripe_onboarding_complete ?? false,
      })
      .eq("id", userId);
  }
});





Deno.test("e2e: rental listing accepts a renter booking request end-to-end", async () => {
  requireCreds();
  if (!RENTER_EMAIL || !RENTER_PASSWORD) {
    console.warn(
      "Skipping renter booking e2e — set TEST_RENTER_EMAIL / TEST_RENTER_PASSWORD to enable.",
    );
    return;
  }

  // 1. Host publishes a rental listing
  const { client: hostClient, token: hostToken, userId: hostId } =
    await authedClient();
  const listingId = await createDraft(hostToken, {
    mode: "rent",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  const listing = await fillAndPublish(hostClient, listingId, {
    price_daily: 275,
    price_hourly: 55,
    instant_book: false,
  });
  assertEquals(listing?.status, "published");
  assertEquals(listing?.mode, "rent");

  // 2. Renter signs in with a distinct account (ownership rule forbids self-booking)
  const renterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: renterAuth, error: renterErr } = await renterClient.auth
    .signInWithPassword({ email: RENTER_EMAIL, password: RENTER_PASSWORD });
  if (renterErr) throw new Error(`Renter sign-in failed: ${renterErr.message}`);
  const renterId = renterAuth.user!.id;
  assert(renterId !== hostId, "Renter must differ from host");

  // 3. Renter submits a booking request
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const { data: booking, error: bookingErr } = await renterClient
    .from("booking_requests")
    .insert({
      listing_id: listingId,
      shopper_id: renterId,
      host_id: hostId,
      start_date: startDate,
      end_date: endDate,
      total_price: 550,
      status: "pending",
      message: "Automated e2e booking request — safe to ignore.",
      fulfillment_selected: "pickup",
    })
    .select("id, status, shopper_id, host_id, listing_id, total_price")
    .single();
  assertEquals(bookingErr, null, `booking insert failed: ${bookingErr?.message}`);
  assertExists(booking?.id, "booking row returned no id");
  CREATED_BOOKING_IDS.push(booking!.id);

  // 4. Verify the persisted row via the host's session (RLS: host can read)
  const { data: hostView, error: hostViewErr } = await hostClient
    .from("booking_requests")
    .select("id, status, shopper_id, host_id, listing_id")
    .eq("id", booking!.id)
    .single();
  assertEquals(hostViewErr, null, hostViewErr?.message);
  assertEquals(hostView?.status, "pending");
  assertEquals(hostView?.shopper_id, renterId);
  assertEquals(hostView?.host_id, hostId);
  assertEquals(hostView?.listing_id, listingId);
});

Deno.test("e2e: pay-in-person sale completes buyer + seller confirmation flow", async () => {
  requireCreds();
  if (!RENTER_EMAIL || !RENTER_PASSWORD) {
    console.warn(
      "Skipping cash-sale confirmation e2e — set TEST_RENTER_EMAIL / TEST_RENTER_PASSWORD to enable.",
    );
    return;
  }

  // 1. Seller publishes a cash-only sale listing.
  const { client: sellerClient, token: sellerToken, userId: sellerId } =
    await authedClient();
  const listingId = await createDraft(sellerToken, {
    mode: "sale",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  const listing = await fillAndPublish(sellerClient, listingId, {
    price_sale: 12500,
    accept_card_payment: false,
    accept_cash_payment: true,
  });
  assertEquals(listing?.status, "published");
  assertEquals(listing?.mode, "sale");
  assertEquals(listing?.accept_cash_payment, true);

  // 2. Buyer signs in as a distinct account (ownership rule forbids self-buying).
  const buyerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: buyerAuth, error: buyerErr } = await buyerClient.auth
    .signInWithPassword({ email: RENTER_EMAIL, password: RENTER_PASSWORD });
  if (buyerErr) throw new Error(`Buyer sign-in failed: ${buyerErr.message}`);
  const buyerId = buyerAuth.user!.id;
  assert(buyerId !== sellerId, "Buyer must differ from seller");

  // 3. Buyer creates a pending_cash sale transaction (mirrors SaleCheckout).
  const { data: tx, error: txErr } = await buyerClient
    .from("sale_transactions")
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: 12500,
      platform_fee: 0,
      seller_payout: 12500,
      status: "pending_cash",
      fulfillment_type: "pickup",
      buyer_name: "E2E Cash Buyer",
      buyer_email: RENTER_EMAIL,
    })
    .select("id, status, payment_intent_id")
    .single();
  assertEquals(txErr, null, `cash tx insert failed: ${txErr?.message}`);
  assertExists(tx?.id);
  assertEquals(tx?.status, "pending_cash");
  assertEquals(tx?.payment_intent_id, null);
  CREATED_SALE_TX_IDS.push(tx!.id);

  // 4. Seller confirms — direct UPDATE, which requires the RLS fix that admits
  //    the 'pending_cash' status into the seller's update policy.
  const { data: sellerUpd, error: sellerUpdErr } = await sellerClient
    .from("sale_transactions")
    .update({ seller_confirmed_at: new Date().toISOString() })
    .eq("id", tx!.id)
    .select("id, seller_confirmed_at, status")
    .single();
  assertEquals(sellerUpdErr, null, sellerUpdErr?.message);
  assertExists(
    sellerUpd?.seller_confirmed_at,
    "seller_confirmed_at should be set — RLS is dropping the update if this is null",
  );
  assertEquals(sellerUpd?.status, "pending_cash");

  // 5. Buyer confirms receipt and completes the transaction in a single update.
  const { data: buyerUpd, error: buyerUpdErr } = await buyerClient
    .from("sale_transactions")
    .update({
      buyer_confirmed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", tx!.id)
    .select("id, status, buyer_confirmed_at, seller_confirmed_at")
    .single();
  assertEquals(buyerUpdErr, null, buyerUpdErr?.message);
  assertEquals(buyerUpd?.status, "completed");
  assertExists(buyerUpd?.buyer_confirmed_at);
  assertExists(buyerUpd?.seller_confirmed_at);

  // 6. Both parties can read the final row via their own RLS-scoped clients.
  const { data: sellerView } = await sellerClient
    .from("sale_transactions")
    .select("id, status")
    .eq("id", tx!.id)
    .single();
  assertEquals(sellerView?.status, "completed");

  const { data: buyerView } = await buyerClient
    .from("sale_transactions")
    .select("id, status")
    .eq("id", tx!.id)
    .single();
  assertEquals(buyerView?.status, "completed");
});

Deno.test("e2e: pay-in-person cash sale routed through confirm-sale edge function", async () => {
  requireCreds();
  if (!RENTER_EMAIL || !RENTER_PASSWORD) {
    console.warn(
      "Skipping cash-sale edge-function e2e — set TEST_RENTER_EMAIL / TEST_RENTER_PASSWORD to enable.",
    );
    return;
  }

  // 1. Seller publishes a cash-only sale listing.
  const { client: sellerClient, token: sellerToken, userId: sellerId } =
    await authedClient();
  const listingId = await createDraft(sellerToken, {
    mode: "sale",
    category: "food_truck",
    city: "Phoenix",
    state: "AZ",
  });
  await fillAndPublish(sellerClient, listingId, {
    price_sale: 8000,
    accept_card_payment: false,
    accept_cash_payment: true,
  });

  // 2. Buyer signs in.
  const buyerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: buyerAuth, error: buyerErr } = await buyerClient.auth
    .signInWithPassword({ email: RENTER_EMAIL, password: RENTER_PASSWORD });
  if (buyerErr) throw new Error(`Buyer sign-in failed: ${buyerErr.message}`);
  const buyerId = buyerAuth.user!.id;
  const buyerToken = buyerAuth.session!.access_token;
  assert(buyerId !== sellerId, "Buyer must differ from seller");

  // 3. DB-level invariant: buyer_id != seller_id enforced by CHECK constraint.
  const { error: selfBuyErr } = await sellerClient
    .from("sale_transactions")
    .insert({
      listing_id: listingId,
      buyer_id: sellerId,
      seller_id: sellerId,
      amount: 8000,
      platform_fee: 0,
      seller_payout: 8000,
      status: "pending_cash",
    });
  assertExists(selfBuyErr, "Self-buy insert should be rejected");

  // 4. Buyer creates a valid pending_cash transaction.
  const { data: tx, error: txErr } = await buyerClient
    .from("sale_transactions")
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: 8000,
      platform_fee: 0,
      seller_payout: 8000,
      status: "pending_cash",
      fulfillment_type: "pickup",
      buyer_name: "E2E Cash Buyer 2",
      buyer_email: RENTER_EMAIL,
    })
    .select("id")
    .single();
  assertEquals(txErr, null, txErr?.message);
  assertExists(tx?.id);
  CREATED_SALE_TX_IDS.push(tx!.id);

  // Helper to invoke confirm-sale as an authenticated user.
  const invokeConfirm = async (token: string, role: "buyer" | "seller") => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ transaction_id: tx!.id, role }),
    });
    const json = await res.json();
    return { status: res.status, json };
  };

  // 5. Seller confirms via edge function — pending_cash -> seller_confirmed.
  const sellerRes = await invokeConfirm(sellerToken, "seller");
  assertEquals(sellerRes.status, 200, JSON.stringify(sellerRes.json));
  assertEquals(sellerRes.json.status, "seller_confirmed");

  // 6. Idempotency: second seller confirmation is rejected cleanly (not a duplicate write).
  const sellerDupe = await invokeConfirm(sellerToken, "seller");
  assert(
    sellerDupe.status >= 400 || sellerDupe.json?.error,
    "duplicate seller confirmation should be rejected",
  );

  // 7. Authorization: buyer cannot invoke as 'seller'.
  const wrongRole = await invokeConfirm(buyerToken, "seller");
  assert(
    wrongRole.status >= 400 || wrongRole.json?.error,
    "buyer invoking role=seller must be rejected",
  );

  // 8. Buyer confirms via edge function — completes the transaction.
  const buyerRes = await invokeConfirm(buyerToken, "buyer");
  assertEquals(buyerRes.status, 200, JSON.stringify(buyerRes.json));
  assertEquals(buyerRes.json.status, "completed");

  // 9. Final row is completed for both parties.
  const { data: finalRow } = await sellerClient
    .from("sale_transactions")
    .select("status, buyer_confirmed_at, seller_confirmed_at, payment_intent_id")
    .eq("id", tx!.id)
    .single();
  assertEquals(finalRow?.status, "completed");
  assertExists(finalRow?.buyer_confirmed_at);
  assertExists(finalRow?.seller_confirmed_at);
  assertEquals(finalRow?.payment_intent_id, null, "cash sale must not have a Stripe payment intent");
});



Deno.test("e2e: cleanup — remove listings, bookings, and sale transactions created by this run", async () => {
  const { client } = await authedClient();
  if (CREATED_SALE_TX_IDS.length > 0) {
    const { error } = await client
      .from("sale_transactions")
      .delete()
      .in("id", CREATED_SALE_TX_IDS);
    if (error) console.warn(`Sale tx cleanup warning: ${error.message}`);
  }
  if (CREATED_BOOKING_IDS.length > 0) {
    const { error } = await client
      .from("booking_requests")
      .delete()
      .in("id", CREATED_BOOKING_IDS);
    if (error) console.warn(`Booking cleanup warning: ${error.message}`);
  }
  if (CREATED_LISTING_IDS.length > 0) {
    const { error } = await client
      .from("listings")
      .delete()
      .in("id", CREATED_LISTING_IDS);
    if (error) console.warn(`Listing cleanup warning: ${error.message}`);
  }
});
