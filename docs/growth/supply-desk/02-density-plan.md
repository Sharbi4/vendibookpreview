# Density Plan — top 5 metros where demand outruns supply

_Supply Desk · data pulled 2026-10-05_

## Method & caveats

Three demand signals, all counted in distinct sessions where possible:

1. **Search sessions with a location** (90 days, `search_performed` + `search_zero_results`, internal searches excluded). Location text was normalised to metros by city name and ZIP prefix.
2. **Zero-result sessions** in that metro.
3. **Listing views / view sessions** (30 days) on live listings in the metro, divided by the live count to get pressure per listing.

Caveats:

- **Only about 30% of searches carry a location** (1,263 of 4,164). The ranking is directional, so read the ratios and ignore the absolutes.
- **View sessions ≈ views,** which means bots or unauthenticated crawlers are inflating views. Use views for relative pressure only.
- **Conversations are too sparse to rank metros:** 0–1 per state in 30 days. This is the 97% "no contact" problem, and it belongs to the Buyer Desk.

## Scoreboard (candidates)

| Metro | Search sessions | Zero-result sessions | Live listings | Views (30d) per live listing | Notes |
|---|---|---|---|---|---|
| **Los Angeles** | 32 | 19 | 4 | **141** | Highest pressure per listing; zero results across trailer/truck sale and rent, ghost kitchen, vendor lot |
| **Houston** | **51** | 16 | ≈10–12 | 36 | Most search demand overall; only 2 rentals; 1 truck for sale |
| **Minneapolis–St Paul** | 30 | **29** | **0** | — | Pure white space (ZIPs 55303/55306). Fall is when MN owners sell off-season |
| **Atlanta** | 10 (+7 "Georgia" sessions, 64 searches) | 1 (+28 zero events on "Georgia") | 2 metro / 9 in GA | 50 metro / 56 GA | GA searches are statewide; "atlanta georgia" appears in food-trailer **rent** zero results |
| **Raleigh–Durham** | 11 | **11 (100%)** | 0–1 | 78 (NC, 4 listings) | Every located search returned nothing |
| _Alternate: Denver–Colorado Springs_ | 16 | 10 | 3 | 31 | Pick if MN outreach stalls |
| _Alternate: Phoenix (+Tucson)_ | 14 (+8) | 4 (+1) | 6 (+3) | 47 | 2 alerts for trailer **rentals** (ZIPs 850/853). The 25 Tucson drafts are mostly junk |
| _Not picked: New York–NJ_ | 7 | 7 | 6 | — | Few sessions, many repeats |

## The 5 metros and 60-day supply targets

Target = live, published listings by 2026-12-05. These are additions on top of today's count.

The floor we want per metro is enough choice that a buyer sees **≥3 relevant results for their category and mode**. That is the minimum for a search to feel like a market.

| # | Metro | Today | Trailer, sale | Truck, sale | Trailer/truck, rent | Ghost kitchen / commissary / vendor lot | **Target add** | **60-day live** |
|---|---|---|---|---|---|---|---|---|
| 1 | **Los Angeles** (LA/OC/Inland Empire) | 4 | +6 | +5 | +3 | +2 | **+16** | 20 |
| 2 | **Houston** (incl. Spring, Katy, Cypress, Magnolia) | ≈10 | +4 | +5 | +4 | +2 | **+15** | 25 |
| 3 | **Minneapolis–St Paul** | 0 | +4 | +4 | +3 | +1 vendor lot | **+12** | 12 |
| 4 | **Atlanta** (metro ATL) | 2 | +4 | +4 | +3 (rent demand) | +1 | **+12** | 14 |
| 5 | **Raleigh–Durham** | 0–1 | +4 | +3 | +2 | +1 | **+10** | 10–11 |
| | **Total** | ≈16 | +22 | +21 | +15 | +7 | **+65** | ≈81 |

### Where the supply comes from (per metro, 60 days)

| Source | Expected share | Notes |
|---|---|---|
| Draft recovery (`01-draft-recovery.md`) | ~10% | Few drafts in these metros: Houston 5, LA 4, Atlanta 2, Raleigh 1, MSP 0 |
| **MUSE-2** cross-listing invites | ~55% | Each metro has active FB Marketplace food truck/trailer inventory. Plan for about 25 invites per metro per week at a 5–8% conversion, which is about 8–12 listings per metro in 60 days |
| **MUSE-4** "Wanted" posts | ~15% | Brings out owners who weren't listing yet, mostly rentals and commissary space |
| Direct partnerships (builders, dealers, commissaries) | ~20% | 1–2 trailer builders or dealers per metro can add 3–8 units each. Ops owns this |

### Weekly tracking (send to Growth & Liquidity)

Per metro, track:

- live count
- new listings this week, by source (needs a UTM to listing attribution, see LP-4)
- zero-result sessions this week
- % of located searches returning ≥3 results

**Graduation rule:** when a metro's zero-result share drops below 20% for 2 weeks running, stop Muse invites there and rotate in the next alternate.
