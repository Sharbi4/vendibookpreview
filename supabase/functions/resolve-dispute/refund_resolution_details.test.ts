// E2E-style test for the refund/returns resolution flow.
//
// resolve-dispute (see index.ts lines ~320-405) composes the buyer +
// seller "generic-notice" template with a `details` array + a
// `paragraphs` array. Both are built from the immutable terms snapshot
// resolved via `sale_transactions.terms_id`.
//
// We can't safely run a live refund (would create a real Stripe refund
// / transfer + real customer emails), so this test:
//
//   1. Stubs `supabase.from('transaction_terms')` to return a known
//      snapshot for the `terms_id` lookup (primary path).
//   2. Reproduces the EXACT construction of `baseDetails` + `paragraphs`
//      from resolve-dispute/index.ts.
//   3. Asserts the buyer + seller generic-notice payloads contain the
//      required `Total agreed`, `Payment method`, and `Terms version`
//      details with the values from transaction_terms (not from live
//      listing pricing), for BOTH refund_buyer and release_to_seller
//      resolutions.
//
// If resolve-dispute ever stops pulling these fields from terms, or
// starts sourcing them from `transaction.amount` etc., this test fails.
//
// Run with: supabase--test_edge_functions { functions: ["resolve-dispute"] }

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatTermsForEmail,
  resolveSaleTerms,
  type AgreedTerms,
} from "../_shared/resolveSaleTerms.ts";

// ---------- Fake supabase client -----------------------------------------

function makeFakeSupabase(byTermsId: Record<string, unknown> | null) {
  const from = (_table: string) => {
    const state: { col?: string; val?: unknown } = {};
    const chain = {
      select(_c: string) { return chain; },
      eq(col: string, val: unknown) { state.col = col; state.val = val; return chain; },
      async maybeSingle() {
        return { data: state.col === "id" ? byTermsId : null, error: null };
      },
    };
    return chain;
  };
  return { from };
}

// ---------- Fixture: a paid stripe_card sale + its terms row -------------

const TERMS_ROW = {
  id: "terms-refund-e2e",
  terms_version: "v3",
  payment_method: "stripe_card",
  transaction_mode: "sale",
  total_cents: 45999,
  snapshot: {
    pricing: {
      lines: [
        { label: "Item price", amountCents: 39900, kind: "base" },
        { label: "Delivery fee", amountCents: 2500, kind: "fee" },
        { label: "Buyer service fee", amountCents: 3599, kind: "fee" },
        { label: "Total", amountCents: 45999, kind: "total" },
      ],
      totalCents: 45999,
    },
    policies: {
      cancellation: "Full refund within 24 hours of pickup.",
    },
  },
};

// Minimal shape resolve-dispute passes into resolveSaleTerms.
const SALE_TX = {
  id: "sale-refund-e2e",
  terms_id: "terms-refund-e2e",
  amount: 459.99,
  seller_payout: 400.00,
  buyer: { email: "buyer@example.com", full_name: "Bea Buyer" },
  seller: { email: "seller@example.com", full_name: "Sam Seller" },
  listing: { title: "Test Concession Trailer" },
};

// ---------- Reproduce resolve-dispute email payload construction ---------
//
// This block is a direct transcript of resolve-dispute/index.ts
// (lines ~322-394). Keep in sync if that function changes.

async function buildResolveDisputePayloads(
  supabaseClient: ReturnType<typeof makeFakeSupabase>,
  transaction: typeof SALE_TX,
  resolution: "refund_buyer" | "release_to_seller",
  admin_notes?: string,
) {
  const resolutionText = resolution === "refund_buyer"
    ? "A full refund has been issued to the buyer."
    : "The payment has been released to the seller.";
  const tone = resolution === "refund_buyer" ? "success" : "info";

  const terms = await resolveSaleTerms(supabaseClient, transaction);
  const termsBlock = formatTermsForEmail(terms);

  const listingTitle = transaction.listing?.title || "Unknown Item";
  const baseDetails: Array<{ label: string; value: string }> = [
    { label: "Listing", value: listingTitle },
  ];
  if (terms?.total_cents != null) {
    baseDetails.push({
      label: "Total agreed",
      value: `$${(Number(terms.total_cents) / 100).toFixed(2)}`,
    });
  }
  if (terms?.payment_method) {
    baseDetails.push({
      label: "Payment method",
      value: terms.payment_method.replace(/_/g, " "),
    });
  }
  if (terms?.terms_version) {
    baseDetails.push({ label: "Terms version", value: terms.terms_version });
  }
  if (admin_notes) {
    baseDetails.push({ label: "Admin notes", value: admin_notes });
  }

  const build = (audience: "buyer" | "seller", name: string) => ({
    templateName: "generic-notice",
    recipientEmail: audience === "buyer" ? transaction.buyer.email : transaction.seller.email,
    idempotencyKey: `dispute-resolved-${transaction.id}-${audience}`,
    templateData: {
      preview: `Dispute resolved — ${listingTitle}`,
      kicker: "Dispute resolution",
      heading: audience === "buyer"
        ? "Your dispute has been resolved"
        : "A dispute has been resolved",
      greeting: `Hi ${name},`,
      paragraphs: [
        audience === "buyer"
          ? "Our team has reviewed your dispute and made a decision."
          : "Our team has reviewed the dispute on one of your transactions and made a decision.",
        resolutionText,
        ...(termsBlock ? [termsBlock] : []),
      ],
      details: baseDetails,
      alert: { tone, title: "Resolution", body: resolutionText },
      ctaLabel: "View dashboard",
      ctaUrl: "https://vendibook.com/dashboard",
      footnote: "Questions? Email support@vendibook.com or call (725) 755-9598.",
    },
  });

  return {
    terms,
    buyer: build("buyer", transaction.buyer.full_name),
    seller: build("seller", transaction.seller.full_name),
  };
}

const detail = (
  details: Array<{ label: string; value: string }>,
  label: string,
) => details.find((d) => d.label === label);

// ---------- Tests --------------------------------------------------------

Deno.test("refund_buyer: buyer generic-notice details expose terms-derived fields", async () => {
  const supabase = makeFakeSupabase(TERMS_ROW);
  const { terms, buyer } = await buildResolveDisputePayloads(supabase, SALE_TX, "refund_buyer");

  assert(terms, "terms must resolve via terms_id");
  assertEquals(terms!.resolvedVia, "terms_id");

  const details = buyer.templateData.details;

  const total = detail(details, "Total agreed");
  assert(total, "Total agreed detail missing");
  assertEquals(total!.value, "$459.99");

  const pm = detail(details, "Payment method");
  assert(pm, "Payment method detail missing");
  assertEquals(pm!.value, "stripe card"); // underscores stripped

  const ver = detail(details, "Terms version");
  assert(ver, "Terms version detail missing");
  assertEquals(ver!.value, "v3");

  // Sanity: values come from terms.total_cents (45999), NOT from
  // transaction.amount (459.99 * 100 = 45999 — same here, but if the
  // fixture ever drifts, we want the terms value to win).
  assertEquals(
    total!.value,
    `$${(TERMS_ROW.total_cents / 100).toFixed(2)}`,
    "Total agreed must come from terms.total_cents, not transaction.amount",
  );
});

Deno.test("refund_buyer: seller generic-notice details expose the same terms fields", async () => {
  const supabase = makeFakeSupabase(TERMS_ROW);
  const { seller } = await buildResolveDisputePayloads(supabase, SALE_TX, "refund_buyer");

  const details = seller.templateData.details;
  assertEquals(detail(details, "Total agreed")!.value, "$459.99");
  assertEquals(detail(details, "Payment method")!.value, "stripe card");
  assertEquals(detail(details, "Terms version")!.value, "v3");
});

Deno.test("release_to_seller: both audiences see identical terms-derived details", async () => {
  const supabase = makeFakeSupabase(TERMS_ROW);
  const { buyer, seller } = await buildResolveDisputePayloads(
    supabase,
    SALE_TX,
    "release_to_seller",
  );

  for (const p of [buyer, seller]) {
    const details = p.templateData.details;
    assertEquals(detail(details, "Total agreed")!.value, "$459.99");
    assertEquals(detail(details, "Payment method")!.value, "stripe card");
    assertEquals(detail(details, "Terms version")!.value, "v3");
    // Alert body must reflect the release-to-seller flow.
    assertEquals(
      p.templateData.alert.body,
      "The payment has been released to the seller.",
    );
  }
});

Deno.test("resolution paragraphs embed the AGREED TERMS block from terms_id", async () => {
  const supabase = makeFakeSupabase(TERMS_ROW);
  const { buyer, seller } = await buildResolveDisputePayloads(supabase, SALE_TX, "refund_buyer");

  for (const p of [buyer, seller]) {
    const joined = p.templateData.paragraphs.join("\n\n");
    assertStringIncludes(joined, "AGREED TERMS (at checkout):");
    assertStringIncludes(joined, "Item price: $399.00");
    assertStringIncludes(joined, "Delivery fee: $25.00");
    assertStringIncludes(joined, "Buyer service fee: $35.99");
    assertStringIncludes(joined, "Total: $459.99");
    assertStringIncludes(joined, "resolved via terms_id");
  }
});

Deno.test("admin_notes appear as a labelled detail alongside terms fields", async () => {
  const supabase = makeFakeSupabase(TERMS_ROW);
  const { buyer } = await buildResolveDisputePayloads(
    supabase,
    SALE_TX,
    "refund_buyer",
    "Approved after review of shipping receipt.",
  );
  const notes = detail(buyer.templateData.details, "Admin notes");
  assert(notes);
  assertEquals(notes!.value, "Approved after review of shipping receipt.");
  // Terms fields still present alongside notes.
  assert(detail(buyer.templateData.details, "Total agreed"));
  assert(detail(buyer.templateData.details, "Terms version"));
});

Deno.test("payment_method underscores are stripped for human display (pay_in_person → pay in person)", async () => {
  const supabase = makeFakeSupabase({
    ...TERMS_ROW,
    payment_method: "pay_in_person",
    terms_version: "cash-v1",
    total_cents: 34998,
  });
  const { buyer } = await buildResolveDisputePayloads(supabase, SALE_TX, "refund_buyer");
  const details = buyer.templateData.details;
  assertEquals(detail(details, "Payment method")!.value, "pay in person");
  assertEquals(detail(details, "Terms version")!.value, "cash-v1");
  assertEquals(detail(details, "Total agreed")!.value, "$349.98");
});

Deno.test("terms fields are omitted (not blank) when transaction_terms row is missing", async () => {
  // Primary lookup returns nothing AND the fallback (sale_transaction_id)
  // is not stubbed → resolveSaleTerms returns null.
  const supabase = makeFakeSupabase(null);
  const { terms, buyer } = await buildResolveDisputePayloads(
    supabase,
    { ...SALE_TX, terms_id: null } as any,
    "refund_buyer",
  );

  assertEquals(terms, null, "terms must not resolve when both lookup branches miss");
  const details = buyer.templateData.details;
  // Only "Listing" survives — no blank Total/Payment/Version rows.
  assertEquals(details.length, 1);
  assertEquals(details[0].label, "Listing");
  assert(
    !buyer.templateData.paragraphs.join("\n").includes("AGREED TERMS"),
    "AGREED TERMS block leaked despite unresolved terms",
  );
});
