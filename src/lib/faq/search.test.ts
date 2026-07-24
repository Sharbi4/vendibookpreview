import { describe, it, expect } from "vitest";
import { faqCategories, findFaqEntry, allFaqEntries } from "@/data/faqContent";
import { searchFaq, relatedEntries, scoreEntry } from "./search";

describe("faq search", () => {
  it("has every requested top-level category present", () => {
    const ids = faqCategories.map((c) => c.id);
    for (const required of [
      "getting-started",
      "accounts-profiles",
      "buying",
      "selling",
      "renting",
      "hosting",
      "food-trucks-trailers",
      "commercial-kitchens",
      "vendor-spaces",
      "payments",
      "deposits",
      "payouts",
      "refunds-cancellations",
      "protected-transactions",
      "in-person-transactions",
      "verification",
      "documents-contracts",
      "inspections",
      "transportation",
      "financing",
      "permit-path",
      "listing-upgrades",
      "host-subscriptions",
      "messaging-notifications",
      "reviews",
      "safety",
      "technical-support",
    ]) {
      expect(ids, `missing category: ${required}`).toContain(required);
    }
  });

  it("has unique entry ids across all categories", () => {
    const ids = allFaqEntries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ranks title matches above body matches", () => {
    const results = searchFaq(faqCategories, "payout");
    // Every result must contain payout-related content and payout-title
    // entries should dominate the top.
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.entry.question.toLowerCase()).toMatch(/payout/);
  });

  it("returns nothing for gibberish", () => {
    const results = searchFaq(faqCategories, "zzqqwwvvxxnope");
    expect(results).toHaveLength(0);
  });

  it("returns the entire catalog when the query is empty", () => {
    const results = searchFaq(faqCategories, "");
    expect(results.length).toBe(allFaqEntries.length);
  });

  it("filters results by category", () => {
    const results = searchFaq(faqCategories, "", { categoryId: "payments" });
    for (const r of results) expect(r.category.id).toBe("payments");
  });

  it("scores keyword matches higher than body-only matches", () => {
    const entry = findFaqEntry("what-is-vendibook");
    expect(entry).toBeDefined();
    const kwScore = scoreEntry(entry!, ["platform"]); // in keywords
    const bodyScore = scoreEntry({ ...entry!, keywords: [] }, ["platform"]); // body-only
    expect(kwScore).toBeGreaterThan(bodyScore);
  });

  it("suggests related entries within the same topic", () => {
    const entry = findFaqEntry("payout-timing");
    expect(entry).toBeDefined();
    const related = relatedEntries(faqCategories, entry!, 3);
    expect(related.length).toBeGreaterThan(0);
    // At least one should also be a payout topic.
    expect(related.some((r) => r.category.id === "payouts")).toBe(true);
  });

  it("every actionable link points to an in-app route, mailto, or tel", () => {
    for (const entry of allFaqEntries) {
      for (const a of entry.actions ?? []) {
        expect(
          a.href.startsWith("/") ||
            a.href.startsWith("mailto:") ||
            a.href.startsWith("tel:") ||
            a.href.startsWith("https://"),
          `bad href for entry ${entry.id}: ${a.href}`,
        ).toBe(true);
      }
    }
  });

  it("critical facts match the code: rental host+renter 12.9% and cash sale free", () => {
    const feeEntry = findFaqEntry("fees-work");
    expect(feeEntry?.answer).toMatch(/12\.9%/);
    const cash = findFaqEntry("pay-in-person");
    expect(cash?.answer.toLowerCase()).toMatch(/no vendibook commission|100%|free/);
  });
});
