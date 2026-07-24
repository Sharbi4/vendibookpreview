
# Enterprise Polish for Embedded Checkout

Scoped to the already-built `EmbeddedStripeCheckout` (Custom Checkout via `CheckoutElementsProvider` + `useCheckout` + `PaymentElement`). No backend, webhook, or payment-hold changes. All new copy uses "payment protection" (never "escrow").

## Files changed

**Edit**
- `src/components/checkout/EmbeddedStripeCheckout.tsx` — add ExpressCheckoutElement row, skeleton loading, success checkmark, mapped decline errors, mobile bottom-sheet layout with sticky pay button + safe-area padding, ESC-close, focus trap.
- `src/pages/SaleCheckout.tsx` — build and pass `summary` node (cover, title, itemized lines, total, protection block, financing line, trust row) into `<EmbeddedStripeCheckout>`.
- `src/pages/BookingCheckout.tsx` — same summary integration for rental instant-book path (rental-specific lines: nightly/daily × units, service fee, tax).
- `src/lib/stripeAppearance.ts` — minor: add Express Checkout Element theme variables (button height/radius) so Apple Pay / Google Pay / Link match Satin Lux.

**New**
- `src/components/checkout/CheckoutOrderSummary.tsx` — reusable summary card (cover image, title, itemized lines, bold total) used by both Sale and Booking checkouts.
- `src/components/checkout/PaymentProtectionBlock.tsx` — compact assurance card. Sale card copy: "Your payment is protected. Funds are held securely and released to the seller only after you confirm the item is as described." Rental variant tuned for booking.
- `src/components/checkout/TrustRow.tsx` — stripe-wordmark-blurple, verified-badge, Visa/Mastercard/Amex/Discover glyphs (lucide `CreditCard` + inline SVG or existing PNGs), and a Lock + "256-bit encryption" note.
- `src/components/checkout/FinancingLine.tsx` — mounts Stripe's `<PaymentMethodMessagingElement>` for Affirm/Klarna/Afterpay near the total; falls back to a static "as low as $X/mo with Affirm" line if the element fails to load.
- `src/components/checkout/PaymentFormSkeleton.tsx` — shimmer skeleton mimicking Express row + tab strip + input rows.
- `src/lib/stripeErrorCopy.ts` — maps Stripe decline_code / code / type → `{ title, why, fix }`. Common: `card_declined/generic_decline`, `insufficient_funds`, `expired_card`, `incorrect_cvc`, `incorrect_number`, `processing_error`, `authentication_required`, `card_velocity_exceeded`, `fraudulent`. Fallback: generic calm copy.

## What each fix does

1. **Express row** — Above `PaymentElement`, mount `<ExpressCheckoutElement>` (from `@stripe/react-stripe-js`) inside the existing `CheckoutElementsProvider`. Handle `onConfirm` by calling `checkout.confirm()` (Custom Checkout wires the wallet result automatically). Add a hairline "or pay with card" divider between the row and the tabbed PaymentElement. If Express returns zero available methods (`onReady` reports none), the row hides itself so nothing shows empty.

2. **In-modal summary** — Both pages already compute `subtotal`, `deliveryFee`/`freight`, tax estimate, and `total`. Wrap those into a `CheckoutOrderSummary` node and pass via the existing `summary` prop slot. Renders inside the modal above the payment fields on desktop; on mobile it collapses into a sticky header with an expand toggle so total stays visible.

3. **Protection block + trust row** — Rendered below the summary, above the Express row. Uses `stripe-wordmark-blurple.png` and `verified-badge.png` already in `src/assets/`. Sale copy uses "payment protection" wording verbatim; rental variant adapts to booking release timing.

4. **Financing** — `<PaymentMethodMessagingElement>` mounted next to the total with `amount`, `currency: 'usd'`, `country: 'US'`, `paymentMethods: ['affirm','klarna','afterpay_clearpay']`. Redirect flow for approval is unchanged.

5. **Premium loading + success** — Replace `checkoutState.type === 'loading'` branch with `<PaymentFormSkeleton>`. Add a local `isSuccess` state; when `checkout.confirm()` returns `type: 'success'`, render a full-panel checkmark ("Payment confirmed") for ~900ms, then navigate to `returnUrl`. Entitlement remains webhook-driven — the success view is purely visual.

6. **Calm errors** — On `result.type === 'error'`, look up `stripeErrorCopy.ts` by `error.code` / `error.decline_code` and render a three-line panel (title, why, fix) inline. Modal stays open, PaymentElement state preserved (no remount). Example: `card_declined` → "Your bank declined this card. / Your bank blocked the charge — this can happen for security reasons. / Try another card or contact your bank."

7. **Mobile bottom sheet** — At `<md`, modal becomes `fixed inset-x-0 bottom-0 top-4 rounded-t-2xl`, body scrolls, sticky footer holds the pay button with `pb-[env(safe-area-inset-bottom)]`. Focus trap via `focus-trap-react` (already available via radix; if not, a small inline trap) and ESC-to-close via existing `onClose`. Summary total pinned to header.

## Apple Pay domain registration (required, one-time)

Apple Pay via ExpressCheckoutElement requires each domain that displays the button to be registered with Stripe. Steps for approval turn:

1. In Stripe Dashboard → Settings → Payment methods → Apple Pay → **Add new domain**, register:
   - `vendibook.com`
   - `www.vendibook.com`
   - `vendibookpreview.lovable.app`
2. Stripe returns a verification file per domain. Serve each at `/.well-known/apple-developer-merchantid-domain-association` on that exact host. Options:
   - Add the file(s) to `public/.well-known/` in the repo (simplest — works for the Lovable preview and both custom domains since all requests hit the same build).
   - Or use Stripe API `POST /v1/payment_method_domains` to register programmatically and let Stripe host verification.
3. Click **Verify** in the Dashboard until status = Verified.
4. Test in Safari on macOS/iOS — the wallet button only renders when the device has a saved card *and* the domain is verified. Google Pay / Link have no per-domain step.

I'll wait until you confirm the domains registered before flipping the Express row on for production; behind the scenes ExpressCheckoutElement will simply hide Apple Pay on unverified domains, so there's no user-visible break if we ship code first.

## Out of scope (intentionally)

- `create-checkout` edge function, `stripe-webhook`, entitlement grants, Connect payout logic, payment-hold state machine.
- Feature-flag / hosted-redirect fallback (already in place).
- Copy rewording elsewhere in the app.

## Approval

Reply "approved" (or with tweaks) and I'll implement in build mode. If Apple Pay domain registration should happen first, say so — I can prep the `.well-known` file drop as step 1.
