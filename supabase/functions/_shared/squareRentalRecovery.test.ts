import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { recoverRentalSquarePayment } from "./squareMarketplace.ts";

// Fake Vendibook Square account; no real Square call is made.
Deno.env.set("SQUARE_ENVIRONMENT", "sandbox");
Deno.env.set("SQUARE_APPLICATION_ID", "test-app");
Deno.env.set("SQUARE_LOCATION_ID", "LOC_VENDIBOOK");
Deno.env.set("SQUARE_ACCESS_TOKEN", "test-token");
Deno.env.delete("RENTAL_SQUARE_PLATFORM_ENABLED");

const record = {
  id: "rec-1", reference: "VB-R-TEST01", square_payment_id: null, square_location_id: "LOC_VENDIBOOK",
  created_at: "2026-11-19T20:00:00Z", metadata: { square_mode: "platform" },
};

// deno-lint-ignore no-explicit-any
function stubAdmin(state: { saved: string | null }): any {
  return { from() {
    // deno-lint-ignore no-explicit-any
    let pending: any = null;
    // deno-lint-ignore no-explicit-any
    const q: any = {
      update: (v: { square_payment_id: string }) => { pending = v; return q; },
      select: () => q,
      eq: () => q,
      is: () => { if (pending) state.saved = pending.square_payment_id; return Promise.resolve({ error: null }); },
      maybeSingle: async () => ({ data: { ...record, square_payment_id: state.saved }, error: null }),
    };
    return q;
  } };
}

function stubSquare(payments: unknown[]) {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ payments })))) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

Deno.test("a charge Square took for this rental is linked back to its booking payment", async () => {
  const restore = stubSquare([
    { id: "PAY_OTHER", location_id: "LOC_VENDIBOOK", reference_id: "VB-R-OTHER" },
    { id: "PAY_MATCH", location_id: "LOC_VENDIBOOK", reference_id: "VB-R-TEST01" },
  ]);
  const state = { saved: null as string | null };
  try {
    const result = await recoverRentalSquarePayment(stubAdmin(state), record);
    assertEquals(result?.payment.id, "PAY_MATCH");
    assertEquals(state.saved, "PAY_MATCH");
  } finally { restore(); }
});

Deno.test("a payment with another reference or location is never linked", async () => {
  const restore = stubSquare([
    { id: "PAY_WRONG_REF", location_id: "LOC_VENDIBOOK", reference_id: "VB-R-OTHER" },
    { id: "PAY_WRONG_LOC", location_id: "LOC_HOST", reference_id: "VB-R-TEST01" },
  ]);
  const state = { saved: null as string | null };
  try {
    assertEquals(await recoverRentalSquarePayment(stubAdmin(state), record), null);
    assertEquals(state.saved, null);
  } finally { restore(); }
});
