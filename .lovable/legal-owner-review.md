# Legal — Owner / Counsel Confirmation Register

**Purpose:** persistent list of every fact a public Vendibook legal page needs but that must be confirmed by owner / counsel before being written. Nothing bracketed ever ships to a public page. When a fact is unknown, the safest existing accurate statement stays and the item is flagged here.

Format: one row per fact. When confirmed, replace `PENDING` with the confirmed value, add a date, and cite the source (email, doc, chat).

## Cross-document

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Registered legal entity name | **PENDING** | Public pages currently just say "Vendibook". |
| 2 | State of formation | **PENDING** | |
| 3 | Registered mailing address for legal notices | **PENDING** | Used in Terms notice-of-claim section, DMCA agent, CA privacy request address. |
| 4 | Governing law (state) | **PENDING** | Terms currently says "the jurisdiction in which Vendibook operates" — vague, must resolve. |
| 5 | Venue (county / court) | **PENDING** | |
| 6 | Arbitration provider (JAMS / AAA / other) | **PENDING** | Do NOT fabricate. |
| 7 | Arbitration rules set | **PENDING** | |
| 8 | Arbitration opt-out procedure and window | **PENDING** | |
| 9 | Class-action waiver stance | **PENDING** | |
| 10 | Aggregate liability cap dollar amount | **PENDING** | Default draft language will use "the greater of $100 or the fees you paid in the 12 months preceding the claim" — owner may override. |
| 11 | Business email domain for legal notices | Confirmed: `support@vendibook.com` (memory) | |
| 12 | Support phone | Confirmed: `(725) 755-9598` (memory) | |
| 13 | Support hours | Confirmed: Mon–Fri 9am–5pm AZ, no DST (memory) | |

## Payments & protected transactions

| # | Item | Status | Notes |
|---|---|---|---|
| 14 | Funds characterization | **Default draft: "payment protection held by Stripe on our behalf"** — NOT escrow. Owner may confirm a stronger legal characterization only with counsel opinion. | Never write the word "escrow" unless owner confirms a licensed escrow arrangement. |
| 15 | Rental payout timing wall-clock claim | **PENDING** | Memory says "24h"; code doesn't enforce it. Safe copy: "typically released after handoff confirmation and Stripe's standard schedule." |
| 16 | Sale payout timing wall-clock claim | **PENDING** | Memory says "25d"; same. |
| 17 | Reserves policy | **PENDING** | |
| 18 | Chargeback policy | **PENDING** | Draft will state buyer's Stripe/card issuer process controls; seller cooperation required. |
| 19 | Tax remittance responsibility | **PENDING** | Draft: sellers/hosts responsible for their own taxes. |

## Insurance / damage protection

| # | Item | Status | Notes |
|---|---|---|---|
| 20 | Damage protection program | **Default draft: NONE claimed.** | Never claim insurance/damage protection unless owner confirms carrier + policy number. |
| 21 | Deposits | **PENDING** | Whether platform-mediated or host-collected. |

## Privacy / data

| # | Item | Status | Notes |
|---|---|---|---|
| 22 | Retention: transactions | **PENDING** | Draft: 7 years for tax/financial. |
| 23 | Retention: marketing consents | **PENDING** | Draft: until withdrawn. |
| 24 | Retention: support call recordings (Vapi) | **PENDING** | Vapi default per assistant config. |
| 25 | Retention: chat transcripts (Tawk) | **PENDING** | |
| 26 | Retention: SMS consent records | Confirmed by carrier requirement: **retained indefinitely as compliance record** | |
| 27 | Retention: identity verification results | **PENDING** | Stripe Identity controls document retention; owner to state our own metadata retention. |
| 28 | CCPA/CPRA applicability | **PENDING** | Owner to state whether we meet the statutory threshold or provide rights voluntarily. |
| 29 | Ad-tech = "sale/share" under CPRA? | **Default draft: YES** given Meta Pixel + Google Ads present. Requires functional Do Not Sell/Share link + GPC honoring before Privacy Policy can claim otherwise. | |
| 30 | International processing / SCCs | **PENDING** | |
| 31 | Children under 18 | **Default draft: platform not directed to under 18; users must be 18+.** | |

## Communications

| # | Item | Status | Notes |
|---|---|---|---|
| 32 | Call-recording jurisdictional stance | **Default draft: disclose recording on every recorded call (two-party safe).** | Existing Help Center callback consent line already does this. |
| 33 | SMS keyword-based opt-in support (other than inbound STOP/START/HELP) | **Not live.** Public copy will not advertise it. | |
| 34 | Marketing SMS volume | Confirmed via carrier config: "message frequency varies; standard message and data rates may apply." | |

## Marketplace conduct

| # | Item | Status | Notes |
|---|---|---|---|
| 35 | Prohibited assets list | **Draft from existing Marketplace Rules v1** | Owner to sign off. |
| 36 | Off-platform circumvention penalty | **PENDING** | Draft: account termination + fee forfeiture. |

## Financing

| # | Item | Status | Notes |
|---|---|---|---|
| 37 | Financing providers actually live | Confirmed: **Affirm** via Stripe Checkout | Vendibook is not the lender. |
| 38 | Other financing providers | **PENDING** | Draft omits any provider not confirmed. |

## IP / DMCA

| # | Item | Status | Notes |
|---|---|---|---|
| 39 | DMCA designated agent registered with USCO | **PENDING** | If not registered, draft will describe the process without claiming safe-harbor status. |
| 40 | Agent name + address | **PENDING** | |

## Referral

| # | Item | Status | Notes |
|---|---|---|---|
| 41 | Referral program availability by state | **PENDING** | Some states restrict incentive-based referral programs. |
| 42 | Tax treatment of referral rewards | **PENDING** | Draft: 1099 issued when annual rewards exceed $600. |

## E-Sign

| # | Item | Status | Notes |
|---|---|---|---|
| 43 | ESIGN Act consent scope | Draft: transaction records, receipts, contract copies, legal notices sent electronically. | |
| 44 | Paper-copy request procedure | **PENDING** | Draft: email `support@vendibook.com` — owner to confirm process and any fee. |

---

Add new rows as they surface during Phase 3. Do not delete rows; mark them `CONFIRMED` with date + source when resolved.
