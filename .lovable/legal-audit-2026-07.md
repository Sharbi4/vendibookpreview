# Vendibook Legal & Consent — Product-Truth Audit

**Effective:** 2026-07-27 (Phase 0 read-only)
**Scope:** Every fact a public legal document might claim, verified against live code / DB config as of this date. Nothing here is a legal recommendation; this is the *product-truth ledger* every Phase 3 document will cite.

Legend:
- ✅ **Verified in code / DB** — safe to state publicly.
- ⚠️ **Mismatch or defect** — public copy today conflicts with product; must fix before/with new legal copy.
- 🔒 **Owner/counsel gate** — cannot state publicly until owner confirms.

---

## 1. Fees & payouts (source: `src/lib/commissions.ts`)

✅ Rental (dual-sided): **12.9%** from host + **12.9%** from renter. Both computed on `basePrice + deliveryFee`. Host receives `subtotal − hostFee`. Renter pays `subtotal + renterFee`.
✅ Sale (Stripe): **12.9%** seller commission, **$0** buyer platform fee. Buyer pays freight when not seller-paid.
✅ Sale (Pay-in-Person / cash): **0% commission, 0 platform fee** — waived entirely (`isCashSale === true`).
✅ Rentals paid in person still owe commission (memory rule; not deducted in cash-sale branch).
🔒 Payout timing: memory says rentals 24h, sales 25d. **Code doesn't enforce a wall-clock timer**; payout is Stripe-scheduled after `completed`. Public docs may only cite the Stripe standard schedule + our review windows once owner reconciles memory vs. `manage-payout-schedule`.

## 2. Transaction state machine (source: `src/lib/transactions/stateMachine.ts`)

✅ `pending → paid → confirmed → completed → paid_out` (Stripe funds path)
✅ `pending_cash → paid → completed → paid_out` (in-person)
✅ Recovery arcs: `payment_failed → pending`, `payout_failed → completed`.
✅ Terminal: `paid_out`, `refunded`, `cancelled`.
✅ Enforced by DB trigger `enforce_sale_status_transition` — source of truth is server-side, not client.
🔒 **Naming: "Payment Protection" not "escrow".** Funds are Stripe-held between `paid` and `paid_out`; they are not held in a licensed escrow account. Public copy that says "escrow" today must be replaced.

## 3. Subscription catalog (source: `monetization_products` DB, verified 2026-07-27)

| Slug | Name | Price | Cadence |
|---|---|---|---|
| `host_starter` | Host Starter | **$39.00 / mo** | recurring |
| `host_growth` | Host Growth | **$89.00 / mo** | recurring |
| `host_operator` | Host Operator | **$149.00 / mo** | recurring |
| `host_starter_annual` | Host Starter (Annual) | **$390.00 / yr** | recurring |
| `host_growth_annual` | Host Growth (Annual) | **$890.00 / yr** | recurring |
| `host_operator_annual` | Host Operator (Annual) | **$1,490.00 / yr** | recurring |

✅ Tier resolver (`useHostEntitlements.resolveTier` + `_shared/toolAccess.resolveTierFromSub`) maps `host_starter` → Starter, `host_growth` → Pro, `host_operator` → Premium; legacy `host_pro` still resolves to Pro.
⚠️ Some marketing/legal surfaces still say "Starter / Pro / Premium" as the *display* name — that's OK as tier labels, but the *plan names on the checkout* and Subscription Terms must use the DB catalog names (Host Starter / Host Growth / Host Operator).

## 4. One-time add-ons (source: same table)

| Slug | Name | Price | Duration |
|---|---|---|---|
| `boost-featured-30` | Featured Boost — 30 days | **$49.00** | 30 d |
| `pro_weekly_pass` | Pro Weekly Pass | **$29.00** | 7 d |
| `listing_rewrite` | AI Listing Rewrite | **$59.00** | one-time |
| `permit_path_plus` | Permit Path Plus | **$29.00** | one-time |

## 5. Referral program (source: `referral_program_config` DB, verified 2026-07-27)

| Program | Reward | Min transaction | Hold days | Monthly cap |
|---|---|---|---|---|
| `supply` | **$150** | $0 | 7 | unlimited |
| `rental` | **$50** | $150 | 2 | unlimited |
| `purchase` | **$500** | $3,000 | 14 | 10 / mo |

✅ Rewards paid via Stripe Connect (existing `referral-payout-batch`).
⚠️ Old marketing copy has referenced 24h/25d holds — those numbers do not match config. New Referral Program Terms will cite the table above.
🔒 FTC material-connection disclosure language must be added ("I may earn a Vendibook referral reward").

## 6. SMS (source: `_shared/smsGuard.ts`, `twilio-inbound-webhook`, `sms-record-consent`)

✅ Consent recorded via `sms_consent_events` with source enum (`web_form`, `signup`, etc.).
✅ `smsGuard` fails closed — any missing/stale/contradicted consent state blocks the send.
✅ STOP / START / HELP handling live in `twilio-inbound-webhook` (HMAC-verified).
✅ Public opt-in web form at `/sms-opt-in` (unchecked box, name + email + phone).
✅ SMS Terms page at `/legal/sms`; proof page at `/legal/sms-opt-in-proof`.
⚠️ **Broken links on `/legal/sms`:**
   - Line 79 links to `/support` — that route does not exist. Must be `/help`.
   - Line 102 links to `/legal/privacy` — that route does not exist. Must be `/privacy`.
✅ Keyword-based *inbound* handling for STOP/START/HELP is live and tested; other keyword opt-in flows are **not** live and will not be advertised.

## 7. Support & communications (source: audit of latest support-ticket work)

✅ Canonical customer submit path: `submit-support-ticket` (JWT-authed).
✅ Vapi outbound assistant `a37b08b5-ddf7-473d-ac23-1cb49ea2c713` — used for callback ("call me now") and outbound support.
✅ Vapi tool endpoint `vapi-create-support-ticket` (Bearer-authed) creates canonical tickets from voice, with server-derived priority and idempotency.
✅ Tawk forwarding via `_shared/tawkForward.ts` to private `tickets@vendibook.p.tawk.email` — server-side only; never exposed in client responses. Public copy must never reveal this address.
✅ Support hours: **Mon–Fri 9am–5pm AZ time, no DST** (memory rule; matches Help Center copy).
✅ Public support contact: **support@vendibook.com** + phone **(725) 755-9598**.
🔒 Call-recording disclosure copy: existing Help Center callback consent line covers *outbound* calls. E-Sign / Electronic Communications doc will restate it. Owner must confirm one-party vs. two-party jurisdictional stance (safe default: disclose recording every call).
✅ Zendesk is fully removed (memory rule) — no legal copy may reference it.

## 8. Analytics / advertising tag inventory (drives Sale/Share determination)

| Tag | Where fired | Consent-gated today? |
|---|---|---|
| Meta Pixel `1070006041675593` | `index.html` `<head>` — fires on every page load | ⚠️ **NO** |
| Meta Conversions API | `src/lib/facebookCAPI.ts` server-side events | ⚠️ Fires on tracked events regardless of banner state |
| GA4 `G-NNWR0V8SH2` | `src/hooks/usePageTracking.ts` calls `gtag('config', …)` on every route change | ⚠️ **NO** |
| Google Ads `AW-17121224552` | Loaded via `loadGoogleAds()` in `src/lib/cookieConsent.ts` — only after `analytics && marketing` consent | ✅ Yes |
| Google Maps | Loaded lazily via `googleMapsLoader.ts` when a map component mounts | N/A (functional) |
| Stripe.js | Loaded on checkout surfaces | ✅ Essential |
| Tawk chat SDK | Loaded via `ZendeskWidget.tsx` shim (misleading filename — actually Tawk after Zendesk removal) | 🔒 Needs verification whether current mount is gated |
| Vapi web SDK | Loaded on demand when user clicks Vendi voice trigger | ✅ On-demand |
| Facebook CAPI server events | Fired from server on `purchase`, `initiate_checkout`, `view_item`, etc. | ⚠️ Fires regardless of banner state |

⚠️ **Behavioral defect (P0 for legal accuracy):** Meta Pixel and GA4 both fire *before* any cookie banner has ever appeared, and the banner itself only shows on `/checkout`, `/book/`, `/buy/`, `/browse` (`CookieConsent.tsx` `CONSENT_REQUIRED_ROUTES`). A visitor on the homepage, listing detail page, blog, or help center is being tracked with no opportunity to consent. This directly contradicts any "no sale/share" claim in a Privacy Policy or California notice.

⚠️ **No GPC handling.** No code reads `navigator.globalPrivacyControl`.

🔒 Owner determination required: does Meta Pixel + Google Ads usage qualify as **"sharing" under CCPA/CPRA**? The conservative answer is yes; that triggers a real "Do Not Sell or Share" mechanism, GPC honoring, and a notice-at-collection.

## 9. Identity verification

✅ Stripe Identity is the sole provider (via `check-identity-verification`, `IdentityVerification.tsx`, "Verified" badges).
🔒 Documents processed by Stripe Identity are *not stored by Vendibook*; only the verification result + minimal display metadata. Owner to confirm retention window Stripe uses on our behalf for the Privacy Policy.

## 10. Financing surfaces

✅ Affirm messaging component (`AffirmMessagingLine.tsx`) shown on high-ticket sale checkouts.
✅ Stripe Checkout handles Affirm as a Stripe-native payment method — Vendibook is **not** the lender.
🔒 Public financing page copy must state: Vendibook is not the lender; Affirm (and any Stripe-mediated financing) determines eligibility, terms, rates and approval; provider terms control. No "instant", "preapproved", or guaranteed language.

## 11. AI tools live today

✅ PermitPath (free tier + PermitPath Plus $29 unlock).
✅ Spark writing assist (Pro tier).
✅ PricePilot / Listing Studio / Marketing Studio / Concept Lab / Market Radar (Pro tier).
✅ BuildKit (Premium tier).
✅ Startup Guide, Regulations Hub (free).

All AI outputs are informational only; no legal/tax/permitting advice. This is already the tone in existing tool UI. New `/legal/ai-tools` doc must lock this in.

## 12. Existing legal pages / DB rows (source: `legal_documents` table + routes)

| DB `document_type` | Slug (`/legal/:slug`) | Version | Status | Body state |
|---|---|---|---|---|
| `terms_of_service` | `terms` | v1 | active | Explicit "(Draft) — working draft pending qualified legal review" |
| `privacy_policy` | `privacy` | v1 | active | Explicit "(Draft) — working draft pending qualified legal review" |
| `marketplace_rules` | `marketplace-rules` | v1 | active | Draft |
| `seller_terms` | `seller-terms` | v1 | active | Draft |
| `renter_terms` | `renter-terms` | v1 | active | Draft |
| `pay_in_person_acknowledgment` | `pay-in-person-terms` | v1 | active | Draft |
| `featured_listing_terms` | `featured-listing-terms` | v1 | active | Draft |
| `subscription_terms` | `subscription-terms` | v1 | active | **Real copy** (2026-07-24) |
| `refund_cancellation_policy` | `refund-cancellation-policy` | v1 | active | **Real copy** (2026-07-24) |

Static route pages (hardcoded, may drift from DB):
- `/terms` → `src/pages/Terms.tsx` (hardcoded copy)
- `/privacy` → `src/pages/Privacy.tsx` (hardcoded copy — dated 2026-01-11 in copy, drift from DB)
- `/california-privacy` → `src/pages/CaliforniaPrivacy.tsx` (hardcoded copy)
- `/legal/sms` → `src/pages/legal/SmsTerms.tsx` (hardcoded)
- `/legal/sms-opt-in-proof` → `src/pages/legal/SmsOptInProof.tsx`
- `/legal/:slug` → `LegalDocumentPage.tsx` (DB-driven; catch-all)

Missing routes referenced from other pages / footer: `/legal/cookies`, `/legal/e-sign`, `/legal/ai-tools`, `/legal/financing`, `/legal/ip`, `/legal/refunds`, `/legal/acceptable-use`. Also **no `/legal` hub page**.

## 13. Consent triggers currently wired (source: `CONSENT_TRIGGERS` + grep of `user_consents`)

| Trigger | Currently writes consent? | Doc(s) referenced |
|---|---|---|
| Signup | ✅ Yes (AuthFormPanel) | Terms, Privacy |
| Publish listing | ✅ ConsentModal | Marketplace Rules, Seller Terms |
| Purchase review | ✅ FinalReviewSheet | Buyer Terms, Refund |
| Pay in person | ✅ ConsentModal | Pay-in-Person acknowledgment |
| Rental request | ✅ | Renter Terms |
| Instant book | ✅ | Renter Terms |
| Booking review | ✅ | Renter Terms, Refund |
| Featured activation | ✅ | Featured Listing Terms |
| Stripe Connect onboarding | 🔒 Consent capture exists but does not reference a *Payments Terms* doc (that doc doesn't exist yet) |
| Identity verification | 🔒 Same — no dedicated doc |
| Referral | ✅ `referral-accept-terms` (own flow) | Referral Program Terms (doc doesn't exist yet) |
| Review submission | Partial |  |
| Cancellation | Partial |  |
| Subscription start | ⚠️ **Currently relies on public Terms alone** — no dedicated Subscription Terms clickwrap on the plan-picker/checkout. Refund + Subscription Terms v1 exist in DB but are not shown on Stripe subscription checkout. |
| SMS opt-in | ✅ Separate, unchecked | SMS Terms |
| E-Sign acknowledgment | ⚠️ Not captured anywhere — SignNow flow assumes acceptance |

## 14. Cross-cutting broken links / stale strings

- `/legal/sms` → `/support` (nonexistent) — must be `/help`.
- `/legal/sms` → `/legal/privacy` (nonexistent) — must be `/privacy`.
- `src/pages/Terms.tsx` / `src/pages/Privacy.tsx` render **static dates** and hardcoded copy that has drifted from the DB `legal_documents` rows they're supposed to mirror. Privacy page shows "Last Updated: January 11, 2026" as literal string; must be sourced from `legal_documents.effective_at` or removed.
- No page in the app renders `new Date()` as a legal effective date (verified — no such pattern found). Good.
- Footer has `/california-privacy#do-not-sell` — the anchor exists on `CaliforniaPrivacy.tsx` **but no functional Do-Not-Sell mechanism is wired** (Meta Pixel keeps firing regardless).
- `EventPro` / `PermitPath` — referenced in some marketing; PermitPath is a live tool; EventPro is not a separate legal entity — should be treated as a product name of Vendibook.

## 15. Mismatch list (to be resolved before or with Phase 3 copy)

| # | Location | Current claim | Reality | Resolution |
|---|---|---|---|---|
| M1 | `Privacy.tsx` | "Last Updated: January 11, 2026" literal | Copy hasn't been updated for the marketplace | Rewrite (Phase 3 §2) + drive date from DB |
| M2 | `Terms.tsx` | Vague "laws of the jurisdiction in which Vendibook operates" | No governing law stated | Owner confirms state; safe default: preserve existing wording, flag |
| M3 | Various | Word "escrow" wherever it appears | Funds are Stripe-held payment protection | Global replace "escrow" → "payment protection" |
| M4 | Referral pages | Older "24h/25d" hold copy | Config: 7/2/14 day holds | Rewrite Referral Program Terms from config |
| M5 | Meta Pixel init | Fires pre-consent, no GPC | Directly contradicts any "no sale/share" claim | Phase 5 — gate all non-essential tags before the Privacy Policy makes any sale/share claim |
| M6 | `CookieConsent.tsx` | Banner only on 4 route prefixes | Should appear on first visit, regardless of route (or gate all non-essential tags until decided) | Phase 5 fix |
| M7 | `/legal/sms` | Links to `/support`, `/legal/privacy` | Both are dead routes | Phase 1 fix |
| M8 | Subscription checkout | Assumes public Terms covers recurring-billing consent | CCPA/UDAP require distinct affirmative consent | Phase 4 wiring |
| M9 | Existing Terms/Privacy DB rows | Body starts with literal "(Draft) — working draft pending qualified legal review" | Public users see this today | Phase 3 v2 rewrites, seeded atomically |
| M10 | Insurance / damage-protection language anywhere | Vendibook does not underwrite | | Never claim; deposits + host policy only |
| M11 | Identity verification badge tooltip copy | | Only Stripe Identity is used | Say "Identity verified by Stripe Identity" — no broader claim |
| M12 | Financing surfaces | No unified `/legal/financing` doc today | Affirm is live via Stripe | Phase 3 §15 doc |

## 16. Owner/counsel confirmation register (persistent — see `.lovable/legal-owner-review.md`)

Day-one items I will not fabricate:

1. Registered legal entity name, state of formation, mailing address.
2. Governing law + venue.
3. Arbitration provider (JAMS / AAA / other), rules set, opt-out procedure.
4. Class-action waiver stance.
5. Liability cap dollar amount.
6. Whether protected-sale funds are legally "escrow" (default: **no** — say "payment protection held by Stripe").
7. Insurance / damage-protection carrier (default: **none claimed**).
8. Retention periods: transactions, marketing consents, support call recordings, SMS consent records.
9. Whether CCPA/CPRA applies statutorily or is offered voluntarily.
10. Whether ad-tech qualifies as "sale/share" — drives GPC + DNS/S link requirement.
11. DMCA designated agent — is the agent registered with the U.S. Copyright Office?
12. Financing lender (Affirm confirmed; other?).
13. Call-recording jurisdictional stance (one-party vs. two-party — safest: always disclose).
14. Tawk chat + Vapi call recording retention windows.

Nothing goes on a public page in bracketed placeholder form. Where a fact is unknown, the safest accurate existing statement stays and the item is flagged here.

---

**Next:** Phase 1 (routing + Legal Center hub + fix broken links + register missing static routes) — no legal copy changes yet.
