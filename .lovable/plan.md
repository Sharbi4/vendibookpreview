
# Legal & Consent Modernization Plan

This is a large multi-turn effort. I'll ship it in reviewable phases, not as one giant migration. Legal copy affects enforceability, so every phase includes a "requires owner/counsel confirmation" list and I will not invent facts.

## Phase 0 — Product-truth audit (read-only, one deliverable)

Deliverable: `.lovable/legal-audit-2026-07.md` — the source of truth every later phase cites. Contents:

1. Fee & payout truth from `src/lib/commissions.ts`, `stripe-webhook`, `create-checkout`, `create-cash-sale`, `create-connect-account`, `manage-subscription`, `create-payout`.
2. Transaction state machine from `src/lib/transactions/stateMachine.ts` + protected-sale flow — confirms "payment protection" (never "escrow") language.
3. Cancellation/refund matrix from `cancel-booking`, `cancel-transaction`, transaction terms snapshot logic.
4. Subscription catalog (Starter/Pro/Premium names + live Stripe price IDs) from `useHostEntitlements.ts`, `_shared/toolAccess.ts`, `AccountSubscription.tsx`.
5. Referral truth from `useReferralEarnings.ts`, `referral_program_config`, `referral-*` functions.
6. SMS truth from `sms-record-consent`, `_shared/smsGuard.ts`, `twilio-inbound-webhook` (STOP/START/HELP live?).
7. Support/comms truth: Vapi outbound assistant, Tawk forwarding, `send-transactional-email`, callback recording disclosure.
8. Analytics/adtech inventory (Meta Pixel, GA4, Google Ads, Merchant, Facebook CAPI, tracking pixels) — feeds the "sale/share" determination.
9. Identity verification actual scope (Stripe Identity vs claims).
10. Financing surfaces currently live (Affirm messaging, Stripe financing).
11. AI tools live: PermitPath, Spark, market research, pricing.
12. Existing broken/legacy links list.
13. **Mismatch list** — every place current legal/marketing copy contradicts code. Fix links & copy in scope; flag financial/behavioral mismatches for owner.

I'll paste the audit into chat when Phase 0 lands so you can spot-check before I write legal copy.

## Phase 1 — Legal architecture & routing (no copy changes yet)

- Confirm canonical `/terms` and `/privacy` (currently `/legal/terms`, `/legal/privacy` via `LegalDocumentPage`). Add `/terms` and `/privacy` as first-class routes; make `/legal/terms` and `/legal/privacy` 301-style client redirects to the canonical URLs.
- Add `/legal` **Legal Center** hub page (plain-language cards grouped: Everyone / Sellers & Hosts / Buyers & Renters / Payments / Communications / AI & Tools / State Notices).
- Add missing static routes: `/legal/cookies`, `/legal/e-sign`, `/legal/ai-tools`, `/legal/financing`, `/legal/ip`, `/legal/california`, `/legal/refunds`, `/legal/acceptable-use`.
- Fix broken links: SMS Help→`/help` (not `/support`); privacy→`/privacy`; SMS opt-in web form→`/sms-opt-in`.
- Footer + Account Settings gain a "Legal" group linking the hub.
- SEO: canonical, description, printable CSS, `robots` indexable, JSON-LD `WebPage`, per-doc `dateModified` from `effective_at` (never `new Date()`).

## Phase 2 — Extend `legal_documents` catalog + seed v2 (single atomic migration per doc family)

Add new `document_type` enum values: `california_privacy_notice`, `cookie_policy`, `acceptable_use_policy`, `payments_terms`, `electronic_communications_esign`, `sms_terms`, `referral_program_terms`, `ai_tools_disclaimer`, `financing_disclosure`, `ip_dmca_policy`.

Extend `CURRENT_VERSIONS` mapping. For every existing doc I rewrite, insert a new `v2` row with:
- `effective_at` = literal ISO date of publication (not `now()`).
- `status = 'active'`; superseded rows flipped to `'archived'` (`v1` copy retained forever).
- Full Markdown body seeded in the same migration.
- Add trigger check `no_overwrite_frozen_active_rows` if not already enforced.

I'll do this doc-by-doc across turns so each migration is small and human-reviewable, not one 10,000-line SQL file.

## Phase 3 — Draft new document copy (owner-review gated)

Order (each turn ships one doc as a draft page + Markdown; you approve before I insert the v2 row):

1. Terms of Service
2. Privacy Policy
3. California / U.S. State Privacy Notice
4. Cookie Policy
5. Marketplace Rules / Acceptable Use
6. Seller/Host Terms
7. Buyer/Renter Terms
8. Payments, Payouts & Protected Transactions Terms (uses "payment protection", never "escrow")
9. Refund & Cancellation Policy
10. Subscription & Paid Add-On Terms
11. E-Sign & Electronic Communications Consent
12. SMS Terms (retitle + link fixes only unless owner requests rewrite)
13. Referral Program Terms
14. AI Tools & Informational Content Disclaimer
15. Financing Disclosure
16. IP / DMCA Policy

Every draft carries: TOC, effective date, plain-language summary block, print button, contact section, `## Requires owner/counsel confirmation` footer listing every unresolved item for that document — I will not silently invent legal entity name, mailing address, arbitration forum, class waiver, governing law, retention numbers, insurance/damage-protection claims, DMCA agent registration, or lender identity.

## Phase 4 — Consent wiring audit + matrix

Deliverable: consent-trigger→document(s) matrix, then code changes so every trigger writes the correct active version(s) via `user_consents` with unchecked clickwrap, exact wording, route, entity IDs, locale.

Triggers to reconcile: signup, publish_listing, purchase_review, pay_in_person, rental_request, instant_book, booking_review, featured_activation, stripe_connect, identity_verification, referral, review_submission, cancellation, subscription_start, sms_opt_in (kept separate & optional), e_sign_acknowledgment.

- SMS consent stays a distinct checkbox — never bundled.
- Recurring-billing consent moves from Terms-only into an explicit checkout checkbox tied to Subscription & Paid Add-On Terms v2 + Payments Terms v2.
- Every receipt/transaction detail page gets a "Terms accepted (v2, 2026-07-XX)" link resolving to the exact frozen row (already snapshot-linked; I'll just verify).
- Material-change re-consent flow: add a `requires_reconsent` flag on new v2 rows and a one-time modal on next authenticated visit (never treat "continued use" as sole acceptance for recurring-billing changes).

## Phase 5 — Cookie/adtech reality check

- Inventory every third-party tag actually fired (Meta Pixel, GA4, Google Ads, CAPI, Merchant, Tawk, Vapi web SDK, Stripe.js, Google Maps).
- Confirm `CookieConsent` gates non-essential tags before consent — if it doesn't today, fix the gating (this is one of the flagged behavioral defects, not a copy change).
- Only after gating is real: Cookie Policy + California notice describe categories accurately. If ad-tech qualifies as "sharing" under CCPA/CPRA, ship a real "Do Not Sell or Share" link honoring GPC — do NOT claim "we do not sell/share" until confirmed.

## Phase 6 — Tests & smoke

Add / extend:
- `scripts/smoke/legal-routes-smoke.ts` — every canonical + legacy route returns 200 unauthenticated, canonical link tag correct, no bracketed placeholders, JSON-LD present.
- `scripts/smoke/consent-wiring-smoke.ts` — each trigger requires unchecked consent; failed persistence blocks the mutation; `user_consents` row records `document_type`, frozen `version`, wording hash, trigger, entity IDs.
- Vitest: `legalDocuments.test.ts` version-resolution + `CURRENT_VERSIONS` coverage; `consentSnapshot.test.ts` receipt→frozen-row resolution.
- Cookie gating unit test: no non-essential tag fires before consent state = granted.
- Broken-link crawler over rendered legal Markdown.
- Run typecheck + build after every phase.

## Owner/counsel confirmation register (persistent, per-doc)

I will maintain `.lovable/legal-owner-review.md` and append every unverified fact as I encounter it. Nothing on a public page will contain `[BRACKETED]` placeholders. When a fact is unknown, the safest existing accurate statement stays and the item is flagged.

Known day-one items already visible:
- Registered legal entity name, state of formation, mailing address.
- Governing law + venue + arbitration provider + class-action waiver + opt-out procedure.
- Liability cap dollar amount.
- Whether protected-sale funds are legally "escrow" (default: no — say "payment protection held by Stripe").
- Insurance / damage-protection: none claimed unless owner confirms carrier.
- Retention periods (transactions vs. marketing vs. support recordings vs. SMS consent).
- Whether CCPA/CPRA applies (revenue/data thresholds) or is offered voluntarily.
- Whether ad-tech usage constitutes "sale/share" — drives GPC + DNS/S link requirement.
- DMCA designated agent registration status with USCO.
- Financing lender identity & disclosures (Affirm vs. Stripe-mediated).
- Call-recording consent (one-party vs two-party jurisdictions handled by disclosure).
- Vapi outbound + Tawk chat retention windows.

## Out of scope this pass

- Rewriting SMS Terms substantively (already carrier-audited; link fixes only unless requested).
- New non-legal marketing pages.
- Any change to money movement, refund logic, payout timing, transaction state machine, or entitlement resolution.
- Publishing v2 rows before Phase 3 owner sign-off — v2 seeds sit as `status='draft'` until approved.

## What I need from you to start Phase 1

1. Confirmation to proceed phase-by-phase with owner-review gates between Phase 3 docs.
2. Any of the day-one confirmation items you can answer now (entity, governing law, arbitration, liability cap, insurance, retention, ad-tech-as-sharing, DMCA agent, financing lender). Anything you don't answer gets flagged, not fabricated.
3. Confirmation that the target effective date for v2 rows is the actual publication date at merge time (not a fixed date I should hard-code now).

Approve to start Phase 0 (product-truth audit) — it's read-only and lands a single markdown deliverable in the repo for you to review before any code or copy changes.
