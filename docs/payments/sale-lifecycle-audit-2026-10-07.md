# For-sale purchase lifecycle audit — 2026-10-07

Scope: a food truck / trailer bought on Vendibook, from checkout through PayPal capture, agreement,
walkthrough, pickup or delivery, tracking, confirmation, refunds and payout. Read-only code review by five
parallel reviewers, verified against the live database schema, then fixes. PayPal stays in sandbox; no
real-money transaction was made.

## 1. Lifecycle (after these fixes)

| Step | What happens | Where |
|---|---|---|
| Listing live | Buy Now / Make Offer shown only while no committed sale exists (`listing_sale_committed`) | `SalePurchaseCard` |
| Checkout start | `create-sale-intent` re-prices server-side (agreed offer or list price, delivery/freight via `salePricing`), refuses with `listing_sold` when another buyer's sale is committed; reuses this buyer's pending/failed sale | `create-sale-intent` |
| Cash (pay in person) | `create-cash-sale` now prices amount/delivery/freight server-side; `pending_cash` | `create-cash-sale` |
| PayPal order | `paypal-create-order` (kind `sale`): `PHYSICAL_GOODS`, listing title, seller merchant as payee + Vendibook platform fee when routed; refuses `listing_sold` / `already_paid` | `paypal-create-order` |
| Capture | `paypal-capture-order`: closed (refunded/reversed/cancelled) orders are never re-captured; before capturing, refuses if another buyer committed the listing or this sale already has a completed payment | `paypal-capture-order` |
| Finalize | `finalizeCapture`: amount/currency check, listing guard, second-buyer and duplicate-payment captures → `refund_review_*` + admin alert; marks sale `paid`; a lost "paid" update is repaired on the next webhook/return | `_shared/paypalFinalize.ts` |
| DB guard | `a02_block_second_committed_sale` serializes per listing; now also blocks a cash sale being confirmed/completed when another sale committed | migration `20261007090000` |
| Notifications | Seller: `sale-paid-seller` email + in-app. Buyer: receipt email + in-app | finalize, `send-sale-notification` (server-only now) |
| Agreement | SignNow purchase agreement generated after paid (never breaks payment); hourly sweep retries; webhook now retries failed processing and missing PDFs | `signnowDocuments`, `signnow-agreement-sweep`, `signnow-webhook` |
| Walkthrough | Daily private room + per-user token for the buyer/seller; marked completed only when both joined | `video-walkthrough-*` |
| Pickup | Seller marks ready for pickup; optional verified handoff (pickup code entered by the buyer only, code no longer readable by the buyer) | `sale-fulfillment-update`, `handoff-ops` |
| Delivery / freight | Seller (or admin): shipped → out for delivery → delivered, forward-only and per handoff method; estimated delivery date or window with change history; buyer notified once per real change, email for out-for-delivery / delay / date change / shipped / delivered | `sale-fulfillment-update`, `sale_fulfillment_updates` |
| GPS | Seller/driver browser shares location with disclosure + consent; stale location (>5 min) no longer shown as live | `handoff-ops`, `DeliveryTrackingPanel` |
| Confirmation | Buyer and seller confirm (`confirm-sale`, now idempotent) → `completed` | `confirm-sale` |
| Payout | Routed sales were paid to the seller's PayPal at capture. Non-routed payables need walkthrough + both signatures; admin payout now refuses refund-review captures and disputed/refunded/cancelled sales | `admin-payout-action` |
| Refund | `paypal-refund` (seller or admin), `admin-cancel-order`, `resolve-dispute` all go through one path: seller-routed assertion, proportional platform-fee return, ledger-based totals, full refund closes the sale, voids unsigned agreements, cancels handoffs and deliveries | `paypal-refund`, `_shared/paypalAccounting.ts` |

## 2. State map

`sale_transactions.status` (CHECK + `enforce_sale_status_transition`):
`pending → payment_authorized | paid | payment_failed | cancelled`; `payment_failed → pending | payment_authorized | paid | cancelled`;
`pending_cash → paid | buyer_confirmed | seller_confirmed | completed | disputed | cancelled`;
`paid → confirmed | buyer_confirmed | seller_confirmed | disputed | refunded | completed`;
`*_confirmed / confirmed → completed | disputed | refunded`; `disputed → refunded | completed`;
`completed → paid_out | payout_failed | disputed`; terminal: `paid_out`, `refunded`, `cancelled`.

| Event | Sale | payment_records | seller_payables | Fulfillment |
|---|---|---|---|---|
| Intent | pending | – | – | shipping_status pending |
| Order created | pending | created | – | – |
| Approved | pending | approved | – | – |
| Declined | payment_failed | declined/failed | – | – |
| Captured | paid | completed | pending_release (or payout_completed when routed) | – |
| Second buyer / duplicate capture | unchanged | completed + `refund_review_*` | blocked from payout | – |
| Shipped / out for delivery / delivered | unchanged | – | – | shipped → out_for_delivery → delivered, history row |
| ETA set / changed / delayed | unchanged | – | – | estimated_delivery_date/_end, history row |
| Both confirm | completed | – | eligible after conditions | – |
| Dispute raised | disputed | – | payout_on_hold + dispute_frozen_at | – |
| Partial refund | unchanged | partially_refunded (ledger sum) | recalculated / recovery note if routed | – |
| Full refund | refunded (via disputed if completed; cancelled if never paid) | refunded | cancelled / recovery note | documents voided, handoffs + deliveries cancelled |

Square never touches `sale_transactions`: it handles rentals (`square-rental-*`) and billing only.

## 3. Notification matrix (sale, PayPal)

| Event | Buyer | Seller | Channel |
|---|---|---|---|
| Payment completed | ✓ | ✓ | email + in-app |
| Agreement ready / signed | ✓ | ✓ | email |
| Walkthrough scheduled | ✓ | ✓ | email + in-app |
| Ready for pickup | ✓ | – | in-app |
| Shipped | ✓ | – | email + in-app |
| Out for delivery | ✓ | – | email + in-app |
| Delivery date set / changed / delayed | ✓ | – | email + in-app |
| Delivered | ✓ | – | email + in-app |
| Buyer / seller confirmed | other party | other party | in-app (cash: email) |
| Completed | ✓ | ✓ | email + in-app |
| Refund issued / completed | ✓ | ✓ | in-app (+ cancel email from admin cancel) |
| Issue reported | other party | other party | in-app |

Seller "sale completed" email is now sent once (on completion), not on shipped/delivered/confirmed/payout.

## 4. Findings and fixes

Severity: Critical (money, double sale, unauthorized), High (stuck transaction), Medium (wrong status /
missing notice), Low (polish).

| # | Sev | Problem | Fix | Files |
|---|---|---|---|---|
| 1 | Critical | PayPal refund webhook added the same refund again (partial refunds doubled, ≥50% partial became "fully refunded", seller payout zeroed) | Ledger (deduplicated by refund id) is the source of truth for `refunded_cents`; webhook skips already-recorded refunds | `paypal-webhook`, `paypal-refund`, `_shared/paypalAccounting.ts` |
| 2 | Critical | Seller-routed refunds left Vendibook's whole fee with Vendibook (seller funded 100%) | Refund sends `payment_instruction.platform_fees` proportional to the refunded amount | `paypal-refund`, `_shared/paypal.ts` |
| 3 | Critical | Dispute "refund buyer" failed for every seller-routed sale and skipped ledger/payable/audit | `resolve-dispute` refunds through `paypal-refund`; release-to-seller used invalid `on_hold` status | `resolve-dispute` |
| 4 | Critical | Any buyer/seller could make Vendibook email the seller "Payment received" for an unpaid sale (fake-payment scam vector) | `send-sale-notification` accepts only server callers or admins and refuses paid-type emails for unpaid sales | `send-sale-notification` |
| 5 | Critical | Seller-covered freight could be charged to a cash buyer; cash sale amount/freight came from the browser | Freight checkout refuses when the seller covers freight; cash sales priced server-side | `paypal-create-order`, `create-cash-sale` |
| 6 | Critical | Buyers shown the seller's freight cost / "$4.50/mile" and the seller's 12.9% fee | Buyer views show "Free shipping" and no Vendibook fee | frontend + `_shared/orders` (see section 5) |
| 7 | High | Sold listing stayed purchasable; a second buyer (or the same buyer via a second order) could be charged | Server checks in intent, order creation and pre-capture; duplicate captures go to refund review; listing page shows Sold | `create-sale-intent`, `paypal-create-order`, `paypal-capture-order`, `_shared/paypalFinalize.ts`, `SalePurchaseCard` |
| 8 | High | Full refunds left the sale `paid` (UI kept offering handoff/confirm, and "Complete payment" on a refunded order) | Full refund closes the sale, voids unsigned agreements, cancels handoffs and deliveries; failures flagged `needs_review` | `_shared/paypalAccounting.ts` |
| 9 | High | Admin cancel refused every seller-routed order and failed silently on completed sales | Routed orders allowed; completed → disputed → refunded; already-refunded orders can finish close-out; returns `needs_review` on failure | `admin-cancel-order` |
| 10 | High | Old PayPal return URL could overwrite a refunded order as cancelled | Capture endpoint returns early for closed payments | `paypal-capture-order` |
| 11 | High | Disputes didn't pause payouts; refund-review captures could be paid out | Dispute holds payable; payout blockers for review states and disputed/refunded/cancelled sales; partial refunds with balance payable | `raise-dispute`, `admin-payout-action` |
| 12 | High | A sale whose "paid" update was lost after capture stayed pending forever | Finalize repairs it on the next webhook/return | `_shared/paypalFinalize.ts` |
| 13 | High | SignNow webhook skipped retries of failed deliveries and never retried a failed PDF download (agreement stuck, payout blocked) | Duplicates skipped only after success; PDF retried until stored; failures recorded on the event; also reads `document_id` from query/content | `signnow-webhook` |
| 14 | High | Protected Sale: parties could self-mark ID verified; funds_released without a deposit; cancel after deposit lost the money trail | Identity from `is_seller_identity_verified`; release only after a paid deposit; cancel after deposit refused | `protected-sale-update`, `protected-sale-confirm-handoff` |
| 15 | High | Seller "shipped"/"delivered" sent the seller a "sale completed" email; buyers got no email | Buyer milestone emails; seller completion email once | `send-sale-notification`, `sale-fulfillment-update` |
| 16 | Medium | Fulfillment milestones unvalidated (pickup "shipped", status backwards, repeated notices); no out-for-delivery, ETA window, history or delay notice | Forward-only per method, notify on change only, `set_eta` / `report_delay`, `estimated_delivery_end`, `sale_fulfillment_updates` | `sale-fulfillment-update`, migration |
| 17 | Medium | Buyer could read the pickup code and verify a handoff alone | Column privilege revoked; only the buyer (or admin) enters the code | migration, `handoff-ops` |
| 18 | Medium | Seller could insert walkthrough video rows directly to satisfy the payout condition | Direct insert policy dropped (media registered via `handoff-ops`) | migration |
| 19 | Medium | Old unique index blocked re-issued agreements and second amendments after SignNow already created them | Dropped the non-partial indexes (one-live-document indexes remain) | migration |
| 20 | Medium | Buyers could start deliveries; deliveries could start on unpaid sales, run in parallel, or move backwards | Seller/admin only, paid sale only, one open session, closed sessions refuse actions | `handoff-ops` |
| 21 | Medium | Cash sale could be confirmed while another buyer had paid | Trigger checks moves into confirmed/completed | migration |
| 22 | Low | `confirm-sale` double submit duplicated notifications; routed sellers told "payout queued" | Conditional update; routed copy | `confirm-sale` |
| 23 | Low | Walkthrough marked completed when only one side joined | Requires both joins | `video-walkthrough-exit` |

Already correct: seller-routed lookups/capture/refund assertion, `PHYSICAL_GOODS` + listing title, payee and
fee only when routed, PayPal idempotency keys, webhook event dedupe, ledger dedupe, capture amount checks,
Daily room/token authorization, SignNow HMAC + private bucket + signed URLs, driver-link hashing, payment
tables read-only for users, sale status changes server-only.

## 5. Remaining risks

- A true simultaneous capture by two buyers still reaches finalize for the loser; it is routed to refund review
  (never two valid sales), but the loser gets the paid-path notifications before the sale flip fails.
- No scheduled sweep for orders approved at PayPal but never captured (browser closed); buyer retry, the
  webhook and admin reconcile cover it. Refund `FAILED`/`PENDING` webhook events are not handled.
- SignNow decline, reminders and expiry are not implemented; generation failures are logged, not stored as a
  status admins can see.
- No structured pickup date or pickup reminders for ordinary sales (arranged in messages).
- Three fulfillment status systems remain (sale milestones, admin tracking form, handoff sessions). Admin
  shipping edits in `useAdminTransactions` still write the table directly.
- Walkthrough has no "buyer accepted / concerns" outcome (that lives on the in-person handoff decision).
- Transactional email goes through Lovable's email queue, not Resend directly as AGENTS.md describes.
- PayPal's refund `platform_fees` behaviour should be confirmed with one sandbox refund on a routed order.
