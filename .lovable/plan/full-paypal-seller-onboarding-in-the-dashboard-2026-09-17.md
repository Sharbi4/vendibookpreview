# Full PayPal seller onboarding in the dashboard

## Build
- Keep the complete flow at **Dashboard → Payments → Payment setup**, without changing signup or publishing.
- Send sellers to PayPal from the dashboard and return them directly to the same setup page.
- Show one reliable progress flow for: not connected, opening PayPal, setup in progress, checking, action required, ready, revoked, disconnected, and unavailable.
- Replace toast-only failures with persistent, recoverable messages and clear retry actions; retain concise success confirmations.
- Show exact outstanding requirements from the real PayPal connection record, including email confirmation, payment receivability, permissions, and approval.
- Support resume, status refresh, disconnect, and reconnect without losing historical records.
- Keep listing online-payment activation after genuine readiness, with manual seller payouts unchanged.

## Technical details
- Correct the backend PayPal return URL to `/dashboard/payments/setup?paypal_return=1`.
- Return structured backend errors through the dashboard hook and connection panel instead of treating a failed lookup as a successful refresh.
- Consolidate readiness logic so the setup screen and badges use the same live backend status.
- Preserve the server-side feature gate, authenticated ownership checks, archived-account filtering, and safe logging.

## Verification
- Test authenticated dashboard states on desktop and mobile.
- Verify return URL cleanup, retry behavior, disconnect/reconnect presentation, and legacy `/account` return compatibility.
- Confirm type checking and the live preview build remain clean.

## Unchanged
- No multiparty routing, platform fees, automated payouts, payment math, checkout behavior, or signup changes.
