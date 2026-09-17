# PayPal Connected Path — revision 2 (disconnect, status gating, line items, shipping)

Plan only. Supersedes the approved 2026-09-17 plan; everything there still
stands except where noted below. CONFIRMED = read in this project.

## 0. Status of work already in flight

Before the mode switch, part of **Phase 0** was written into
`supabase/functions/_shared/paypal.ts` (not deployed, no behavior change in
production until deploy):

- `PARTNER_ATTRIBUTION_ID` (`PAYPAL_BN_CODE`, default `VENDIBOOK_SP_PPCP`) sent
  as `PayPal-Partner-Attribution-Id` on every REST call.
- `buildAuthAssertion(merchantId)` + `actAsMerchantId` / `extraHeaders` options
  on `paypalRequest`.
- `purchase_units[].items[]` now always built (derived single line when a caller
  passes none), plus `amount.breakdown.item_total` always present.
- Optional `shipping` address → `SET_PROVIDED_ADDRESS`; `NO_SHIPPING` otherwise.
- Optional `payeeMerchantId` + `platformFeeCents` → `payee` +
  `payment_instruction.platform_fees`.
- PayPal debug id captured from the `paypal-debug-id` response header and logged
  on success as well as failure.

This matches requirements 3, 4 and 5 at the plumbing level. What is still
missing is the **per-kind data** each caller must supply, covered below.

## 1. Contradictions / gaps found against the prior plan

- Prior plan said disconnect would call PayPal. **Wrong** — PayPal cannot be
  revoked by us; disconnect is a Vendibook-side forget only. Corrected below.
- Prior plan said "Disconnect clears merchant_id/email/scopes". That would
  orphan historical reconciliation. Corrected to archive-then-clear.
- Prior plan left the shipping decision at "physical goods get an address".
  Confirmed from the database: `sale_transactions.fulfillment_type` today is
  `pickup` (only row present), with `delivery_address`, `delivery_fee`,
  `freight_cost`, `shipping_status` columns available. So most sales are
  **NO_SHIPPING pickups**, not shipped goods. Matrix below.
- Prior plan had no shipping-address validation step. Added.
- Prior plan's evidence list did not prove BN code or line items explicitly.
  Added.

## 2. Seller connection model — corrected lifecycle (req 1)

`seller_paypal_accounts` (one active row per seller):

`user_id`, `tracking_id`, `merchant_id`, `paypal_email`,
`primary_email_confirmed`, `payments_receivable`, `oauth_scopes` jsonb,
`consent_granted`, `products` jsonb, `onboarding_status`
(`not_started | referral_created | returned | ready | action_required |
disconnected`), `referral_url`, `last_status_check_at`, `status_payload` jsonb
(PII-trimmed), `disconnected_at`, timestamps.

Companion `seller_paypal_account_history` — an append-only archive written on
every disconnect (user_id, merchant_id, paypal_email, tracking_id, connected_at,
disconnected_at, final status snapshot). Never deleted.

**Disconnect = Vendibook forgets the association.** No PayPal API call. Steps:
archive the current row into history → clear `merchant_id`, `paypal_email`,
`oauth_scopes`, `products`, readiness flags → set `onboarding_status =
disconnected`, `disconnected_at = now()`. The seller can then onboard a
different PayPal account, which mints a new `tracking_id`.

**Historical integrity:** `payment_records` keep their own captured
`payee_merchant_id` at order time (new nullable column) so past orders,
refunds, payables and admin screens still resolve after a disconnect. Nothing
about a past transaction is rewritten by a disconnect.

Confirmation copy, shown before disconnect proceeds:

> Disconnecting your PayPal account will prevent you from offering PayPal
> services and products on your website. Do you wish to continue?

## 3. Status messages and gating (req 2)

Exact strings rendered in Payments & Payouts and surfaced in the seller's
listing dashboard:

- `primary_email_confirmed = false` →
  "Attention: Please confirm your email address on
  https://www.paypal.com/businessprofile/settings in order to receive payments!
  You currently cannot receive payments."
- `payments_receivable = false` →
  "Attention: You currently cannot receive payments due to restriction on your
  PayPal account. Please reach out to PayPal Customer Support or connect to
  https://www.paypal.com for more information."
- Missing/insufficient `OAUTH_INTEGRATIONS` scopes → "Vendibook doesn't yet have
  permission to process payments for you. Reconnect PayPal to grant access."

Gate: `seller_paypal_ready(user_id)` = connected AND
`primary_email_confirmed` AND `payments_receivable` AND required scopes granted.
While false, PayPal checkout is disabled for that seller's listings (seller-payee
kinds only) with an honest buyer message; Vendibook's own products are never
gated. Re-check on demand, on return from onboarding, nightly, and on
merchant webhooks.

## 4. Line-item mapping per checkout kind (req 4)

Every order carries: `intent`, `amount` + `currency`, purchase `description`,
`reference_id` / `invoice_id` / `custom_id` = Vendibook payment reference, and
`items[]`. Item `sku` is the stable Vendibook id so PayPal rows reconcile back.

| Kind | Items to send | Payee |
|---|---|---|
| Vehicle / equipment sale | 1 line: listing title, `sku = listing:<id>`, category PHYSICAL_GOODS, unit = sale price; separate lines for delivery fee (PHYSICAL_GOODS) and buyer-side charges; tax via `tax_total` | Seller |
| Rental booking | line per rate component (nightly/weekly/monthly subtotal), `sku = listing:<id>`, category DIGITAL_GOODS (service); cleaning/extras as their own lines | Seller |
| Security deposit | own line, category DIGITAL_GOODS, `sku = deposit:<booking id>`; excluded from the partner-fee base | Seller (inside booking order) |
| Freight (Vendibook-arranged) | 1 line "Vendibook freight shipping", PHYSICAL_GOODS, `sku = freight:<tx id>` | Vendibook |
| Featured listing boost | 1 line "Featured Listing — 30 days", DIGITAL_GOODS, `sku = boost-featured-30` | Vendibook |
| Verified Seller / IDV | 1 line, DIGITAL_GOODS, `sku = verified-seller` | Vendibook |
| Concierge / listing services | line per ordered service, DIGITAL_GOODS, `sku = <product slug>` | Vendibook |
| Notary | 1 line, DIGITAL_GOODS, `sku = notary:<listing id>` | Vendibook |
| Protected sale deposit | 1 line, DIGITAL_GOODS, `sku = protected-deposit:<sale id>` | Vendibook (Phase 1) |
| Memberships / subscriptions | PayPal Billing Plans, not Orders v2 — plan name + catalog price carry the detail; no `items[]` | Vendibook |

Callers to update: `paypal-create-order/index.ts` (per-kind item builder),
`_shared/payments/types.ts` + `paypalProvider.ts` (items/shipping/payee pass-through).

## 5. Shipping matrix (req 5)

| Transaction | Shipping decision |
|---|---|
| Sale, `fulfillment_type = pickup` (the current norm — CONFIRMED) | `NO_SHIPPING` |
| Sale, seller delivery with a collected `delivery_address` | `SET_PROVIDED_ADDRESS` with the validated address, PHYSICAL_GOODS |
| Sale, Vendibook freight | `SET_PROVIDED_ADDRESS` on the freight order using the confirmed delivery address |
| Rental booking | `NO_SHIPPING` — the listing location is a service/pickup location, not a shipping destination; it must not be sent in PayPal shipping fields |
| Security deposit | follows its parent booking → `NO_SHIPPING` |
| Boost, IDV, concierge, notary, protected deposit, memberships | `NO_SHIPPING` |

**Address validation before checkout:** an order that will send
`SET_PROVIDED_ADDRESS` must first pass Vendibook validation — required fields
present, US state code valid, ZIP format valid, and geocoded via the existing
Google Maps loader used elsewhere in the app. Failure blocks order creation and
returns a specific, correctable error the buyer sees inline ("We couldn't verify
this delivery address — check the street and ZIP"). No silent fallback to
`NO_SHIPPING` on a physical delivery.

## 6. Revised QA / evidence package (req 6)

Onboarding & connection: disconnect confirmation dialog (exact copy);
association cleared in Vendibook after disconnect; reconnect with the same PayPal
account; reconnect with a *different* PayPal account; historical orders,
refunds and payables still resolve after disconnect.

Readiness: `primary_email_confirmed=false` — exact warning shown and checkout
disabled; `payments_receivable=false` — exact warning shown and checkout
disabled; scopes missing — warning shown; status restored → checkout re-enabled.

Attribution: REST request sample showing `PayPal-Partner-Attribution-Id:
VENDIBOOK_SP_PPCP` in the headers; browser screenshot/source showing
`data-partner-attribution-id` on the SDK script tag.

Orders: create-order request samples per kind showing `items[]` with name, unit
amount, quantity, description, SKU, category, plus `invoice_id` / `custom_id`
Vendibook references; physical-goods sample with the shipping address and
`SET_PROVIDED_ADDRESS`; invalid-address correction path recording; `NO_SHIPPING`
sample for a non-shipping purchase.

Payments: success and decline recordings for each in-scope method (PayPal,
Venmo, Pay Later, card); refund with partner-fee reversal; thank-you screen
naming the payment source (Venmo shown as Venmo).

## 7. Revised staged rollout

- **Phase 0 (in progress, no behavior change)** — BN code, `items[]`, shipping
  plumbing, debug-id logging. Finish by wiring per-kind items and the shipping
  matrix in `paypal-create-order`, plus SDK `data-partner-attribution-id`.
- **Phase 1 (sandbox, flagged)** — `seller_paypal_accounts` +
  `seller_paypal_account_history` + `payment_records.payee_merchant_id`;
  `paypal-partner-referral`; `paypal-seller-status`; Payments & Payouts connect /
  ready / action-required / disconnected UI with the exact PayPal copy and the
  disconnect confirmation; address validation helper.
- **Phase 2** — payee + partner fee on sale and rental orders behind
  `paypal_multiparty_enabled`, per-seller opt-in; live single-merchant path
  untouched by default.
- **Phase 3** — refunds with fee reversal, merchant webhooks
  (`MERCHANT.ONBOARDING.COMPLETED`, `MERCHANT.PARTNER-CONSENT.REVOKED`,
  product/capability updates), thank-you payment source.
- **Phase 4** — sandbox QA matrix above, evidence capture, certification.
- **Phase 5** — live cohort flip; retire manual payouts per onboarded seller,
  keeping the manual path for cash sales, Vendibook-invoiced items and
  sellers who never onboard.

---
Approve to resume Phase 0 and build Phase 1 (sandbox only, no live checkout
behavior change).
