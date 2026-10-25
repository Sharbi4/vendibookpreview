# BuyerMatch buyer and renter matching

Owner policy, October 24, 2026: Pro includes matching for eligible sale and rental listings. The published pricing remains $79/month or $790/year; matching does not change commissions or guarantee outcomes.

## Deployment

Apply `20261024190000_buyermatch_rentals.sql` and deploy `buyermatch-recommendations` through the Vendibook Lovable backend. The migration expands intake, activation and eligibility rechecks to rentals, and snapshots the listing mode and rental rates. It keeps existing owner, Pro entitlement, published/public listing, capacity, admin review and permission requirements. Private prospect evidence stays admin-only. Existing campaigns are not automatically activated or resumed, and no outreach is sent by this migration.

The dashboard queries both modes and labels rental rates by hour, day, week or month. Operators must verify requested dates and availability before describing a rental match. Legacy event identifiers remain unchanged so historical reports continue to work.

## Checks

- `node node_modules/vitest/vitest.mjs run --config vitest.buyermatch.config.ts` executes the real migrations in isolated PostgreSQL/WASM: rental intake and rate snapshot, owner/Pro/admin restrictions, unavailable rentals, sold sales, and anonymous access restrictions.
- UI coverage: publishing rental benefit, host campaign submission, rate labels, and preventing rental views from triggering sale appraisal advice.
- No live listing, payment or outreach fixtures are required.

Update Allison and Atlas provider knowledge through the ElevenLabs connector after deployment: buyer and renter matching is included, subject to review and capacity. Keep voice, tools, callback scheduling and all other settings intact.
