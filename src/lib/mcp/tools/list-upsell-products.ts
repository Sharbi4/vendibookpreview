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
