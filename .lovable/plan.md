## Root causes first

**1. Why the Delivery step feels empty**
`PurchaseStepDelivery` only renders a card per method in `fulfillmentOptions`. For a listing with a single fulfillment type (e.g. delivery-only, no fee, no radius) the entire step collapses to: one plain radio-styled card + "Back / Continue" — no explainer, no ETA, no "what happens next", no address input when pickup-only. When `deliveryFee = 0` and `deliveryRadiusMiles = null`, the card's subtitle is literally "Seller delivers to you." with a green "FREE" chip. That's the whole step. Reads cheap on an $80k asset.

**2. Why Affirm / Afterpay don't render**
`EmbeddedStripeCheckout` uses `ui_mode: 'custom'` via `CheckoutElementsProvider`. In custom checkout the enabled payment methods are set **server-side** at Session creation via `payment_method_types` / automatic payment methods on the Checkout Session. Nothing in `create-checkout` opts BNPL in, and the `PaymentElement` here has no `PaymentMethodMessagingElement`, so "from $X/mo" never shows even when the method is eligible. Also needs verification that Affirm + Afterpay are activated in the Stripe Dashboard for the platform account, currency is USD, buyer country US, and amount within each method's min/max ($50–$30k Affirm, $1–$2k Afterpay typical). Diagnosis is code-side confirmed; dashboard activation is unverified until we can inspect the Stripe account.

---

## New immersive step map

Full-screen flow launched from Buy Now. Site `Header`/`Footer` hidden. Top chrome = Vendibook logo + Secured/Protected badge + labeled progress bar with checkmarks. Persistent right-rail order summary (collapsible bottom sheet on mobile). Framer-motion fade + slide between steps, gated on `prefers-reduced-motion`.

| # | Step | Purpose | Reuse | New |
|---|------|---------|-------|-----|
| 1 | **Your order** | "Here's what you're buying." Cover, real title, category, key specs, city/state, seller, what's included, price snapshot, buyer-protection banner, **Terms checkbox lives here** (unchecked, affirmative) | `useTermsGate` state, listing data | `PurchaseStepOrder` |
| 2 | **How you'll get it** | Enriched delivery/pickup — always full (see below) | `PurchaseStepDelivery` (extended) | Method explainer blocks, ETA rows, "what to expect after checkout" |
| 3 | **Add-ons & protection** | Protection + financing highlight. **Skipped** when no protection eligibility AND no BNPL eligibility — folded into Review instead of showing bare | `ProtectionOptInCard`, `FinancingLine` | `PurchaseStepAddons` wrapper with skip-if-empty logic |
| 4 | **Your details** | Contact + billing address, grouped/validated, prefilled | `PurchaseStepInfo` (regrouped) | Section headers, autofill from profile |
| 5 | **Review & pay** | Comprehensive summary + branded embedded payment + "What happens after you pay" 4-step + Questions link | `PurchaseStepReview`, `EmbeddedStripeCheckout`, `FinalReviewSheet` + `useTermsGate` | `PostPaymentTimeline`, "payment protection" copy |

Terms checkbox moves to Step 1; the `FinalReviewSheet` acknowledge-terms gate before charge stays exactly as-is.

BookingCheckout gets the same chrome + step map, mapped to its own step components (rental variant of Step 1 shows dates + slot; Step 2 is pickup/return logistics; Step 3 optional insurance; Step 4 renter details; Step 5 review + pay).

### Fixing the empty Delivery step

Every method card, even when it's the only one, renders:

- Icon + method name + one-line plain description
- **ETA/timeline row** ("Ready in ~24h", "7–10 business days", etc.)
- **Fee row** (or FREE) with a "what affects this?" popover
- **Explainer block** (Freight: `FreightInfoPopover` inline as a "How Vendibook Freight works" link; Delivery: "What affects the delivery fee"; Pickup: "How pickup coordination works")
- **Address autocomplete** with zone/distance check for `delivery`, live freight quote for `vendibook_freight`, and for `pickup` a read-only pickup city/state block + "You'll coordinate the exact address in Messages" note
- **"What to expect after checkout"** 3-bullet strip pinned at the bottom of the step

Single-method listings get the same treatment (no radio affordance, just a labeled "Delivery method" card).

---

## Look

- Font: read `tailwind.config.ts` + `src/index.css` for real heading/body families, reuse them, pipe body family into `stripeFonts` so `PaymentElement` matches. No new font.
- Panels: existing dark card + `bg-card/70 backdrop-blur-md border-border/60` frosted-glass treatment; hairline borders.
- One flame `#FF5124` ember glow on the order-total card in the summary only (radial gradient + soft shadow).
- Persistent trust row (Stripe secured / buyer protection / encrypted) under the summary and in the payment modal.
- Never use `text-white`/`bg-black`; only semantic tokens.

---

## Affirm / Afterpay fix

Server (`create-checkout`, sale + card path):
- Set `payment_method_types: ['card', 'affirm', 'afterpay_clearpay', 'klarna', 'link']` when currency USD and amount in range, else `automatic_payment_methods: { enabled: true }`.
- Add short min/max guard per method so we don't ask Stripe for an ineligible method.
- No change to fees/hold/payout logic.

Client (`EmbeddedStripeCheckout`):
- Add `PaymentMethodMessagingElement` above the `PaymentElement` with `amount`, `currency: 'usd'`, `countryCode: 'US'`, `paymentMethods: ['affirm','afterpay_clearpay','klarna']` so "from $X/mo with Affirm" renders pre-selection.
- Keep `PaymentElement layout: 'tabs'` — tabs will show whichever methods the Session enables.

Also flag for user: verify Affirm + Afterpay are **activated in the Stripe Dashboard for the connected platform account**; if not activated there, no code change will surface them.

---

## File-by-file diff plan

**New files**
- `src/components/checkout/CheckoutChrome.tsx` — full-screen shell: logo, secured badge, labeled progress bar with checks, back-to-listing exit, hides site header/footer.
- `src/components/checkout/OrderSummaryRail.tsx` — persistent rail wrapping `StickySummary` + `TrustRow`, ember-glow total card, mobile collapsible bottom sheet.
- `src/components/purchase-wizard/PurchaseStepOrder.tsx` — Step 1 "Your order" with terms checkbox.
- `src/components/purchase-wizard/PurchaseStepAddons.tsx` — Step 3 wrapper; owns skip-if-empty decision.
- `src/components/checkout/PostPaymentTimeline.tsx` — 4-step "What happens after you pay" strip.
- `src/components/checkout/MethodExplainerBlock.tsx` — reusable ETA + fee + explainer sub-block for delivery cards.
- `src/components/booking-wizard/BookingStepOrder.tsx`, `BookingStepLogistics.tsx`, `BookingStepAddons.tsx`, `BookingStepDetails.tsx` (mirror step map on rental side; may reuse existing sub-fragments from `BookingCheckout.tsx`).

**Modified**
- `src/pages/SaleCheckout.tsx` — swap `Header`/`Footer` for `CheckoutChrome`, add 2 new steps to `CHECKOUT_STEPS`, move terms checkbox out of Review into Step 1, add skip-empty logic for Addons step, mount `OrderSummaryRail` + `PostPaymentTimeline`.
- `src/pages/BookingCheckout.tsx` — same chrome + step map for rentals; keep existing money math and terms gate.
- `src/components/purchase-wizard/PurchaseStepDelivery.tsx` — always render full method block (icon/name/ETA/fee/explainer/address/next-steps) including when only one option exists; add pickup city/state read-only block.
- `src/components/purchase-wizard/PurchaseStepReview.tsx` — remove terms checkbox (now Step 1), add `PostPaymentTimeline`, "Questions? Contact us" link, replace any "escrow" copy with "payment protection".
- `src/components/purchase-wizard/PurchaseStepInfo.tsx` — regroup as Contact / Billing address sections, prefill from profile.
- `src/components/checkout/EmbeddedStripeCheckout.tsx` — inject `PaymentMethodMessagingElement`, pass body font into `stripeFonts`.
- `src/lib/stripeAppearance.ts` — extend `stripeFonts` with the real body font family/URL so Payment Element matches site type.
- `supabase/functions/create-checkout/index.ts` — sale card path: add `payment_method_types` including `affirm`/`afterpay_clearpay`/`klarna` when USD + eligible, with min/max guards. **No fee, commission, payer, hold, payout, or entitlement change.**

**Untouched (explicit)**
- `useTermsGate`, `buildTerms`, `FinalReviewSheet` behavior
- `create-cash-sale` money logic
- Commission / hold / payout / entitlements
- `create-checkout` return contract (already fixed in prior turn)

---

## Open questions before edits

1. Confirm Affirm + Afterpay are activated in the Stripe Dashboard for the platform account. If not, code changes won't surface them.
2. BookingCheckout mirror: keep as a follow-up commit in the same PR, or ship SaleCheckout first and mirror in a second pass? (Recommend same PR; scope is symmetric.)
3. `PaymentMethodMessagingElement` shows "from $X/mo" — OK to render on Step 5 above the payment card (and optionally inline on Step 3 financing highlight)?

Waiting for approval — no files will be edited until you confirm.
