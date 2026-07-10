// Focused unit tests for `formatTermsForEmail` — the single formatter
// every downstream email (raise-dispute, resolve-dispute, refund
// notices) relies on to render the immutable AGREED TERMS block.
//
// These tests pin two invariants that MUST hold or downstream emails
// diverge from each other and from the AgreedTermsPanel UI:
//
//   1. Snapshot line key normalization — `amountCents` (client
//      buildTerms) and `amount_cents` (server create-cash-sale) MUST
//      produce byte-identical output when the underlying data matches.
//   2. Block format stability — a single canonical shape (header,
//      bullet lines with `  • {label}: {USD}`, payment method,
//      cancellation policy, terms version + resolution branch) that
//      does not silently reorder or reword between calls.
//
// Run with: supabase--test_edge_functions { functions: ["raise-dispute"] }

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatTermsForEmail,
  type AgreedTerms,
} from "../_shared/resolveSaleTerms.ts";

// ---------- helpers -----------------------------------------------------

function terms(overrides: Partial<AgreedTerms> = {}): AgreedTerms {
  return {
    id: "terms-unit",
    terms_version: "v3",
    payment_method: "stripe_card",
    transaction_mode: "sale",
    total_cents: 12500,
    snapshot: {
      pricing: {
        lines: [
          { label: "Base price", amountCents: 10000, kind: "base" },
          { label: "Delivery fee", amountCents: 2500, kind: "fee" },
        ],
      },
      policies: { cancellation: "Refunds within 24 hours." },
    },
    resolvedVia: "terms_id",
    ...overrides,
  };
}

// ---------- key-convention parity ---------------------------------------

Deno.test("amountCents (client) and amount_cents (server) produce identical blocks", () => {
  const clientBlock = formatTermsForEmail(terms())!;

  const serverBlock = formatTermsForEmail(
    terms({
      snapshot: {
        pricing: {
          lines: [
            // snake_case only — the shape create-cash-sale writes.
            { label: "Base price", amount_cents: 10000, kind: "base" },
            { label: "Delivery fee", amount_cents: 2500, kind: "fee" },
          ],
        },
        policies: { cancellation: "Refunds within 24 hours." },
      },
    }),
  )!;

  assertEquals(
    clientBlock,
    serverBlock,
    "camelCase and snake_case snapshots must render byte-identical blocks",
  );
});

Deno.test("mixed camelCase + snake_case lines in one snapshot all render correctly", () => {
  const block = formatTermsForEmail(
    terms({
      snapshot: {
        pricing: {
          lines: [
            { label: "Base price", amountCents: 10000 },
            { label: "Delivery fee", amount_cents: 2500 },
            { label: "Total", amountCents: 12500, kind: "total" },
          ],
        },
        policies: { cancellation: "Refunds within 24 hours." },
      },
    }),
  )!;

  assertStringIncludes(block, "Base price: $100.00");
  assertStringIncludes(block, "Delivery fee: $25.00");
  assertStringIncludes(block, "Total: $125.00");
});

Deno.test("amountCents wins when both keys are present on the same line", () => {
  // Defensive: if a snapshot ever carried both, the camelCase form is
  // the canonical one (client authored the row). Guarantee no silent
  // "sum both" or "prefer snake_case" regression.
  const block = formatTermsForEmail(
    terms({
      snapshot: {
        pricing: {
          lines: [
            { label: "Base price", amountCents: 10000, amount_cents: 99999 },
          ],
        },
      },
    }),
  )!;
  assertStringIncludes(block, "Base price: $100.00");
  assert(!block.includes("$999.99"), "snake_case value must not override camelCase");
});

Deno.test("missing/undefined amount coerces to $0.00 rather than throwing", () => {
  const block = formatTermsForEmail(
    terms({
      snapshot: {
        pricing: {
          lines: [{ label: "Mystery fee" }],
        },
      },
    }),
  )!;
  assertStringIncludes(block, "Mystery fee: $0.00");
});

// ---------- block format stability --------------------------------------

Deno.test("block always opens with the AGREED TERMS header", () => {
  const block = formatTermsForEmail(terms())!;
  assert(
    block.startsWith("AGREED TERMS (at checkout):"),
    `block header changed — got: ${JSON.stringify(block.slice(0, 40))}`,
  );
});

Deno.test("line items render as '  • {label}: {USD}' bullets", () => {
  const block = formatTermsForEmail(terms())!;
  for (const line of block.split("\n")) {
    if (line.startsWith("  •")) {
      assert(
        /^ {2}• .+: \$\d{1,3}(,\d{3})*\.\d{2}$/.test(line),
        `bullet line does not match expected shape: ${JSON.stringify(line)}`,
      );
    }
  }
});

Deno.test("format is deterministic — repeated calls return identical strings", () => {
  const t = terms();
  const a = formatTermsForEmail(t);
  const b = formatTermsForEmail(t);
  const c = formatTermsForEmail(t);
  assertEquals(a, b);
  assertEquals(b, c);
});

Deno.test("section ordering is fixed: header, lines, payment, cancellation, version", () => {
  const block = formatTermsForEmail(terms())!;
  const iHeader = block.indexOf("AGREED TERMS");
  const iLines = block.indexOf("• Base price");
  const iPayment = block.indexOf("Payment method:");
  const iCancel = block.indexOf("Cancellation policy:");
  const iVersion = block.indexOf("Terms version:");

  assert(iHeader >= 0 && iLines > iHeader, "lines must come after header");
  assert(iPayment > iLines, "payment method must come after lines");
  assert(iCancel > iPayment, "cancellation must come after payment method");
  assert(iVersion > iCancel, "terms version must come last");
});

Deno.test("empty snapshot.pricing.lines falls back to a single Total line", () => {
  const block = formatTermsForEmail(
    terms({
      total_cents: 4200,
      snapshot: { pricing: { lines: [] }, policies: {} },
    }),
  )!;
  assertStringIncludes(block, "Total: $42.00");
  assert(
    !block.includes("• Base price"),
    "must not leak lines from the default fixture when snapshot is empty",
  );
});

Deno.test("optional sections are omitted rather than emitted with blank values", () => {
  const block = formatTermsForEmail(
    terms({
      payment_method: null,
      terms_version: null,
      snapshot: { pricing: { lines: [] }, policies: {} },
      total_cents: 100,
    }),
  )!;
  assert(!block.includes("Payment method:"), "empty payment method must be omitted");
  assert(!block.includes("Cancellation policy:"), "empty cancellation policy must be omitted");
  assert(!block.includes("Terms version:"), "empty terms version must be omitted");
});

Deno.test("resolution branch marker matches the resolvedVia field verbatim", () => {
  const primary = formatTermsForEmail(terms({ resolvedVia: "terms_id" }))!;
  const legacy = formatTermsForEmail(terms({ resolvedVia: "sale_transaction_id" }))!;
  assertStringIncludes(primary, "resolved via terms_id");
  assertStringIncludes(legacy, "resolved via sale_transaction_id");
  assert(!primary.includes("sale_transaction_id"), "primary block must not mention fallback branch");
});

Deno.test("thousands separator + two-decimal USD rounding on large values", () => {
  const block = formatTermsForEmail(
    terms({
      total_cents: 1234567,
      snapshot: {
        pricing: {
          lines: [{ label: "Big total", amountCents: 1234567 }],
        },
      },
    }),
  )!;
  assertStringIncludes(block, "Big total: $12,345.67");
});
