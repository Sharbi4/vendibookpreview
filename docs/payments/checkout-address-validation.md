# Checkout address entry

## Current behavior (owner decision 2026-10-13)

Checkout no longer shows a separate "Check your address with Google" box, and no checkout step waits on a
Google Address Validation result. This applies to rental contact, rental delivery, purchase seller-delivery,
purchase freight and PayPal advanced-card billing addresses.

What stays:

- US street fields keep Google Places suggestions while typing (`AddressAutocomplete`). Choosing a suggestion
  fills street, city, state and ZIP.
- Required-field checks still apply (street, city, state, ZIP where the form asks for them).
- Freight still needs a complete address and a live quote. Seller delivery still enforces the delivery radius.
  Pickup needs no delivery address.
- Raw card details stay inside PayPal's hosted fields.

## Server function

`validate-checkout-address` (Google Address Validation API) is still deployed but nothing in the app calls it.
It can be removed from the backend in a later cleanup, or wired back in if the owner wants verification again.
The original build was commit `6fb0817f4`; the check box was removed on 2026-10-13.
