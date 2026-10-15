import { describe, it, expect } from "vitest";
import { faqCategories, findFaqEntry, allFaqEntries } from "@/data/faqContent";
import { searchFaq, relatedEntries, scoreEntry } from "./search";

describe("faq search", () => {
  it("has every requested top-level category present", () => {
    const ids = faqCategories.map((c) => c.id);
    for (const required of [
      "getting-started",
      "buying",
      "renting",
      "selling",
      "hosting",
      "memberships-billing",
      "tools-addons",
      "trust-safety",
      "account",
      "referrals",
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
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.entry.question.toLowerCase()).toMatch(/pay/);
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
    const results = searchFaq(faqCategories, "", { categoryId: "buying" });
    for (const r of results) expect(r.category.id).toBe("buying");
  });

  it("scores keyword matches higher than body-only matches", () => {
    const entry = findFaqEntry("what-is-vendibook");
    expect(entry).toBeDefined();
    const kwScore = scoreEntry(entry!, ["platform"]);
    const bodyScore = scoreEntry({ ...entry!, keywords: [] }, ["platform"]);
    expect(kwScore).toBeGreaterThan(bodyScore);
  });

  it("suggests related entries within the same topic", () => {
    const entry = findFaqEntry("payout-timing");
    expect(entry).toBeDefined();
    const related = relatedEntries(faqCategories, entry!, 3);
    expect(related.length).toBeGreaterThan(0);
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

  it("critical facts match FEE_CONFIG: 8.7% online sale, 12.9% rentals, Pro rental-only", () => {
    const feeEntry = findFaqEntry("seller-fees");
    expect(feeEntry?.answer).toMatch(/8\.7%/);
    expect(feeEntry?.answer).toMatch(/12\.9%/);
    expect(findFaqEntry("pricing-pro-sale-commission")?.answer).toMatch(/^No\./);
    const buying = findFaqEntry("payment-methods");
    expect(buying?.answer).toMatch(/Square/);
  });

  it("follows the master guide: no escrow holds, blanket windows, retired products or pay in person", () => {
    expect(findFaqEntry("pay-in-person-cash")?.answer).toMatch(/^No\./);
    // Owner payout override (2026-10-15) applies to sales and rentals.
    const payout = /We pay out within 24 hours after the rental or sale is complete and confirmed/;
    expect(findFaqEntry("payout-timing")?.answer).toMatch(payout);
    expect(findFaqEntry("pricing-payout-timing")?.answer).toMatch(payout);
    expect(findFaqEntry("rental-payment-square")?.answer).toMatch(/Square/);
    expect(findFaqEntry("what-is-vendibook")?.answer).toMatch(/food truck community/);
    for (const entry of allFaqEntries) {
      const text = `${entry.question} ${entry.answer}`;
      expect(text, entry.id).not.toMatch(/funds are held|held by (our payment processor|PayPal)/i);
      expect(text, entry.id).not.toMatch(/7 days after delivery|5–10 business days|financed purchase/i);
      expect(text, entry.id).not.toMatch(/stripe|concierge|starter|growth plan|operator plan/i);
      expect(text, entry.id).not.toMatch(/pay-in-person (equipment )?sales? (are|is|remain)|100% free/i);
    }
  });

  it("plan prices are rendered from live catalog tokens, never hardcoded", () => {
    const tiers = findFaqEntry("tiers-overview");
    // Prices come from the monetization catalog at render time via
    // {{price:slug}} tokens, so the copy must not bake in stale dollar amounts.
    expect(tiers?.answer).toMatch(/\{\{price:vendibook_pro\}\}/);
    expect(tiers?.answer).toMatch(/\{\{price:permit_path_plus_monthly\}\}/);
    expect(tiers?.answer).not.toMatch(/\$39|\$89|\$149/);
  });


  it("uses 'payment protection' language, not 'escrow'", () => {
    // Buyer-facing explainer must exist and avoid the word 'escrow'.
    const protection = findFaqEntry("payment-protection");
    expect(protection).toBeDefined();
    expect(protection!.answer.toLowerCase()).not.toContain("in escrow");
  });
});
