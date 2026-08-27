import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { getStageRequirements } from "@/lib/listings/stages";
import type { ListingCategory } from "@/types/listing";

const BLOCKED_STATUSES = new Set([
  "removed",
  "deleted",
  "rejected",
  "suspended",
  "sold",
  "rented",
]);

export default defineTool({
  name: "publish_listing",
  title: "Publish a Vendibook listing",
  description:
    "Publish a Vendibook listing owned by the signed-in user. Requires all blockers to be cleared and a legal acknowledgment. The caller must have already recorded the typed YES consent in the app; this tool verifies it was recorded before publishing.",
  inputSchema: {
    listing_id: z.string().uuid().describe("The listing UUID to publish."),
    consent_acknowledged: z
      .boolean()
      .describe("Must be true. The tool verifies the seller's typed YES consent is recorded server-side.")
      .default(false),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ listing_id, consent_acknowledged }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    if (!consent_acknowledged) {
      return {
        content: [{ type: "text", text: "You must acknowledge the seller disclosure and type YES on screen before publishing." }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();

    const { data: current, error: readError } = await supabase
      .from("listings")
      .select(
        "id, host_id, status, published_at, deleted_at, moderation_status, title, description, category, mode, city, state, price_sale, price_monthly, price_weekly, price_daily, price_hourly, image_urls, condition, operational_status, title_status, has_lien, no_known_problems, known_problems, included_items, length_inches, height_inches, photos_exclusions_answered, seller_disclosure_acknowledged"
      )
      .eq("id", listing_id)
      .maybeSingle();

    if (readError) {
      return { content: [{ type: "text", text: `Read failed: ${readError.message}` }], isError: true };
    }
    if (!current) {
      return { content: [{ type: "text", text: "Listing not found." }], isError: true };
    }

    const listing = current as Record<string, unknown>;
    if (listing.host_id !== uid) {
      return { content: [{ type: "text", text: "You do not own this listing." }], isError: true };
    }

    const moderation = listing.moderation_status as string | null;
    if (
      listing.deleted_at ||
      BLOCKED_STATUSES.has(String(listing.status)) ||
      (moderation && moderation !== "clear")
    ) {
      return {
        content: [{ type: "text", text: "This listing cannot be published right now. It may be under review, sold, rented, or removed." }],
        isError: true,
      };
    }

    if (listing.status === "published" && listing.published_at) {
      return {
        content: [{ type: "text", text: "This listing is already published." }],
        structuredContent: { listing_id, public_url: `/listing/${listing_id}`, already_published: true },
      };
    }

    // Verify seller disclosure consent is recorded.
    if (!listing.seller_disclosure_acknowledged) {
      return {
        content: [
          {
            type: "text",
            text: "The seller disclosure has not been acknowledged. The seller must read the disclosure and type YES on screen before publishing.",
          },
        ],
        isError: true,
      };
    }

    // Re-run blocker checks before publishing.
    const blockers: string[] = [];
    if (!listing.title) blockers.push("Add a headline/title.");
    if (!listing.description) blockers.push("Add a description.");
    if (!listing.category) blockers.push("Select a category.");
    if (!listing.mode) blockers.push("Select sale or rent.");
    if (!listing.city || !listing.state) blockers.push("Set city and state.");

    const images = Array.isArray(listing.image_urls) ? (listing.image_urls as string[]) : [];
    if (!images.length) blockers.push("Upload at least one photo.");

    const mode = listing.mode as "rent" | "sale" | undefined;
    if (mode === "sale") {
      if (Number(listing.price_sale) <= 0) blockers.push("Set the sale price.");
    } else if (mode === "rent") {
      const hasRate =
        Number(listing.price_monthly) > 0 ||
        Number(listing.price_weekly) > 0 ||
        Number(listing.price_daily) > 0 ||
        Number(listing.price_hourly) > 0;
      if (!hasRate) blockers.push("Set at least one rental rate.");
    } else {
      blockers.push("Set sale or rent.");
    }

    if (mode && listing.category) {
      try {
        const stageReqs = getStageRequirements({
          mode,
          category: listing.category as ListingCategory,
          condition: (listing.condition as string | null) ?? null,
          operationalStatus: (listing.operational_status as string | null) ?? null,
          titleStatus: (listing.title_status as string | null) ?? null,
          hasLien: (listing.has_lien as string | null) ?? null,
          noKnownProblems: Boolean(listing.no_known_problems),
          knownProblems: Array.isArray(listing.known_problems) ? listing.known_problems : [],
          includedItems: (listing.included_items as string | null) ?? null,
          photosExclusionsAnswered: Boolean(listing.photos_exclusions_answered),
          lengthInches: (listing.length_inches as number | null) ?? null,
          heightInches: (listing.height_inches as number | null) ?? null,
        });
        for (const req of stageReqs) blockers.push(req.label);
      } catch {
        // ignore
      }
    }

    if (blockers.length) {
      return {
        content: [{ type: "text", text: `Cannot publish yet. ${blockers.join("; ")}` }],
        structuredContent: { listing_id, blockers },
        isError: true,
      };
    }

    // Idempotent publish.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("listings")
      .update({ status: "published", published_at: nowIso } as never)
      .eq("id", listing_id)
      .is("published_at", null)
      .select("published_at");

    if (claimError) {
      return { content: [{ type: "text", text: `Publish failed: ${claimError.message}` }], isError: true };
    }

    if (!claimed || claimed.length === 0) {
      const { data: rows, error: updateError } = await supabase
        .from("listings")
        .update({ status: "published" } as never)
        .eq("id", listing_id)
        .select("published_at");
      if (updateError) {
        return { content: [{ type: "text", text: `Publish failed: ${updateError.message}` }], isError: true };
      }
      if (!rows || rows.length === 0) {
        return {
          content: [{ type: "text", text: "Publishing did not complete. Your draft is safe — please try again." }],
          isError: true,
        };
      }
    }

    // Authoritative verification.
    const { data: verified, error: verifyError } = await supabase
      .from("listings")
      .select("status, published_at")
      .eq("id", listing_id)
      .maybeSingle();

    if (verifyError || !verified || verified.status !== "published" || !verified.published_at) {
      return {
        content: [{ type: "text", text: "Publishing did not complete. Your listing is still a draft — please try again." }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Published! Your listing is live at /listing/${listing_id}.`,
        },
      ],
      structuredContent: {
        listing_id,
        public_url: `/listing/${listing_id}`,
        published_at: verified.published_at,
      },
    };
  },
});
