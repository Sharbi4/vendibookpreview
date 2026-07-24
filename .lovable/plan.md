## Goal
Move buyers off Stripe's hosted checkout page and onto an embedded, brand-native payment surface on vendibook.com, without touching any money/webhook/Connect logic in the backend. Keep the current hosted redirect path behind a feature flag as a safety fallback.

## Current-state facts (verified this turn)
- `supabase/functions/create-checkout/index.ts` builds a full Checkout Session (automatic_tax, `billing_address_collection: 'required'`, `payment_method_types: ['card','us_bank_account','affirm','klarna','afterpay_clearpay']` for sales; card/affirm/klarna/afterpay for rentals), rich `payment_intent_data.metadata` (buyer/seller/host ids, escrow, platform_fee, terms_id, freight, referral, deposit) and returns `{ url, session_id, customer_total, ... }` today. `success_url` already uses `?session_id={CHECKOUT_SESSION_ID}`. Sale flow is escrow (no `transfer_data`); rentals also hold funds on platform.
- `src/pages/SaleCheckout.tsx` and `src/pages/BookingCheckout.tsx` call `supabase.functions.invoke('create-checkout')` and then `window.open(data.url, '_blank')` / `window.location.href = data.url` to hand off to Stripe's hosted page.
- `src/components/checkout/CheckoutOverlay.tsx` is currently a "redirecting to Stripe" spinner — it will be repurposed to host the embedded surface.
- No Stripe JS SDK is currently installed on the client. `VITE_STRIPE_PUBLISHABLE_KEY` is not yet in `.env`.

## Stripe SDK naming (verified against docs this turn)
Custom Checkout with the Payment Element is `ui_mode: "elements"` on the Checkout Session (NOT the older `ui_mode: "custom"`). Client side uses `CheckoutElementsProvider` (from `@stripe/react-stripe-js/checkout`), initialized with the session's `client_secret`, and payment is confirmed via `checkout.confirm()`. The Session `return_url` receives the buyer after redirect-based methods (Affirm/Klarna/Afterpay) and after successful confirm. Appearance API + `fonts` option are passed to `loadStripe`/provider options exactly like standard Elements.

## Files to change

### Backend (minimal, no money-logic changes)
- `supabase/functions/create-checkout/index.ts`
  - Accept a new body flag `ui_mode?: 'hosted' | 'elements'` (default `'elements'`).
  - When `elements`: set `ui_mode: 'elements'`, replace `success_url`/`cancel_url` with `return_url: ${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}${escrow ? '&escrow=true' : ''}`. Keep `payment_method_types`, `automatic_tax`, `billing_address_collection`, all `metadata` and `payment_intent_data.metadata`, idempotency, and application-fee/Connect logic identical.
  - When `hosted`: existing behavior unchanged (fallback path).
  - Return `client_secret` (in addition to existing `session_id`, `customer_total`, `platform_fee`, `host_receives`, `terms_id`). Keep `url` populated only in `hosted` mode.

### Frontend – dependencies & env
- `package.json`: add `@stripe/stripe-js` and `@stripe/react-stripe-js`.
- `.env` (user-managed): add `VITE_STRIPE_PUBLISHABLE_KEY` (publishable key is safe in client bundle).
- `src/lib/stripeClient.ts` (new): singleton `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)`.
- `src/lib/featureFlags.ts` (new or extend): `EMBEDDED_CHECKOUT_ENABLED` flag (default `true`, overridable via `localStorage` for kill-switch).
- `src/lib/stripeAppearance.ts` (new): Appearance API object with theme `night`, brand variables (`fontFamily: 'Poppins, system-ui, sans-serif'`, `colorPrimary #FF5124`, `colorBackground #141416`, `colorText #F5F5F5`, `colorTextSecondary #A1A1AA`, `colorTextPlaceholder #6B6B72`, `colorDanger #F26D6D`, `borderRadius: '12px'`), plus `rules` for `.Input`, `.Input:focus` (with orange focus ring via `boxShadow`), `.Tab`, `.Tab--selected`, `.Label`, and floating labels via `variables.labelFloating: true` / rule tweaks. Also exports the `fonts` array loading Poppins from `https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap` so it renders inside Stripe's iframe.

### Frontend – new embedded checkout component
- `src/components/checkout/EmbeddedStripeCheckout.tsx` (new):
  - Props: `{ clientSecret, onComplete, onError }`.
  - Wraps children in `CheckoutElementsProvider` (from `@stripe/react-stripe-js/checkout`) with `stripe`, `options: { clientSecret, appearance, fonts }`.
  - Renders `<PaymentElement layout="tabs" />` and a "Pay $X" button that calls `useCheckout().confirm()`; surfaces `error.message` and disables while `isLoading`.
  - Handles redirect PM's (Affirm/Klarna/Afterpay) naturally — Stripe redirects to `return_url`; the component just triggers confirm.

### Frontend – repurpose CheckoutOverlay
- `src/components/checkout/CheckoutOverlay.tsx`:
  - Replace the "redirecting" spinner with a full-screen branded modal (Satin Lux surface, hairline borders, orange accents) that mounts `EmbeddedStripeCheckout` above the existing order summary/terms slot.
  - New props: `{ isVisible, clientSecret, orderSummary?: ReactNode, onClose, onComplete }`. Keep `isVisible`/`message` back-compat for callers that pass them.
  - Only shown when `clientSecret` is set; otherwise renders the old "redirecting" state for fallback path.

### Frontend – wire into flows
- `src/pages/SaleCheckout.tsx`:
  - When flag on: call `create-checkout` with `ui_mode: 'elements'`, receive `client_secret`, open `CheckoutOverlay` with the embedded surface. Existing terms gate + order summary components remain — pass them into the overlay's `orderSummary` slot.
  - When flag off: keep current `window.open(data.url)` behavior.
- `src/pages/BookingCheckout.tsx`: same treatment; keep iframe-aware fallback path (`window.open('about:blank')`) intact only for hosted mode.
- `src/pages/PaymentSuccess.tsx`: no functional change required — it already reads `session_id`. Entitlements stay webhook-driven; success page only confirms UI.

### Stripe Dashboard branding (out-of-code)
- Set brand logo, dark background, orange primary button, rounded shapes in **Stripe Dashboard → Settings → Branding** and **Public Details** for both test and live. This affects hosted receipts, refund emails, and any Stripe-side surface (e.g., Affirm redirect). No repo change.

## Edge cases / risks
- **Automatic tax:** unchanged. `automatic_tax` + `billing_address_collection: 'required'` continue to work in `ui_mode: 'elements'`; tax is recalculated when the buyer edits the billing address in the Payment Element.
- **Connect:** we don't use `transfer_data` today (escrow model) — nothing to migrate. `payment_intent_data.metadata` stays intact so `stripe-webhook` continues to key off buyer/seller/terms ids exactly as it does now.
- **Apple Pay / Google Pay:** require the site to be served over HTTPS with the Stripe domain association file at `/.well-known/apple-developer-merchantid-domain-association`. The vendibook.com production domain must be registered under **Stripe → Payment method domains** before Apple/Google Pay tabs will appear on the embedded PE.
- **Affirm / Klarna / Afterpay:** always redirect to the provider — expected. `return_url` brings the buyer back to `/payment-success?session_id=...`; the existing PaymentSuccess page + webhooks handle finalization.
- **us_bank_account (ACH):** in embedded PE this uses Financial Connections + microdeposits; the confirm flow can enter a `requires_action`/`processing` state. The success page must tolerate `processing`/`pending` — no code change needed since entitlements are webhook-driven.
- **Iframed preview:** `BookingCheckout` today opens a new tab when embedded in an iframe. In embedded mode we don't need that hack — the PE mounts in-page and works inside iframes.
- **Idempotency:** `create-checkout` idempotency key logic is untouched; adding `ui_mode` to the request body doesn't affect it.
- **CSP:** if a Content-Security-Policy is added later, it must allow `https://js.stripe.com`, `https://api.stripe.com`, `https://m.stripe.network`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`.

## Rollout
1. Land backend change (`ui_mode` param + `client_secret` in response) — backwards compatible since default can start at `'hosted'` for the first deploy.
2. Ship SDK, appearance, and embedded component behind `EMBEDDED_CHECKOUT_ENABLED=false`.
3. Flip default in `create-checkout` and the flag to `true` after smoke test on sale + rental + Affirm redirect.
4. Keep `hosted` mode as fallback for one release cycle; instructions in `CheckoutOverlay` catch mount errors and auto-fallback to `window.location.href = url` if a hosted `url` is also returned.

Waiting for approval before editing.