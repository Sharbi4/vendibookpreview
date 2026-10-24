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


## 2026-10-24 billing audit and safeguards

The owner-supplied table matches Tax Foundation January 1, 2026, not the newer July 1 table already used in code. Neither is address-exact. The table alone does not establish product taxability.

Read-only audit found a completed $49 Featured Boost on October 19 with zero tax and a current Illinois profile, plus an October 20 Florida pending attempt with zero tax. These old attempts did not retain the billing-state snapshot; current profiles cannot prove the state at purchase. Historical charges were not changed or recharged.

Official sources reviewed:
- Illinois: https://tax.illinois.gov/content/dam/soi/en/web/tax/research/legalinformation/letterrulings/st/documents/2024/ST24-0031-GIL.pdf (no state digital-advertising tax).
- Florida: https://floridarevenue.com/TaxLaw/Documents/TAA%2098A-083.pdf (fact-specific Internet banner advertising ruling).
- Washington: https://dor.wa.gov/taxes-rates/retail-sales-tax/services-newly-subject-retail-sales-tax/advertising-services (advertising taxable from October 1, 2025).
- New York: https://www.tax.ny.gov/pubs_and_bulls/advisory_opinions/sales/24-46s.htm (online job postings treated as advertising rather than software).
- California: https://www.cdtfa.ca.gov/lawguides/vol2/suta/540-0346.html (Internet ad space without tangible property not taxable); software changes are separately described at https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/.

This audit does NOT certify the existing broad digital/SaaS state matrix for advertising, every service, or titled vehicles. Featured classification, local sourcing and registration obligations need confirmation for the actual products. Do not impose a general equipment rate on every service or silently substitute unverified new tax rules.

Technical patch: payment-time quotes require a valid state; Square billing requests corrected address details for invalid saved states/ZIPs. Rental state falls back to the parsed listing address when the structured field is absent. Quotes used for payment store state/city/ZIP, rate, tax cents, product kind, exemption and zero-tax reason in square_billing_attempts.tax_snapshot. New Square purchase receipts inherit that snapshot. No historical location is backfilled from mutable profiles. Recurring Square billing uses the quoted effective percentage rather than reconstructing it from rounded cents. Missing legacy snapshots require refreshed checkout before new payment.

Deploy migration 20261024140000_billing_tax_audit.sql before square-billing, square-rental-payment, paypal-create-order and tax-quote. PayPal order creation explicitly rejects rental booking requests, which remain Square only. Never test with a real charge. Verify taxed and legitimately zero-tax cases read-only before declaring production fixed.
