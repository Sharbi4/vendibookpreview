# Facebook and Instagram checkout URL

Enter `https://vendibook.com/meta-checkout` in Meta Commerce Manager after publishing the branch containing this page.

Meta supplies `products=LISTING_UUID:QUANTITY,LISTING_UUID:QUANTITY` and may supply `coupon=CODE`. Product IDs are the `id` values in the existing `meta-catalog-feed` CSV, not Meta's internal catalog object IDs. URLSearchParams decodes the parameter once. IDs are case-insensitive UUIDs; quantities must be positive safe integers. Duplicate IDs are combined. Malformed entries are skipped without crashing the page.

Vendibook sells or rents individual assets. One available listing at quantity one routes directly to `/checkout/:id` for sales or `/book/:id` for rentals. Multiple listings show separate checkout buttons. Quantities above one show a notice and require the shopper to explicitly continue with one asset; rental dates and duration are chosen in booking. This is not a combined multi-seller cart or bulk-quantity checkout. Coupon codes are intentionally ignored because listing checkout does not support coupons; do not advertise coupon offers for this flow.

The landing page is public. Existing checkout and booking authentication remains in place. Lookups use the shared public eligibility filter (published status, publish timestamp, no deletion, clear moderation) and exclude test titles. No results show Browse; request failures show Retry. A partially available selection identifies that some items are unavailable before checkout.

## Publish and test

1. Publish the verified `fix/paypal-webhook-config` branch from the existing Vendibook Lovable project. Confirm that the intended branch is selected before publishing.
2. Enter the base URL above in Commerce Manager's checkout URL settings.
3. Use two currently available product IDs from the feed in Meta's Test URL tool. Verify both titles, photos, prices, and their individual Checkout/Book destinations.
4. Test a single sale, a single rental, quantity greater than one, an unavailable product, and a coupon parameter (no discount should appear). Complete login handoff without placing an order merely to test routing.
5. Check the page from a signed-out mobile browser. Save the Commerce Manager setup only after its test passes.

Example using two IDs observed in the live feed on September 30, 2026 (availability may change):

`https://vendibook.com/meta-checkout?products=99578bd4-d236-4371-b8f6-563a5d10d7a5:1,c96a0bae-53c4-4df4-b895-b90e3d50703b:1`

Automated regression coverage: `src/test/metaCheckout.test.tsx` and `src/test/listings/publicVisibility.test.ts`.
