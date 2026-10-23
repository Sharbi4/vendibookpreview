# Roadmap

- [done] Buyer city rollout: source 045f70ab2 synced locally; exact inventory migration applied; six anonymous RPCs, real photos, mobile/dialog checks, isolated PostgreSQL and 16 focused tests passed; automatic build OK.
- [open] Publish buyer city frontend — blocked by 12 persisted preexisting critical findings and incomplete deep analysis; existing HEIC cover remains unsupported in Chromium on two city results. Details: docs/buyer-city-pages.md.

- [done] Operations console rollout schema and five services deployed; 23 focused tests, applied SQL checks and automatic build pass; unsigned and host access denied; city/SEO pages untouched.
- [open] Operations admin snapshot/participant delivery and public-landmark route verification — needs authorized admin/participant session; available owner session has host role only.
- [open] Publish operations frontend — held by 12 preexisting critical security findings and incomplete deep scan; SMS delivery reports also await TWILIO_AUTH_TOKEN; GA4 owner setup.

- [done] Meta Muse admin lead matching, provenance/consent, draft approval and no-send workflow; 58 focused tests pass, migrations applied and drafting endpoint deployed.
- [open] Meta Muse inference and live admin workflow verification — blocked by rotated META_MODEL_API_KEY and authorized admin session; Facebook Page setup/sending is a separate unconnected phase.

- [done] BuyerMatch seller intelligence: repaired missing services, locked/live dashboards, membership center, approved activation and attributable events.
- [open] BuyerMatch automated Muse transport and paid-member activation/Astra verification — requires approved Muse workflow and current member-owned campaign; frontend unpublished.
- [done] Make all Build Studio uploads private to manufacturer teams/admins as requested; no further Build Studio redesign work.

- [open] Premium homepage refresh using the attached tester feedback; preserve partner logos and existing search/voice behavior. Awaiting design selection.

- [done] Checkout agreement gate: keep the payment-side Payments Terms version aligned with the version saved by the checked agreement box.
- [done] PayPal seller connect (sandbox): partner Merchant ID 48R2DERT59KTA confirmed; status check now falls back to webhook-recorded connection data instead of erroring when PayPal status API is unavailable.
- [open] Rental checkout 10-bug fix — planned, not started; preserve sandbox PayPal + CAPTURE-only architecture.
- [open] Deploy reset_sandbox_listing admin action (exists in code, not deployed).
- [open] PayPal multiparty routing (PAYPAL_MULTIPARTY_ENABLED) + onboarding webhooks already firing (MERCHANT.ONBOARDING.COMPLETED verified working 2026-09-20).
- [open] Phase 2 PayPal dispute webhooks + automated evidence package.
- [open] Square disputes beyond refunds; SignNow UI triggers + counsel review of template text.
- [open] Rotate pasted Square production access token.
- [done] Preserve the selected PayPal Pay Later funding source through approval so review copy shows the order total, not a same-day charge.
- [done] Replace TaxJar with state sales-tax rates: TaxJar API was 403-rejecting every lookup, so all tax fell to the fallback table anyway. Removed the TaxJar integration from _shared/tax.ts; checkout now uses the published statewide base sales-tax rate table as the single source.
- [done] Homepage Featured row: raised the row from 8 to 12 listings (all live featured listings now show, currently 9).
- [done] Refresh /how-purchasing-works with the current documented post-purchase handoff and the premium warm-white payments/checkout presentation.
- [done] Seller-covered nationwide freight: show Free shipping on sale listing cards and hide the internal mileage/rate/cost from buyers while preserving the freight calculation.

- [done] AI risk checker on messages/offers + admin email alert
- [done] Plaid identity verification right after sign-up (free, required for all members), then back to intended page
- [open] Remove Lionel Yates' flagged off-platform message (843909fouty71three) and warn him to keep booking on Vendibook for user/seller safety.
