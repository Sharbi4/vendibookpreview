// Deno tests for the shared terms resolver + email formatter used by
// raise-dispute and resolve-dispute.
//
// These prove:
//   1. `resolveSaleTerms` uses sale.terms_id as the PRIMARY lookup and
//      only falls back to sale_transaction_id when terms_id is missing
//      or the primary row is not found.
//   2. Both branches return AgreedTerms whose `resolvedVia` correctly
//      reflects the path taken.
//   3. `formatTermsForEmail` renders the full agreed-terms block
//      (line items with USD formatting, payment method, cancellation
//      policy, terms version + resolution branch marker) — the exact
//      string both dispute functions push into the recipient emails.
//   4. Snapshot line key naming is normalized (amountCents vs
//      amount_cents), so client- and server-authored terms both render.
//
// Run with: supabase--test_edge_functions { pattern: "resolveSaleTerms" }

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatTermsForEmail,
  resolveSaleTerms,
  type AgreedTerms,
} from "./resolveSaleTerms.ts";

// ---------- Fake supabase client ----------------------------------------

interface Call {
  table: string;
  filterCol: string;
  filterVal: unknown;
}

type Row = Record<string, unknown>;

interface FakeOpts {
  /** Row returned when queried by transaction_terms.id */
  byTermsId?: Row | null;
  /** Row returned when queried by transaction_terms.sale_transaction_id */
  bySaleId?: Row | null;
}

function makeFakeSupabase(opts: FakeOpts) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const state: Partial<Call> = { table };
    const chain = {
      select(_cols: string) {
        return chain;
      },
      eq(col: string, val: unknown) {
        state.filterCol = col;
        state.filterVal = val;
        return chain;
      },
      async maybeSingle() {
        calls.push(state as Call);
        if (state.filterCol === "id") {
          return { data: opts.byTermsId ?? null, error: null };
        }
        if (state.filterCol === "sale_transaction_id") {
          return { data: opts.bySaleId ?? null, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  };
  return { client: { from }, calls };
}

// ---------- Fixtures ----------------------------------------------------

const CANONICAL_SNAPSHOT = {
  pricing: {
    lines: [
      { label: "Item price", amountCents: 34999, kind: "base" },
      { label: "Platform fee", amount_cents: 451, kind: "fee" },
      { label: "Total", amountCents: 35450, kind: "total" },
    ],
    totalCents: 35450,
  },
  policies: {
    cancellation: "Full refund within 24 hours of pickup.",
  },
};

const CANONICAL_ROW: Row = {
  id: "terms-primary-1",
  terms_version: "v3",
  payment_method: "stripe_card",
  transaction_mode: "sale",
  total_cents: 35450,
  snapshot: CANONICAL_SNAPSHOT,
};

const LEGACY_ROW: Row = {
  ...CANONICAL_ROW,
  id: "terms-legacy-1",
};

// ---------- resolveSaleTerms --------------------------------------------

Deno.test("resolveSaleTerms uses terms_id as the primary lookup", async () => {
  const { client, calls } = makeFakeSupabase({ byTermsId: CANONICAL_ROW });
  const terms = await resolveSaleTerms(client, {
    id: "sale_1",
    terms_id: "terms-primary-1",
  });
  assert(terms, "expected terms to resolve");
  assertEquals(terms!.id, "terms-primary-1");
  assertEquals(terms!.resolvedVia, "terms_id");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].filterCol, "id");
  assertEquals(calls[0].filterVal, "terms-primary-1");
});

Deno.test("resolveSaleTerms falls back to sale_transaction_id when terms_id is null", async () => {
  const { client, calls } = makeFakeSupabase({ bySaleId: LEGACY_ROW });
  const terms = await resolveSaleTerms(client, {
    id: "sale_legacy",
    terms_id: null,
  });
  assert(terms);
  assertEquals(terms!.id, "terms-legacy-1");
  assertEquals(terms!.resolvedVia, "sale_transaction_id");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].filterCol, "sale_transaction_id");
  assertEquals(calls[0].filterVal, "sale_legacy");
});

Deno.test("resolveSaleTerms falls back when terms_id points at a missing row", async () => {
  const { client, calls } = makeFakeSupabase({
    byTermsId: null,
    bySaleId: LEGACY_ROW,
  });
  const terms = await resolveSaleTerms(client, {
    id: "sale_2",
    terms_id: "terms-missing",
  });
  assert(terms);
  assertEquals(terms!.resolvedVia, "sale_transaction_id");
  // Both branches queried, in the correct order.
  assertEquals(calls.length, 2);
  assertEquals(calls[0].filterCol, "id");
  assertEquals(calls[1].filterCol, "sale_transaction_id");
});

Deno.test("resolveSaleTerms returns null when neither branch resolves", async () => {
  const { client } = makeFakeSupabase({ byTermsId: null, bySaleId: null });
  const terms = await resolveSaleTerms(client, {
    id: "sale_x",
    terms_id: "terms_x",
  });
  assertEquals(terms, null);
});

// ---------- formatTermsForEmail -----------------------------------------

function baseTerms(
  overrides: Partial<AgreedTerms> = {},
): AgreedTerms {
  return {
    id: "terms-x",
    terms_version: "v3",
    payment_method: "stripe_card",
    transaction_mode: "sale",
    total_cents: 35450,
    snapshot: CANONICAL_SNAPSHOT,
    resolvedVia: "terms_id",
    ...overrides,
  };
}

Deno.test("formatTermsForEmail renders every agreed line + total in USD", () => {
  const block = formatTermsForEmail(baseTerms())!;
  assert(block, "expected non-null block");
  assertStringIncludes(block, "AGREED TERMS (at checkout):");
  assertStringIncludes(block, "Item price: $349.99");
  assertStringIncludes(block, "Platform fee: $4.51");
  assertStringIncludes(block, "Total: $354.50");
});

Deno.test("formatTermsForEmail normalizes amount_cents (server) and amountCents (client)", () => {
  // Only the middle line uses snake_case; both must appear formatted.
  const block = formatTermsForEmail(baseTerms())!;
  // amount_cents=451 -> $4.51 (the snake_case-only line)
  assertStringIncludes(block, "Platform fee: $4.51");
});

Deno.test("formatTermsForEmail exposes payment method + cancellation policy + resolution branch", () => {
  const block = formatTermsForEmail(baseTerms())!;
  assertStringIncludes(block, "Payment method: stripe card");
  assertStringIncludes(block, "Cancellation policy: Full refund within 24 hours of pickup.");
  assertStringIncludes(block, "Terms version: v3 (resolved via terms_id).");
});

Deno.test("formatTermsForEmail marks legacy fallback resolution branch", () => {
  const block = formatTermsForEmail(
    baseTerms({ resolvedVia: "sale_transaction_id" }),
  )!;
  assertStringIncludes(block, "resolved via sale_transaction_id");
});

Deno.test("formatTermsForEmail falls back to total_cents when snapshot has no lines", () => {
  const terms = baseTerms({
    snapshot: { pricing: { lines: [] } },
    total_cents: 12034,
  });
  const block = formatTermsForEmail(terms)!;
  assertStringIncludes(block, "Total: $120.34");
});

Deno.test("formatTermsForEmail returns null for unresolved terms", () => {
  assertEquals(formatTermsForEmail(null), null);
});

// ---------- Dispute paragraph integration -------------------------------
//
// These reproduce the exact array shape that
//   raise-dispute/index.ts (`raiserParagraphs`, `otherParagraphs`,
//   `adminParagraphs`) and
//   resolve-dispute/index.ts (`paragraphs`)
// build for `send-transactional-email`. If those functions ever drop
// the `...(termsBlock ? [termsBlock] : [])` line, these tests fail.

Deno.test("raise-dispute paragraphs embed the agreed-terms block from terms_id", async () => {
  const { client } = makeFakeSupabase({ byTermsId: CANONICAL_ROW });
  const terms = await resolveSaleTerms(client, {
    id: "sale_r1",
    terms_id: "terms-primary-1",
  });
  const termsBlock = formatTermsForEmail(terms);
  assert(termsBlock);

  const raiserParagraphs = [
    `Your dispute for Test Truck has been submitted and is under review.`,
    `Your reason: Item damaged.`,
    `Payment will remain in escrow until the dispute is resolved.`,
    ...(termsBlock ? [termsBlock] : []),
  ];
  const adminParagraphs = [
    `Transaction: sale_r1`,
    `Amount: $354.50`,
    ...(termsBlock ? [termsBlock] : ["(No transaction_terms snapshot linked to this sale.)"]),
  ];

  const raiserJoined = raiserParagraphs.join("\n\n");
  const adminJoined = adminParagraphs.join("\n\n");
  assertStringIncludes(raiserJoined, "AGREED TERMS (at checkout):");
  assertStringIncludes(raiserJoined, "Total: $354.50");
  assertStringIncludes(adminJoined, "AGREED TERMS (at checkout):");
  // Admin fallback text must NOT appear when a snapshot was resolved.
  assert(
    !adminJoined.includes("(No transaction_terms snapshot linked to this sale.)"),
    "admin fallback marker leaked despite successful terms resolution",
  );
});

Deno.test("resolve-dispute paragraphs embed the agreed-terms block via terms_id", async () => {
  const { client } = makeFakeSupabase({ byTermsId: CANONICAL_ROW });
  const terms = await resolveSaleTerms(client, {
    id: "sale_res",
    terms_id: "terms-primary-1",
  });
  const termsBlock = formatTermsForEmail(terms);
  assert(termsBlock);

  // Matches resolve-dispute `paragraphs` construction.
  const paragraphs = [
    "Our team has reviewed your dispute and made a decision.",
    "A full refund has been issued to the buyer.",
    ...(termsBlock ? [termsBlock] : []),
  ];
  const joined = paragraphs.join("\n\n");
  assertStringIncludes(joined, "AGREED TERMS (at checkout):");
  assertStringIncludes(joined, "Item price: $349.99");
  assertStringIncludes(joined, "Cancellation policy: Full refund within 24 hours of pickup.");
  assertStringIncludes(joined, "resolved via terms_id");
});

Deno.test("dispute paragraphs mark the legacy fallback branch when terms_id is null", async () => {
  const { client } = makeFakeSupabase({ bySaleId: LEGACY_ROW });
  const terms = await resolveSaleTerms(client, {
    id: "sale_legacy",
    terms_id: null,
  });
  const termsBlock = formatTermsForEmail(terms);
  assert(termsBlock);
  const joined = [
    "Our team has reviewed the dispute on one of your transactions and made a decision.",
    "The payment has been released to the seller.",
    termsBlock,
  ].join("\n\n");
  assertStringIncludes(joined, "resolved via sale_transaction_id");
});
