import { describe, it, expect } from "vitest";
import {
  buildListingFixNudgeHtml,
  buildListingFixNudgeText,
  listingFixSubject,
} from "../../../supabase/functions/_shared/marketing-templates/listing-fix-nudge";

// Owner rule 2026-10-06: never tell a seller their view count.
describe("listing-fix nudge", () => {
  const data = {
    firstName: "Sam", listingId: "abc", listingTitle: "Food trailer", views: 4817,
    fixes: [{ key: "photos", text: "Add more photos." }], unsubscribeUrl: "https://example.invalid/u",
  } as Parameters<typeof buildListingFixNudgeHtml>[0];
  it("never includes the view count", () => {
    for (const out of [listingFixSubject(data), buildListingFixNudgeHtml(data), buildListingFixNudgeText(data)]) {
      expect(out).not.toContain("4817");
      expect(out).not.toContain("4,817");
    }
  });
  it("still says buyers are visiting", () => {
    expect(buildListingFixNudgeText(data)).toContain("has been getting buyer visits on Vendibook, but no messages yet.");
  });
});
