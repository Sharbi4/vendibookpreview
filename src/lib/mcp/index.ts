import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListingsTool from "./tools/search-listings";
import getListingTool from "./tools/get-listing";
import listMyListingsTool from "./tools/list-my-listings";
import listMyBookingsTool from "./tools/list-my-bookings";

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
    "Tools for Vendibook — the marketplace for food trucks, trailers, shared kitchens, and vendor lots. Use `search_listings` and `get_listing` for public marketplace data. Use `list_my_listings` and `list_my_bookings` to act as the signed-in user. All per-user tools respect Vendibook's ownership and privacy rules.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchListingsTool, getListingTool, listMyListingsTool, listMyBookingsTool],
});
