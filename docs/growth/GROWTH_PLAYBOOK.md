# Vendibook Growth & Liquidity Playbook

Owner: Growth/Liquidity lead (Claude). Sub-teams: **Buyer Desk** (demand) and **Supply Desk** (sellers/hosts). Field agent: **Muse** (Facebook, Instagram, Threads).
Baseline pulled from production on 2026-10-05. Re-run `docs/growth/liquidity-scorecard.sql` for current numbers.

> **Operating priority (owner, 2026-10-05).** First: real, quality sellers, listings and buyers, plus trust and security of the site. Liquidity comes second.
> - Never feature, promote or route anything that fails a quality or scam check. That covers stock or reused photos, prices that make no sense for the category, contact details in a listing, and off-platform payment pushes.
> - Never claim "verified" beyond what the platform actually verifies (phone, plus free Plaid ID for anyone starting contact).
> - Sellers are never blocked from answering buyers. Scammers are caught by message-risk-scan, the hourly trust-safety-sweep and the hourly pulse.

---

## 1. Diagnosis: real buyer traffic is thin, and too little of it converts to a contact

> **Baseline corrected 2026-10-05.** The first pull counted 4,842 "human" view sessions. 3,700 of them were one scraper (Chrome/119 user agent, exactly 1 view per session, never logged in, around the clock) and 393 were sellers viewing their own listings. The scorecard SQL now excludes both automatically.

| Metric (30d) | Value | Read |
|---|---|---|
| Live listings | 144 (125 sale / 19 rent) | Enough supply to transact in TX, FL, AZ, CA, GA |
| New listings | 48 | Supply growth is healthy |
| Real drafts | 102 (151 raw, minus internal/test hosts, QA titles and guest placeholders) | A large, cheap supply win, but they're blocked by the disclosures step (see Supply Desk) |
| Real listing-view sessions | 754 (4,843 before removing the scraper and self-views) | Real buyer attention is thin: grow it (SEO, Muse) as well as convert it |
| **Buyer contacts** (messages + offers + leads + booking requests) | **6** | **The bottleneck** |
| **Buyer Contact Rate** | **0.80%** | B2B high-ticket marketplaces should be at 2–5% |
| Listings with any contact | 2.8% | 97% of sellers hear nothing, which causes churn |
| Zero-result searches | 19.6% | 1 in 5 searches is a dead end |
| Offer response rate | 0% (3 offers) | No seller answered an offer |
| Sale transactions / GMV | 1 / $1,200 | — |

Seller-facing view counts are inflated by the same scraper and by self-views (the Glendale coffee trailer's 344 views were mostly its own seller), so host digests overstate interest. See Buyer Desk LP-5.

### Root causes found in the product
1. **Login wall before first contact. Shipped 2026-10-05 (commit 13e5949b; live once published in Lovable):** logged-out buyers can now ask a question with just an email (`MessageHostForm` → `listing_leads`, source `guest_inquiry`, `notify-listing-lead` emails concierge, seller and buyer). Original finding: in the sale layout (`SalePurchaseCard` on desktop, `SaleListingMobile` on mobile), "Message seller," "Make offer," and "Buy now" all send anonymous users to `/auth`. The redirect lives in `MessageHostForm`. A $20k–$80k buyer's first question is "Is it still available? Clean title? Can I see it?", and we charge an account signup for it. This is the largest single leak.
2. **There's no one-tap question.** Messaging opens a blank form. Prefilled chips ("Still available?", "Clean title?", "Video walkthrough?", "Negotiable?") lower the effort of a first contact. Mobile is 51% of traffic.
3. **"Ask for Help" on mobile sale listings starts a Vendi voice call** (`start-vendi-call`), not a text inquiry. That's a high-commitment step for a first touch.
4. **Offers die silently.** Offers expire in 48h. Sellers aren't chased by SMS, and no human gets alerted when a high-ticket offer goes unanswered.
5. **Contact events aren't instrumented.** `message_host_click` was last seen in February. We can't see the funnel step between a view and a contact.
6. **Only 31 of 144 listings accept offers.** Negotiation is the norm in used-equipment B2B. If offers are off, buyers leave rather than haggle.

---

## 2. Liquidity metrics (the scorecard)

Tracked weekly, with pulse checks every hour. Definitions are in `liquidity-scorecard.sql`.

**North star: Buyer Contact Rate (BCR)** = buyer contacts ÷ human listing-view sessions. Target: 0.80% → 1.5% in 30 days → 3% in 90 days. At ~750 real sessions a month, 1.5% is about 11 contacts in 30 days, so also grow real traffic.

| Layer | Metric | Why it matters | 30-day target |
|---|---|---|---|
| Supply | Live listings by state × category | Liquidity is local. Density beats breadth | 15+ live in each of TX, FL, AZ, CA, GA |
| Supply | Draft → publish rate | 102 real drafts are free supply | Publish ~20 (Supply Desk estimate, needs the /list/finish flow) |
| Supply | % listings with ≥8 photos, price, offers on | Listing quality drives contacts | 70% |
| Demand | Zero-result search rate | Unmet demand = supply-acquisition map | <10% |
| Match | **Buyer Contact Rate** | North star | 1.5% |
| Match | % live listings with ≥1 contact (30d) | Seller-side liquidity; drives retention | 25% |
| Match | Median seller first-response time | Buyers leave after hours, not days | <4h |
| Match | Offer response rate | Silent offers kill trust | 90% |
| Close | Contact → transaction (or off-platform sale reported) | Final conversion | Track it |
| Close | Days-to-sell (published → sold/archived) | The core liquidity measure for sellers | Baseline it |

---

## 3. Website roadmap (ranked by liquidity impact)

These are ready to paste into Lovable as prompts. Payments run on **Square and PayPal**. No Stripe. **PayPal is intentionally in sandbox mode right now. Do not change PayPal environment, credentials, plans, or webhook configuration** in any growth work or Lovable prompt.

**P0: Guest inquiry, no login (est. 5–10× more contacts)**
> On sale listing pages (`SalePurchaseCard`, `SaleListingMobile`, and the shared `MessageHostForm`), let anonymous visitors send a question to the seller without creating an account. Collect name, email or phone (one required), and the message, with quick-pick chips: "Is this still available?", "Is the title clean?", "Can I see it in person / video walkthrough?", "Is the price negotiable?". Insert into the existing `listing_leads` table (`listing_id`, `host_id`, `name`, `email`, `phone`, `message`, `source='guest_inquiry'`) with an anon-insert RLS policy and rate limiting. Notify the seller by email and SMS with a magic link to reply. Fire `trackHostContacted` and a `guest_inquiry_submitted` analytics event. On mobile, make "Ask a question" a text inquiry, and offer the Vendi call as a secondary option.

**P0: Offer rescue loop**
> When an offer is created, SMS and email the seller immediately with one-tap Accept / Counter / Decline links. At 12h with no response, send a second SMS and an admin alert in the dashboard. At 36h, send an admin alert to call the seller. Before an offer expires, give the buyer a "seller hasn't answered, want Vendibook to reach them?" option. When an account is closed, notify sellers whose open offers were cancelled.

**P1: Default `accepts_offers = true` for sale listings**, with a minimum-offer floor at 80% of ask. Prompt sellers on existing listings to turn it on.

**P1: Zero-result recovery.** Never show an empty page. Show the nearest listings by distance, a "Get alerted when one is listed near {city}" capture (`availability_alerts` already exists), and a "Tell us what you need" `asset_requests` form. Every zero-result search becomes a demand signal the Supply Desk can work.

**P1: Instrument the contact funnel.** Add `contact_cta_click`, `auth_wall_shown`, `auth_wall_completed`, `offer_modal_open`, and `guest_inquiry_submitted`.

**P2: Draft recovery.** For the 151 drafts, send an email or SMS sequence: "Your listing is 80% done, publish in 1 tap." Allow publishing with 3+ photos and a price, and nudge for the rest after publish.

**P2: "Hot listing" social proof.** Show "X people viewed this week" on listings with 20+ weekly sessions, plus "Seller usually replies in Y hours."

**P2: Seller weekly performance email.** Views, saves, and contacts, plus a pricing and offer nudge when views are high and contacts are zero.

---

## 4. Buyer Desk charter (demand)

Mission: turn attention into conversations. Owns BCR, zero-result rate, and the offer response rate from the buyer side.
- Each day, work the hot-but-cold listings (query at the bottom of the scorecard SQL). Generate Muse posts that drive real buyers to them.
- Mine zero-result searches and `asset_requests` into "wanted" demand. Hand them to the Supply Desk as sourcing briefs.
- Build buyer personas: first-time operators (financing-led), expanding operators (2nd unit), event and catering companies (rent), and commissaries or ghost kitchens.
- Write Muse scripts for responding to "looking for a food truck/trailer" posts in Facebook groups.
- Follow up on every offer and inquiry within 1 hour.

## 5. Supply Desk charter (sellers/hosts)

Mission: dense, high-quality, responsive supply where demand already is. Owns draft→publish, listing quality, and seller response time.
- Get the 151 drafts published.
- Density first: TX, FL, AZ, CA, GA, then whatever states zero-result searches point to.
- Raise listing quality: 8+ photos, offers on, a real price, title status, and a video walkthrough.
- Coach sellers on response time. Escalate any unanswered offer.
- Write Muse scripts that find "food truck for sale" posts on Facebook Marketplace and in groups and invite those sellers to cross-list free on Vendibook.

---

## 6. Muse prompts (copy/paste)

Muse acts on social. Every prompt includes these guardrails: be human and helpful, never spammy. One reply per post. Disclose Vendibook affiliation. Respect each group's rules and never post where promotion is banned. No DMs to people who haven't engaged. No fake reviews or impersonation.

**MUSE-1: Match wanted posts to inventory (Buyer Desk)**
> Search Facebook groups (food truck owners, food truck for sale, concession trailer buy/sell, mobile food vendors in TX, FL, AZ, CA, GA) and Instagram/Threads for posts from people *looking to buy or rent* a food truck, food trailer, coffee trailer, BBQ smoker, or commercial kitchen in the last 24 hours. For each one, find 1–3 matching live Vendibook listings by category, state or nearby city, and budget (vendibook.com/search). Reply once, helpfully: "Hey! There's a {year/size} {type} in {city} listed at ${price} on Vendibook, {1 standout feature}. {link} You can ask the seller questions right on the listing. I'm with Vendibook, happy to help if you're comparing options." Log each match: post URL, person's need, listings suggested, and the time.

**MUSE-2: Recruit sellers (Supply Desk)**
> Find Facebook Marketplace and group posts from people *selling* food trucks, trailers, or kitchen equipment ($8k+) in the last 48 hours, prioritizing TX, FL, AZ, CA, GA. Reply or message once: "Great setup! If you want more serious buyers, you can cross-list free on Vendibook. It's a marketplace just for food trucks and trailers, with built-in offers, financing for buyers, and freight. Takes about 5 minutes: vendibook.com/sell-my-food-truck. I'm with Vendibook." Log seller, asset, price, location, and outcome.

**MUSE-3: Push hot-but-cold listings (Buyer Desk)**
> Here are this week's listings with high views and no contacts: {paste from scorecard query}. For each one, write and post 1 Instagram carousel caption, 1 Threads post, and 1 Facebook group post (where allowed). Hook: price, turnkey status, location. CTA: "Ask the seller a question, no account needed." Vary the copy and never repeat the same text across groups.

**MUSE-4: Turn demand gaps into supply asks (Supply Desk)**
> Buyers searched for these with zero results this week: {paste zero-result categories and locations}. Post "Wanted" call-outs in local food-truck groups for those areas: "Buyers on Vendibook are actively looking for {asset} near {city}. If you have one to sell or rent, list it free: vendibook.com/list." Log responses.

**MUSE-5: Seller success stories (both desks)**
> When a listing gets an offer or sells, ask the seller's permission first, then post a short story: "{asset} in {city} got an offer in {N} days on Vendibook." Social proof for both sides.

---

## 7. Operating cadence
- **Hourly:** liquidity pulse (new listings, contacts, offers, zero-result spikes). Alert on any unanswered offer older than 4h.
- **Daily:** hot-but-cold list → Muse-3, zero-result list → Muse-4, and an offer and inquiry follow-up sweep.
- **Weekly:** full scorecard, state density map, and a review of what Muse drove (UTM-tag every Muse link: `?utm_source={fb|ig|threads}&utm_medium=muse&utm_campaign={muse-1..5}`).
