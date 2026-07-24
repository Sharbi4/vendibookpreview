
## Affirm / Afterpay / Klarna — root cause (report first)

Server side is correct. `create-checkout` explicitly requests `payment_method_types: ['card', 'affirm', 'klarna', 'afterpay_clearpay']` (line 541 for sales, 619 for rentals-with-ACH). Currency USD, buyer country US, embedded Payment Element `layout: 'tabs'` with no `paymentMethodOrder`/`fields` restrictions.

That leaves three real reasons a BNPL tab would not render in the Element:

1. **Not activated on the platform account in the Stripe Dashboard.** Requesting a method in `payment_method_types` does not enable it — each of Affirm, Klarna, and Afterpay/Clearpay must be turned on under Settings → Payment methods. Until then Stripe silently drops them from the Element. This is the most common cause and needs to be verified in the dashboard; we cannot toggle it from code.
2. **Amount outside the method's min/max for the buyer's country.** US ranges are roughly Affirm $50–$30,000, Afterpay $1–$4,000, Klarna varies by plan. Any test with a $1 sale hides them. Live listings are almost always in-range, so this only bites test runs.
3. **`PaymentIntent.setup_future_usage` set to `off_session`/`on_session`, or `capture_method: 'manual'`.** Both disqualify BNPL. Our `create-checkout` sets neither, so this is fine — leave it that way.

Action: (a) surface a one-liner in chat asking the user to confirm the three methods are toggled on in the Stripe Dashboard for the platform account; (b) add Stripe's `PaymentMethodMessagingElement` above the total on Review AND inside the payment modal so buyers see "from $X/mo with Affirm" before opening the tabs — component already exists (`AffirmMessagingLine.tsx`), just needs to be wired into the modal too.

## Font root cause

`stripeAppearance.ts` loads Poppins from Google Fonts into the Stripe iframe, but the site body font is `SofiaProSoftLight` served from `/__l5e/assets-v1/…/SofiaProSoftLight.otf` (see `src/index.css` line 8–12, `tailwind.config.ts` line 21). Stripe's iframe cannot reach that relative asset path and Sofia is not on Google Fonts, so the PaymentElement will always look different unless we either (a) accept Poppins as the closest hosted fallback or (b) pass Sofia via an absolute `src: url()` `CustomFontSource`. We will do (b) using an absolute `https://<origin>` URL derived from `window.location.origin` at render time, with Poppins kept as the CSS fallback.

## Scope of the redesign

Frontend + one server-side label fix in `create-checkout` (change `'Item price'` in `snapshotLines` to the real listing title). No changes to fees, holds, payouts, entitlements, terms gate, or `create-checkout` / `create-cash-sale` call shape.

## File-by-file plan

### 1. Fonts — pipe Sofia into Stripe
**`src/lib/stripeAppearance.ts`**
- Change `stripeFonts` from a static `CssFontSource` to a factory `getStripeFonts(origin: string): CustomFontSource[]` returning `{ family: 'SofiaProSoftLight', src: "url('https://…/SofiaProSoftLight.otf') format('opentype')", weight: '400' }` plus a `500`/`600` entry pointing at the same file.
- Update `variables.fontFamily` to lead with `SofiaProSoftLight`.
- Keep a `CssFontSource` fallback pointing at Google Poppins so first paint isn't blank while the .otf loads.

**`src/components/checkout/EmbeddedStripeCheckout.tsx`**
- Replace `fonts: stripeFonts` with `fonts: getStripeFonts(window.location.origin)`.

### 2. Glass look — quiet everything, ember only on total
**`src/components/checkout/CheckoutChrome.tsx`** (already exists)
- Confirm shell uses `bg-[rgb(8,8,10)]` behind blurred panels; no change unless needed.

**`src/pages/SaleCheckout.tsx` + `BookingCheckout.tsx`**
- Swap the wizard container class from `bg-card/70 backdrop-blur-md border border-border/60` to a shared utility `glass-panel` (see index.css below). No structural change.

**`src/index.css`** — add two utilities:
```css
.glass-panel {
  background: rgba(18,18,20,0.55);
  backdrop-filter: blur(20px) saturate(1.1);
  -webkit-backdrop-filter: blur(20px) saturate(1.1);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}
.glass-panel--ember {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 0 0 1px rgba(255,81,36,0.22),
    0 20px 60px -20px rgba(255,81,36,0.35);
}
```

**`src/components/shared/StickySummary.tsx`**
- Root wrapper → `glass-panel glass-panel--ember` (this is the single ember card).
- Headings `text-[#F5F5F5]`, body `text-[#C7C7CE]` — via existing semantic tokens where possible, direct hex only where token contrast is wrong on glass.

### 3. Real listing details in the summary (kill "Item price")
**`supabase/functions/create-checkout/index.ts`** (server label only, no money change)
- Line 311: `label: 'Item price'` → `label: listingTitle` (the function already loads the listing to get title/cover; use it here).

**`src/pages/SaleCheckout.tsx`**
- Line 632 and 812: `{ label: 'Item price', amount: priceSale }` → `{ label: listing.title, amount: priceSale }`.
- Extend the `listing` select to include a `profiles!listings_user_id_fkey (full_name)` join (or reuse whatever the page already loads for the host — check the existing query and reuse) so we can pass `sellerName`.

**`src/components/shared/StickySummary.tsx`** — new optional props:
- `sellerName?: string`
- `keySpecs?: Array<{ label: string; value: string }>` (year, make, condition — parsed by caller from `listing`)
- `locationLabel?: string` (city, state)
- Render below title: category chip · `locationLabel` · "Sold by {sellerName}" · a 2–3 chip strip of `keySpecs`.
- Financing "from $X/mo" line via existing `FinancingLine` under the total when `financingEligiblePrice` is set.

**`src/pages/BookingCheckout.tsx`** — same summary prop wiring for rentals (Sold by → "Hosted by", specs from the listing).

### 4. Fulfillment block on Review (always clear)
**`src/components/purchase-wizard/PurchaseStepReview.tsx`**
- Add a "How you'll get it" card just above the payment block that switches on `fulfillmentSelected`:
  - `pickup` → pickup city/state + any `pickup_instructions` (address exchanged after purchase), Package icon.
  - `delivery` → delivery address + fee, Truck icon.
  - `vendibook_freight` → freight quote, "Paid by {buyer|seller}", ETA window, Ship icon.
- Reuse copy from `METHOD_META` in `PurchaseStepDelivery` to avoid drift.

### 5. Next steps + contact (Review AND /payment-success)
**`src/components/checkout/PostPaymentTimeline.tsx`** (already exists) — no code change, but ensure it is rendered on:
- `PurchaseStepReview.tsx` (already added last turn) — verify wording "payment protection", not "escrow".
- `src/pages/PaymentSuccess.tsx` — add `<PostPaymentTimeline variant="sale" />` (or `"rental"`) and a "Questions? Contact us" link block with expected response time (business hours from memory: Mon–Fri 9–5 AZ), pointing at the existing `/contact` route and firing the `start-vendi-call` custom event for concierge (per `mem://architecture/vendi-ui-trigger-pattern`).

### 6. Trust row
**`src/components/checkout/TrustRow.tsx`** (already exists) — surface it in three places:
- Under the wizard footer on every step in `SaleCheckout.tsx` and `BookingCheckout.tsx`.
- Inside `EmbeddedStripeCheckout.tsx` modal footer, next to the existing "Vendibook never sees your full card number" line (keep that line verbatim).

### 7. Affirm messaging wiring
**`src/components/checkout/EmbeddedStripeCheckout.tsx`**
- Above the `<PaymentElement/>`, render `<AffirmMessagingLine amountCents={amount} />` so the promo shows inside the modal in addition to the Review step.

**`src/components/purchase-wizard/PurchaseStepReview.tsx`**
- Confirm `<AffirmMessagingLine>` sits directly under the bold total (already added last turn — verify placement).

## Explicit non-goals
- No changes to `commissions.ts`, hold/release timing, webhook contract, or `create-cash-sale`.
- No new step split; the current 3-step wizard stays. The `Info | Delivery | Review` structure is preserved.
- Not migrating the Sofia .otf into a self-hosted CDN — we point Stripe at the same relative-turned-absolute URL the site already uses.

## Deliverable order after approval
1. `stripeAppearance.ts` + `EmbeddedStripeCheckout.tsx` font wiring.
2. `index.css` glass utilities + `StickySummary.tsx` glass + real details.
3. `SaleCheckout.tsx` + `BookingCheckout.tsx` summary props + wrapper classes.
4. `create-checkout/index.ts` label change (redeploy).
5. Fulfillment block + trust row + PaymentSuccess timeline.
6. Ask user in chat to confirm Affirm/Klarna/Afterpay activation in the Stripe Dashboard.
