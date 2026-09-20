# Roadmap

- [done] Checkout agreement gate: keep the payment-side Payments Terms version aligned with the version saved by the checked agreement box.
- [done] PayPal seller connect (sandbox): partner Merchant ID 48R2DERT59KTA confirmed; status check now falls back to webhook-recorded connection data instead of erroring when PayPal status API is unavailable.
- [open] Rental checkout 10-bug fix — planned, not started; preserve sandbox PayPal + CAPTURE-only architecture.
- [open] Deploy reset_sandbox_listing admin action (exists in code, not deployed).
- [open] PayPal multiparty routing (PAYPAL_MULTIPARTY_ENABLED) + onboarding webhooks already firing (MERCHANT.ONBOARDING.COMPLETED verified working 2026-09-20).
- [open] Phase 2 PayPal dispute webhooks + automated evidence package.
- [open] Square disputes beyond refunds; SignNow UI triggers + counsel review of template text.
- [open] Rotate pasted Square production access token.
- [done] Preserve the selected PayPal Pay Later funding source through approval so review copy shows the order total, not a same-day charge.
