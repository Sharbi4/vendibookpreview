import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListingsTool from "./tools/search-listings";
import getListingTool from "./tools/get-listing";
import listMyListingsTool from "./tools/list-my-listings";
import listMyBookingsTool from "./tools/list-my-bookings";
import checkListingBlockersTool from "./tools/check-listing-blockers";
import publishListingTool from "./tools/publish-listing";
import listUpsellProductsTool from "./tools/list-upsell-products";
import createUpgradeCheckoutTool from "./tools/create-upgrade-checkout";

// Build the OAuth issuer from the project ref (Vite inlines this at build
// time as a string literal, so the entry stays import-safe). Never derive
// from SUPABASE_URL — Cloud proxies through .lovable.cloud, and mcp-js
// rejects any token whose configured issuer doesn't match the direct
// supabase.co issuer that discovery publishes.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vendibook-mcp",
  title: "Vendibook",
  version: "0.1.0",
  instructions:
    "Tools for Vendibook — the marketplace for food trucks, trailers, shared kitchens, and vendor lots. Public tools: `search_listings`, `get_listing`. Authenticated tools: `list_my_listings`, `list_my_bookings`, `check_listing_blockers`, `publish_listing`, `list_upsell_products`, `create_upgrade_checkout`. Use `check_listing_blockers` before publishing. Use `list_upsell_products` and `create_upgrade_checkout` for Vendibook Pro, Featured Boost, and Listing Concierge upgrades.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchListingsTool,
    getListingTool,
    listMyListingsTool,
    listMyBookingsTool,
    checkListingBlockersTool,
    publishListingTool,
    listUpsellProductsTool,
    createUpgradeCheckoutTool,
  ],
});
