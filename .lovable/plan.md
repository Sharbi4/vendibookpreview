# Financing Implementation Audit — For-Sale Listings

Read-only audit. Nothing implemented.

**Headline finding: there is no ClickLease integration anywhere in the codebase.** A case-insensitive search across `src/`, `supabase/`, and `scripts/` returns zero matches. Equinox Funding is the only financing provider, and there is no provider-selection abstraction — the provider is hard-coded in constants, copy, and logo components.

Second finding: financing is live (`app_feature_flags.equinox_financing_enabled = true`) but gated behind a per-listing seller opt-in that almost no one has enabled.

---

## 1. Listing-wizard fields, toggles, disclosures

`src/components/listing-wizard/PublishWizard.tsx`
- State: `equinoxOptIn`, `equinoxDisclosureAccepted`, `vinSerial`, `vinUnavailable` (lines ~394-401), all persisted into the wizard draft cache (lines ~649-652, 690-691, 736-739).
- UI block "Buyer financing (optional)" at lines ~3461-3520, rendered only when `isFinanceableSaleListing(listing)`. Contains checkbox `equinox_opt_in`, nested disclosure checkbox `equinox_disclosure` showing `EQUINOX_DISCLOSURE_TEXT`, and a VIN control shown when `isTitledSaleCategory(listing)`.
- Persistence: `persistFinancingPreference()` (line ~405, upserts `listing_financing_preferences` with `equinox_opt_in`, `include_vin` = same value, `disclosure_version`, `disclosure_accepted_at`) and `persistVinSerial()` (line ~433, writes `listing_ownership_details.vin_serial`, fills NOT NULL `title_status` from disclosures). Both called at price-step save (~1886) and final publish (~2121).
- Hydration on edit: lines ~510-539.
- Publish blocker: `equinoxOptIn && !equinoxDisclosureAccepted` → "Accept the financing disclosure" (lines 3807, 3820). Financing never blocks publishing otherwise.

Related: `src/components/listing-wizard/stages/ListingDisclosures.tsx` (line ~219, title/VIN copy referencing the purchase sheet), `src/components/listing/OwnershipDetailsForm.tsx` (line ~166, VIN helper copy), `src/components/listing-wizard/stages/PrivacySummary.tsx`.

Platform-fee wording lives only in the disclosure string, not in wizard-specific code: `src/lib/financing/disclosure.ts` → `EQUINOX_DISCLOSURE_TEXT` (12.9% platform fee on financed sales) and `EQUINOX_DISCLOSURE_VERSION = 'equinox-financing-v1'`.

## 2. Database objects that gate financing

`supabase/migrations/20260807215954_*.sql`
- `public.listing_financing_preferences`: `listing_id` (PK, FK→listings), `host_id`, `equinox_opt_in` (default false), `include_vin` (default false), `disclosure_version`, `disclosure_accepted_at`, timestamps.
- Grants: SELECT to `anon`, full CRUD to `authenticated`, ALL to `service_role`. RLS on: policy "Financing opt-in is publicly readable" (`USING (true)`) and "Owners manage their listing financing preferences" (host_id = auth.uid() AND owns the listing).
- Index on `host_id`; `trg_listing_financing_preferences_updated_at`.
- `supabase/migrations/20260808021829_*.sql` seeds one listing's opt-in row manually.

Other gating inputs: `app_feature_flags` row `equinox_financing_enabled` (currently `true`); `listings.mode = 'sale'`; RPC `is_listing_publicly_visible`; `listing_ownership_details.vin_serial` (owner-only, released only via edge function); RPC `public_display_name`.

There is no DB function, trigger, or constraint specific to financing — all gating is table state read by app/edge code.

## 3. Listing-detail UI and its conditions

Single client gate: `useEquinoxFinancingEnabled(listing)` in `src/hooks/useListingFinancing.ts` = flag on AND `isFinanceableSaleListing` (mode === 'sale', any category) AND `equinox_opt_in === true` AND `disclosure_version === EQUINOX_DISCLOSURE_VERSION` AND `disclosure_accepted_at` set.

Consumers:
- `src/components/listing-detail/sale/FinancingActionPanel.tsx` — "Apply Now with Equinox" (`handleApply` → edge fn `financing-apply-link`, opens tab synchronously), "Download Purchase Sheet (PDF)" (`handleDownload` → edge fn `financing-purchase-sheet` → `generateFinancingPurchaseSheet` in `src/lib/financing/purchaseSheet.ts`), plus a `/financing?listing_id=` link. Rendered from `src/pages/ListingDetail.tsx:917` and `src/components/listing-detail/sale/SaleListingMobile.tsx:653`.
- `src/components/listing-detail/ListingPaymentMethods.tsx` — Equinox logo row.
- `src/components/listing/ListingCard.tsx:164,310` — compact `FinancingAvailableBadge`.
- `src/components/financing/FinancingAvailableBadge.tsx`, `src/components/checkout/FinancingLine.tsx` (no financing UI; PayPal note only).

Server-side authority: `supabase/functions/_shared/financingEligibility.ts` → `checkFinancingEligibility()` + `resolveViewerId()`, used by `supabase/functions/financing-apply-link/index.ts` and `supabase/functions/financing-purchase-sheet/index.ts`. Fails closed for everyone, owners included; VIN released only when `include_vin` is true.

Seller-side surfaces: `src/pages/ListingPaymentsFinancing.tsx` (per-listing manage page, `/listings/:id/payments-financing`), `src/components/financing/ListingFinancingToggle.tsx` + `src/hooks/useListingFinancing.ts#useSetListingFinancing`, `src/components/dashboard/HostListingCard.tsx:587-589`, `src/pages/HostListings.tsx:43-45,182` (batch via `useHostFinancingPreferences`), `src/pages/FinancingEnable.tsx` (campaign deep link).

## 4. Hard-coded provider URLs / provider selection

- `src/lib/financing/disclosure.ts:11` — `EQUINOX_APPLY_URL = 'https://equinox-funding.com/efapplication/'`
- `supabase/functions/_shared/financingEligibility.ts:13` — same constant (server copy)
- `src/pages/Financing.tsx:38` `APPLY_URL`, plus `:419` terms and `:428` privacy links
- `src/pages/ListingPaymentsFinancing.tsx:195` uses `EQUINOX_APPLY_URL`
- `src/data/blogPosts.ts:217` — UTM-tagged apply link
- `src/test/financing/financingGating.test.ts:72` asserts the URL
- Logos/branding: `src/components/brand/ProviderLogos.tsx#EquinoxFundingLogo`, `src/assets/brand/equinox-funding-logo.png`
- Marketing copy: `src/components/howitworks/EquinoxFinancingCallout.tsx`, `PaymentRailsSection.tsx`, `src/components/home/FinancingTopBanner.tsx`, `ConciergeSection.tsx`, `Footer.tsx`, `src/data/pricingFaq.ts`, `helpArticles.ts`, `faqContent.ts`, `supabase/functions/_shared/marketing-templates/equinox-partnership.ts`

No provider registry, enum, or routing logic exists. Adding a second lender (e.g. ClickLease) would require introducing a provider concept where today there is a single hard-coded constant.

## 5. What "financing on by default" would require

Target: every eligible for-sale listing shows financing unless the seller opted out, with a one-time account-level (or publish-time) disclosure acceptance instead of a per-listing opt-in.

Required changes, by layer:

Data
- Invert semantics: either add `financing_opt_out boolean not null default false` to `listing_financing_preferences` (keeping `equinox_opt_in` for legacy reads) or migrate to a single `financing_enabled boolean default true`. Absence of a row must mean "on", which today means "off" everywhere.
- Move disclosure acceptance from the row to the seller: a `financing_disclosure_version` / `financing_disclosure_accepted_at` pair on `profiles`, or a record in `user_consents` / `legal_documents` (`current_legal_document`, `record_user_consent` already exist and are the natural home).
- Decide the VIN rule: `include_vin` currently piggybacks on the opt-in. Defaulting financing on must NOT default VIN disclosure on — keep `include_vin` explicit and default false.
- Backfill/migration for existing rows so today's opted-out majority isn't silently switched on without an accepted disclosure.

Gate logic (two places must change together, or buyers see a badge the server refuses to honor)
- `src/hooks/useListingFinancing.ts#useEquinoxFinancingEnabled` — flag on AND `isFinanceableSaleListing` AND NOT opted out AND seller-level disclosure current.
- `supabase/functions/_shared/financingEligibility.ts#checkFinancingEligibility` — same inversion, still fail-closed on flag off / non-sale / not publicly visible; `includeVin` stays strictly explicit.
- `useHostFinancingPreferences` returns a "missing = false" map today; it must become "missing = on".

Eligibility definition
- `isFinanceableSaleListing` in `src/lib/financing/disclosure.ts` currently accepts any for-sale category. If default-on should be limited to food trucks/trailers, add category checks here (note `src/pages/ListingPaymentsFinancing.tsx:264` already claims trucks/trailers only — that copy is currently inaccurate).

Wizard
- Remove the `equinox_opt_in` / `equinox_disclosure` checkbox block (`PublishWizard.tsx` ~3461-3520) and the two publish blockers (3807, 3820); replace with a short informational line plus the seller-terms acceptance if not already on file.
- `persistFinancingPreference()` becomes a no-op or writes only the opt-out default; `persistVinSerial()` and the VIN control stay.
- Drop `equinoxOptIn` / `equinoxDisclosureAccepted` from wizard state and the draft cache.

Disclosure/terms
- Bump `EQUINOX_DISCLOSURE_VERSION` (and the server copy) since the acceptance model changes; text must state that financing is shown by default and how to turn it off.

Tests and copy
- `src/test/financing/financingGating.test.ts` encodes the opt-in rule and would need rewriting to the default-on rule.
- `src/pages/__tests__/sellerPages.test.ts` and marketing copy in `EquinoxFinancingCallout.tsx`, `PaymentRailsSection.tsx`, `pricingFaq.ts`, `helpArticles.ts`, `faqContent.ts` describe an add-on the seller turns on.

Risk to flag: the disclosure states a 12.9% platform fee applies to financed sales. Turning financing on by default means sellers can be exposed to that fee without a per-listing acknowledgement, so the seller-level terms acceptance is not optional — it is the legal substitute for the per-listing checkbox.

## 6. Opt-out in the dashboard without cluttering creation

Yes, and the surfaces already exist — only their semantics change:
- `src/components/financing/ListingFinancingToggle.tsx` on `src/components/dashboard/HostListingCard.tsx` becomes a "Buyer financing: On / Off" opt-out switch (confirmation dialog moves to the *off* path).
- `src/pages/ListingPaymentsFinancing.tsx` stays the full per-listing manage page (opt-out + VIN consent + disclosure text).
- `src/pages/HostListings.tsx` + `useHostFinancingPreferences` keep batch loading; only the default-when-missing flips.
- `src/pages/FinancingEnable.tsx` (campaign deep link) becomes a manage/opt-out entry point rather than an activation page.
- Creation flow keeps a single non-blocking sentence and the existing VIN field, with no checkbox and no publish blocker.

An account-level "offer financing on all my for-sale listings" default on the seller profile could sit alongside the per-listing override, but that is an extra layer, not a requirement.
