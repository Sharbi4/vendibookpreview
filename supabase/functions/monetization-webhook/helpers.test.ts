import { assertEquals, assert, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateConsentId, PersistenceError } from "./helpers.ts";

// ---- validateConsentId --------------------------------------------------

Deno.test("validateConsentId returns null for missing/malformed input", () => {
  assertEquals(validateConsentId(undefined), null);
  assertEquals(validateConsentId(null), null);
  assertEquals(validateConsentId(""), null);
  assertEquals(validateConsentId("   "), null);
  assertEquals(validateConsentId("not-a-uuid"), null);
  assertEquals(validateConsentId("123"), null);
  assertEquals(validateConsentId("11111111-1111-1111-1111-11111111111"), null);
  assertEquals(validateConsentId(12345 as unknown), null);
  assertEquals(validateConsentId({} as unknown), null);
});

Deno.test("validateConsentId accepts valid UUIDs and lowercases them", () => {
  assertEquals(
    validateConsentId("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assertEquals(
    validateConsentId("550E8400-E29B-41D4-A716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assertEquals(
    validateConsentId("  550e8400-e29b-41d4-a716-446655440000  "),
    "550e8400-e29b-41d4-a716-446655440000",
  );
});

// ---- PersistenceError contract ------------------------------------------
// The outer handler branches on `err instanceof PersistenceError` to decide
// between "delete idempotency row + return 500 (retry)" and
// "mark event errored + return 200 (side-effect failure)". These tests pin
// the invariants a future refactor could accidentally break.

Deno.test("PersistenceError is an Error subclass with correct name", () => {
  const e = new PersistenceError("insert failed", { code: "23505" });
  assert(e instanceof Error);
  assert(e instanceof PersistenceError);
  assertEquals(e.name, "PersistenceError");
  assertEquals(e.message, "insert failed");
});

Deno.test("PersistenceError is distinguishable from generic Error", () => {
  const generic = new Error("boom");
  const persist = new PersistenceError("db down");
  assertEquals(generic instanceof PersistenceError, false);
  assertEquals(persist instanceof PersistenceError, true);
});

Deno.test("upsert-failure path surfaces as PersistenceError (retryable)", async () => {
  // Mimics what handleSubscriptionChange does when supabase.update returns
  // an error: wrap the pg message and throw PersistenceError so the outer
  // catch takes the retry branch instead of silently 200-ing.
  const simulate = () => {
    const updErr = { message: "connection reset" } as { message: string };
    throw new PersistenceError(
      `host_subscriptions update failed: ${updErr.message}`,
      updErr,
    );
  };
  await assertRejects(
    async () => simulate(),
    PersistenceError,
    "host_subscriptions update failed: connection reset",
  );
});
