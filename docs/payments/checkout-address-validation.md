# Checkout address validation

## Coverage

The shared `CheckoutAddressCheck` checks rental contact, rental delivery, purchase seller-delivery, purchase freight and PayPal advanced-card billing addresses. US street inputs also offer existing Google Places suggestions. International billing retains its country selector and uses that country in the validation request. Provider-hosted PayPal wallet/standard-card address entry remains controlled by PayPal.

`validate-checkout-address` calls Google's Address Validation API server-side. It verifies the signed-in user, limits checks per user, sends only postal fields, times out provider requests and omits submitted addresses and credentials from logs. Google service credentials never reach the browser. No database migration is needed.

## Customer behavior

- Check address explicitly before proceeding.
- Complete premise/subpremise verdicts without unresolved issues can proceed.
- Google corrections require the customer to choose the suggested address; apartment/suite details remain visible for review.
- Missing, suspicious or insufficiently precise addresses require correction.
- Any address edit invalidates the previous check. Late responses for other input are ignored.
- During a provider/deployment outage, the customer may explicitly confirm the entered address. The UI clearly says Google verification was unavailable; it never reports this as Google-verified.
- Pickup does not require a delivery address. Validation does not bypass freight quoting or delivery-radius checks. A corrected freight address triggers a fresh quote.

This is an address-quality aid, not identity verification or a security authorization decision. Raw card details remain inside PayPal's hosted fields.

## Deployment through Lovable

Use the existing **Vendibook Marketplace** Lovable project `f4d8586e-de66-4307-b052-b071b734f592`, whose `supabase/config.toml` identifies backend `nbrehbwfsmedbelzntqs`. Do not use the unrelated direct Supabase connector.

1. Sync the tested changes from `fix/paypal-webhook-config` while preserving concurrent project changes.
2. Deploy `validate-checkout-address` and its shared dependencies, and the updated `geocode-location` (structured Google address components, no query-address logs).
3. Enable Google's Address Validation API for the server credential's Google project. Prefer `GOOGLE_ADDRESS_VALIDATION_API_KEY`; then `GOOGLE_API_KEY` (verified working 2026-10-10), then `GOOGLE_MAPS_API_KEY` (rejected by this API as API_KEY_INVALID). Restrict the credential appropriately server-side; do not expose it through a frontend environment variable. Google Places/Geocoding permission alone does not enable Address Validation.
4. The new function uses `verify_jwt=false` at the gateway and validates the bearer token using `auth.getUser` inside the handler. Keep this custom authentication in place.
5. Verify an unauthenticated request is rejected and an authenticated public sample address returns Google's accept/confirm/fix result. Verify missing unit, corrected postcode, stale input and outage handling. Do not use private customer addresses for smoke tests.
6. Publish the frontend only after checking the backend deployment and live API response. A Git push alone is not deployment evidence.

## Focused verification

Tests cover Google verdict interpretation, corrections, outage confirmation, stale responses, rental-contact save gating, sale delivery/freight gating, pickup, hosted card-field stability and rental Details navigation. Use one test worker on the local Windows machine to avoid unnecessary memory pressure.

Official references: [Google checkout address workflow](https://developers.google.com/maps/architecture/ecommerce-checkout-address-validation), [validation decisions](https://developers.google.com/maps/documentation/address-validation/build-validation-logic), [REST request](https://developers.google.com/maps/documentation/address-validation/reference/rest/v1/TopLevel/validateAddress).
