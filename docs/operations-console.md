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

## Rollout observations — 2026-10-23

- Workspace includes `65df452a2`, `f12140bfa`, and `e95ee796a`; local `fix/paypal-webhook-config` and its origin reference point to `65df452a2`. Lovable saves changes on an internal edit branch; no direct Git push to the requested branch was performed.
- Applied once as `drizzle/migrations/0023_operations_console.sql`. Required platform adaptations: reference `public.profiles` instead of `auth.users` for the two new audit actor fields; place grants before RLS; omit transaction wrappers managed by the migration tool; initialize the singleton setting separately. The original repository migration is untouched. Production readback confirms both new tables, RLS, service-only claims and anonymous snapshot denial.
- Deployed `admin-operations`, `send-post-publish-feedback`, `twilio-status-callback`, `get-maps-api-key`, and `handoff-ops` with shared dependencies.
- Fixed the three dashboard `replaceAll` compatibility errors with global replacements; removed two frontend non-null assertions using guards. Automatic preview build/type checks report `build OK`. Operations Vitest: 23/23 pass; isolated SQL checks pass against the actually applied migration.
- Live unsigned checks: admin endpoint 403, handoff context 401, Twilio callback 403 `invalid signature`, snapshot 401. Browser map endpoint 200 with only `apiKey`; source reads only `GOOGLE_MAPS_BROWSER_KEY`, never server/connector fallback.
- Available owner session is a host, not an admin (`is_admin=false`, recorded role `host`). Authenticated admin endpoint/snapshot return 403; the desktop/mobile UI visibly denies access without overflow or page errors. Real admin snapshot/UI and participant delivery end-to-end verification remain unverified; permissions were not changed.
- Fulfillment Realtime membership and participant/assigned-driver SELECT policies are present; account-active policy is restrictive. No anonymous participant policy. An authorized participant/driver session is still needed to exercise a real order through the UI.
- `TWILIO_AUTH_TOKEN` is missing; delivery reports remain **Needs Auth Token** with no connector-key substitution or signature bypass. Google routing credentials are present, but no standalone non-mutating landmark routing action exists in `handoff-ops`; routing requires a real consented session update, so the landmark test was not run. GA4 remains owner setup.
- Existing feedback cron job 25 remains active hourly (`0 * * * *`); not manually invoked. No SMS/email, fake orders, or customer GPS were used for validation.
- Frontend publication held: 12 persisted critical deep-scan findings dated October 2–15 predate this rollout, including paid public-service abuse, caller-chosen tracking submissions and listing script injection. Deep scan remains incomplete; the fresh basic scan passed but explicitly excludes deep code analysis. No findings were bypassed or unrelated fixes attempted. Existing URL `https://vendibook.com` is not evidence this rollout is published.
