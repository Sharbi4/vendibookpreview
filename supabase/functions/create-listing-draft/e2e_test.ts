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

const CREATED_LISTING_IDS: string[] = [];

function requireCreds() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "Missing TEST_USER_EMAIL / TEST_USER_PASSWORD. Add both to the project " +
        ".env (or as edge-function secrets) before running these e2e tests.",
    );
  }
}

async function authedClient() {
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
  client: ReturnType<typeof createClient>,
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

Deno.test("e2e: cleanup — remove listings created by this run", async () => {
  if (CREATED_LISTING_IDS.length === 0) return;
  const { client } = await authedClient();
  const { error } = await client
    .from("listings")
    .delete()
    .in("id", CREATED_LISTING_IDS);
  // Cleanup failure shouldn't fail the whole suite loudly, but surface it.
  if (error) console.warn(`Cleanup warning: ${error.message}`);
});
