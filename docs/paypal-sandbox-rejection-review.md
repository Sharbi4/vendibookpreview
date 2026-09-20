# PayPal sandbox rejection review
Reviewed 2026-09-20 against Vendibook LC - Integration Guide (24 pages) and PayPal's official documentation. Branch: `fix/paypal-webhook-config`.

## What is verified
- API logs contain a sandbox HTTP 422 `INSTRUMENT_DECLINED` at 2026-09-20 11:52:24 UTC, with `PayPal-Mock-Response` present. PayPal debug ID: `3fc230ceac4f5`.
- Earlier successful attempts returned actual capture status `COMPLETED`, not merely an SDK approval.
- The latest decline log did not join to an existing payment record during this review. Its API response is verified; its complete receipt/fulfillment outcome is not independently certified.
- 49 focused tests cover funding labels, final review errors, capture status extraction, failure classification, sandbox header restrictions, SDK configuration, and finalization safeguards. The finalizer tests were also rerun after isolating Deno dependencies from browser typechecking.
- Application typecheck and production Vite/PWA build passed. Existing CSS/font/chunk-size warnings remain; no browser visual smoke test or full Deno deployment check was performed.
- No backend secrets, PayPal app features, or production environment selection were changed by this review.

## Implemented corrections
1. Payment method labels now use the server's PayPal response only. Verified card brand/last four are shown when supplied. Unknown methods do not inherit a clicked-button label or claim a PayPal balance. PayPal is named as the funding source only when the response identifies that source.
2. CAPTURE recovery is read-only for sales as well as rentals. Checking status after a failure cannot initiate another capture or skip the buyer's final review. Legacy AUTHORIZE handling is not enabled or expanded.
3. A top-level Orders `COMPLETED` response is not capture proof. PayPal can return an order marked completed containing a declined capture. The unavailable-listing guard now checks the nested capture; missing provider information remains unconfirmed.
4. Funding refusals are distinguished from missing buyer approval and API errors. `PAYER_ACTION_REQUIRED` and `ORDER_NOT_APPROVED` no longer become false card declines. Authentication/permissions failures are failed requests, not bank declines.
5. Ambiguous capture errors, including 429/5xx and missing capture facts, return pending for sale and rental checkout. They do not produce a paid receipt.
6. Declined/failed capture results return a factual status message; structured failures include the original PayPal issue and debug ID.
7. Denied/declined webhooks use the shared finalizer. Late denials cannot blindly overwrite verified completed payments. No paid ledger, payable, or receipt is created from declined/failed/pending finalization.
8. Sandbox capture tests support PayPal's three documented sample scenarios: `INSTRUMENT_DECLINED`, `TRANSACTION_REFUSED`, and `INTERNAL_SERVER_ERROR`. Unsupported names fail rather than silently becoming normal captures.

## Backend activation
Redeploy these functions from this branch, including their shared imports:
- `paypal-capture-order`
- `paypal-finalize-order`
- `paypal-webhook`

Use the existing sandbox configuration. Never switch the environment to live for rejection testing.

Backend secret `PAYPAL_SANDBOX_DECLINE_ORDER_ID` selects a fresh, unpaid 17-character PayPal order ID. The existing `ALL_SANDBOX_ORDERS` sentinel is preserved for a dedicated sandbox test run; it affects every sandbox capture while set.

Backend secret `PAYPAL_SANDBOX_CAPTURE_ERROR` selects one of the three scenarios above. If omitted, the existing default remains `INSTRUMENT_DECLINED`.

These are backend secrets, not VITE/browser variables or merely GitHub Actions secrets. The helper ignores them entirely in live and never alters GET status lookups, refunds, or a different explicitly selected order.

For each scenario:
1. Use a new sandbox purchase/request that has seller/host approval when required.
2. Complete the checkout agreements and approve the order in PayPal.
3. Configure the test order ID before pressing Submit payment (or use the explicit all-sandbox setting).
4. Submit once through Vendibook's final review.
5. Verify the outgoing test header, the provider response issue/status and debug ID in `paypal_api_logs`.
6. Verify the buyer UI, matching payment record, unpaid transaction, and absence of a paid receipt/fulfillment. Do not infer these from an HTTP response alone.
7. Remove the test secrets and run a separate normal successful payment. Do not reuse a completed order for decline testing.

A source push is not proof of edge-function deployment. Only the observed INSTRUMENT_DECLINED API response is externally verified so far. The expanded scenario selector requires the updated backend.

## Rejection and recovery matrix
| Scenario | Correct trigger | Expected behavior | Verification |
| --- | --- | --- | --- |
| Funding refused | Sandbox header INSTRUMENT_DECLINED | Red decline; choose another method; no paid receipt | Provider 422 observed; local tests pass; full transaction evidence still needed |
| Transaction refused | Sandbox header TRANSACTION_REFUSED | Declined, no fulfillment | Local classification/header tests; provider run pending |
| Internal service error | Sandbox header INTERNAL_SERVER_ERROR | Unconfirmed/pending; reconcile existing capture only | Local tests; provider run pending |
| Order not approved | Submit an unapproved order through an authorized test path | Approval required, not bank decline | Local classifier test; provider run pending |
| Payer action required | PayPal action-required flow | Preserve additional-approval requirement; return to PayPal | Classification covered; full challenge/action-link flow still requires manual verification |
| Buyer cancels | Close/cancel the PayPal flow | Cancelled/recoverable, not paid | Existing callback; manual run pending |
| Network interruption | Interrupt final capture response in a controlled browser test | Unable to confirm; no false “nothing charged” claim | Final-review test passes; browser run pending |
| Pending capture | Provider returns nested capture PENDING | Pending receipt/status; no paid ledger or fulfillment | Local UI/finalizer tests; provider run pending |
| Declined capture inside completed order | PayPal direct-card rejection response | Follow nested capture DECLINED, never outer COMPLETED | Capture extraction regression passes |
| Late denied webhook | Signed, verified denial after completed capture | Do not overwrite completed payment | Shared finalizer regression passes; signed webhook replay pending |
| Expired card, wrong CVV, insufficient funds, suspected fraud | Advanced Card Fields rejection triggers | Provider-specific refusal, no payment completion | Not supported by the current card-button integration; see gap below |
| 3-D Secure challenge/cancellation/failure | PayPal's dedicated 3DS test cases for the implemented card product | Correct authentication and liability outcomes | Not certified by these Buttons tests |
| Venmo | Eligibility tests | Only eligible funding shown | Guide p.19 states end-to-end Venmo sandbox testing is not fully available |

## Guide-specific gaps and external checks
- Guide p.19 specifies custom Card Fields with cardholder name, expiry, CVV and billing address. Current code uses `paypal.Buttons({ fundingSource: CARD })` and explicitly excludes `card-fields` from the SDK. The name-on-card CCREJECT triggers belong to Expanded Card Checkout; do not present them as a reliable test of this Buttons integration.
- Guide p.8 requires PPCP_CUSTOM SUBSCRIBED and CUSTOM_CARD_PROCESSING ACTIVE without limits before enabling advanced cards. A full Card Fields implementation and seller eligibility verification remain necessary for that portion of the guide; this patch does not enable an unverified product.
- Guide pp.8-9 and 19-20 require separate Apple Pay/Google Pay and vaulting readiness. These are not certified by a PayPal/card-button decline test.
- Guide pp.4-5 requires BN attribution and safe API/debug-ID logging. Existing logs provide evidence of the actual sandbox requests; no raw card credentials should be added to logs or storage.
- Guide pp.6-10 requires confirmed email, receivable payments, and merchant consent. These remain separate from buyer payment failures.
- Guide pp.12 and 19 link negative testing and card testing; these are different mechanisms.
- Fastlane/vaulting, reporting configuration, PayPal app capability approval, domain registration, and signed webhook delivery require separate verification. Square subscriptions were not changed.

## Official sources
- [Sandbox negative response headers](https://developer.paypal.com/negative-testing/request-headers/)
- [Standard Checkout integration](https://developer.paypal.com/platforms/checkout/standard/integrate)
- [Hosted-fields integration and three capture error examples](https://developer.paypal.com/platforms/checkout/advanced/sdk/v1/)
- [Handling payment failures](https://developer.paypal.com/api/handle-payment-failures/)
- [Card testing and rejection triggers](https://developer.paypal.com/sandbox-testing/card-testing)
- [Funding failures](https://developer.paypal.com/docs/multiparty/checkout/standard/customize/handle-funding-failures/)

## Changed files
- `supabase/functions/_shared/paypalCaptureOutcome.ts`
- `supabase/functions/_shared/paypalFinalize.ts`
- `supabase/functions/paypal-capture-order/index.ts`
- `supabase/functions/paypal-finalize-order/index.ts`
- `supabase/functions/_shared/paypalSandboxTest.ts`
- `supabase/functions/_shared/paypal.ts`
- `supabase/functions/paypal-webhook/index.ts`
- `src/components/checkout/PayPalReviewAuthorize.tsx`
- `src/test/payments/fundingLabel.test.ts`
- `src/test/payments/paypalSandboxTest.test.ts`
- `src/test/payments/paypalCaptureOutcome.test.ts`
- `src/test/payments/paypalFinalizationRejections.test.ts`
- `docs/paypal-sandbox-rejection-review.md`

No database migration is required for this patch.
