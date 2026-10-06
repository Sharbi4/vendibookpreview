# PayPal Connected Path: response to partner team feedback (2026-10-06)

Reply to the PayPal partner team's checklist. Debug IDs come from `paypal_api_logs` (sandbox). That table records every PayPal call with its `paypal-debug-id` and the request headers (with secrets redacted).

## 1. Onboarding failure screenshots

These show the seller's Payments page (`/dashboard/payments/setup`). The same warnings also appear on Seller onboarding and on Account → Payments, because all three screens use `SellerPayPalConnect`. The copy is PayPal's exact text.

| Scenario | Screenshot | Message shown |
|---|---|---|
| `payments_receivable: false` | `onboarding-payments-receivable-false.png` | "Attention: You currently cannot receive payments due to restriction on your PayPal account. Please reach out to PayPal Customer Support or connect to https://www.paypal.com for more information." |
| `primary_email_confirmed: false` | `onboarding-primary-email-unconfirmed.png` | "Attention: Please confirm your email address on https://www.paypal.com/businessprofile/settings in order to receive payments! You currently cannot receive payments." |

These were rendered from the production UI code with the seller's status set to each failure state. A live video still needs a sandbox seller in each state, which needs item 3 below fixed first.

## 2. Seller experience: Partner Referrals (`POST /v2/customer/partner-referrals`)

Implemented in `supabase/functions/_shared/paypal.ts` → `createPartnerReferral`:

- `products: ["PPCP"]`. This replaced `EXPRESS_CHECKOUT` on 2026-09-17.
- `legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }]`.
- `third_party_details.features` includes `PAYMENT` and `ACCESS_MERCHANT_INFORMATION`, plus `REFUND` and `BILLING_AGREEMENT`.
- `tracking_id` is unique per seller (`vb-<uuid>`).
- No `email` field is sent. All 33 logged sandbox referral calls were checked.
- The BN code `VENDIBOOK_SP_PPCP` is sent as `PayPal-Partner-Attribution-Id` on every call, including this one. It is set centrally in `paypalRequest`.

Debug IDs (successful, sandbox): `ca3f0dd544a00` (2026-09-22), `f381327d24b70`.

## 3. Account status (`GET /v1/customer/partners/{partner_id}/merchant-integrations/{merchant_id}`)

The code checks `payments_receivable === true` and `primary_email_confirmed === true` before a seller counts as ready (`_shared/paypalSellerStatus.ts`). Any false flag shows the matching warning above and keeps the seller off routed checkout.

**Blocked on PayPal:** this call has never succeeded for our sandbox app. 362 logged calls failed:

| Response | Count | Latest debug ID |
|---|---|---|
| 401 `AUTHORIZATION_ERROR` "This API call is not authorized" (tracking_id lookup, partner `48R2DERT59KTA`) | 180 | `f401623dd59c4` (2026-10-06) |
| 404 `USER_BUSINESS_ERROR` "Partner not Business or Account Closed" (merchant-id lookup, partner `48R2DERT59KTA`) | 55 | `f421372616341` (2026-09-20) |
| 404 `USER_BUSINESS_ERROR` "Invalid account" (old config used the client id as partner id; fixed) | 127 | `f78661587bdeb` (2026-09-20) |

**Ask for PayPal:**
- Enable the merchant-integrations (seller status) API for our sandbox REST app.
- Confirm that partner merchant ID `48R2DERT59KTA` is the sandbox Business account that owns the app.

Until this call succeeds, no sandbox seller can reach "ready". That blocks the payee test in item 4 and the status debug ID in item 6.

## 4. Orders and capture

`createPayPalOrder` (`POST /v2/checkout/orders`):
- `intent: "CAPTURE"`.
- `purchase_units[].items[]` always carry `name`, `description`, `unit_amount`, `category` (`PHYSICAL_GOODS` / `DIGITAL_GOODS`), `quantity` and `sku`. They are checked against `amount.breakdown.item_total`.
- `experience_context.shipping_preference` is `NO_SHIPPING` when no address is needed, and `SET_PROVIDED_ADDRESS` with the buyer's address for shipped equipment.
- `purchase_units[].payee.merchant_id` is set to the seller's merchant ID when the seller is ready (Connected Path), with `payment_instruction.platform_fees` for Vendibook's fee.
- 2026-10-06: the AUTHORIZE order used for Vendibook's own Verified Seller product now also sends `items` and `amount.breakdown`. It takes a `payee` when one is given.

`capturePayPalOrder` (`POST /v2/checkout/orders/{id}/capture`) confirms `COMPLETED` before anything is marked paid.

Debug IDs (sandbox, order created then captured `COMPLETED`):

| Order | Create | Capture |
|---|---|---|
| 4A474065C4651511E | `f112157ee9914` | `f159860bb6ec5` |
| 4AM44936M82695515 | `f103110c8059b` | `f5563903d2dba` |
| 8WV871857P432912J | `f732380c1fb82` | `f52526100a37e` |

These orders were first-party, with Vendibook as payee. A create with `payee.merchant_id` needs a ready sandbox seller, which is blocked on item 3.

## 5. BN code

`PayPal-Partner-Attribution-Id: VENDIBOOK_SP_PPCP` is on every logged call: referrals, merchant integrations, orders and capture. The value can be overridden with `PAYPAL_BN_CODE`.

## 6. Debug IDs to send

| API | Debug ID |
|---|---|
| `/v2/customer/partner-referrals` | `ca3f0dd544a00` |
| `/v1/customer/partners/{partner_id}/merchant-integrations/{merchant_id}` | `f421372616341` (404) and `f401623dd59c4` (401): needs PayPal to enable access |
| `/v2/checkout/orders` | `f112157ee9914` |
| `/v2/checkout/orders/capture` | `f159860bb6ec5` |
