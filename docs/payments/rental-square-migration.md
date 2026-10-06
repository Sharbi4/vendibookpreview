# Rental bookings on Square

Rental checkout moves from PayPal to Square using Square's marketplace pattern. The renter pays the host's own Square account. Vendibook's share is taken as `app_fee_money`.

Equipment-sale checkout and every other PayPal flow are unchanged.

## Audit (2026-10-05, before any changes)

1. **Architecture.** Booking checkout is one React page, `src/pages/BookingCheckout.tsx` (`/book/:listingId`, or embedded at `/dashboard/bookings/new/:listingId`).
   - The page inserts `booking_requests` directly from the browser.
   - Database triggers re-price and validate every insert: `secure_booking_request_financials`, the guard triggers, the availability triggers, and `zz_rental_checkout_snapshot`.
   - Payment goes through the PayPal edge functions. The status page is `src/pages/BookingConfirmation.tsx` (`/dashboard/bookings/:id`).
2. **Steps.** Inline wizard (`SaleCheckoutWizard`) with a progress rail: Review, Use (pickup/delivery/on-site), Details (contact, business info, documents, insurance + Plaid identity), Agreement, Payment.
   - Desktop has a right-rail summary; mobile has a collapsible summary.
   - Before submit, the Renter Terms review opened as a **bottom sheet** (`FinalReviewSheet`).
   - Only the URL (dates, slot, hours) and the contact draft survived a refresh. Step, booking id and progress were lost, so a retry could create a **duplicate booking request**.
3. **Calendar.**
   - Client: `useBlockedDates` (`listing_blocked_dates` + `get_listing_busy_slots` + buffer days), `useHourlyAvailability`, and `DateSelectionModal`.
   - Server: the `check_booking_availability` triggers.
   - **No lock**: two simultaneous requests could both pass. `get_listing_busy_slots` shows only *paid* bookings, while the triggers also block unpaid pending ones.
4. **PayPal.** Capture-only order, created and captured server-side.
   - Chain: `paypal-checkout-intent`, then `paypal-create-order` (server quote, Pro fee lock, sales tax, 20-minute order reuse), then `paypal-capture-order` (`claim_rental_capture` row lock), then the shared `finalizeCapture`.
   - `paypal-webhook` is the backstop.
5. **Tables.**
   - Bookings: `booking_requests` (`booking_status` pending/approved/declined/cancelled/completed; `payment_status` unpaid/pending/paid/refunded/failed).
   - Money: `payment_records`, `payment_ledger_entries`, `seller_payables`.
   - Agreements and identity: `user_consents`, `legal_acceptances`, `transaction_terms`, `documents` (SignNow), `booking_documents`, `booking_identity_verifications`.
   - Handoff and tracking: `handoff_*`, `fulfillment_sessions`, `gps_trip_events`.
   - Tours: `video_walkthroughs`.
6. **Edge functions.** `booking-verification`, `paypal-*`, `cancel-booking`, `paypal-refund`, `send-booking-notification`, `signnow-ensure-rental-agreement`, `complete-ended-bookings`, `handoff-ops`, `tax-quote`.
   - The legacy hold functions (`capture-booking-payment`, `release-booking-hold`, `expire-booking-holds`) are unreachable.
7. **Statuses.** Request-to-book stays `pending` until the host approves; the renter pays after approval.
   - Instant Book is approved on payment only when the host's identity is verified.
   - `payment_records` uses the `paypal_payment_status` enum.
8. **Legal and consent.** All of these are preserved unchanged:
   - Agreement step with Rental Transaction Terms and Privacy/e-consent, both unticked by default and recorded via `record_user_consent`.
   - Renter Terms review.
   - Rental disclosure attestation and Plaid identity check (`booking-verification`).
   - Pre-booking documents.
   - Server gate `assertRentalCheckoutReady`.
   - Terms-of-service and payments-terms acceptance enforced server-side.
   - SignNow rental agreement after approval.
   - GPS/location-tracking consent and condition video at handoff.
   - Pre-booking video walkthroughs.
9. **After payment.** `finalizeCapture` handles, in order:
   - Ledger entries and the seller payable.
   - Booking marked `paid` (and `approved` for verified Instant Book).
   - `send-booking-notification` (paid).
   - The buyer receipt.
   - The SignNow agreement.

   The renter then lands on `/dashboard/bookings/:id` or `/receipt/:reference`.
10. **What changes.** Rentals pay by card on the host's Square account. Additions:
    - Server functions `square-rental-payment`, `square-rental-webhook` and `square-seller-oauth`.
    - Host "Connect Square" on payment setup.
    - Inline review instead of the bottom sheet.
    - Persistent checkout progress and one booking per checkout (`client_request_key`).
    - A per-listing availability lock.
    - A central fee config.
    - Rental funnel analytics.
11. **What's preserved.** The booking model, calendar, statuses, every legal and compliance step, sale checkout, and PayPal everywhere else. PayPal also remains the rental fallback until Square is switched on.
12. **Risks found.**
    - **Production database is behind the repo.** `20260919180000_rental_checkout_integrity.sql` was never applied (no `renter_snapshot`, `payment_lock_record_id`, `rental_checkout_fingerprint` or `claim_rental_capture`). The current checkout code can't insert rental bookings against production until it runs. The last booking is from February 2026.
    - The `payment_provider` enum had no `square` value, although Square billing writes it.
    - No Square seller OAuth or seller data existed. Square was platform-billing only, with one token. The pasted production Square token rotation is still open on the roadmap.
    - Square charges its processing fee to the host's account, not Vendibook's. That is a cost shift versus PayPal and needs to be stated in host terms.
    - Square caps `app_fee_money` at 90% of the payment; the code refuses larger app fees.
    - Bugs fixed here:
      - A paid booking could never be cancelled: the lock was kept forever and the trigger rejected the change.
      - `useHostBookings` hid unpaid request-to-book bookings from hosts.
      - `paypal-create-order` locked renter fee + host fee as the "host fee" on retries.
      - The request button said "Continue to payment".
      - Completed rentals were counted as abandoned.
      - Deposit copy on the booking page contradicted checkout.
    - Bugs found and still open:
      - `complete-ended-bookings` uses a 10% fee, references an undefined `transfer.id`, and filters on `booking_end_timestamp`, which is never set for new bookings.
      - `release-booking-hold` and `expire-booking-holds` write `payment_status='released'`, which the CHECK constraint rejects.
      - Refunds through `paypal-refund` never update the booking.
      - `cancel-booking` sends a `cancelled` event that `send-booking-notification` ignores.
      - Per-mile delivery is charged as a flat fee.
      - The FAQ promises a rental extension feature that doesn't exist.

## Money model

| | Who gets it |
|---|---|
| Rental subtotal minus host commission (12.9%, 10.9% Pro) | Host's Square account |
| Renter service fee + host commission | Vendibook (app fee) |
| Sales tax (marketplace facilitator) | Vendibook (app fee), held for remittance |
| Refundable security deposit | Vendibook (app fee), refunded from the app fee |

The split is `splitRentalCharge` (`_shared/squareRentalMath.ts`). Rates live only in `_shared/feeConfig.ts`; the SQL trigger mirror is guarded by `src/lib/fees/feeConfig.test.ts`.

Refunds go out from the host's account. The app fee is refunded in proportion, and a deposit-only refund comes entirely from the app fee (`refundAppFeeShare`).

## Payment flow

1. The checkout creates the booking (keyed by `client_request_key`) after the agreements and the inline Renter Terms review.
2. `square-rental-payment` `config` returns the processor for this booking:
   - `square` when `RENTAL_SQUARE_ENABLED` is on and the host is connected;
   - otherwise `paypal` while `RENTAL_PAYPAL_FALLBACK` is not `false`;
   - otherwise `unavailable`.
3. Square's Web Payments SDK tokenizes the card in Square iframes (with buyer verification).
4. `pay` rechecks, server-side:
   - legal acceptance and `assertRentalCheckoutReady`;
   - approval or verified Instant Book;
   - the listing state and `check_booking_availability`;
   - the fingerprint.

   It then locks the host fee and tax, inserts one `payment_records` row per attempt, runs `claim_rental_capture`, and calls `POST /v2/payments` with:
   - `app_fee_money`;
   - an idempotency key derived from the record and the attempt;
   - `reference_id`;
   - `autocomplete: true`.
5. The booking becomes `paid` only through `finalizeCapture`, after Square returns `COMPLETED` for the exact quoted amount, location and app fee.
   - Ambiguous errors keep the lock and are settled by the webhook or by `status` (which asks Square).
   - Declines release the lock and show plain-language copy.
6. `square-rental-webhook` handles `payment.updated`, `refund.*` and `oauth.authorization.revoked`: signature verified, deduped by `square_webhook_events`, objects re-fetched from Square.

## Setup (sandbox first)

1. Square Developer Dashboard (sandbox application):
   - Set the OAuth redirect URL to `https://vendibook.com/dashboard/payments/square/callback`. Add a preview URL too if you test there.
   - Add a webhook subscription to `<SUPABASE_URL>/functions/v1/square-rental-webhook` for `payment.updated`, `refund.created`, `refund.updated` and `oauth.authorization.revoked`.
2. Supabase secrets (never in code or the browser):
   - `RENTAL_SQUARE_ENVIRONMENT=sandbox`, `RENTAL_SQUARE_APPLICATION_ID`, `RENTAL_SQUARE_APPLICATION_SECRET` (sandbox app). Vendibook billing already runs on the production app through `SQUARE_ENVIRONMENT`/`SQUARE_APPLICATION_ID`; the `RENTAL_*` values keep rentals separate. To go live, set `RENTAL_SQUARE_ENVIRONMENT=production` with the production app's id and secret.
   - `SQUARE_OAUTH_REDIRECT_URL`, `SQUARE_TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`)
   - `SQUARE_RENTAL_WEBHOOK_SIGNATURE_KEY`, `SQUARE_RENTAL_WEBHOOK_URL` (exactly the subscribed URL)
   - `RENTAL_SQUARE_ENABLED=true`
   - Optional: `RENTAL_PAYPAL_FALLBACK=false` once every renting host is connected.

   `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` stay Vendibook's own billing credentials; rentals use each host's OAuth token.
3. Apply migrations in order: `20260919180000_rental_checkout_integrity.sql`, then `20261005230000_rental_square_payments.sql`. Both were dry-run against production inside a rolled-back transaction on 2026-10-05.
4. Deploy the edge functions `square-rental-payment`, `square-rental-webhook`, `square-seller-oauth`, `cancel-booking`, `square-webhook`, `paypal-create-order` and `tax-quote`, then publish the site.
5. Sandbox test:
   1. Connect a sandbox seller from Dashboard, then Payments, then Setup.
   2. Book an Instant Book listing with card `4111 1111 1111 1111`.
   3. Check that the booking is `paid`/`approved`, the receipt shows the Square payment id, and the payable shows `payout_completed` via Square.
   4. Repeat with decline card `4000 0000 0000 0002`.
   5. Cancel as the host and check the refund and booking status.

## Analytics

Rental milestones are recorded in `analytics_events` with category `rental_checkout`, via `src/lib/rentalCheckoutAnalytics.ts`:

- `booking_started`, `dates_selected`, `delivery_selected`
- `booking_details_completed`, `agreements_completed`, `review_reached`
- `payment_started`, `payment_completed`, `booking_completed`
- `booking_abandoned`, `square_payment_failed`

They sit alongside the existing `checkout_step_view` and `checkout_abandoned` events. Payloads carry ids, step, flow, provider and error codes only.

## Extension-ready

A rental extension can be built as a new `booking_requests` row linked to the original, or as a second Square payment against the same host account. Either way it goes through `square-rental-payment` `pay`, which already takes any approved booking id. No extension feature ships yet.
