# Market Capture Assessment: Vendibook (2026-10-05)

Framework: Ravi Mehta's Market Capture Framework. A buyer picks a marketplace over the alternatives (FB Marketplace, Craigslist, builder sites, calling the seller directly) when it wins on **price, exclusive supply, discoverability, trust or fulfillment**.
Data: live DB (read-only), 30d clean human traffic (753 sessions, scraper and seller self-views removed).

## Scorecard

| Dimension | Today | Evidence | Can we win it? |
|---|---|---|---|
| **Price** | **Low** | Sellers set prices, and the same unit is often on FB Marketplace. Offers are on for only 31 of 121 sale listings. | No. Use price *transparency* instead. |
| **Exclusive supply** | **Low** | Food trucks and trailers are the same units sold everywhere. Vendor lots and vendor spaces have **0 listings** despite 27 zero-result sessions. Food-trailer rentals around ZIP 55303 (Twin Cities) have 0 listings despite 17 zero-result sessions. A scraper pulled 3,700 sessions of our listings this month. | Only in niches FB handles badly: **rentals, commissaries, vendor lots**. |
| **Discoverability** | **Medium** | Organic search works (121 Google + 14 ChatGPT sessions/30d). But 19.6% of searches return nothing, a coffee trailer is filed as a truck, and the Houston search radius misses 16 live TX trailers. | Yes, it's fixable in code. |
| **Trust** | **Medium → best wedge** | Members must verify phone + ID before messaging or making offers (trust gate), every message is risk-scanned, and sellers show PayPal-verified badges. But only 81 of 121 sale listings fill in title, condition and running status, and buyers never see why Vendibook is safer than FB. | **Yes.** For $10k–80k used equipment, scams are the buyer's #1 fear. |
| **Fulfillment** | **Medium, underused** | Vendibook Freight (31 listings), financing, PayPal checkout (94 listings), delivery check and notary (**0 listings enabled**). None of this appears in buyer-facing copy, and the hot-but-cold listings are mostly pickup-only. | **Yes.** No FB seller can offer freight, financing and a protected checkout together. |

**Position:** win the way Viator did, not the way TripAdvisor's hotel booking tried to. Don't fight on price or commodity supply. Make Vendibook the **safest and easiest way to buy or rent a $10k–80k food business**, and own the niches (rentals, commissaries, vendor lots) where FB Marketplace doesn't work.

**Leaky bucket check:** only 4 live listings put a phone, email or link in the description, so the bucket doesn't leak through descriptions. It leaks because 99% of buyers leave without contacting anyone. The guest-inquiry concierge relay (now hardened so contact details are masked and the seller is read from the listing) keeps first contact on Vendibook.

## Actions taken today
1. **Trust:** hardened guest inquiries so they can't bypass the trust gate (commit `75d30208` on `buyer-desk/2026-10-05-v2`): seller read from the listing, contact masking, AI risk scan, rate limits, honeypot.
2. **Trust (payments):** removed the unused Stripe packages from `package.json` (Square + PayPal only).
3. **Website:** added LP-9 (trust and fulfillment strip) and LP-10 (price vs. comps) below. Both are paste-ready in `lovable-prompts.md`.
4. **Muse:** added an approved list of Vendibook claims so posts sell on trust and fulfillment, not just the unit (`muse-prompts-2026-10-05.md`).
5. **Supply:** SB-1 (Twin Cities rentals), SB-3 (vendor lots) and SB-4 (commissaries) in `demand-map-2026-10-05.md` are the exclusive-supply plays. They're promoted to P0 for Supply Desk.

## Ops follow-ups (no code)
- Ask the hosts of these 4 listings to move contact details out of the description and onto Vendibook messaging: `f1a879a6` (WA ice cream), `8d19aa3e` (MI turnkey), `c96a0bae` (AR pizza truck), `22701ef2` (FL 2026 trailer). The phone regex can also match long price strings, so check each one first.
- Recruit sellers onto freight and notary: today 31 of 130 listings have freight on and **0** have notary on. Start with the hot-but-cold 15.
- Confirm `signup_phone_required` and `signup_identity_required` are switched on in production before Muse claims "verified members".

## What to measure (weekly)
- Trust: % of sale listings with complete trust fields (81/121 today; target 110/121). Guest inquiries held vs. delivered.
- Fulfillment: listings with freight on (31 → 60) and notary on (0 → 15). Share of contacts on freight-enabled listings.
- Discoverability: zero-result rate (19.6% → under 10%).
- Exclusive supply: live vendor lots + commissaries + MN rentals (0 → 10).
