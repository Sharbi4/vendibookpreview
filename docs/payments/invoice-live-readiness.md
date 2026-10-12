# Invoice purchases: live deployment readiness

Target branch: `fix/paypal-webhook-config`. The owner deploys through Lovable.
The owner selected live implementation on 2026-10-12; sandbox buyer/seller accounts
are not required for this deployment path. No real payment or payout was executed
by the automated regression tests.

## Current implementation boundary

Purchase requests, review, invoice records and invoice screens are implemented.
Invoice payment creation remains blocked by `invoice_validation_pending` in
`paypal-create-order`. Do not remove that guard or enable invoice payments until
immutable invoice totals are used for order/capture reconciliation, delayed funds
are correctly recorded as held, buyer confirmation releases the correct capture,
and refund/dispute/28-day automatic-disbursement handling is implemented and verified.
Existing checkout is not switched to delayed disbursement by this change.

## Live configuration in Lovable

Set `PAYPAL_ENVIRONMENT=live` and `PAYPAL_ONBOARDING_ENV=live`.
Configure the matching live client ID, secret, partner merchant ID and webhook ID
using Lovable secrets; do not put credentials in GitHub.
Enable seller onboarding and multiparty only for the intended rollout.
After PayPal approves the partner app for platform fees and delayed disbursement,
set `PAYPAL_INVOICE_DISBURSEMENT_ENABLED=true`. New live referrals then request
`PARTNER_FEE` and `DELAY_FUNDS_DISBURSEMENT`. Existing connections do not acquire
new permissions just because the flag changes; complete PayPal's required onboarding.

An admin can POST to `paypal-system-status` with their authenticated bearer token:
`{"action":"invoice_readiness","seller_id":"<seller UUID>"}`.
This checks fresh live merchant status without creating orders or moving money.
Missing, inactive or unverifiable capabilities fail closed. It never substitutes a
sandbox connection or a cached webhook consent record for live capability evidence.
A successful seller check does not certify invoice payments, webhook delivery or payouts.

Deploy migrations in order, including `20261012170000_invoice_live_validation.sql`.
For the live rollout, `commerce_rollout.payment_environment` is `live` and
`live_validation_reference` must point to actual readiness evidence before enabling
payments. Sandbox evidence cannot activate a live rollout. This migration leaves
both rollout switches unchanged. Reviewed tax evidence for each invoice revision
and the existing legal-review requirement still apply.

PayPal documents automatic seller disbursement after 28 days:
https://developer.paypal.com/platforms/checkout/delayed-disbursement/
This integration must not promise an indefinite hold.
