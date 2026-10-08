# Campus Partner codes

School-specific codes (PIMA27, SCC27, ...) handed out by participating schools. No student
verification: holding the school's current code is enough. Codes rotate each academic year.

Built on the existing `promo_codes` / `promo_code_uses` tables (`program = 'campus_partner'`).
There is no second discount system: `discount_codes` is not used for Campus Partner codes.

## Benefit (Vendibook-funded)

| Checkout | Credit | Applies to | Never discounted |
| --- | --- | --- | --- |
| Rental (Square) | `rental_percent` (10%) of the eligible rental subtotal, max `rental_cap_cents` ($100) | rental price only | renter fee, delivery, tax, deposit, add-ons |
| Online purchase (PayPal buttons, card fields, Apple/Google Pay) | `purchase_credit_cents` ($250) when the price is at least `purchase_min_cents` ($5,000) | equipment price | freight, delivery, tax; cash / pay-in-person sales get nothing |

Per user, per code: 2 completed rentals (`rental_uses_per_user`), 1 purchase
(`purchase_uses_per_user`).

The credit is applied **after tax** as its own negative line ("Campus Partner credit"). The
listing price, the 12.9% host/seller commission basis and the host/seller proceeds never change;
the credit comes out of Vendibook's share (`applyPartnerCredit` refuses if the payer total could
no longer cover seller proceeds + tax + deposit). On Square host-account payments the app fee
drops by the credit; on PayPal routed orders the platform fee is gross minus seller proceeds.

## Flow

1. Buyer enters a code ("Have a school or partner code?"). `campus-partner-code` checks it for
   display only (rate-limited per user and IP): purchase credit from the buyer's own sale row
   (`sale_transaction_id`, cash excluded); rental credit from the booking quote (`booking_id`).
   The applied code is kept in sessionStorage per booking / listing for the tab.
2. `square-rental-payment` (config + pay) and `paypal-create-order` re-validate with
   `resolvePartnerCredit`, apply the credit, store `fee_breakdown.campus_partner`
   (promo_code_id, code, partner_name, kind, credit, eligible base) and call
   `reserve_partner_redemption` right after the payment record exists. The reservation is
   idempotent per payment record and serialized per code/user/kind (advisory lock), so a second
   tab or a retried payment cannot double-redeem. The amount sent to Square/PayPal is the same
   total the buyer sees.
3. Trigger `trg_sync_partner_redemption` on `payment_records` moves the use:
   reserved → completed (paid) / released (failed, declined, cancelled, expired);
   completed → partially_refunded (refund beyond the rental deposit; the use still counts) or
   refunded (full refund; eligibility restored). It writes `partner_transaction_completed` /
   `partner_transaction_refunded` analytics events.
4. Capture posts a `promo_credit` ledger entry (funded_by vendibook).

## Where the buyer sees it

Checkout summary and Review & Pay (school, code, credit), the Square pay-later panel
(credit + total due), confirmation (`/payment-success`, `/booking-confirmation`, booking detail),
receipt (`/receipt/:ref`), order detail (`/orders/:id`), sale transaction detail
(`CampusPartnerBenefit`, reading the buyer's own `promo_code_uses` row), and the emails
`order-receipt`, `booking-confirmation`, `payment-receipt` ("Vendibook Campus Partner credit -$XX · School").

## Analytics (category `campus_partner`)

Client: `partner_code_entered`, `partner_code_valid`, `partner_code_invalid`,
`partner_credit_applied`, `partner_credit_removed`, `partner_checkout_started`.
Server: `partner_transaction_completed`, `partner_transaction_refunded`.
Payloads carry promo_code_id, code, partner_name, transaction_type and amounts only.

## Admin

`/admin/campus-partners` reads `campus_partner_report(p_from, p_to)` (admin / service role only):
per-code settings, rental/purchase redemptions, unique users, GMV, credits funded, refunded
transactions, platform revenue and net platform revenue. Filters: school/code, state, type,
status, redemption dates. Activating a code asks for confirmation.

## Codes (academic year 2026-27, expire 2027-08-31 Arizona time)

Added inactive by migration 20261008200000 (existing codes untouched):
PIMA27, EMCC27, OCC27, LBCC27, FSCJ27, CSCC27, TRIC27 (ATC27 already existed).
Active today: ATC27, CSN27, GWINNETT27, HCC27, SCC27. Turn a new code on in the admin page only
after the school confirms it.

## Retired

The parallel `discount_codes` build (campus_partners table, discount_code_redemptions columns,
`campus_*` functions) was removed by migration 20261008200000.
