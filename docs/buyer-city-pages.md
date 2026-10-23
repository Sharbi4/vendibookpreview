# Buyer city sale pages

Canonical food truck URLs include `/food-trucks-for-sale/houston-tx`, `tucson-az`, `los-angeles-ca`, `miami-fl`, `atlanta-ga`, and `north-florida`. The same buyer journey also serves the existing configured city sale pages for trucks and trailers. Rental pages are unchanged.

## Inventory

Apply `supabase/migrations/20261023010000_buyer_city_inventory.sql` through the Vendibook Lovable project before publishing the frontend. If Lovable records an adapted migration under drizzle, apply it once and retain the source for review.

`buyer_city_inventory` returns only public card fields, up to ten listings. It explicitly excludes unpublished, deleted, moderated, unlisted, test/demo listings, rentals, and suspended owners, including for signed-in admin callers. It does not return owner details, exact coordinates or street addresses. Missing condition remains null.

City matches and listings within 100 straight-line miles rank first, then wider mapped options by distance. Unknown coordinates rank last within their group. Rounded miles are not road mileage or delivery estimates. North Florida includes named cities from Jacksonville to Pensacola; distances use Jacksonville and the page says so. New inventory is selected on every visit and refreshed every minute while visible, plus window focus. Ties use updated time and listing ID.

Failed requests render a retry state and remain indexable. No local matches means a useful wider inventory list, with noindex rather than pretending nationwide inventory is local. Sitemap region entries require actual matching inventory. Buyer SEO events retain consent gating and first-touch attribution; no paid conversion events are added.

## Buyer actions

- Financing uses the existing launch flag and `useFinancingHandoff`, source `buyer_city`, then the actual Equinox application. Signed-out applicants can skip lead capture. Provider source checked October 22, 2026: https://equinox-funding.com/efapplication/ — personal and business credit are among the underwriting criteria; approval is not guaranteed.
- Atlas uses the existing launch flag, starting text mode with the buy topic when enabled. When off, the button links to the Atlas information page.
- Meeting requests call existing `atlas-follow-up`, creating an admin support ticket and notifications through its established pipeline. Required name/email, optional phone, preferred times/time zone and buying plans are collected only on submission. The form confirms a saved reference and follow-up deadline, not a booked appointment. No marketing/SMS opt-in is inferred.
- `PostPurchasePreview` uses the existing illustrative order image; driver location depends on consent and connection. Payment and payout logic are unchanged.

## Verification

`node scripts/test-buyer-city-database.mjs` runs the SQL against isolated PostgreSQL (PGlite), including anonymous projection, exclusions, ten cap, distance order, new supply replacement, invalid coordinates and North Florida membership. Set `PGLITE_TEST_MODULE` to a local installed PGlite module when needed.

Run `src/test/seo/sitemapLocations.test.ts` and `src/test/seo/buyerSeoTracking.test.ts`. Check the actual page, financing handoff dialog, sales meeting form, mobile overflow, and error/retry state. Do not submit real financing or meeting requests for testing.
