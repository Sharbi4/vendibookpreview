# Homepage and payments conversion-copy rewrite

## Goal
Rewrite the current homepage, public payments page, and seller money center so Vendibook feels premium, concise, credible, and action-oriented while preserving all payment behavior and legal accuracy.

## What will change
- Replace all requested homepage copy in the existing layout: hero, search entry, PayPal and financing banners, listing rows, trust points, seller steps, editorial content, tools, transaction support, final action, and homepage search description.
- Reorder the public payments page copy around one organized transaction flow: walkthrough, agreement, PayPal checkout, and handoff records.
- Remove the large Purchase Protection warning section while retaining the vehicle limitation in the FAQ and bottom disclosure with PayPal’s current terms link.
- Simplify payment-method, Pay Later, seller setup, freight, responsibility, FAQ, and closing copy without changing checkout behavior or eligibility logic.
- Align the seller money center heading and PayPal setup language with customer-facing terms and remove internal partner-flow wording.

## Accuracy boundaries
- No changes to payment math, routing, readiness checks, checkout controls, financing destinations, legal routes, or payout behavior.
- No claims of guaranteed protection, financing, title verification, inspection, delivery, seller verification, automatic refunds, or live multiparty payouts.
- Keep Pay Later/WebBank and Purchase Protection disclosures concise and subordinate at the bottom of the public payments page.

## Verification
- Check the homepage, `/payments`, and `/dashboard/payments` at desktop and 390px mobile widths.
- Confirm the former large Purchase Protection headline is gone, while the limitation remains in the FAQ and bottom disclosure.
- Confirm no customer-facing “approved PayPal Partner flow” wording remains.
- Check for horizontal overflow, runtime errors, and production build status.
