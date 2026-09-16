# PayPal Partner (multiparty) certification audit — Vendibook

Audit only. No code changed. Every claim below is marked CONFIRMED (read in this
project this turn) or INFERRED (reasoned from what I read).

## A. Current PayPal architecture (CONFIRMED)

Single server-side service layer, one browser panel.

- `supabase/functions/_shared/paypal.ts` — the only place REST is called. OAuth
  token cached in memory until expiry (line 78-120), `paypalRequest()` with
  retry/idempotency (`PayPal-Request-Id`), `createPayPalOrder`,
  `createPayPalAuthorizeOrder`, capture, authorize/void/capture-authorization,
  `refundPayPalCapture`, subscriptions, `verifyPayPalWebhook`.
- `_shared/payments/paypalProvider.ts` + `paymentStrategy.ts` — provider
  abstraction and the server-only capture-vs-authorize decision.
- Edge functions: `paypal-create-order` (640 lines, 7 checkout kinds: sale,
  booking, product, freight, notary, concierge, protected_sale_deposit),
  `paypal-capture-order`, `paypal-authorize-order`, `paypal-settle-authorization`,
  `paypal-refund` (admin-only), `paypal-webhook`, `paypal-config`,
  `paypal-subscription-create/activate/cancel`, `paypal-system-status`,
  `paypal-live-diagnostics`.
- Browser: `src/lib/paypalClient.ts` loads the SDK from
  `https://www.paypal.com/sdk/js` at runtime with the client id fetched from
  `paypal-config`; `src/components/checkout/PayPalPaymentPanel.tsx` mounts
  Buttons, Card Fields, Messages; `src/pages/HostedPayment.tsx` and
  `ProductCheckout.tsx` are the checkout surfaces.
- Money records: `payment_records` (reference, provider order/capture id, fee
  and tax breakdown), `payment_ledger_entries`, `payment_audit_log`,
  `seller_payables`, `payout_preferences` (seller enters a PayPal *email* —
  manual admin payout, no merchant account link).
- Retired Stripe endpoints return HTTP 410 (`create-checkout`, `customer-portal`,
  etc.).

Key structural finding (CONFIRMED): this is a **single-merchant** integration.
All money is received into Vendibook's own PayPal account, and sellers are paid
later by manual admin payout. There is no partner/multiparty wiring anywhere.

## B. Already compliant

- SDK loaded dynamically from the official PayPal URL, never bundled
  (`paypalClient.ts` line 80). CONFIRMED.
- Secrets server-side only; `paypal-config` returns client id + environment
  only, and `safeLog()` strips secret-like keys. CONFIRMED.
- Access token cached and reused until 60s before expiry. CONFIRMED.
- Orders created only when the buyer clicks PayPal (`createOrder:` callback,
  panel line 260/280). CONFIRMED.
- `user_action: PAY_NOW` on capture orders; `CONTINUE` on authorize orders.
  CONFIRMED (`paypal.ts` line 261).
- Amounts re-derived server-side from the database; browser sends only an id.
  CONFIRMED.
- Webhook signature verified via PayPal's verify endpoint with an
  environment-scoped webhook id. CONFIRMED.
- Idempotency via `PayPal-Request-Id` plus in-flight order reuse. CONFIRMED.
- `onError` handled with a recoverable UI, no blank page. CONFIRMED.
- No PayPal-specific surcharge. CONFIRMED (fees are marketplace commission on
  every payment path, see `src/lib/commissions.ts`).
- Venmo + Pay Later enabled in `enable_funding`. CONFIRMED.

## C. Partially compliant

- **Item detail** — `purchase_units[].amount.breakdown` is sent (item_total,
  tax) but `purchase_units[].items[]` is never populated. CONFIRMED absent.
- **Shipping** — `shipping_preference: NO_SHIPPING` is hardcoded on *both* order
  builders for *all* kinds. Correct for boosts, verification, concierge,
  notary, subscriptions; wrong for freight/delivered sale, where a buyer
  shipping address exists on `sale_transactions.delivery_address`. CONFIRMED.
- **Refunds** — `paypal-refund` is Vendibook-admin only; a seller cannot refund.
  Acceptable under the single-merchant model, likely insufficient under
  multiparty. INFERRED. Insufficient-balance errors surface as a generic
  provider error, not a specific message. CONFIRMED.
- **Thank-you screen** — capture result is verified server-side, but the
  confirmation UI does not display the payment source used (PayPal vs Venmo vs
  card); `paypalProvider.ts` line 207 *does* capture `paymentSource`, so the
  data exists and is simply unused. CONFIRMED.
- **Seller PayPal visibility** — sellers see a payout *email* field only; no
  merchant id, no granted scopes, no connection status. CONFIRMED.

## D. Missing / must build

1. **BN code `VENDIBOOK_SP_PPCP`** — `PayPal-Partner-Attribution-Id` appears
   nowhere in the codebase, and the SDK script tag sets no
   `data-partner-attribution-id`. CONFIRMED absent, in every path.
2. **Partner Referrals onboarding** — no `/v2/customer/partner-referrals` call,
   no `partner_config_override.return_url`, no onboarding button or mini-browser
   flow. CONFIRMED absent.
3. **Seller status lookup** — no `/v1/customer/partners/{id}/merchant-integrations`
   call; `primary_email_confirmed`, `payments_receivable`, `oauth_integrations`
   scopes are never read or gated on. CONFIRMED absent.
4. **Seller merchant record** — no column/table holding a seller PayPal merchant
   id, tracking id, or granted scopes. CONFIRMED (`payout_preferences` holds a
   payout email only).
5. **`purchase_units[].payee` / `PayPal-Auth-Assertion`** — orders carry no
   payee, so funds land in the platform account. CONFIRMED absent.
6. **Disconnect / reconnect** with confirmation warning. CONFIRMED absent.
7. **`items[]`** on create-order. CONFIRMED absent.
8. **Order PATCH** when amounts change after creation — the code recreates or
   reuses instead. CONFIRMED absent.
9. **App Switch** — no `appSwitchWhenAvailable`, no `app_switch_preference`.
   CONFIRMED absent.
10. **Buyer email/phone** in `payment_source.paypal` — not passed. CONFIRMED.
11. **Merchant-onboarding webhooks** (`MERCHANT.ONBOARDING.COMPLETED`,
    `MERCHANT.PARTNER-CONSENT.REVOKED`) — not handled. CONFIRMED.

## E. Certification blockers

1. Missing BN code on every REST call and the SDK load — hard blocker.
2. No seller onboarding flow at all, so the two required onboarding recordings
   (successful, not-ready) cannot be produced. Hard blocker.
3. No payee routing — orders are not multiparty. Hard blocker.
4. No readiness gate on `payments_receivable` / `primary_email_confirmed`.
5. Missing `items[]`.
6. Shipping behavior not differentiated per transaction type.
7. Business-model conflict: Vendibook's documented model is manual admin payouts
   with no seller merchant onboarding. Multiparty certification assumes funds
   route to the seller's own PayPal account. This is a product decision, not a
   coding one — see section J. **INFERRED, and the most important open item.**

## F. Files that would change

Server: `_shared/paypal.ts` (attribution header, payee, items, shipping,
auth-assertion, PATCH), `_shared/payments/paypalProvider.ts` and `types.ts`
(payee/items in the provider contract), `paypal-create-order/index.ts`
(per-kind shipping + items + payee), `paypal-capture-order`,
`paypal-refund`, `paypal-webhook` (merchant onboarding events),
`paypal-config` (expose BN code to the client), plus NEW
`paypal-partner-referral` and `paypal-seller-status` functions.

Client: `src/lib/paypalClient.ts` (`data-partner-attribution-id`),
`PayPalPaymentPanel.tsx` (app switch, payer email/phone, payment-source display),
`src/components/account/PaymentsPayoutsSection.tsx` +
`PayoutMethodForm.tsx` (connect / status / disconnect UI),
checkout confirmation screens.

Database: new seller PayPal connection table (merchant id, tracking id, scopes,
`payments_receivable`, `primary_email_confirmed`, consent status) with RLS and
GRANTs.

## G. Recommended order

1. BN code everywhere (small, unblocks all API evidence).
2. `items[]` + per-kind shipping mapping.
3. Seller connection table + Partner Referral create + return handling.
4. Seller status lookup, readiness gating, status screen, disconnect.
5. Payee routing on create-order for seller-fulfilled kinds.
6. Merchant onboarding webhooks.
7. Refund permissions/behavior + insufficient-balance handling.
8. Thank-you payment-source display, App Switch, buyer email/phone.
9. Sandbox QA matrix, then evidence capture.

## H. Sandbox QA matrix (outline)

Onboarding: happy path; email-unconfirmed; payments-not-receivable; scopes
declined; disconnect; reconnect. Buyer: PayPal, Venmo, Pay Later, card — each
success and each decline — across sale, rental booking, freight, featured boost,
verification, concierge, protected-sale deposit, subscription. Plus cancel/return,
partial refund, full refund, insufficient-balance refund, webhook replay,
duplicate-click idempotency.

## I. Evidence package

Plaintext request/response with headers for: OAuth token, partner referral
create, seller status lookup, create order (each kind), PATCH, capture,
authorize/capture-later, refund, webhook verify. Screen recordings for the four
required flows. Screenshots: connect button, onboarding redirect, seller status
screen, disconnect warning, checkout with PayPal parity, cancel/return,
thank-you with payment source. Questionnaire answers.

## J. Questions for PayPal before coding

1. Vendibook pays sellers **manually** after the fact, from the platform
   account. Does the Partner/multiparty program require funds to route to each
   seller's PayPal merchant account (payee), or can we certify as a
   platform-of-record that pays sellers out separately?
2. If payee routing is required, what happens to existing sellers who never
   onboard — do their listings become untransactable?
3. Fee model: platform fee via `payment_instruction.platform_fees` vs our
   current gross-capture-then-manual-payout. Which does PayPal expect?
4. Is the Vendibook *membership subscription* (Billing Plans, platform's own
   product) in or out of scope for multiparty certification?
5. Is App Switch mandatory for this integration tier?
6. Which sandbox secrets should we add now: partner merchant id, partner
   client id/secret, BN code, seller onboarding webhook id? (We will not invent
   values — please confirm names/sources.)

---

No changes will be made until you approve a build scope. My recommendation is to
resolve J1 with PayPal first, since payee routing vs manual payout decides most
of section D.
