# Rental checkout, seller connection, and marketplace pages

Branch: `fix/paypal-webhook-config`. PayPal environment selection remains unchanged (sandbox). Marketplace checkout remains CAPTURE with the buyer's final review before server capture. Square billing and sale-checkout behavior are not redesigned.

## Implemented fixes

- Persist actual Instant Book eligibility, including identity verification and the `flow=request` override. The same decision drives payment rendering and analytics.
- Submit non-instant requests without rendering PayPal. Waiting-for-host status is a real booking detail route. Approved unpaid requests expose Pay now using the canonical embedded booking target.
- Recheck contact, business information, required documents, current disclosure/verification, fulfillment, delivery address, slot, dates, self-booking, and legal acceptance at submission. Contact/disclosure edits invalidate the final step.
- Snapshot renter contact and personal address separately from delivery address. Rental receipts and SignNow documents use that snapshot for new transactions.
- Keep pending captures on a stable, unpaid status receipt; refresh reconciles existing provider captures without making a new charge. Failed/cancelled attempts return to the booking payment step. Preserve authentication return URLs.
- Fingerprint dates, hours, space, fulfillment, delivery/contact/business information, and totals. A database capture claim rejects stale orders and competing payment records before contacting PayPal. Unchanged retries retain provider idempotency.
- Reject malformed dates/slots, retain the selected space in the URL, avoid mutating hour arrays, filter hourly selections to current dates, and derive authoritative hourly totals from unique selected slots.
- Protect completed payments from delayed pending events; retain capture locks on uncertain responses. Only verified completion starts paid fulfillment. Rental notification uniqueness covers retries/races; agreement creation retains its idempotent helper.
- Remove the unused warm-up intent argument. The hook describes the existing CAPTURE contract.
- Read PayPal permissions from `oauth_integrations[].oauth_third_party[].scopes`, matching the configured onboarding client. Separate wallet readiness from optional card/vault vetting. Explicit inactive consent and wallet restrictions remain blocking.
- Share account-keyed seller status across dashboard components, refresh on login and return from a PayPal tab, poll unfinished setup, invalidate payment readiness after refresh, and show each checklist fact independently.
- Distinguish partner authorization/business-account configuration errors from normal unfinished seller onboarding. Preserve the latest Lovable partner-ID work and error-body parsing.

## Dashboard and page changes

- Transactions includes purchases, sales, rentals, and other recorded payments; transaction entities are combined with their payment record rather than repeated per attempt. Existing Activity remains available for walkthroughs and listing activity.
- Transaction detail links to documents, the original conversation, handoff/tracking, payment status, and issue reporting. Support cases have dedicated participant-scoped routes and a timeline.
- Vendibook case state and recorded PayPal dispute state are separate. PayPal Resolution Center is independent of opening a Vendibook case and preserves sandbox selection. It does not automatically file a provider dispute.
- Evidence collection now includes rentals, correct walkthrough fields, documents, conversations, handoff media, fulfillment and GPS record links, legal acceptances, and payment/refund facts. Signed assets retain their existing access controls.
- How It Works now explains seller approval, buyer final payment review, pickup/seller delivery/freight, tracking when active, condition walkthroughs, signatures, and completion.
- Why Sell on Vendibook has a new premium warm-white/dark layout, orange CTA buttons, seller-focused copy, a connected four-stage selling process, FAQs, and listing/browsing conversion paths. Hero/scroll motion and reduced-motion handling are retained.

## Migration and rollout

Apply `supabase/migrations/20260919180000_rental_checkout_integrity.sql` with the related edge-function deployment. It adds `renter_snapshot`, `payment_lock_record_id`, the rental fingerprint/pricing/capture guards, and a unique booking notification key. It replaces duplicate generic booking notifications while retaining cancellation notifications.

Deploy changed edge functions: `paypal-create-order`, `paypal-checkout-intent`, `paypal-capture-order`, `paypal-finalize-order`, `paypal-order-review`, `paypal-seller-onboarding`, `send-booking-notification`, and `dispute-case-ops`. Rebuild shared-helper consumers including `paypal-webhook`, `order-payment-recovery`, `admin-order-ops`, `signnow-ensure-rental-agreement`, `signnow-ensure-document`, `signnow-agreement-sweep`, and the other SignNow helper consumers. Do not change provider environment or Square configuration.

GitHub source synchronization alone is not evidence that a database migration or edge function is deployed. Backend deployment has not been executed from this workspace. Avoid an interval where the new frontend and old backend are mixed. Existing provider orders created before fingerprinting should be reconciled before rollout; they are not silently trusted by the new capture guard. Pre-migration bookings lack a historical renter snapshot; do not fabricate historical contact data. Use a new reviewed request for unpaid sandbox fixtures lacking that snapshot.

## Validation

- Focused Vitest suites: 77 tests passed across 8 files (rental validation, booking/receipt UI, payment strategy, PayPal hardening, required documents, transaction support, seller status parsing, and login/tab-return refresh).
- PGlite migration regressions: 9 tests passed, including approval gating, unverified instant fallback, stale-order rejection, competing capture claims, immutable contact/quote fields, duplicate notifications, self-booking, and hourly quote tampering.
- Application TypeScript and production Vite/PWA builds were run; final results are reported with the delivery. The production build uses the repository's actual Vite configuration and plugins. Sitemap/feed regeneration is unrelated and was not included in local validation.
- Local browser attachment failed, so visual/browser smoke testing is not claimed. Authenticated PayPal/SignNow end-to-end tests are still needed.

Run frontend suites with `npx vitest run src/test/rentalCheckoutValidation.test.ts src/test/bookingRequestPayment.test.tsx src/test/payments/paymentStrategy.test.ts src/test/payments/paypalHardening.test.ts src/test/documents/rentalRequirements.test.ts src/test/transactionSupport.test.tsx src/test/payments/paypalSellerStatus.test.ts src/test/payments/paypalConnectionRefresh.test.tsx`.

Run database fixtures with `node --test scripts/tests/rental-checkout-db.test.mjs` in a validation environment providing `@electric-sql/pglite`, or point `PGLITE_MODULE` to its ESM module. This applies the actual migration to an isolated fixture, not the connected database.

## External checks still required

On September 20, sandbox logs showed `AUTHORIZATION_ERROR` (401) and `USER_BUSINESS_ERROR` (404, partner not Business/account closed) with partner ID `48R2DERT59KTA`. PayPal's identity response reported app-owner merchant `JQ9RNCNVTREA8`. The latest Lovable branch recorded a partner-ID correction to that account; no successful post-correction seller-status response was observed during investigation. Example debug IDs: `f406980bc1107`, `f4069807cff43`.

After deployment, verify the enabled sandbox Business partner account, matching app credentials, Partner Referrals access, and callback/webhook configuration. Do not substitute a client ID for a merchant ID. Do not paste secrets into chats or source files.

Complete sandbox walkthroughs for true instant booking, unverified-host fallback, explicit request override, normal request approval then Pay now, contact/document/disclosure invalidation, delivery/space/hour edits, decline/cancel/relogin recovery, pending-to-completed capture, duplicate clicks/webhooks, and self-booking rejection. Confirm SignNow template IDs, sandbox tokens, signer mappings, callback verification, and idempotent agreement creation at the approved stage. Confirm seller signup/return/login refresh now displays actual scopes and each readiness fact.
## Changed implementation files

```text
scripts/tests/rental-checkout-db.test.mjs
src/App.tsx
src/components/account/SellerPayPalConnect.tsx
src/components/booking/ContactInfoWizard.tsx
src/components/booking/DisclosureStep.tsx
src/components/booking/RentalVerificationPanel.tsx
src/components/checkout/PayPalPaymentPanel.tsx
src/components/checkout/PayPalReviewAuthorize.tsx
src/components/disputes/OrderCaseSection.tsx
src/components/disputes/PayPalResolutionLink.tsx
src/components/transaction/checkout/PayPalEmbeddedPayment.tsx
src/components/workspace/WorkspaceShell.tsx
src/hooks/useMyPayPalConnection.ts
src/hooks/useUserTransactions.ts
src/hooks/useWarmPayPalCheckout.ts
src/integrations/supabase/types.ts
src/lib/hourlySelections.ts
src/lib/rentalCheckoutValidation.ts
src/lib/transactionTerms.ts
src/pages/BookingCheckout.tsx
src/pages/BookingConfirmation.tsx
src/pages/HowItWorks.tsx
src/pages/OrderDetail.tsx
src/pages/OrderReceipt.tsx
src/pages/PaymentCancelled.tsx
src/pages/PaymentReturn.tsx
src/pages/PaymentSuccess.tsx
src/pages/SaleCheckout.tsx
src/pages/seo/WhyListOnVendibook.tsx
src/pages/workspace/WorkspaceActivity.tsx
src/pages/workspace/WorkspaceCases.tsx
src/pages/workspace/WorkspaceTransactions.tsx
src/test/bookingRequestPayment.test.tsx
src/test/payments/paypalConnectionRefresh.test.tsx
src/test/payments/paypalSellerStatus.test.ts
src/test/rentalCheckoutValidation.test.ts
src/test/transactionSupport.test.tsx
supabase/functions/_shared/disputeCaseCore.ts
supabase/functions/_shared/notify.ts
supabase/functions/_shared/orders/deliverOrderReceipt.ts
supabase/functions/_shared/paypal.ts
supabase/functions/_shared/paypalFinalize.ts
supabase/functions/_shared/paypalSellerStatus.ts
supabase/functions/_shared/rentalCheckoutReady.ts
supabase/functions/_shared/signnowDocuments.ts
supabase/functions/dispute-case-ops/index.ts
supabase/functions/paypal-capture-order/index.ts
supabase/functions/paypal-checkout-intent/index.ts
supabase/functions/paypal-create-order/index.ts
supabase/functions/paypal-finalize-order/index.ts
supabase/functions/paypal-order-review/index.ts
supabase/functions/paypal-seller-onboarding/index.ts
supabase/functions/send-booking-notification/index.ts
supabase/migrations/20260919180000_rental_checkout_integrity.sql
```
