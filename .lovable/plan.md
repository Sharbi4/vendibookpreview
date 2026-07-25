# Guided Checkout Redesign — Sale + Rental

Goal: replace today's "dump user into fields" flow with a considered, step-by-step, one-screen-at-a-time purchase experience worthy of a $3k–$100k+ transaction. Sale flow is authoritative; Rental mirrors the same pattern with rental-specific steps.

## Screens — SaleCheckout (5 steps)

1. **Confirm** — "Here's what you're buying"
   - Listing hero photo, title, city/state, price, seller name + verified badge, condition/specs summary.
   - Copy: "Take one more look before we continue."
   - No inputs. CTA: "Looks right — continue".

2. **Delivery** — "How do you want to get it?"
   - Three Turo-style selectable cards (1.5px cream border → 2px flame + tint when selected, roomy padding):
     - **Pickup** — "Free — you arrange pickup at {sellerCity}".
     - **Delivery** — inline ZIP-only field with reason microcopy; on ZIP entry, live estimate: `$4.50/mi × distance` (existing freight logic in `src/lib/shipping.ts`), stated as "Estimated $X — based on distance from {sellerCity} to {zip}".
     - **Freight** — "Quoted after purchase — typically $X–$Y for this size" when we can't calculate exactly; be honest about estimated vs fixed.
   - Running total updates live in sticky footer.

3. **Add-ons** — "Anything to add?"
   - Skippable list, none pre-selected. Each row: one-line benefit + price + toggle.
   - Inspection referral, notarization (if eligible), buyer-side extras only.
   - Explicit "No thanks, continue" secondary CTA.

4. **Details** — "Where should we send everything?"
   - Full legal name — "Used on your bill of sale".
   - Email — "Receipts, documents, and updates".
   - Phone — "So the seller can coordinate handoff".
   - Address — ONLY if delivery or freight selected. When Pickup, show: "Since you're picking up, we don't need a delivery address."
   - Every non-obvious field has WHY microcopy.

5. **Review & Agree**
   - Itemized cost breakdown (tabular numerals): item price, delivery (method named), add-ons, deposit vs balance, taxes/fees, **Total due now** separated from Total price.
   - Payment structure block (pay in full / deposit + balance / pay in person) with explicit amounts and timing.
   - Payment method selector (card / ACH / Affirm-Klarna-Afterpay) with Stripe messaging component showing monthly estimate.
   - Single agreement block: what's included, plain-language payment protection (never "escrow"), one-line cancellation and refund terms, links to full docs, ONE checkbox: "I understand and agree to these terms."
   - Pay button labeled with exact amount: "Pay $X,XXX now".

## Screens — BookingCheckout (4 rental steps)

1. **Dates & Duration** — pick dates/slots, running nightly/hourly rate shown live.
2. **Add-ons & Deposit** — cleaning fee, security deposit disclosed explicitly, optional protections.
3. **Your Details** — same WHY-microcopy pattern; address only if required by host.
4. **Review & Agree** — full breakdown: nightly × nights, cleaning fee, deposit (with "refundable after return"), taxes/fees, protection fee, cancellation policy stated in one line, single agreement checkbox, pay button with exact amount.

## Cross-cutting rules

- **Chrome:** shared `GuidedCheckoutShell` renders header ("Step N of M" progress + Back), main step slot, sticky footer with running total + primary CTA + persistent trust row (Stripe-secured · Payment protection · Free e-signature).
- **Never lose data:** all step state kept in a `useCheckoutState(sessionKey)` hook backed by `sessionStorage` keyed by listing id; returning restores furthest step + data.
- **Mobile:** each step full-screen; CTA fixed to bottom safe-area.
- **Verbiage:** every primary CTA describes the next action ("Choose delivery", "Add your details", "Review your order", "Pay $X now").
- **Errors:** inline, specific, never wipe input.
- **Money display:** all totals use `font-variant-numeric: tabular-nums`, Sofia headings, Manrope body.
- **Estimated vs fixed:** every estimate line reads "Estimated — {basis}".

## Files

**New**
- `src/components/checkout/GuidedCheckoutShell.tsx` — header, progress, back, sticky footer, trust row.
- `src/components/checkout/StepConfirmPurchase.tsx` — Sale step 1.
- `src/components/checkout/StepDeliveryMethod.tsx` — Sale step 2, cards + ZIP + live estimate.
- `src/components/checkout/StepAddOns.tsx` — Sale step 3.
- `src/components/checkout/StepBuyerDetails.tsx` — Sale step 4 (address conditional on delivery).
- `src/components/checkout/StepReviewAgree.tsx` — Sale step 5, breakdown + payment method + single agreement.
- `src/components/checkout/AgreementBlock.tsx` — reusable plain-language terms + one checkbox.
- `src/components/checkout/CostBreakdown.tsx` — itemized rows, tabular nums, deposit vs balance handling.
- `src/hooks/useCheckoutState.ts` — sessionStorage-backed step + form state.
- `src/components/booking/BookingStepDates.tsx`, `BookingStepAddOns.tsx`, `BookingStepDetails.tsx`, `BookingStepReview.tsx` — rental variants.

**Rewritten**
- `src/pages/SaleCheckout.tsx` — become a thin orchestrator around `GuidedCheckoutShell` + the 5 Step components; keep existing calls to `create-checkout` / `create-cash-sale` and terms gate untouched.
- `src/pages/BookingCheckout.tsx` — same orchestrator pattern with 4 rental steps; keep existing booking mutation and payment call.

**Reused as-is**
- `EmbeddedStripeCheckout`, `AffirmMessagingLine`, `TrustRow`, `PaymentProtectionBlock`, `PostPaymentTimeline`, `useTermsGate`, existing money/fee helpers in `src/lib/commissions.ts` and `src/lib/shipping.ts`, `create-checkout` / `create-cash-sale` / booking edge functions.

## Not changing

- Fee math, protection hold, payouts, entitlements.
- `useTermsGate` behavior.
- `create-checkout`, `create-cash-sale`, `manage-subscription`, or any Stripe edge function contract beyond what's already in flight.
- Backend / RLS / DB schema.

## Verification

- `tsgo --noEmit` clean at the end.
- Walk each step manually in preview: back preserves data, refresh restores step, running total updates, address field appears only for delivery/freight, agreement checkbox required to enable Pay button, Pay button shows exact amount.
