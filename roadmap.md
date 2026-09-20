# Roadmap

- [in-progress] PayPal seller connect (sandbox): restore PAYPAL_SANDBOX_PARTNER_MERCHANT_ID = 48R2DERT59KTA (user-confirmed platform partner ID), redeploy paypal-seller-onboarding, retest refresh_status now that Robert May's onboarding completed (merchant_id N6NHEA25QFTK6, consent granted).
- [open] Rental checkout 10-bug fix — planned, not started; preserve sandbox PayPal + CAPTURE-only architecture.
- [open] Deploy reset_sandbox_listing admin action (exists in code, not deployed).
- [open] PayPal multiparty routing (PAYPAL_MULTIPARTY_ENABLED) + onboarding webhooks already firing (MERCHANT.ONBOARDING.COMPLETED verified working 2026-09-20).
- [open] Phase 2 PayPal dispute webhooks + automated evidence package.
- [open] Square disputes beyond refunds; SignNow UI triggers + counsel review of template text.
- [open] Rotate pasted Square production access token.
