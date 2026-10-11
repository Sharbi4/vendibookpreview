# PayPal Connected Path: response to partner team feedback (2026-10-06)

Reply to the PayPal partner team's checklist. Debug IDs come from `paypal_api_logs` (sandbox). That table records every PayPal call with its `paypal-debug-id` and the request headers (with secrets redacted).

## 1. Onboarding failure screenshots

These show the seller's Payments page (`/dashboard/payments/setup`). The same warnings also appear on Seller onboarding and on Account → Payments, because all three screens use `SellerPayPalConnect`. The copy is PayPal's exact text.

| Scenario | Screenshot | Message shown |
|---|---|---|
| `payments_receivable: false` | `onboarding-payments-receivable-false.png` | "Attention: You currently cannot receive payments due to restriction on your PayPal account. Please reach out to PayPal Customer Support or connect to https://www.paypal.com for more information." |
| `primary_email_confirmed: false` | `onboarding-primary-email-unconfirmed.png` | "Attention: Please confirm your email address on https://www.paypal.com/businessprofile/settings in order to receive payments! You currently cannot receive payments." |

These were rendered from the production UI code with the seller's status set to each failure state.

## 0. Recorded end-to-end sandbox run (2026-10-07)

A screen recording (`vendibook-paypal-sandbox-test.mp4`, about 8 minutes, sent separately and not stored in the repo) shows the whole Connected Path on vendibook.com against PayPal sandbox:

1. A new seller account connects a new sandbox Business account (merchant `WEHZLZNTDJ3Y4`) from Payments setup, grants the partner permissions, and presses **Check status**. The page shows "Ready To Receive Payments", with primary email confirmed, payments receivable, permissions granted, and advanced cards and vaulting approved.
2. A separate buyer account buys an unlisted $25 sandbox listing (pickup, $1.40 AZ tax, $26.40 total). It pays with a sandbox Personal account.
3. The order is created with the seller as payee and Vendibook's platform fee, then captured, and the Vendibook receipt shows Paid with capture `59769807W41985022`.

The first capture attempt in the recording fails. It revealed a bug: the order was created with `PayPal-Auth-Assertion`, but the capture and order look-up calls did not send it, so PayPal answered 404 `RESOURCE_NOT_FOUND` (debug IDs `f959729336a16`, `ca468a60f4fff`). This was fixed the same night (commit 87f8488a). Capture, order review, finalize, payment recovery and admin reconcile now act as the seller recorded on the payment record. The same approved order was then captured successfully.

## 2. Seller experience: Partner Referrals (`POST /v2/customer/partner-referrals`)

Implemented in `supabase/functions/_shared/paypal.ts` → `createPartnerReferral`:

- `products: ["PPCP"]`. This replaced `EXPRESS_CHECKOUT` on 2026-09-17.
- `legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }]`.
- `third_party_details.features` includes `PAYMENT` and `ACCESS_MERCHANT_INFORMATION`, plus `REFUND` and `BILLING_AGREEMENT`.
- `tracking_id` is unique per seller (`vb-<uuid>`).
- No `email` field is sent. All 33 logged sandbox referral calls were checked.
- The BN code `VENDIBOOK_SP_PPCP` is sent as `PayPal-Partner-Attribution-Id` on every call, including this one. It is set centrally in `paypalRequest`.

Debug IDs (successful, sandbox): `f3845432d7871` (2026-10-06, the recorded run, 201), `ca3f0dd544a00` (2026-09-22), `f381327d24b70`.

## 3. Account status (`GET /v1/customer/partners/{partner_id}/merchant-integrations/{merchant_id}`)

The code checks `payments_receivable === true` and `primary_email_confirmed === true` before a seller counts as ready (`_shared/paypalSellerStatus.ts`). Any false flag shows the matching warning above and keeps the seller off routed checkout.

**Passing since 2026-10-06** with partner ID `JQ9RNCNVTREA8`:

| Lookup | Status | Debug ID |
|---|---|---|
| By tracking ID (`vb-fd7cf8e3-…`), right after the seller returned | 200 | `f7036507d1594` |
| By merchant ID `WEHZLZNTDJ3Y4` | 200 | `f602072f87f20` |
| By merchant ID, the seller pressing **Check status** (in the recording) | 200 | `f2186613576a1` |

The response shows `payments_receivable: true`, `primary_email_confirmed: true` and `oauth_integration_status: ACTIVE`, with PPCP_CUSTOM, vaulting and advanced cards `SUBSCRIBED`. Vendibook marked the seller `ready`.

History, kept for reference. Before the partner-ID fix, 362 logged calls failed:

| Response | Count | Latest debug ID |
|---|---|---|
| 401 `AUTHORIZATION_ERROR` "This API call is not authorized" (tracking_id lookup, partner `48R2DERT59KTA`) | 180 | `f401623dd59c4` (2026-10-06) |
| 404 `USER_BUSINESS_ERROR` "Partner not Business or Account Closed" (merchant-id lookup, partner `48R2DERT59KTA`) | 55 | `f421372616341` (2026-09-20) |
| 404 `USER_BUSINESS_ERROR` "Invalid account" (old config used the client id as partner id; fixed) | 127 | `f78661587bdeb` (2026-09-20) |

**Root cause found (2026-10-06): the configured partner ID is wrong.** Every first-party sandbox order (57 creates and 12 captures) was paid to `payee.merchant_id = JQ9RNCNVTREA8`. With no payee given, PayPal pays the account that owns the REST app, so `JQ9RNCNVTREA8` is Vendibook's sandbox partner account. The status calls used `48R2DERT59KTA`, which explains "Partner not Business or Account Closed" and "not authorized".

**Fix (applied 2026-10-06):** the Supabase secret `PAYPAL_SANDBOX_PARTNER_MERCHANT_ID` is now `JQ9RNCNVTREA8`. This is a merchant ID, not a credential.

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

Those three orders were first-party, with Vendibook as payee.

**Connected Path order (seller as payee), the recorded run on 2026-10-07:** order `3RY65885GN675332L`, reference `VB-SALE-MUXCFBT1-F9E6C422`.

| Call | Status | Debug ID |
|---|---|---|
| `POST /v2/checkout/orders` | 200 (`PAYER_ACTION_REQUIRED`) | `f6323839326a1` |
| `GET /v2/checkout/orders/{id}` (review before capture) | 200 | `f844106827281` |
| `POST /v2/checkout/orders/{id}/capture` | 201 (`COMPLETED`, capture `59769807W41985022`) | `f8326207faa96` |

The create request carried:
- `intent: CAPTURE`;
- `purchase_units[].payee.merchant_id: WEHZLZNTDJ3Y4`;
- `payment_instruction.disbursement_mode: INSTANT`, with `platform_fees: [{ amount: 4.63 USD, payee: { merchant_id: JQ9RNCNVTREA8 } }]`;
- `PayPal-Auth-Assertion` for the seller;
- `PayPal-Partner-Attribution-Id: VENDIBOOK_SP_PPCP`;
- `amount.breakdown` with `item_total` 25.00 and `tax_total` 1.40;
- `shipping_preference: NO_SHIPPING`, because it was a pickup.

The capture and the review call are sent with the same assertion.

That order's single item was named "Item price" and sent as `DIGITAL_GOODS`. Since commit 87f8488a, sale items carry the listing title as `name` (the quote label stays as `description`) and are sent as `PHYSICAL_GOODS` even for pickup orders.

On 2026-10-07, routed captures and look-ups were found to be missing from `paypal_api_logs`. The seller's PayPal merchant ID was written into the uuid `seller_id` column, so the row was rejected. Fixed in commit 1baf300d. The two debug IDs above were read from the function logs (`[PAYPAL] api_ok`, `onBehalfOf: WEHZLZNTDJ3Y4`).

## 5. BN code

`PayPal-Partner-Attribution-Id: VENDIBOOK_SP_PPCP` is on every logged call: referrals, merchant integrations, orders and capture. The value can be overridden with `PAYPAL_BN_CODE`.

## 6. Debug IDs to send

| API | Debug ID |
|---|---|
| `/v2/customer/partner-referrals` | `f3845432d7871` |
| `/v1/customer/partners/{partner_id}/merchant-integrations/{merchant_id}` | `f2186613576a1` (200, seller `WEHZLZNTDJ3Y4` ready) |
| `/v2/checkout/orders` (seller as payee, platform fee) | `f6323839326a1` |
| `/v2/checkout/orders/{id}/capture` (seller as payee) | `f8326207faa96` (201 `COMPLETED`) |
| First-party order and capture (Vendibook as payee) | `f112157ee9914` / `f159860bb6ec5` |
