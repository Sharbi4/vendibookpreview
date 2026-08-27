import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const VALID_UPGRADE_SLUGS = new Set([
  "vendibook_pro",
  "boost-featured-30",
  "pro_listing_30",
  "listing_concierge",
]);

export default defineTool({
  name: "create_upgrade_checkout",
  title: "Create an upgrade checkout link",
  description:
    "Return a Vendibook checkout URL for an upgrade product (Vendibook Pro, Featured Boost, Listing Concierge). The user completes payment on the secure PayPal checkout page. Does not charge the payment method directly.",
  inputSchema: {
    product_slug: z
      .enum(["vendibook_pro", "boost-featured-30", "pro_listing_30", "listing_concierge"])
      .describe("The upgrade product to purchase."),
    listing_id: z.string().uuid().optional().describe("Optional listing UUID to attach the upgrade to (required for featured boost)."),
    discount_code: z.string().optional().describe("Optional promo/discount code."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ product_slug, listing_id, discount_code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    if (!VALID_UPGRADE_SLUGS.has(product_slug)) {
      return { content: [{ type: "text", text: "Unknown upgrade product." }], isError: true };
    }

    // Listing-scoped products must name a listing the caller actually owns, so
    // a boost can never be attached to someone else's listing.
    const LISTING_SCOPED = new Set(["boost-featured-30", "pro_listing_30"]);
    if (LISTING_SCOPED.has(product_slug)) {
      if (!listing_id) {
        return {
          content: [{ type: "text", text: "That upgrade applies to a specific listing — provide the listing_id first." }],
          isError: true,
        };
      }
      const { data: owned, error: ownErr } = await supabase
        .from("listings")
        .select("id")
        .eq("id", listing_id)
        .maybeSingle();
      if (ownErr) {
        return { content: [{ type: "text", text: `Listing lookup failed: ${ownErr.message}` }], isError: true };
      }
      if (!owned) {
        return { content: [{ type: "text", text: "That listing was not found on this account." }], isError: true };
      }
    }

    const { data: product, error } = await supabase
      .from("monetization_products")
      .select("billing_type, is_active")
      .eq("slug", product_slug)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Catalog lookup failed: ${error.message}` }], isError: true };
    }
    if (!product?.is_active) {
      return { content: [{ type: "text", text: "That upgrade is not currently available." }], isError: true };
    }

    // For recurring products (Pro) we start a PayPal subscription directly.
    if (product.billing_type === "recurring") {
      const { data, error: fnError } = await supabase.functions.invoke("paypal-subscription-create", {
        body: {
          product_slug: product_slug,
          billing_interval: /annual|yearly/i.test(product_slug) ? "annual" : "monthly",
          return_path: listing_id ? `/listing/${listing_id}` : "/account",
          cancel_path: listing_id ? `/listing/${listing_id}` : "/pricing",
        },
      });
      if (fnError) {
        return { content: [{ type: "text", text: `Checkout failed: ${fnError.message}` }], isError: true };
      }
      const payload = data as { approve_url?: string; url?: string; message?: string; error?: string };
      const url = payload?.approve_url ?? payload?.url;
      if (!url) {
        return { content: [{ type: "text", text: payload?.message ?? payload?.error ?? "We could not start that checkout." }], isError: true };
      }
      return {
        content: [{ type: "text", text: `Complete payment here: ${url}` }],
        structuredContent: { product_slug, listing_id: listing_id ?? null, checkout_url: url },
      };
    }

    // One-time products route through the in-app hosted checkout.
    const params = new URLSearchParams();
    if (listing_id) params.set("listing_id", listing_id);
    params.set("success", listing_id ? `/listing/${listing_id}` : "/account");
    params.set("cancel", listing_id ? `/listing/${listing_id}` : "/pricing");
    if (discount_code) params.set("discount", discount_code);
    const qs = params.toString();
    const url = `/checkout/product/${product_slug}${qs ? `?${qs}` : ""}`;

    return {
      content: [{ type: "text", text: `Complete payment on the secure checkout page: ${url}` }],
      structuredContent: { product_slug, listing_id: listing_id ?? null, checkout_url: url },
    };
  },
});
