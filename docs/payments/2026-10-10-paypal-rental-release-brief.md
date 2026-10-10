# PayPal rental checkout, deposits, and release rules

Prepared October 10, 2026. This is a revised implementation brief and source review, not confirmation that production has been migrated or certified. The latest owner direction requests PayPal live checkout and defined deposit/payout triggers; the current repository still routes rentals through Square. Resolve the provider rollout scope before enabling a replacement.

## Current flow verified in source

Listing/date selection → `BookingCheckout` Review → Details (Contact, Business, host Documents, Verification, Agreement) → booking request → host approval for request bookings → `RentalPaymentPanel` → `square-rental-payment` → provider-confirmed `finalizeCapture` → booking confirmation, receipt, agreement and handoff → scheduled completion job → payout review / deposit refund handling.

| Area | Existing implementation | Finding |
| --- | --- | --- |
| Request | `src/pages/BookingCheckout.tsx`; `20261005230000_rental_square_payments.sql` | Persistent client request key; unique shopper/key index and per-listing availability lock are present in source. Production application of migrations requires separate verification. |
| Snapshot | `20260919180000_rental_checkout_integrity.sql` | Rental fingerprint, snapshot trigger and capture lock exist. Preserve them across provider changes. |
| Approval | `src/hooks/useHostBookings.ts` | Host-scoped booking update; notification and SignNow calls initiated from client. Inspect reliability and retry coverage; legacy authorization branches also remain. |
| Checkout | `src/components/booking/RentalPaymentPanel.tsx` | Square card form and server quote. Request flow requires host approval. |
| Capture | `supabase/functions/square-rental-payment/index.ts` | Immediate capture (`autocomplete: true`), host account when connected, otherwise platform account. Shared finalizer marks payment only after provider confirmation. |
| Webhook | `supabase/functions/square-rental-webhook/index.ts` | Existing Square reconciliation entry point; retain for historical Square charges even after migration. |
| PayPal | `_shared/paypal.ts`, `paypal-create-order`, `paypal-capture-order`, `paypal-webhook` | Existing Orders API integration. Partner referral requests PPCP; connected routing uses `INSTANT`. No delayed-disbursement entitlement was verified for the live account. |
| Money | `payment_records`, `payment_ledger_entries`, `seller_payables` | Internal payable holds cannot stop money already settled directly to a connected seller. |
| Completion | `complete-ended-bookings/index.ts` | Scheduled end time currently changes approved/paid bookings to completed. This is not evidence of successful return. |
| Release gate | `_shared/payoutReleasePolicy.ts`, `_shared/rentalPayoutEligibility.ts`, `admin-payout-action` | Manual payouts require paid/completed rentals, or sale walkthrough/signature evidence, with dispute/hold checks. Direct settlement still bypasses manual review. |
| Deposit | `complete-ended-bookings/index.ts` | Existing automatic PayPal refund path after 24 hours; non-PayPal deposits require original-provider review. This does not establish an authorization-only deposit product. |
| Handoff | `handoff-ops/index.ts` | Existing pickup/delivery, media and condition records. A completed initial handoff must not be treated as a completed rental return. |

## Provider limits that determine the design

- **PayPal connected sellers:** delayed disbursement requires approved partner access and seller onboarding with `DELAY_FUNDS_DISBURSEMENT`. Funds automatically disburse after 28 days. A capture whose expected release falls outside that window cannot be advertised as held until completion. [PayPal delayed disbursement](https://developer.paypal.com/platforms/checkout/delayed-disbursement/)
- **PayPal deposit authorization:** an authorization can reserve funds for up to 29 days; the recommended capture window is the first three days. Reauthorization does not create an unlimited hold. Expiration and failed capture need explicit recovery. [PayPal authorization periods](https://developer.paypal.com/payment-methods/auth-honor/)
- **Square deposit authorization:** online card authorizations normally expire after seven days; default expiry action is cancellation. Card-on-file charging later is a new payment, not a continuous guaranteed hold. [Square delayed capture](https://developer.squareup.com/docs/payments-api/take-payments/card-payments/delayed-capture)

Both providers expose mechanisms usable in a deposit workflow. A refundable captured deposit and an uncaptured authorization are different products. Account eligibility, money recipient, refund permissions, accepted terms and timing must be verified before either is enabled for Vendibook. Neither authorization mechanism alone guarantees a hold for long or far-future rentals.

## Proposed trigger matrix

The owner has specified rental payout after successful completion and sale payout after walkthrough and signatures. The remaining timings below are proposals or existing-code behavior, not newly adopted business policy.

| Action | Required trigger and evidence | Block / recovery |
| --- | --- | --- |
| Create request | Renter explicitly submits; valid dates, host-selected requirements and consent snapshot; one idempotent request | No payment or payout; failed availability check creates no competing reservation |
| Make payment available | Authorized host approval, or existing eligible Instant Book rules | Declined, cancelled, expired or conflicting booking cannot charge |
| Collect rental payment | Renter confirms the server-priced charge; provider confirms exact amount, currency and intended recipient | Pending/ambiguous result stays pending until provider reconciliation |
| Confirm booking | Verified completed capture plus existing booking guards | Browser return, approval click or authorization alone never means paid |
| Create deposit authorization | Separate disclosed renter authorization, timed so coverage reaches return/review and fits provider limits | If it cannot cover the period, require an approved alternative; never silently charge instead |
| Collect refundable deposit | Explicitly disclosed captured-deposit model and provider-confirmed charge | Track separately from rental earnings; never describe captured money as merely authorized |
| Start rental | Paid booking, required agreements/documents and existing handoff acceptance evidence | Missing prerequisites remain an actionable checklist |
| Record successful return | Proposed: host and renter return confirmation with condition evidence, or audited admin resolution | Scheduled end time alone does not prove return; late/missing/disputed return stays held |
| Release rental host proceeds | Successful return/completion evidence, confirmed payment, positive reconciled host balance, all release holds cleared | Dispute, chargeback, refund review, provider failure or insufficient evidence blocks release |
| Release sale seller proceeds | Saved walkthrough, completed signatures and existing release-readiness gate; confirmed payment | Same dispute/refund/hold gates; sale cancellation blocks release |
| Return deposit | Successful return, no unresolved claim and approved review window elapsed | Void an uncaptured authorization; refund a captured deposit to its original provider. Existing code uses 24 hours, which must be confirmed as policy before reuse |
| Deduct damage amount | Documented claim, evidence and authorized resolution under accepted terms | No automatic full-deposit capture solely because a host reports damage; refund/void unused balance appropriately |
| Cancel / decline / expire | Existing cancellation terms and authoritative transition | Void uncaptured authorizations; refund captured amounts per accepted policy. Never create a new payout |
| Lift a hold | Authorized resolution with actor, reason and evidence | Re-evaluate every release condition; lifting one hold is not permission to skip another |
| Mark payout/refund complete | Provider-confirmed result or verified external transfer evidence | Eligibility, admin approval, API timeout or queued job never means money was sent |

The deadline for a connected PayPal release must be monitored independently of Vendibook's review deadline. An internal dispute flag cannot extend PayPal's 28-day limit. Do not enable this route for transactions whose required hold exceeds the supported window until an approved alternative is designed.

## Revised implementation prompt

Audit and repair Vendibook's rental lifecycle, then implement the approved PayPal live checkout design with explicit deposit and seller-release controls. Use the existing booking, payment, ledger, agreement, notification and dashboard architecture. Preserve historical Square payment/refund/webhook support. Do not create a second booking system.

### 1. Verify deployment and capabilities first

Inspect the actual production project, deployed functions and applied migrations. Confirm live PayPal application, merchant identity, webhook ID/signature validation, seller PPCP onboarding, card eligibility, refund permissions, platform fee support and delayed-disbursement entitlement. Report each as verified, missing or inaccessible; a public live client ID alone is insufficient. Never expose credentials in logs or browser code.

Use the existing modern PayPal Orders API integration. Present payment within Vendibook's Review → Details → Payment flow after all booking details and consent. Use supported PayPal card fields where the live account is eligible and the PayPal wallet approval flow where offered. Do not introduce legacy NVP/SOAP Express Checkout, express shortcuts that skip booking requirements, or promises that PayPal wallet approval never leaves the page. Keep unsupported payment methods hidden with clear recovery.

### 2. Resolve the money route before switching checkout

Apply the trigger matrix above. Verify provider-supported delayed release rather than merely changing a database payout status. Do not fall back silently from delayed to immediate seller disbursement. Do not silently reroute all receipts to Vendibook's account. Identify the supported approach for far-future and long rentals, and for sales exceeding PayPal's release window.

Confirm whether deposits are captured/refundable or authorized/voidable, when they are collected, and the return/claim review window. Reuse host-configured deposit amounts. Keep rental price, tax, fees, refundable deposit, host proceeds, refunds and Campus Partner credit distinct in the ledger and UI. Do not use a deposit as platform revenue or payout proceeds.

### 3. Preserve request and pricing integrity

Maintain one booking per renter request key and one provider attempt per stable idempotency key. Verify database locking for competing dates/slots, approval and capture races. Reuse immutable rental/fee/tax/fulfillment snapshots and validate them server-side before charge. Never trust browser totals or mutate old pricing when a listing changes.

Trace approval-payment expiration separately from provider authorization expiration. Reuse an established expiration rule if one exists; otherwise propose a configurable deadline for owner review. Reserve and release availability atomically. Do not rename status enums to hide missing transitions.

Use the existing Campus Partner server resolver. Rental credit remains 10% of rental subtotal, capped at $100 with two uses, Vendibook-funded after tax, without reducing host proceeds. Reserve/release redemptions safely through failed, cancelled and duplicate attempts.

### 4. Reconcile provider outcomes

Reuse the shared capture finalizer and authoritative records. Validate signature, environment, merchant, amount, currency and transaction ownership. Handle duplicate, delayed and out-of-order webhooks idempotently. A captured payment must be recoverable after a closed browser or timeout through webhook plus server reconciliation. A pending provider outcome must never invite a fresh duplicate charge.

Keep Square refunds routed to the original Square account/payment and PayPal refunds to the original PayPal capture. Reconcile partial refunds, remaining host balance, deposit balance, fees, tax treatment and credit redemption. Pending or failed refunds remain visibly pending/failed. Never set refunded merely because an API request was accepted.

### 5. Make completion and release authoritative

Reuse existing handoff/condition evidence where suitable, distinguishing delivery/pickup from return. Replace time-only successful-completion inference with verified return evidence and an audited resolution path. Expired calendars should prompt return action, not automatically release money.

Enforce release gates in server operations and database transitions, including retries/admin actions. Record provider, original payment, release amount, actor, reason, evidence, idempotency key and provider result. No duplicate payout; no client ability to mark paid, refunded, returned or released without authorized verification.

### 6. Keep every surface consistent

Renter and host dashboards must agree with booking and payment records. Distinguish awaiting approval, approved/awaiting payment, payment processing, paid/confirmed, handoff needed, active rental, return required, dispute/hold, release eligible, payout pending and payout completed without inventing new database statuses unnecessarily. Show one next action, honest payment deadlines, and the full price/deposit breakdown.

Keep messages linked to the correct booking. Preserve private pickup/access details until permitted. Documents must come only from the host's saved listing requirements, with correct deadline, optional/required labels and no unrelated uploads in the counter. Preserve unticked legal consent and exact accepted document versions. Required agreements must be enforced at the correct server-validated stage.

Use existing transactional email/notification infrastructure. Ensure each request/approval/decline/payment/cancellation/refund/release notice is retryable and deduplicated. Do not fire external test messages to real users. Include actionable admin reconciliation views and payment logs without secrets or unnecessary personal data.

### 7. Required acceptance evidence

Test in an isolated provider sandbox with representative fixtures; distinguish mocked tests from real provider evidence. Cover:

1. Request → approve → pay → confirmed, and eligible Instant Book.
2. Host decline; renter cancellation before approval; approved request expiration.
3. Decline and retry; double-click Pay; refresh; close browser after capture.
4. Duplicate/out-of-order webhook and webhook failure recovered by reconciliation.
5. Campus Partner credit below cap, at/above cap, exhausted usage, retry and cancellation.
6. Full, partial and deposit-only refunds on original PayPal and historical Square records.
7. Two renters competing for the same dates/slot; approval/capture/expiration races.
8. Mobile, pickup and delivery; private access information and correct host documents.
9. Deposit authorization expiration, failed reauthorization and capture failure.
10. Successful return versus missing return/dispute; both block/release paths.
11. Release attempted early, after cancellation/refund, twice, and with missing evidence.
12. PayPal seller missing delayed-disbursement entitlement; long/far-future rental beyond 28 days; no immediate-disbursement fallback.
13. Sale walkthrough/signature missing or complete, without changing unrelated sale checkout behavior.

Provide exact changes, focused test results, remaining blockers, applied versus unapplied migrations, deployed versus undeployed functions and live rollout/rollback steps. Commit and push each isolated fix to `fix/paypal-webhook-config`. Do not claim live payment certification without provider evidence. Any owner-run live charge must be separately coordinated with an explicit amount and account.

## Checkout repair verification from this work

- `d74ad6fc4`: host document labels, counts, deadline groups and staged-file filtering.
- `dd2cdd5b5`: one Details form at a time, scroll/focus advancement, back navigation and requirement-query retry.
- `9cef5fd97`: contact editing remains visible until successful Save; valid partial input cannot masquerade as saved contact. Document navigation no longer marks an unvisited later-due checklist complete. Merged concurrent branch changes in `3c372cfd1` without overwriting them.
- The focused checkout regression run passed 42 tests across five files. The local browser rendered the isolated Contact stage; progressing through real-user consent and payment was not performed. These results do not certify the entire lifecycle or a PayPal migration.
