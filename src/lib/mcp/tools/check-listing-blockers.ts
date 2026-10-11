import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { getStageRequirements } from "../../listings/stages";
import type { ListingCategory } from "../../../types/listing";

export default defineTool({
  name: "check_listing_blockers",
  title: "Check listing publish blockers",
  description:
    "Return the remaining blockers that prevent a Vendibook listing from being published. The caller must own the listing.",
  inputSchema: {
    listing_id: z.string().uuid().describe("The listing UUID to inspect."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ listing_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();

    const { data: row, error } = await supabase
      .from("listings")
      .select(
        "id, host_id, status, title, description, category, mode, city, state, price_sale, price_monthly, price_weekly, price_daily, price_hourly, image_urls, condition, operational_status, title_status, has_lien, no_known_problems, known_problems, included_items, length_inches, height_inches, photos_exclusions_answered, published_at, deleted_at, moderation_status"
      )
      .eq("id", listing_id)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Lookup failed: ${error.message}` }], isError: true };
    }
    if (!row) {
      return { content: [{ type: "text", text: "Listing not found." }], isError: true };
    }

    const listing = row as Record<string, unknown>;
    if (listing.host_id !== uid) {
      return { content: [{ type: "text", text: "You do not own this listing." }], isError: true };
    }

    if (listing.deleted_at) {
      return { content: [{ type: "text", text: "This listing has been deleted." }], isError: true };
    }

    const blockers: string[] = [];

    if (!listing.title) blockers.push("Add a headline/title.");
    if (!listing.description) blockers.push("Add a description.");
    if (!listing.category) blockers.push("Select a category (food truck, trailer, etc.).");
    if (!listing.mode) blockers.push("Select whether this is for sale or rent.");
    if (!listing.city || !listing.state) blockers.push("Set the city and state location.");

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
      if (!hasRate) blockers.push("Set at least one rental rate (monthly, weekly, daily, or hourly).");
    } else {
      blockers.push("Set whether the listing is for sale or rent so pricing can be checked.");
    }

    // Stage requirements (content-only gates)
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
        for (const req of stageReqs) {
          blockers.push(req.label);
        }
      } catch {
        // Ignore stage-check failures so the core blockers still return.
      }
    }

    const isPublished = listing.status === "published" && listing.published_at;
    const moderation = listing.moderation_status as string | null;
    if (moderation && moderation !== "clear") {
      blockers.push("This listing is under review by our team and cannot be published right now.");
    }

    return {
      content: [
        {
          type: "text",
          text:
            blockers.length === 0
              ? isPublished
                ? "This listing is already published and live."
                : "No blockers — the listing is ready to publish."
              : `Blockers (${blockers.length}): ${blockers.join("; ")}`,
        },
      ],
      structuredContent: {
        listing_id,
        ready: blockers.length === 0 && !isPublished,
        already_published: Boolean(isPublished),
        blockers,
      },
    };
  },
});
