# Facebook and Instagram checkout URL

Enter `https://vendibook.com/meta-checkout` in Meta Commerce Manager after publishing the branch containing this page.

Meta supplies `products=LISTING_UUID:QUANTITY,LISTING_UUID:QUANTITY` and may supply `coupon=CODE`. Product IDs are the `id` values in the existing `meta-catalog-feed` CSV, not Meta's internal catalog object IDs. URLSearchParams decodes the parameter once. IDs are case-insensitive UUIDs; quantities must be positive safe integers. Duplicate IDs are combined. Malformed entries are skipped without crashing the page.

Vendibook sells or rents individual assets. Every valid selection, including a single product, opens a public cart summary with quantity, unit price, line total, and an explicit USD subtotal. Prices follow the catalog feed's selection rules and are added in integer cents. Rental lines show the billing period and explain that dates determine the final total; the catalog subtotal is not a binding booking quote. Taxes, delivery, and applicable fees are calculated in the existing checkout.

The Continue button opens the existing `/checkout/:id` or `/book/:id` for one listing. For several listings, it reveals individual checkout/booking actions. The summary explains that transactions remain separate: it does not create a combined payment or change PayPal behavior. Quantities above one are displayed as requested but block checkout until the shopper explicitly selects Use quantity 1. Unavailable products retain a placeholder row and block checkout until explicitly removed; missing prices never become zero-dollar lines. All valid requested IDs are resolved in batches, preserving order.

A blank `coupon` is harmless. A nonempty coupon shows a clear not-applied notice; do not advertise coupon offers for this flow. `cart_origin=meta_shops` adds Facebook/Instagram context. `fbclid` is ignored, and none of these parameters are forwarded as payment instructions.

The landing page is public. Existing checkout and booking authentication remains in place. Lookups use the shared public eligibility filter (published status, publish timestamp, no deletion, clear moderation) and exclude test titles. Empty or malformed input shows Browse; request failures show Retry. Private or removed product titles/prices are never exposed in placeholder rows. The existing robots policy already permits `/meta-checkout`; no private checkout paths were opened to crawlers.

These presentation changes do not establish the cause of Meta's "Failed to submit URL" message or guarantee acceptance. The final Commerce Manager submission must be tested separately with the authorized Meta account.

## Publish and test

1. Publish the verified `fix/paypal-webhook-config` branch from the existing Vendibook Lovable project. Confirm that the intended branch is selected before publishing.
2. Enter the base URL above in Commerce Manager's checkout URL settings.
3. Use two currently available product IDs from the feed in Meta's Test URL tool. Verify both titles, photos, quantities, line totals, subtotal, and the Continue action leading to individual Checkout/Book destinations.
4. Test a single sale, a single rental, quantity greater than one, an unavailable product, and a coupon parameter (no discount should appear). Complete login handoff without placing an order merely to test routing.
5. Check the page from a signed-out mobile browser. Save the Commerce Manager setup only after its test passes.

Example using two IDs observed in the live feed on September 30, 2026 (availability may change):

`https://vendibook.com/meta-checkout?products=99578bd4-d236-4371-b8f6-563a5d10d7a5:1,c96a0bae-53c4-4df4-b895-b90e3d50703b:1`

Automated regression coverage: `src/test/metaCheckout.test.tsx` and `src/test/listings/publicVisibility.test.ts`.
