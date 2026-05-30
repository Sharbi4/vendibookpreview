## Goal

Make the full Vendibook transaction feel effortless and trustworthy — from browsing → request → payment → host approval → completion → funds released — for both the customer and the host/seller. Pure UX, copy, and visual polish. **No changes to Stripe checkout, webhook, payout, or commission logic.**

## Guiding principles

- One vocabulary, used everywhere (customer and host side, rentals and sales).
- Trust copy stays short and reassuring — never legalistic.
- Every screen tells the user what *just* happened and what's *next*.
- Satin Lux aesthetic preserved (dark charcoal, near-white text, orange CTAs, hairline borders, glass surfaces). No new color systems.

---

## 1. Unified status vocabulary

Adopt the wording you specified across rentals and sales:

| Phase | Customer label | Host/Seller label |
|---|---|---|
| Just submitted | Request Sent | New Request |
| Host hasn't decided | Awaiting Approval | Action Needed — Approve or Decline |
| Host approved, awaiting checkout | Awaiting Payment | Awaiting Buyer Payment |
| Paid, before service date | Payment Secured · Booking Confirmed | Payment Secured — Booking Confirmed |
| Service date arrived | Happening Now | Happening Now |
| Ended, awaiting confirmation | Awaiting Completion | Confirm to Release Funds |
| Done | Completed | Funds Released |
| Dispute open | Dispute Open | Dispute Open |

Implementation: update labels and descriptions in `src/components/dashboard/BookingPhaseIndicator.tsx` (phase taxonomy is already correct). Replace the local `StatusBadge` in `ShopperBookingCard.tsx` and `StatusPill` in `BookingRequestCard.tsx` / `SaleTransactionCard.tsx` with a single shared `TransactionStatusPill` component reading the same vocabulary.

## 2. Shared trust strip

New `src/components/trust/SecurePaymentStrip.tsx` — a slim horizontal strip with three icons + short copy:

- 🛡️ Payment securely held by Vendibook
- ✓ Released after both sides confirm
- ⚡ Protected for buyer and host

Reused in:
- Listing-detail booking widget (`EnhancedBookingSummaryCard`, `RentalBookingWidget`)
- Booking wizard review step (`BookingWizard`)
- Purchase wizard review step (`PurchaseStepReview`)
- Inquiry form (`EnhancedInquiryForm`)
- Payment success page
- Checkout overlay (replacing the busy SSL / Stripe / encryption badges)

Copy bank (one source of truth, used everywhere):
- "Your payment is securely held until the booking is complete."
- "Funds are released after both sides confirm."
- "Vendibook protects both sides of the transaction."

## 3. Checkout overlay refresh

`src/components/checkout/CheckoutOverlay.tsx`: replace the Stripe-purple ripple, orbiting lock, and bouncing dots with a calmer Satin Lux treatment — single soft shield icon, hairline progress bar, one line of reassurance ("Your payment will be securely held until your booking is complete"). Keep the redirect mechanic and the existing `isVisible`/`message` API untouched.

## 4. Per-step "what's next" helper copy

Add short helper sentences (italic muted text under section headers, ~12 words) so customers always know the next step:

- `BookingWizard` (rental): under each step header — Dates ("Pick when you need it"), Details ("Tell the host how you'll use it"), Documents ("These keep your booking compliant"), Review ("Confirm and pay — funds stay protected"), Confirmation ("We've sent the request. The host responds within 24h.").
- `PurchaseStepInfo / Delivery / Review`: same pattern.
- `EnhancedInquiryForm`: a single "The host typically responds within a few hours" line.
- `RentalBookingWidget` collapsed state: "Request now, pay only after the host approves."

## 5. Payment confirmation pages

- `src/pages/PaymentSuccess.tsx` (or the existing equivalent): lead with "Payment secured ✓" plus the new trust strip and a 3-step "What happens next" ladder (1. Host confirms · 2. You enjoy your booking · 3. Funds release after completion).
- `src/pages/PaymentCancelled.tsx` (92 lines): soften copy, add "Your card was not charged" reassurance, and a single CTA back to the listing.

## 6. Host & seller dashboard clarity

In `BookingRequestCard.tsx` and `SaleTransactionCard.tsx`:

- Replace ad-hoc status pills with the shared `TransactionStatusPill` (item 1).
- Add a single-line **Next action** banner at the top of each card derived from phase:
  - pending → "Action needed: approve or decline this request."
  - approved, unpaid → "Waiting on the buyer to complete payment."
  - paid, upcoming → "Payment secured. Get ready for the booking."
  - ended_awaiting_confirmation → "Confirm completion to release your payout."
  - completed → "Funds released to your payout account."
- Mirror the customer-side phase indicator visually so both sides see the same progress.

## 7. Booking-detail trust polish

`EnhancedBookingSummaryCard` and `RentalBookingWidget`: place the new `SecurePaymentStrip` directly above the primary CTA, replacing the various scattered "Secure checkout" / "Affirm/Afterpay" / "Stripe-secured" snippets with one consistent block. Keep the Affirm/Afterpay badges, just group them.

## 8. Mobile responsiveness pass

- Confirm every new strip/banner stacks gracefully under 380px.
- Bottom-sheet padding audit on `BookingWizard` and `RequestDatesModal` (already known to need the 16px input rule).
- Ensure dashboard cards' "Next action" banner doesn't clip when stacked.

---

## What is explicitly NOT changing

- Stripe checkout sessions, edge functions, webhook flow, payout timing (24h rentals / 25d sales), commission math (12.9% / 12.9%).
- Database schema, RLS, status enums, transaction creation flow.
- Listing wizard, search, messaging, identity verification.
- Routing, auth, or any business rule from memory.

## Files touched (estimate)

```text
new   src/components/trust/SecurePaymentStrip.tsx
new   src/components/shared/TransactionStatusPill.tsx
new   src/lib/transactionVocabulary.ts          (labels + helper-copy source of truth)
edit  src/components/dashboard/BookingPhaseIndicator.tsx
edit  src/components/dashboard/BookingRequestCard.tsx
edit  src/components/dashboard/SaleTransactionCard.tsx
edit  src/components/dashboard/ShopperBookingCard.tsx
edit  src/components/checkout/CheckoutOverlay.tsx
edit  src/components/listing-detail/BookingWizard.tsx
edit  src/components/listing-detail/RentalBookingWidget.tsx
edit  src/components/listing-detail/EnhancedBookingSummaryCard.tsx
edit  src/components/listing-detail/EnhancedInquiryForm.tsx
edit  src/components/purchase-wizard/PurchaseStepInfo.tsx
edit  src/components/purchase-wizard/PurchaseStepDelivery.tsx
edit  src/components/purchase-wizard/PurchaseStepReview.tsx
edit  src/pages/PaymentCancelled.tsx
edit  src/pages/PaymentSuccess.tsx               (locate exact file during build)
```

Roughly 3 new files and ~14 surgical edits. No migrations, no edge-function changes.

## Verification after implementation

1. Run through a rental: listing → request dates → wizard → checkout overlay → payment-success → host approves in dashboard → mark complete. Confirm the status vocabulary is consistent at every step on both sides.
2. Same for a purchase via `PurchaseStep*`.
3. Mobile viewport (375px) walkthrough of the same two flows.
4. Spot-check that no Stripe call signatures, webhook handlers, or DB columns were touched.
