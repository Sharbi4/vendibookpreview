# Buyer Desk

Owner: Buyer Desk lead (reports to Growth & Liquidity). Data comes from read-only SELECTs on the Lovable DB.

| File | What |
|---|---|
| [hot-but-cold-2026-10-05.md](hot-but-cold-2026-10-05.md) | Top 15 high-view, zero-contact listings with diagnosis and fixes, plus the clean-traffic SQL |
| [demand-map-2026-10-05.md](demand-map-2026-10-05.md) | Demand by category × state × budget, plus sourcing briefs SB-1…SB-7 for Supply Desk |
| [muse-prompts-2026-10-05.md](muse-prompts-2026-10-05.md) | MUSE-1 (reply to "looking to buy/rent" posts) and MUSE-3 (promote hot-but-cold listings) |
| [market-capture-2026-10-05.md](market-capture-2026-10-05.md) | Market Capture Framework scorecard: compete on trust + fulfillment, own rentals/commissaries/vendor lots |
| [ops-drafts-2026-10-05.md](ops-drafts-2026-10-05.md) | Ready-to-send replies: 3 unmatched asset requests, 15 seller fix nudges, 4 contact-detail nudges |
| [personas.md](personas.md) | 4 buyer personas and the messaging for each |
| [lovable-prompts.md](lovable-prompts.md) | LP-1…LP-10 buyer-side site changes (Square + PayPal only, never Stripe; PayPal stays in sandbox) |

## Headline for Growth lead (2026-10-05)
- **Baseline correction:** 3,700 of 4,842 "human" sessions are one scraper UA, and 316 are a host viewing their own listing. Clean = **753 sessions → BCR 0.80%**. The 1.5% target is about 11 contacts per 30d (+5).
- **Clean traffic is mostly mobile** (44–87% on top listings), so LP-1 (mobile "Ask a question": type first, verify phone + ID in place, no redirect to /auth) is the #1 lever.
- **Offers are off on 11 of the top 15** cold listings, and trust fields (title, condition, running status) are blank on 6 of them.
- **Demand sits under $20k and in rentals**; supply skews $35k+. The biggest single gap is food-trailer rentals in the Twin Cities (17 zero-result sessions). Vendor lot and vendor space have 0 supply and 27 zero-result sessions.
- **Two Atlanta rental asset requests were never matched**, though 2 Atlanta rentals are live. Ops should reply today.
