import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_upsell_products",
  title: "List Vendibook upgrade products",
  description:
    "Return the Vendibook upsell products available to the signed-in user, such as Vendibook Pro membership, Featured Boost, Listing Concierge, and buyer financing/freight options. Prices come from the live catalog.",
  inputSchema: {
    listing_id: z.string().uuid().optional().describe("Optional listing UUID to scope upgrades to."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ listing_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("monetization_products")
      .select("id, slug, name, description, billing_type, price_cents, promo_price_cents, promo_starts_at, promo_ends_at, duration_days, is_active")
      .eq("is_active", true)
      .in("slug", [
        "vendibook_pro",
        "boost-featured-30",
        "pro_listing_30",
        "listing_concierge",
      ])
      .order("display_order");

    if (error) {
      return { content: [{ type: "text", text: `Catalog lookup failed: ${error.message}` }], isError: true };
    }

    /**
     * Benefit highlights the agent may state out loud. These mirror shipped
     * product behaviour (fee math in `_shared/proFee.ts`, the monthly boost
     * credit in `pro_boost_credits`, PricePilot's `minTier: 'pro'` gate) — they
     * are never a second pricing source; prices always come from the catalog.
     */
    const HIGHLIGHTS: Record<string, string[]> = {
      vendibook_pro: [
        "Seller/host commission drops from 12.9% to 10.9% (max $500 savings per transaction)",
        "PricePilot appraisals included",
        "One Featured Boost credit each billing period (does not roll over)",
      ],
      "boost-featured-30": [
        "Pins one listing to the top of search in its city for 30 days",
        "Applies to a specific listing — requires the seller's own listing_id",
        "One-time PayPal payment on the Vendibook checkout page",
      ],
    };

    const products = (data ?? []).map((p) => {
      const now = Date.now();
      const inPromo =
        p.promo_price_cents != null &&
        (!p.promo_starts_at || new Date(p.promo_starts_at).getTime() <= now) &&
        (!p.promo_ends_at || new Date(p.promo_ends_at).getTime() > now);
      const cents = inPromo ? p.promo_price_cents : p.price_cents;
      const price = cents ? `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}` : "$0";
      const cadence = p.billing_type === "recurring" ? "/mo" : p.duration_days ? ` · ${p.duration_days} days` : "";
      return {
        slug: p.slug,
        name: p.name,
        description: p.description,
        highlights: HIGHLIGHTS[p.slug] ?? [],
        requires_listing_id: p.slug === "boost-featured-30" || p.slug === "pro_listing_30",
        price_display: `${price}${cadence}`,
        listing_id: listing_id ?? null,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(products, null, 2) }],
      structuredContent: { products, listing_id: listing_id ?? null },
    };
  },
});
