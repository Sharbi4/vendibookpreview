# Seller PayPal onboarding clarity and buyer trust

## What will change
- Add concise sole-proprietor guidance before every seller-facing PayPal connection action: seller onboarding, Become a Host, listing payment setup, dashboard setup, and the PayPal connection screen.
- Add an expandable “What if I’m not a registered business?” helper beside connection actions, explaining legal-name use, no LLC requirement, PayPal identity verification, and buyer trust.
- Add a buyer-facing PayPal-verified seller indicator on listing and buyer trust/how-it-works surfaces only when that seller can transact.
- Update Seller Payment Terms to cover sole proprietors without changing existing payment timing or release-condition language.

## Technical details
- Extract one shared seller PayPal eligibility helper using the checkout criteria: active connection, `ready` onboarding status, confirmed primary email, payment receivable, merchant ID, and required granted permissions/capabilities.
- Use the same helper in checkout gating and listing badge display so they cannot disagree.
- Keep the existing optional Vendibook Verified Seller badge separate; the new claim is specifically PayPal business identity verification.
- Preserve all PayPal certification, consent, payment, delivery, and walkthrough behavior.

## Verification
- Check seller flows before their PayPal handoff on desktop and mobile.
- Verify an eligible seller shows the buyer trust indicator and an ineligible seller does not.
- Run focused tests and confirm the preview build is clean.
