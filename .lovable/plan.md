# Trust-led Payments page rebuild

## Goal
Rebuild `/payments` around buyer confidence first, while preserving the existing official PayPal artwork, Pay Later education, seller onboarding clarity, FAQs, and legal disclosures.

## What will change
- Replace the funding-first opening with the requested trust-led headline, restrained official PayPal attribution, and existing PayPal app artwork.
- Move payment methods below a new protection/process sequence and an upfront Purchase Protection limitation.
- Preserve the existing Pay in 4, Pay Monthly, trailer-under-$10,000, “no Pay in 12,” Freight, and disclosure content.
- Reframe the PayPal/Vendibook responsibilities, seller section, FAQ, closing action, and legal links.
- Add the four requested FAQs to the existing FAQPage structured data.
- Remove inaccurate wording that says Vendibook holds or releases money.
- Refine spacing, hierarchy, mobile flow, and restrained visual treatment using existing design tokens.

## Accuracy boundary
The current product does not yet implement a recorded-walkthrough artifact as a sale condition, PayPal delayed disbursement, automatic 10-day refunds, or automatic release after both signatures. Those requested claims will not be presented as live protections. The page will describe only the payment, agreement, transaction-record, and support behavior currently enforced. Existing PayPal and Venmo marks will remain official and unaltered.

## Verification
- Search the rebuilt page for prohibited custody/release wording.
- Confirm all FAQ entries are included in FAQPage JSON-LD.
- Check desktop and 390px mobile layouts in the running preview.
- Run TypeScript and production-build checks.
