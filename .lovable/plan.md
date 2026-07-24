
## 1. Root cause of the current "continue to payment" failure

**Verified against live edge logs and DB.** The most recent invocations of `create-checkout` (2026-07-24 22:19:41–22:20:09 UTC) for listing `d02ec787-…` (Ready-to-Operate Food Trailer) all failed with:

```
[CREATE-CHECKOUT] ERROR - {"message":"Listing not found"}
```

That was thrown from this block:

```ts
const { data: listing, error: listingError } = await supabaseClient
  .from('listings')
  .select('host_id, title, cover_image_url, address, pickup_location_text, city, state, category, mode')
  .eq('id', listing_id).single();
if (listingError || !listing) throw new Error("Listing not found");
```

The previous session-turn hotfix removed `cancellation_policy` and `rules` from the select, and the next invocation at 22:21:09–22:21:11 **succeeded**: session `cs_live_a1VaO…` created with `url:null` (Stripe `ui_mode:'custom'`) and returned via `client_secret`.

So the immediate for-sale error the user hit is already resolved by the deployed `create-checkout`. That listing's host (`421aa58f-…`) has `stripe_account_id = acct_1TvTURPHSH1ohKiG` and `stripe_onboarding_complete = true` — no onboarding block is in play here.

However, the underlying weaknesses the user asked us to audit are real and should still be fixed. Everything below is scoped to defect / contract / UX fixes — no money-logic changes.

## 2. `ui_mode` vocabulary reconciliation

Verified end-to-end:

| Layer | Value passed | Behavior |
|---|---|---|
| `SaleCheckout` / `BookingCheckout` | `ui_mode: 'elements' \| 'hosted'` | based on `isEmbeddedCheckoutEnabled()` |
| `create-checkout` (server) | maps `'elements' → Stripe ui_mode:'custom'` (`return_url` only, no `success_url`/`cancel_url`); `'hosted' → success_url + cancel_url, no ui_mode` | correct |
| Return | `{ url: hosted? session.url : null, client_secret: elements? session.client_secret : null, ui_mode, session_id, … }` | matches what `EmbeddedStripeCheckout` and hosted redirect consume |

The mapping is correct; the string `'elements'` in the request just doesn't match the Stripe enum name (`custom`). That's fine because the mapping is centralized. **No functional mismatch, but I'll rename the client-facing token to `'custom'` (keeping `'elements'` as a backward-compatible alias) so the vocabulary is uniform across `SaleCheckout`, `BookingCheckout`, `isEmbeddedCheckoutEnabled`, `create-checkout`, and `EmbeddedStripeCheckout`.**

## 3. Function existence audit

All frontend-invoked payment functions exist under `supabase/functions/`:

`create-checkout`, `get-checkout-session`, `create-cash-sale`, `create-sale-transaction`, `create-notary-checkout`, `customer-portal`, `create-stripe-connect`, `check-stripe-connect`. No missing/orphan references.

## 4. Return-contract audit (severity)

| Function | Success shape | Error shape today | Severity |
|---|---|---|---|
| `create-checkout` | 200 `{url\|client_secret,ui_mode,session_id,customer_total,platform_fee,host_receives,terms_id,terms_version}` | Everything `throw`s → generic 500 `{error:message}`. Only `availability_conflict` returns 409 with `code`. Host-not-onboarded, owner-buying-own-listing, invalid input all leak raw 500. | **High** |
| `create-sale-transaction` | 200 payload / 200 dedupe | 500 `{error}` for "Payment not completed", "not an escrow sale", etc. — expected user-facing conditions | Medium |
| `create-notary-checkout` | 200 `{url}` | 500 `{error}` for "Unauthorized: You do not own this listing", "Proof Notary not enabled" | Medium |
| `customer-portal` | 200 `{url}` | 500 `{error}` for "No Stripe customer found" | Low |
| `create-stripe-connect` | 200 `{url}` | 500 `{error}` on validation failures | Low |
| `check-stripe-connect` | 200 status object | 500 `{error}` — currently only Stripe/API failures | Low |
| `get-checkout-session` | 200 `{session_id,payment_status,…}` | 500 `{error}` for missing `session_id`, non-owner access | Medium |
| `create-cash-sale` | 200 (uses shared JSON helper) | Currently owner-block / self-transaction / invalid returned as 400 via shared helper — already OK | OK |

Cross-cutting gaps:
- No stable `code` enum — client can't discriminate.
- Owner-buying-own-listing is **not** enforced server-side in `create-checkout` (frontend-only), which is a real hole.
- CORS headers present on error responses across all functions (verified) — no changes needed there.

## 5. Client error handling

`SaleCheckout` (and `BookingCheckout`) do:

```ts
const { data, error } = await supabase.functions.invoke('create-checkout', { body: … });
if (error) throw error;
if (data.error) throw new Error(data.error);
```

On a non-2xx, `supabase-js` sets `error` (a `FunctionsHttpError`) and `data` is null, so `data.error` is never read and the user sees "Edge function returned a non-2xx status code". We need to (a) read the JSON body off `error.context` and (b) branch on the returned `code` for user-friendly copy.

## Proposed fix plan

### A. `create-checkout` (Deno)
1. Introduce a `jsonError(status, code, message, extra?)` helper that always returns CORS + `{ error, code, ...extra }`.
2. Replace `throw new Error(...)` with structured returns for **expected** conditions:
   - `missing_fields` → 400
   - `unauthenticated` → 401
   - `listing_not_found` → 404
   - `owner_cannot_buy_own_listing` → 403  *(new server-side check: `listing.host_id === user.id`)*
   - `host_not_onboarded` → 409, message: *"This seller isn't set up to accept online payments yet. We've let them know — please check back soon."*
   - `availability_conflict` → 409 (already returns code; align shape)
   - `terms_draft_invalid` → 409
3. Keep unexpected failures as 500 `{ error, code: 'unknown_error' }`.
4. Normalize the request field to `ui_mode: 'custom' | 'hosted'` (accept `'elements'` as alias) and echo `ui_mode: 'custom' | 'hosted'` in the success body.

### B. Sibling functions
Apply the same `jsonError` helper + `code` enum to:
- `create-sale-transaction` (`session_not_found`, `payment_not_completed`, `not_escrow_sale`)
- `create-notary-checkout` (`not_owner`, `feature_not_enabled`, `listing_not_found`)
- `customer-portal` (`no_stripe_customer`)
- `create-stripe-connect` (`invalid_input`)
- `get-checkout-session` (`missing_session_id`, `session_not_found`, `not_owner`)

No changes to fee math, hold model, payout timing, escrow logic, or entitlements.

### C. Frontend error handling
1. Add `src/lib/edgeErrors.ts` with `readEdgeError(error): Promise<{ code?: string; message: string }>` that reads `error.context.body`/`error.context.json()` on `FunctionsHttpError`.
2. Add `src/lib/checkoutErrorCopy.ts` mapping code → title + description (e.g. `host_not_onboarded`, `availability_conflict`, `owner_cannot_buy_own_listing`, `terms_draft_invalid`, `payment_not_completed`, `unknown_error`).
3. Update `SaleCheckout.runPurchase` and `BookingCheckout` checkout callers to:
   - `await readEdgeError(error)` and toast the mapped copy.
   - On `host_not_onboarded`, additionally surface a small inline notice (not just toast) so the buyer isn't left staring at a dead "Continue to payment" button; offer "Message seller" as the escape hatch.
4. Rename `ui_mode: 'elements'` → `'custom'` in `SaleCheckout` and `BookingCheckout` callers.

### D. Feature-flag + component naming
- `isEmbeddedCheckoutEnabled()` return + docstring updated to say "Custom Checkout (Stripe ui_mode: 'custom')" for consistency; no behavior change.
- `EmbeddedStripeCheckout` stays as-is (already correctly documents `ui_mode: 'custom'`).

### Files touched (no money-logic changes)

```text
supabase/functions/create-checkout/index.ts        (structured errors + owner check + ui_mode alias)
supabase/functions/create-sale-transaction/index.ts (structured errors)
supabase/functions/create-notary-checkout/index.ts  (structured errors)
supabase/functions/customer-portal/index.ts         (structured errors)
supabase/functions/create-stripe-connect/index.ts   (structured errors)
supabase/functions/get-checkout-session/index.ts    (structured errors)
supabase/functions/_shared/jsonError.ts             (NEW helper)

src/lib/edgeErrors.ts                               (NEW: parse FunctionsHttpError body)
src/lib/checkoutErrorCopy.ts                        (NEW: code → toast copy)
src/pages/SaleCheckout.tsx                          (readEdgeError + code branch + inline notice)
src/pages/BookingCheckout.tsx                       (readEdgeError + code branch)
src/lib/featureFlags.ts                             (docstring only)
```

### Tests
- `supabase/functions/create-checkout/error_contract.test.ts` — asserts each expected `code` returns the right HTTP status and JSON shape.
- Extend `tests/e2e/cta_signed_in_destinations.py` with a mocked host-not-onboarded case that verifies a friendly toast + inline notice (no raw 500 string).

## Rollout / risks
- Zero schema changes. Zero money-logic changes. Backwards-compatible on the request side (`'elements'` still accepted). Response adds `code` — existing clients that only read `error`/`url`/`client_secret` continue to work.
- Verified after deploy: re-invoke `create-checkout` for the failing listing and confirm 200 with `client_secret`.
