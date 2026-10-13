# Sales tax (owner decisions 2026-10-13)

Engine: `supabase/functions/_shared/tax.ts`. Vendibook collects tax on top of the price (marketplace
facilitator); tax never reduces seller or host proceeds.

- **Rates**: each state's rate plus its population-weighted average local rate, from the Tax Foundation
  "State and Local Sales Tax Rates, Midyear 2026" (rates as of July 1, 2026). Averages, not address-exact.
  Refresh `STATE_SALES_TAX_RATES` and `TAX_RATES_AS_OF` when a new table is published (January and July).
- **What is taxed**: equipment purchases (equipment + delivery, not shipping), rentals (rental subtotal,
  not the service fee or deposit) at the listing or delivery state.
- **Digital items** (Pro subscriptions, boosts, add-ons; kind `digital`): only in `DIGITAL_TAX_RULES`
  states (Texas on 80%, Connecticut at 1%, California from Jan 1 2027). Source: Numeral, "Sales Tax and
  SaaS: State By State Breakdown" (2026). Have the accountant confirm the list and whether listing
  promotions count as taxable digital services.
- **Exemptions**: buyers upload a state exemption or resale certificate ("Tax exempt?" in checkout, or
  Payments > Tax exemption certificates). It applies to that buyer's checkouts in that state at once;
  admins review and revoke at `/admin/invoices`. Table `tax_exemptions`, private bucket
  `tax-exemption-certificates`. Charges record `tax_exemption_id`.
- **Where applied**: square-rental-payment, square-billing, paypal-create-order, tax-quote (estimates)
  and the manual invoice form (pre-filled, editable).

Applied to the live database 2026-10-13 (migration 20261013200000, rolled-back dry run first).
Tests: `src/test/payments/salesTax.test.ts`, `scripts/test-tax-exemptions.mjs`.
