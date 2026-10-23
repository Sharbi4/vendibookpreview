# Operations console and delivery tracking

## Entry points

- `/admin` and `/admin/operations`: authenticated administrator only. Previous admin tools remain at `/admin/legacy`.
- Transactions and buyer/seller sale cards link to `/order-tracking/:saleTransactionId`.
- The order page links to `/handoff/sale/:id` and, for sellers, `/delivery/sale/:id`. Location sharing requires existing legal acceptance and device permission.

## Live data

`admin_operations_snapshot` is an admin-checked SECURITY DEFINER RPC. Summary data is refreshed every minute while visible. It counts account creation, public current inventory, inquiries/offers/rental requests, fully paid sale payment records, opt-in requests, feedback and communication logs. Periods are 7/30/90 days, with UTC daily buckets. Supply is current inventory; demand is grouped by listing state, not inferred customer location. Email acceptance, SMS acceptance and confirmed delivery are separate. Pending feedback tokens are not responses. Receipt resends use the existing audited `admin-order-ops` workflow.

No GA4 events are invented. GA4 remains awaiting the owner's Lovable connection. A configured connector badge indicates credentials exist, not that every downstream operation is proven healthy.

Order and payment queries are scoped to the signed-in participant. Delivery sessions come from authorized `handoff-ops`, subscribe to RLS-protected Realtime, and refresh every 30 seconds when visible. A five-minute stale location or route never displays as live. Completed/cancelled sessions hide vehicle location. Driver pages must stay foregrounded; browser GPS is not a background fleet telematics service. The illustration is explicitly separate from the actual listing photo.

## Communications

- New admin support SMS validates the user, verified transactional opt-in and active suppressions immediately before dispatch. It uses an atomic request ID, three attempts per user/day and a unique dispatch key. Preview cannot send. Test mode cannot report sent.
- Twilio status callbacks require `TWILIO_AUTH_TOKEN`; `TWILIO_API_KEY` is a gateway credential and cannot verify webhook signatures. No bypass flag is accepted by the callback. Until configured, acceptance can be logged but delivery remains unconfirmed.
- Existing hourly post-publish feedback is email-only: 24-hour delay, eligible publications from the last seven days, atomic per-listing claims, at most one recipient/day, maximum three attempts with the same provider idempotency key. Legacy logs remain unconfirmed and are never resent automatically. Processing/ambiguous attempts require investigation, not blind resends. Admin can pause the workflow.

## Deployment

1. Apply `20261022200000_operations_console.sql` once through Vendibook Lovable backend `nbrehbwfsmedbelzntqs`.
2. Deploy `admin-operations`, `send-post-publish-feedback`, `twilio-status-callback`, `get-maps-api-key`, `handoff-ops` and dependencies. No customer messages or fake orders are needed for validation.
3. Browser key endpoint returns only `GOOGLE_MAPS_BROWSER_KEY`. Configure allowed website referrers and Maps JavaScript API restrictions in Google Cloud. Server routes use `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` through the existing connector gateway.
4. Build/publish the `fix/paypal-webhook-config` branch via Lovable. Do not bypass a publishing security gate.
5. Verify admin access, rejected anonymous requests, real snapshot, buyer/seller order links, location opt-in, stale/paused/closed states, real map and route response. Do not claim an end-to-end live delivery until an authorized driver test has occurred.

## Verification

- `npx vitest run --config vitest.operations.config.ts`
- `node scripts/test-operations-database.mjs` (PGlite; optional PGLITE_TEST_MODULE absolute module URL).
- Generated US state SVG paths use US Census geometry from us-atlas v3; ISC license beside `src/lib/operations/usStates.ts`.
- Local full build was blocked by missing pre-existing `@react-three/fiber` installation; the Lovable build must pass before publishing.
