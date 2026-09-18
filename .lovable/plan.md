# Bounded checkout wizard refactor

## Build
- Bound the desktop sale/rental wizard to the viewport, keep its heading/navigation/footer fixed, and scroll only the active step body.
- Add internal-scroll reset on step changes and preserve natural mobile document scrolling.
- Add wizard mode to the shared checkout shell with a compact heading, fixed-width main column, sticky independently scrolling summary rail.
- Remove review-stage-owned actions in wizard use, provide a Back to listing footer action, remove duplicate pickup copy, and remove financing from Payment.
- Tighten full and compact financing banners.
- Split rental verification into a reusable compact Step 3 panel while leaving Step 4 for cancellation and the two primary agreements only; preserve existing verification calls and completion gates.

## Validation
- Exercise real sale and rental routes at 1280×768, 1280×800, 1280×900, and 390px.
- Verify every step separately, internal desktop scrolling, visible footer, no duplicate controls/copy, and mobile overflow.
- Run checkout-focused tests and inspect the automatic build result.

## Technical details
- No pricing, PayPal, offer, tax, freight, availability, legal persistence, SignNow, authentication, or access-control logic changes.
