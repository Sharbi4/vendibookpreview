# Campus Partner codes

School-specific codes (PIMA27, SCC27, ...) handed out by participating schools. No student
verification: holding the school's current code is enough. Codes rotate each academic year.

## Benefit (Vendibook-funded)

| Checkout | Credit | Applies to | Never discounted |
| --- | --- | --- | --- |
| Rental (Square) | `rental_percent` (10%) of the rental subtotal, max `rental_cap_cents` ($100) | rental price only | delivery, tax, deposit, add-ons |
| Online purchase (PayPal buttons + card fields) | `purchase_credit_cents` ($250) when the price is at least `purchase_min_cents` ($5,000) | equipment price | freight, delivery, tax; cash / pay-in-person sales get nothing |

The credit is applied **after tax** as its own negative line ("Campus Partner credit"). The
listing price, the 12.9% host/seller commission basis and the host/seller proceeds never change;
the credit comes out of Vendibook's platform fee (capped at that fee, so it can't go negative).
On routed payments the processor's app/platform fee drops by the credit, so the host/seller nets
exactly what they would without a code.

## Data

- `campus_partners`: one row per school.
- `discount_codes` (canonical discount table) with `campaign_type = 'campus_partner'`,
  `partner_id`, `academic_year`, dates, `rental_percent`, `rental_cap_cents`,
  `purchase_credit_cents`, `purchase_min_cents`, `per_user_rental_limit` (2),
  `per_user_purchase_limit` (1). `code_normalized` (upper case, no whitespace) is unique.
- `discount_code_redemptions`: the attribution ledger, one row per checkout that applied a code
  (`reserved` → `completed` → `partially_refunded` / `refunded`, or `released`).
- `payment_records.discount_cents` holds the credit; `fee_breakdown.campus_partner` holds the
  redemption id, code, partner and credit. Ledger entry `promo_credit` is posted at capture.
- `promo_codes` / `promo_code_uses` are legacy and unused by any checkout (see tech debt below).

## Flow

1. Shopper applies a code: `campus-partner-code` (`apply` / `status` / `remove`) validates it,
   computes the credit from the trusted, taxed quote and calls `campus_reserve_redemption`
   (advisory lock per code + user + type; per-user limit counted there).
2. `square-rental-payment` and `paypal-create-order` re-validate the reservation immediately
   before charging (`campusCreditForCheckout`) and re-check it is still held once the payment
   record exists. A code that stopped qualifying returns `partner_code_changed` and nothing is
   charged.
3. Trigger `trg_campus_sync_redemption` on `payment_records` completes the redemption when the
   processor confirms the capture, and follows refunds: full refund → `refunded`
   (`eligibility_restored` when the rental/sale wasn't completed yet), partial → `partially_refunded`.
   A rental's security-deposit return is not counted as a refund of the rental.
4. Admin → Revenue & Services → Campus Partners: create/edit schools and codes, activate,
   dates, benefits, per-user limits, and aggregate results (`campus_partner_stats`, no PII).

## Analytics (`analytics_events`, category `campus_partner`)

Browser: `partner_code_entered`, `partner_code_valid`, `partner_code_invalid`,
`partner_credit_applied`, `partner_credit_removed`, `partner_checkout_started`,
`partner_transaction_completed` (rentals). Server trigger (authoritative, all flows):
`partner_transaction_completed`, `partner_transaction_refunded`. Ids, code id, partner slug,
transaction type and credit only.

## Promo-code technical debt

- `promo_codes`, `promo_code_uses`, `lookup_promo_code()` and `sale_transactions.promo_code_id /
  promo_discount` are from an earlier checkout and are not written by any current flow.
  `quoteSaleTransaction` still subtracts `promo_discount` before tax if it is ever set.
- `discount_codes.uses` / `max_uses` and the monetization `discount_code_redemptions.purchase_id`
  path have no checkout writer; the MCP `discount_code` parameter only forwards `?discount=`.
