# Legal — Owner / Counsel Confirmation Register

**Purpose:** persistent list of every fact a public Vendibook legal page needs but that must be confirmed by owner / counsel before being written. Nothing bracketed ever ships to a public page. When a fact is unknown, the safest existing accurate statement stays and the item is flagged here.

Format: one row per fact. When confirmed, replace `PENDING` with the confirmed value, add a date, and cite the source (email, doc, chat).

Latest owner direction: **owner direction, chat, 2026-07-27** — decisions #1–#12 in the Phase 2/3 kickoff message. Items below reflect that direction. Anything still `PENDING` was explicitly left open by owner and must not be invented in public copy.

## Cross-document

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Registered legal entity name | **PENDING** | Owner intent: "Vendibook LLC" as an Arizona LLC, but exact spelling must be reconciled against verified business/EIN records; a prior registration form may read "Vendibook LC" as a typo. Until reconciled, public docs use "Vendibook, an Arizona limited liability company" without naming the LLC. (owner direction 2026-07-27) |
| 2 | State of formation | **CONFIRMED: Arizona** (owner direction 2026-07-27) | |
| 3 | Registered mailing address for legal notices | **PENDING** | Owner explicitly forbids substituting a personal/residential address. Public docs route notices to `support@vendibook.com` and state that Vendibook will provide a current mailing address on request. |
| 4 | Governing law (state) | **CONFIRMED: Arizona** (owner direction 2026-07-27) | |
| 5 | Venue (county / court) | **CONFIRMED: Pima County, Arizona state courts, or U.S. District Court for the District of Arizona where federal jurisdiction exists; subject to any enforceable arbitration provision and non-waivable consumer-law limits.** (owner direction 2026-07-27) | |
| 6 | Arbitration provider | **CONFIRMED: American Arbitration Association (AAA)** (owner direction 2026-07-27) — flag for attorney review before activation | |
| 7 | Arbitration rules set | **CONFIRMED: AAA Consumer Arbitration Rules, governed by the Federal Arbitration Act** (owner direction 2026-07-27) — flag for attorney review | |
| 8 | Arbitration opt-out procedure and window | **CONFIRMED: 30 days from first acceptance; email `support@vendibook.com` from the account email with full name, account email, and clear opt-out request.** Preserves small-claims and non-waivable remedies. (owner direction 2026-07-27) — flag for attorney review | |
| 9 | Class-action / representative-action waiver | **CONFIRMED: jury-trial waiver + class/representative-action waiver, to the extent permitted by law** (owner direction 2026-07-27) — flag for attorney review | |
| 10 | Aggregate liability cap dollar amount | **CONFIRMED: greater of $100 or fees the claimant paid to Vendibook during the 12 months preceding the claim, subject to non-waivable law and appropriate carve-outs** (owner direction 2026-07-27) — flag for attorney review | |
| 11 | Business email domain for legal notices | Confirmed: `support@vendibook.com` (memory) | |
| 12 | Support phone | Confirmed: `(725) 755-9598` (memory) | |
| 13 | Support hours | Confirmed: Mon–Fri 9am–5pm AZ, no DST (memory) | |
| 45 | Product-name clarification | Confirmed: **EventPro and PermitPath are Vendibook product names, not separate legal entities.** (owner direction 2026-07-27) | |
| 46 | Minimum age | Confirmed: **users must be 18+** (owner direction 2026-07-27) | |
| 47 | Recording disclosure | Confirmed: **disclose recording before any recorded call** (owner direction 2026-07-27) | |

## Payments & protected transactions

| # | Item | Status | Notes |
|---|---|---|---|
| 14 | Funds characterization | **Payment protection held via Stripe on Vendibook's behalf — NEVER "escrow"** (memory + owner direction 2026-07-27) | |
| 15 | Rental payout timing wall-clock claim | **CONFIRMED: no wall-clock guarantee.** Copy: "typically released after required confirmation/review, then follow Stripe's processing and payout schedule; timing may vary due to disputes, refunds, risk review, reserves, account restrictions, weekends/holidays, and banking delays." (owner direction 2026-07-27) | |
| 16 | Sale payout timing wall-clock claim | **CONFIRMED: same as #15** (owner direction 2026-07-27) | |
| 17 | Reserves policy | Draft: Stripe may impose reserves per Stripe's terms; Vendibook does not independently control reserves. | |
| 18 | Chargeback policy | Draft: buyer's card issuer/Stripe process controls; seller cooperation required; Vendibook may debit disputed amounts pending resolution. | |
| 19 | Tax remittance responsibility | **CONFIRMED: sellers/hosts responsible for their own taxes except where Vendibook is legally required to collect/remit.** (owner direction 2026-07-27) | |
| 48 | Universal deposit program | **CONFIRMED: no universal deposit program may be claimed unless audited checkout proves it.** (owner direction 2026-07-27) — current v2 drafts omit any deposit claim. | |

## Insurance / damage protection

| # | Item | Status | Notes |
|---|---|---|---|
| 20 | Damage protection program | **CONFIRMED: Vendibook does NOT provide or claim platform insurance or damage-protection.** Hosts/sellers and customers are responsible for any required coverage and transaction-specific terms. Never imply a carrier or policy exists. (owner direction 2026-07-27) | |
| 21 | Deposits | See #48. | |

## Privacy / data

| # | Item | Status | Notes |
|---|---|---|---|
| 22 | Retention: financial/transaction/tax | **CONFIRMED: 7 years (category target; "or longer where legally required")** (owner direction 2026-07-27) | |
| 23 | Retention: marketing consents | **CONFIRMED: until withdrawal + 4 years as proof** (owner direction 2026-07-27) | |
| 24 | Retention: Vapi call recordings/transcripts | **CONFIRMED: 2 years unless a dispute, security incident, legal hold, or law requires longer** (owner direction 2026-07-27) | |
| 25 | Retention: Tawk chat transcripts | **CONFIRMED: 3 years after ticket closure** (owner direction 2026-07-27) | |
| 26 | Retention: SMS consent records | Confirmed by carrier requirement + owner: **retained indefinitely** (owner direction 2026-07-27) | |
| 27 | Retention: Vendibook identity-verification status/metadata | **CONFIRMED: account lifecycle + up to 5 years after closure where reasonably necessary for fraud, disputes, or legal compliance.** Stripe controls underlying identity-document retention under Stripe's own terms. (owner direction 2026-07-27) | |
| 28 | CCPA/CPRA applicability | **CONFIRMED: do NOT claim Vendibook currently meets every statutory threshold.** Offer access, correction, deletion, opt-out rights voluntarily to U.S. users where feasible; separately honor all rights required for residents when an applicable law governs. (owner direction 2026-07-27) | |
| 29 | Ad-tech = "sale/share" under CPRA? | **CONFIRMED: treat conservatively as "sharing".** Phase 5 must ship real Do-Not-Sell-or-Share, first-visit consent controls on all routes, and GPC honoring **before** the new Privacy/California notice v2 is activated. Necessary/functional Stripe and security services remain exempt as appropriate. (owner direction 2026-07-27) | |
| 30 | International processing / SCCs | **PENDING** | Owner did not confirm; drafts describe US-based processing without SCC promise. |
| 31 | Children under 18 | **CONFIRMED: platform not directed to under 18; users must be 18+** (owner direction 2026-07-27) | |

## Communications

| # | Item | Status | Notes |
|---|---|---|---|
| 32 | Call-recording jurisdictional stance | Confirmed: **disclose recording before any recorded call (two-party safe)** (owner direction 2026-07-27) | |
| 33 | SMS keyword-based opt-in support beyond STOP/START/HELP | **Not live** — public copy does not advertise it. | |
| 34 | Marketing SMS volume | Confirmed via carrier config: "message frequency varies; standard message and data rates may apply." | |

## Marketplace conduct

| # | Item | Status | Notes |
|---|---|---|---|
| 35 | Prohibited assets list | **Draft from existing Marketplace Rules v1** — carried forward into v2 draft. | |
| 36 | Off-platform circumvention penalty | Draft: account termination + forfeiture of platform fees / commission; may pursue damages where permitted. |

## Financing

| # | Item | Status | Notes |
|---|---|---|---|
| 37 | Financing providers actually live | **CONFIRMED: Affirm via Stripe Checkout is the only live provider.** Vendibook is not the lender; provider approval, rates, limits, eligibility, and terms control. (owner direction 2026-07-27) | |
| 38 | Other financing providers | **Omitted** — no other lender is confirmed live. (owner direction 2026-07-27) | |

## IP / DMCA

| # | Item | Status | Notes |
|---|---|---|---|
| 39 | DMCA designated agent registered with USCO | **CONFIRMED: assume NOT registered** unless verified. Draft describes a practical copyright/takedown process using `support@vendibook.com` without claiming DMCA safe-harbor status. (owner direction 2026-07-27) | |
| 40 | Agent name + address | **PENDING** — do not publish. (owner direction 2026-07-27) | |

## Referral

| # | Item | Status | Notes |
|---|---|---|---|
| 41 | Referral program availability by state | **PENDING** — draft carries generic "void where prohibited" language until owner confirms per-state review. |
| 42 | Tax treatment of referral rewards | Draft: 1099 issued when annual rewards exceed $600 (existing memory). Owner did not override. |

## E-Sign

| # | Item | Status | Notes |
|---|---|---|---|
| 43 | ESIGN Act consent scope | Draft: transaction records, receipts, contract copies, legal notices sent electronically. | |
| 44 | Paper-copy request procedure | Draft: email `support@vendibook.com`; no fee currently. Owner did not override. |

## Effective dates

| # | Item | Status | Notes |
|---|---|---|---|
| 49 | v2 effective dates | **CONFIRMED: literal migration/publication commit date for each v2 document — never a future placeholder, never `new Date()` at render.** (owner direction 2026-07-27) On activation, we UPDATE the row's `effective_at` to the activation date. Draft rows carry the row's creation timestamp as a placeholder that is replaced on activation. |

---

Add new rows as they surface during Phase 3. Do not delete rows; mark them `CONFIRMED` with date + source when resolved.
