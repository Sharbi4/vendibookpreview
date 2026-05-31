// Unit tests for stripe-webhook referral wiring.
//
// Covers:
//  - refund → referrals set to "voided" with action_type "void_refund"
//  - dispute → referrals set to "on_hold" with action_type "hold_dispute"
//  - charge metadata → extractSessionReferralCode pulls referral_code from session
//  - only referrals in adjustable statuses are touched (DB filter is honored)
//  - idempotency key is deterministic: `stripe-${eventId}-${referralId}`
//  - no-op when neither transactionId nor bookingId is supplied
//  - RPC errors do not throw and are not counted as adjusted

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  adjustReferralsForTransaction,
  extractSessionReferralCode,
} from "./_referral.ts";

type RpcCall = { fn: string; args: Record<string, unknown> };

// Minimal supabase-js-like mock. The helper only uses:
//   client.from("referrals").select(...).in(...).in(...)  →  { data, error }
//   client.rpc(name, args)                                →  { data, error }
function makeMockClient(opts: {
  referralsByTxn: Record<string, Array<{ id: string; status: string }>>;
  rpcError?: { message: string } | null;
}) {
  const rpcCalls: RpcCall[] = [];
  const selectCalls: Array<{ table: string; ids: string[]; statuses: string[] }> = [];

  const client = {
    rpcCalls,
    selectCalls,
    from(table: string) {
      const ctx: { ids: string[]; statuses: string[] } = { ids: [], statuses: [] };
      const builder = {
        select(_cols: string) {
          return builder;
        },
        in(column: string, values: string[]) {
          if (column === "transaction_id") ctx.ids = values;
          else if (column === "status") ctx.statuses = values;
          if (ctx.ids.length && ctx.statuses.length) {
            selectCalls.push({ table, ids: ctx.ids, statuses: ctx.statuses });
            const collected: Array<{ id: string; status: string }> = [];
            for (const id of ctx.ids) {
              for (const r of opts.referralsByTxn[id] ?? []) {
                if (ctx.statuses.includes(r.status)) collected.push(r);
              }
            }
            return Promise.resolve({ data: collected, error: null });
          }
          return builder;
        },
      };
      return builder;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      return { data: null, error: opts.rpcError ?? null };
    },
  };
  return client;
}

Deno.test("adjustReferralsForTransaction: refund voids eligible referrals", async () => {
  const client = makeMockClient({
    referralsByTxn: {
      "txn_1": [
        { id: "ref_a", status: "pending_review" },
        { id: "ref_b", status: "qualified" },
        { id: "ref_c", status: "voided" }, // ineligible — should not be returned by the mock filter
      ],
    },
  });

  const res = await adjustReferralsForTransaction(client, {
    transactionId: "txn_1",
    eventId: "evt_refund_123",
    newStatus: "voided",
    note: "Stripe refund — auto-voiding referral reward",
    actionType: "void_refund",
  });

  assertEquals(res.adjusted, 2);
  assertEquals(client.rpcCalls.length, 2);
  for (const call of client.rpcCalls) {
    assertEquals(call.fn, "log_referral_status_change");
    assertEquals(call.args.p_new_status, "voided");
    assertEquals(call.args.p_action_type, "void_refund");
    assertEquals(call.args.p_source, "system");
  }
  assertEquals(
    res.idempotencyKeys.sort(),
    ["stripe-evt_refund_123-ref_a", "stripe-evt_refund_123-ref_b"].sort(),
  );

  // DB filter must restrict to adjustable statuses only.
  assertEquals(client.selectCalls.length, 1);
  assertEquals(
    client.selectCalls[0].statuses.sort(),
    ["pending_review", "qualified", "transaction_started"].sort(),
  );
});

Deno.test("adjustReferralsForTransaction: dispute holds eligible referrals", async () => {
  const client = makeMockClient({
    referralsByTxn: {
      "booking_1": [{ id: "ref_x", status: "transaction_started" }],
    },
  });

  const res = await adjustReferralsForTransaction(client, {
    bookingId: "booking_1",
    eventId: "evt_dispute_999",
    newStatus: "on_hold",
    note: "Stripe dispute — auto-holding referral reward",
    actionType: "hold_dispute",
  });

  assertEquals(res.adjusted, 1);
  assertEquals(client.rpcCalls.length, 1);
  const call = client.rpcCalls[0];
  assertEquals(call.args.p_referral_id, "ref_x");
  assertEquals(call.args.p_new_status, "on_hold");
  assertEquals(call.args.p_action_type, "hold_dispute");
  assertEquals(call.args.p_idempotency_key, "stripe-evt_dispute_999-ref_x");
});

Deno.test("adjustReferralsForTransaction: matches by either transactionId or bookingId", async () => {
  const client = makeMockClient({
    referralsByTxn: {
      "txn_1": [{ id: "ref_a", status: "pending_review" }],
      "booking_1": [{ id: "ref_b", status: "qualified" }],
    },
  });

  const res = await adjustReferralsForTransaction(client, {
    transactionId: "txn_1",
    bookingId: "booking_1",
    eventId: "evt_refund_55",
    newStatus: "voided",
    note: "refund",
    actionType: "void_refund",
  });

  assertEquals(res.adjusted, 2);
  const sentIds = client.selectCalls[0].ids.sort();
  assertEquals(sentIds, ["booking_1", "txn_1"]);
});

Deno.test("adjustReferralsForTransaction: no-op when no ids supplied", async () => {
  const client = makeMockClient({ referralsByTxn: {} });
  const res = await adjustReferralsForTransaction(client, {
    eventId: "evt_x",
    newStatus: "voided",
    note: "n/a",
    actionType: "void_refund",
  });
  assertEquals(res.adjusted, 0);
  assertEquals(client.rpcCalls.length, 0);
  assertEquals(client.selectCalls.length, 0);
});

Deno.test("adjustReferralsForTransaction: RPC error does not throw and is not counted", async () => {
  const client = makeMockClient({
    referralsByTxn: { "txn_err": [{ id: "ref_err", status: "pending_review" }] },
    rpcError: { message: "boom" },
  });
  const res = await adjustReferralsForTransaction(client, {
    transactionId: "txn_err",
    eventId: "evt_err",
    newStatus: "voided",
    note: "x",
    actionType: "void_refund",
  });
  assertEquals(client.rpcCalls.length, 1);
  assertEquals(res.adjusted, 0);
  assertEquals(res.idempotencyKeys.length, 0);
});

Deno.test("adjustReferralsForTransaction: idempotency key is deterministic per (event, referral)", async () => {
  const client = makeMockClient({
    referralsByTxn: { "txn_1": [{ id: "ref_a", status: "pending_review" }] },
  });
  const a = await adjustReferralsForTransaction(client, {
    transactionId: "txn_1",
    eventId: "evt_same",
    newStatus: "on_hold",
    note: "n",
    actionType: "hold_dispute",
  });
  const b = await adjustReferralsForTransaction(client, {
    transactionId: "txn_1",
    eventId: "evt_same",
    newStatus: "on_hold",
    note: "n",
    actionType: "hold_dispute",
  });
  assertEquals(a.idempotencyKeys, b.idempotencyKeys);
  assertEquals(a.idempotencyKeys[0], "stripe-evt_same-ref_a");
});

Deno.test("extractSessionReferralCode: returns trimmed code when present", () => {
  assertEquals(
    extractSessionReferralCode({ metadata: { referral_code: "  FRIEND25 " } }),
    "FRIEND25",
  );
});

Deno.test("extractSessionReferralCode: returns null when missing or blank", () => {
  assertEquals(extractSessionReferralCode(null), null);
  assertEquals(extractSessionReferralCode(undefined), null);
  assertEquals(extractSessionReferralCode({ metadata: null }), null);
  assertEquals(extractSessionReferralCode({ metadata: {} }), null);
  assertEquals(extractSessionReferralCode({ metadata: { referral_code: "" } }), null);
  assertEquals(extractSessionReferralCode({ metadata: { referral_code: "   " } }), null);
});

Deno.test("extractSessionReferralCode: charge.session metadata round-trip persists referral_code", () => {
  // Simulates how stripe-webhook reads session.metadata.referral_code before
  // writing it onto booking_requests / sale_transactions rows.
  const session = { metadata: { referral_code: "REF-ABC-123", other: "x" } };
  const code = extractSessionReferralCode(session);
  assertExists(code);
  assertEquals(code, "REF-ABC-123");

  const bookingUpdate: Record<string, unknown> = {};
  if (code) bookingUpdate.referral_code = code;
  assertEquals(bookingUpdate.referral_code, "REF-ABC-123");
});
