# Live seller onboarding authorization incident

Observed in the Vendibook Lovable project's stored PayPal API logs:
- 2026-10-12 12:54:34 UTC: POST /v2/customer/partner-referrals, live.
- PayPal HTTP 403, NOT_AUTHORIZED: insufficient permissions.
- PayPal debug ID: 5dcd4aad6e325.
- Same result across six live attempts on October 11–12.
- The same requested PPCP features previously returned 201 in sandbox.
- Requested features: PAYMENT, REFUND, ACCESS_MERCHANT_INFORMATION, BILLING_AGREEMENT.

The edge handler previously collapsed this into HTTP 400 / paypal_error.
It now returns a specific service-unavailable error explaining that the platform
integration needs authorization. The existing seller UI already displays parsed
edge error messages; no checkout architecture or credential routing was changed.

Deployment alone cannot grant PayPal permissions. The owner must verify the live
REST app belongs to the approved partner and is authorized for Partner Referrals,
PPCP and the requested features. Ask PayPal partner support to investigate using
the debug ID above if the app is already approved. Do not swap to sandbox or remove
required permissions to hide the failure. No credentials belong in this document.

After PayPal access is corrected, use the seller's normal Connect PayPal action.
Verify live referral creation returns an action URL, the seller completes onboarding,
and server-verified live merchant status is recorded. The new error classification
is covered in GitHub CI; successful live referral creation remains unverified.
