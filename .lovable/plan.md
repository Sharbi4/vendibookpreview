# Monetization / Upgrade Server Action Entitlement Audit

## What I checked
Every server action that either **sells access** or **spends paid capability** on the caller's behalf.

| Function | Sells / spends | Uses unified helper today | Gap |
|---|---|---|---|
| `create-monetization-checkout` | Sells tier subs, weekly pass, tool unlocks, add-ons | none | **Yes — no entitlement check; user can double-buy something they already own** |
| `create-featured-checkout` | Sells stacking boost days | n/a — stacking is by design | none |
| `create-notary-checkout`, `create-freight-checkout`, `protected-sale-deposit-checkout` | Per-transaction add-ons, not entitlements | n/a | none |
| `manage-subscription` | Cancel / reactivate own sub | JWT ownership + `jsonError` | none |
| `admin-monetization-grant` / `-refund` | Admin overrides | admin role gate | none |
| `ai-tools`, `ai-web-research`, `ai-equipment-guide`, `ai-marketing-creator` | Spend AI credits | `gateToolAccess` → **402 `tool_locked`** | shape drift |
| `generate-ad-copy`, `suggest-pricing`, `generate-listing-insights`, `generate-ai-insights`, `ai-negotiation-coach`, `ai-listing-creator` | Spend AI credits | `resolveHostTier` + `tierRequiredBody` → **403 `entitlement_required`** | shape drift |

Two real issues fall out:

1. **Missing guard on `create-monetization-checkout`.** A Growth subscriber can be charged again for the Pro Weekly Pass, or for `tool_pricepilot` that their subscription already unlocks. The helper (`resolveHostTier`, `resolveToolAccess`) exists but the checkout doesn't call it.
2. **Inconsistent permission-error shape.** Two roughly-equivalent responses coexist: `402 { error, code:'tool_locked', tool, upgrade_url }` vs `403 { error, code:'entitlement_required', requires, current, upgrade_url }`. Client tolerates both, but any new function has to guess which pattern to copy.

## Plan

### 1. Guard `create-monetization-checkout`
After loading the product and before creating any Stripe session:

- Derive `productKind` from the product row:
  - `subscription` — `billing_type === 'recurring'`
  - `weekly_pass` — slug contains `pro_weekly_pass`
  - `tool_unlock` — slug is in the `TOOL_UNLOCK_SLUG` map (`_shared/toolAccess.ts`) or is `permit_path_plus`
  - `addon` — everything else (featured stack, notary, freight referral, etc.)
- For `subscription` / `weekly_pass`: call `resolveHostTier(user.id)`. If current tier is ≥ the tier this product grants, return `409 already_entitled`.
- For `tool_unlock`: call `resolveToolAccess(user.id, toolSlug)`. If `unlocked === true`, return `409 already_entitled`.
- For `addon`: no gate (unchanged).
- Response shape uses the unified body (see step 3).

### 2. Small helper: map product → tier / tool slug
Add `productEntitlement.ts` next to the other shared helpers:

```ts
export type ProductKind = 'subscription' | 'weekly_pass' | 'tool_unlock' | 'addon';
export function classifyProduct(product): {
  kind: ProductKind;
  grantsTier?: HostTier;      // for subscription / weekly_pass
  toolSlug?: ToolSlug;        // for tool_unlock
}
```
Keeps `create-monetization-checkout` short and gives future functions one place to look.

### 3. Unify the permission-error shape
Add `entitlementError()` to `_shared/jsonError.ts`:

```ts
export function entitlementError(opts: {
  requires?: HostTier;
  current?: HostTier;
  tool?: ToolSlug;
  feature?: string;
  message?: string;
}): Response  // always 403, code 'entitlement_required'
```

Then:
- `gateToolAccess` returns `entitlementError({ tool })` instead of the bespoke 402 body. Keeps `tool` field and adds the `code: 'entitlement_required'` alias so `usePremiumUpsell` matches on one code going forward (it still accepts the old `tool_locked` alias for one release).
- `tierRequiredBody` callers switch to `entitlementError({ requires, current, feature })`.
- `create-monetization-checkout`'s new guard uses `entitlementError({ requires, current, message: 'You already have access to this — no need to purchase again.' })` with status overridden to 409 for the "already own" case (new helper variant `alreadyEntitledError`).

No client changes required today; the client already handles both codes. In a follow-up we can drop the `tool_locked` alias.

### 4. Scope guarantee (money logic unchanged)
- No change to price math, promo windows, discount codes, member discount, Stripe metadata, webhook flow, refund flow, or webhook-driven provisioning.
- Guard runs strictly before Stripe session creation — no partial state.
- `create-featured-checkout` stacking behavior is preserved (memory: featured boosts stack).

## Files touched
- `supabase/functions/_shared/jsonError.ts` — add `entitlementError`, `alreadyEntitledError`.
- `supabase/functions/_shared/productEntitlement.ts` — new: `classifyProduct`.
- `supabase/functions/_shared/gateToolAccess.ts` — switch to `entitlementError`, keep `tool_locked` alias in body.
- `supabase/functions/_shared/resolveHostTier.ts` — `tierRequiredBody` becomes a thin wrapper over `entitlementError`.
- `supabase/functions/create-monetization-checkout/index.ts` — call the guard; return `alreadyEntitledError` on match.

## Verification
- Typecheck.
- Manually walk the four match paths in `create-monetization-checkout`: same-tier sub, higher-tier sub buying weekly pass, subscriber buying `tool_pricepilot`, already-purchased tool re-buy — each returns 409 `already_entitled` and never touches Stripe.
- Confirm existing AI-tool and AI-tier gate call sites still surface the upsell (they already accept `entitlement_required`).

Awaiting approval before editing.
