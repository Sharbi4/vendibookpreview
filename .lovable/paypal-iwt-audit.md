# Vendibook LC — PayPal Integration Walkthrough (IWT) audit

BN code: `VENDIBOOK_SP_PPCP` (single constant in `supabase/functions/_shared/paypal.ts`, mirrored to the
browser SDK via `paypal-config`).
Environment: live credentials in production; onboarding environment separately selectable with
`PAYPAL_ONBOARDING_ENV` for certification runs.

Status key: **PASS** already correct · **FIXED** corrected in this pass · **GAP** not implemented, with reason.

---

## 1. SDK and attribution

| Requirement | Status | Evidence |
|---|---|---|
| BN code on every REST call | PASS | `_shared/paypal.ts` sets `PayPal-Partner-Attribution-Id` on all requests |
| BN code on the JS SDK | PASS | `src/lib/paypalClient.ts` sets `data-partner-attribution-id` |
| Official runtime SDK only (no bundled copy) | PASS | `src/lib/paypalClient.ts` injects `https://www.paypal.com/sdk/js` at runtime |
| `data-page-type`, `commit`, merchant id on SDK | FIXED | `src/lib/paypalClient.ts` (`PayPalSdkOptions`), cache key separates intent/merchant |
| App switch enabled | FIXED | `appSwitchWhenAvailable: true` in `src/components/checkout/PayPalPaymentPanel.tsx` |
| Access token caching | PASS | per-environment token cache in `_shared/paypal.ts` |
| SDK load / `onError` / `onCancel` handling | PASS | `PayPalPaymentPanel.tsx` renders a recoverable state for each |

## 2. API call evidence (PCI-safe)

| Requirement | Status | Evidence |
|---|---|---|
| Durable log of every PayPal REST call | FIXED | `paypal_api_logs` table; written from `paypalRequest` |
| Credentials / card data never stored | FIXED | `_shared/paypalApiLog.ts` redacts auth headers, auth assertions, card fields; masks contact fields |
| Debug id, latency, status captured | FIXED | columns `paypal_debug_id`, `latency_ms`, `response_status` |
| Admin-only access | FIXED | RLS: admin SELECT only; inserts service-role only |
| 90-day retention | FIXED | service-role purge function + retention index |
| Sample browser for the engineer | FIXED | `/admin/paypal/api-samples` (`src/pages/AdminPayPalApiSamples.tsx`) — grouped by call, copy + download |

## 3. Seller onboarding (partner referrals)

| Requirement | Status | Evidence |
|---|---|---|
| Unique tracking id per seller | PASS | `vb-<uuid>` in `paypal-seller-onboarding` |
| Return URL + partner notification URL | PASS | `RETURN_URL` → `/dashboard/payments/setup?paypal_return=1` |
| Scoped products / features requested | PASS | products `PPCP`; features `PAYMENT`, `REFUND`, `ACCESS_MERCHANT_INFORMATION`, `BILLING_AGREEMENT` |
| Status flags persisted (email confirmed, receivable, scopes, merchant id) | PASS | `refresh_status` writes all of them |
| Action reasons surfaced to the seller | PASS | `action_reasons` array |
| ACDC vetting + vaulting capability recorded | FIXED | `deriveStatus` now reads `PPCP_CUSTOM` vetting and capability list; stored on `seller_paypal_accounts` |
| Disconnect / reconnect | PASS | `disconnect` archives; `create_referral` re-issues after revocation |
| Checkout blocked until ready | PASS | `seller_payment_readiness` RPC gates the embedded checkout |

## 4. Webhooks

| Event | Status |
|---|---|
| `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED/DENIED/PENDING/REFUNDED/REVERSED` | PASS |
| `PAYMENT.AUTHORIZATION.CREATED/VOIDED/EXPIRED` | PASS |
| `CUSTOMER.DISPUTE.*` | PASS |
| `MERCHANT.ONBOARDING.COMPLETED` | PASS |
| `MERCHANT.PARTNER-CONSENT.REVOKED` | FIXED — now also notifies the seller that checkout is off |
| `CUSTOMER.MERCHANT-INTEGRATION.PRODUCT-SUBSCRIPTION-UPDATED` / `CAPABILITY-UPDATED` | FIXED — recorded, readiness still confirmed by status refresh |
| Signature verification + replay protection | PASS | `verifyPayPalWebhook` + event-id dedupe |

Live webhook id: `6XK510927N3848536`. A sandbox webhook subscribing to the same list is required for
the certification recording (owner task).

## 5. Order creation

| Requirement | Status | Evidence |
|---|---|---|
| Server-authoritative amounts | PASS | quotes computed server-side in `_shared/paypalAccounting.ts`; client never sends money |
| Itemised order with stable SKUs | FIXED | `_shared/paypalOrderDetail.ts`; SKUs persisted to `payment_records.order_items` |
| Exact `amount.breakdown` arithmetic | FIXED | validated in `createPayPalOrder`; mismatch raises `OrderArithmeticError` and a recoverable error |
| `NO_SHIPPING` for pickup / services, validated address for delivery | FIXED | `SET_PROVIDED_ADDRESS` when a delivery address exists, `NO_SHIPPING` otherwise |
| Buyer contact prefill | FIXED | name / email / phone passed from the transaction record |
| `PAY_NOW` user action | PASS | capture flow uses `PAY_NOW`; authorization flow intentionally uses `CONTINUE` |
| Soft descriptor | FIXED | `buildSoftDescriptor` from the seller's business name |
| PATCH on order change | FIXED | `patchPayPalOrder` in `_shared/paypal.ts` |
| No buyer-present vaulting | PASS | no `vault` attribute is ever sent |

## 6. Capture and confirmation

| Requirement | Status | Evidence |
|---|---|---|
| Server-side capture only | PASS | `paypal-capture-order` |
| Capture facts persisted | FIXED | payment source, payer email, shipping and billing address stored on `payment_records` |
| Confirmation shows payment source, PayPal email, shipping, billing | FIXED | `src/components/checkout/PayPalPaymentFacts.tsx`, rendered on `PaymentSuccess` and `/orders/:id` |
| Declines are recoverable, never a blank page | PASS | decline handling in capture + checkout panel |

## 7. Refunds

| Requirement | Status | Evidence |
|---|---|---|
| Seller can refund their own order | FIXED | `paypal-refund` accepts seller or admin; UI `src/components/workspace/SellerRefundDialog.tsx` |
| Refund always issued through PayPal | PASS | never a DB-only status flip |
| Insufficient-balance recovery | FIXED | explicit 409 with the exact remedy; retry-safe |
| Refund-time-limit / non-refundable capture | FIXED | explicit 409 pointing to support |
| Commission behaviour published | PASS | commission recalculated on the retained amount (Payments Terms) |
| Partial + full refunds, idempotent | PASS | idempotency key per refund attempt |

## 8. Tracking

| Requirement | Status | Evidence |
|---|---|---|
| Tracking pushed to PayPal | PASS | `handoff-ops → sync_paypal_tracking` |
| Uses the SKUs sent at order creation | FIXED | order-level `/v2/checkout/orders/{id}/track` with persisted `order_items`; trackers-batch remains the fallback |
| Sync result stored, failures visible | PASS | `paypal_sync_status`, `paypal_sync_error` |

## 9. Payment method parity and branding

| Requirement | Status |
|---|---|
| Official PayPal buttons, unmodified branding | PASS |
| Venmo eligible through the SDK (US, eligible buyers) | PASS |
| Pay Later messaging | GAP — not implemented; see gap list |
| Apple Pay / Google Pay | GAP |
| Fastlane | GAP |
| Vaulting / billing agreements for one-time checkout | GAP |

## 10. Gap list (deliberate, with reasons)

1. **Fastlane** — requires a guest-checkout identity flow Vendibook does not have; every buyer is an
   authenticated Vendibook account. Implementing it would change the account model. Not implemented.
2. **Guest checkout** — Vendibook requires an account to transact (ownership rules, messaging, disputes,
   document compliance). PayPal guest card checkout is available through the card fields, but an
   account-less order is out of scope.
3. **Apple Pay / Google Pay** — needs domain registration and per-wallet certification; can be added
   after IWT sign-off.
4. **Pay Later messaging** — pending owner approval of placement and disclosure copy.
5. **Vaulting / billing agreements for marketplace orders** — Vendibook stores no buyer payment
   instrument; recurring membership billing uses PayPal Subscriptions instead.
6. **Automated seller payouts / split settlement** — Vendibook operates a manual, administrator-reviewed
   payout process by policy. Seller payables are recorded internally and released manually. No Payouts
   API, no split settlement, no funds custody.

## 11. Owner manual tasks (cannot be done in code)

1. Create a **sandbox** webhook subscribing to the event list in section 4 and record its webhook id.
2. Switch `PAYPAL_ONBOARDING_ENV` to `sandbox` for the recording session, then switch back.
3. Record the required videos: seller linking PayPal, buyer purchase, each checkout method offered,
   a declined payment, and seller tools (refund, earnings dashboard, disconnect).
4. Collect debug ids for the four required endpoints from `/admin/paypal/api-samples` after running
   each flow in sandbox.
5. Confirm the soft descriptor text with PayPal (22-character limit applies).
6. Approve the Pay Later messaging placement if it should be in scope for this review.
