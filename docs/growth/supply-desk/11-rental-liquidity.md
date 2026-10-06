# Rental liquidity — Supply Desk (2026-10-06)

_Owner priority reset: **rental liquidity**. Briefs from the Growth lead (03:40 UTC). Data from read-only queries on 2026-10-06._

## ⛔ Blocker found first: hosts couldn't create a rental at all

All 73 target hosts have `signup_phone_required() = true`, because none has a row in `signup_phone_verifications`.

1. The campaign CTA `/listings/:id/rent-it-out` calls `createLinkedRentalDraft`, which runs a `listings` INSERT.
2. The `require_signup_phone` trigger fires on that INSERT and raises "Verify your mobile number…". Its seller exemption covers only UPDATEs.
3. `signup_phone_status()` returns `required = false` for anyone who hosts a listing, so the phone form never appears for them.
4. RentItOut showed the raw error with only a "Back to dashboard" button.

So every campaign click would have hit a dead end. The same bug blocks any existing unverified host from creating a new listing through the wizard.

**Fixed in app code (this commit):** RentItOut now catches that error and shows an inline "Verify your mobile number" step (`InlinePhoneVerification`). The step uses the same `signup-phone-verification` function and `verify_signup_phone_code` RPC as the full-screen prompt, then retries creating the draft. No DB change is needed, and the policy ("creating a listing needs phone") is unchanged.

**DB fix live (Growth lead, migration 20261006040000, commit fa403afd):** a linked-rental INSERT whose `source_listing_id` is the actor's own live sale listing now counts as seller-side, so sellers converting a sale listing skip the phone step. The inline verify step remains as a fallback for any other phone-gate error. The wizard dead end for new listings still needs an owner decision:
- (a) exempt existing hosts, or
- (b) show the verify form on the create-listing routes.

## 1. "Rent It While You Sell It" (`send-rent-while-you-sell`)

**Audience** (computed live, one email per host): a sale food truck or trailer that meets all of these:
- published, moderation clear, price ≥ $1,000;
- live 30+ days, with no linked rental;
- **10+ views in the last 30 days, no offer ever, and no conversation in 30 days**, so "views but no offers yet" is literally true;
- title not a placeholder.

If a host has several qualifying listings, the email uses their most-viewed one.

On 2026-10-06 that's **73 listings → 63 hosts → 61 mailable** after the standard skips. The 3-day cooldown after any concierge or listing-fix email will remove more as the concierge batches go out.

| Wave 1 | Recipients | | Rest | Recipients |
|---|---|---|---|---|
| TX | **13** | | MI, VA | 3 each |
| GA | **4** | | CO, IL, NC, NJ, TN | 2 each |
| FL | **9** | | 13 other states | 1 each |
| AZ | **5** | | | |
| **Wave 1 total** | **31** | | **Rest total** | **30** |

TX top 3 by views: "FOOD TRAILER - EXP 16X 8 FT" (83 views), "2020 The Food Trailer" (70), "Food Trailer" (53). The median target has 36 views in 30 days.

**Email** (Brad, Resend marketing shell, unsubscribe headers, sends logged in `blog_campaign_sends`, Idempotency-Key `2026-10-rent-while-you-sell:<user_id>`):
- Subject: "Your food trailer is getting views. Rent it while you sell it?"
- Body:
  - their real view count and "no offers yet";
  - "only a handful of food trailers for rent on Vendibook" (true: 5 food trailers, 0 food trucks);
  - three bullets: rental and monthly income, keep it listed for sale, a renter could become the buyer;
  - setup takes about 5 minutes (photos and specs are copied, "we suggest including a monthly rate"); nothing goes live until they publish.
- CTA: **Rent it out** → `https://vendibook.com/listings/<id>/rent-it-out?utm_source=email&utm_medium=campaign&utm_campaign=2026-10-rent-while-you-sell&utm_content=rent_while_you_sell_rent_cta`
- Payment wording: "renters book and pay only through Vendibook checkout". Rental checkout is Square only (35c579a0), so no payment brand is named. No payout claims.

**How to run it** (admin JWT or internal caller):
1. `{"mode":"preview_count"}` returns `byState`, `byVariant` and `nextBatch`.
2. `{"mode":"preview_html","variant":"rent_while_you_sell"}`
3. `{"mode":"test","testEmail":"…","variant":"rent_while_you_sell"}`
4. `{"mode":"broadcast","confirm":"2026-10-rent-while-you-sell","states":["TX"],"limit":20}`, then GA, FL, AZ, then everyone else (omit `states`).

Recipients are already ordered TX → GA → FL → AZ → the rest, by views.

**Measure:**
- Clicks: `utm_campaign=2026-10-rent-while-you-sell`.
- Rental drafts created: `listings.source_listing_id is not null and created_at >= send date`.
- Rentals published from those drafts.
- Monthly rates set on them.

## 2. Monthly-rate asks (same function, `monthly_rate` variant)

Computed live: published rentals with no monthly rate. Today that's exactly the 4 the Growth lead named; Boca Raton already has $3,000/mo. These hosts get only this short ask, ahead of the rent-while-you-sell email, and editing their own rental is never phone-gated.

| Listing | Has | Comps quoted ("comparable … list at") |
|---|---|---|
| Commercial Kitchen Rental, Dallas OR | $160/day, $750/wk, $20/hr | kitchens $2,700–$2,800/mo (Phoenix, Las Vegas) |
| Commissary Kitchen For Rent, Charlotte NC | $150/day, $750/wk | kitchens $2,700–$2,800/mo |
| The Q — Commercial Kitchen, Boaz AL | $240/day, $999/wk | kitchens $2,700–$2,800/mo |
| Full loaded food trailer for rent, Rex GA | $300/day, $1,600/wk | trailers $3,000–$9,000/mo (Boca, Lilburn, Tomball, Roseville) |

Subject: "Quick one: add a monthly rate to your kitchen" (or "your food trailer"). Short body; CTA "Add a monthly rate" → `/edit-listing/<id>` with the campaign UTM.

Send with `{"mode":"broadcast","confirm":"2026-10-rent-while-you-sell"}`. They sort first, so a `limit` of 4 sends only these.

## 3. Minneapolis north metro (ZIP 55303): sourcing list

Demand: 14 renter sessions in 30 days from 55303 (Anoka/Ramsey), all with zero results. Our only MN listing is a sale trailer in Ely.

Research note: the search agent could only see search-result summaries (directory and news pages), because direct page fetches were blocked. **Confirm each one is open before contacting it.** Only business-level public info is listed; there are no personal contacts. Distances are approximate road miles from Anoka.

| # | Business | City (mi) | Type | Public URL | Why it fits | Confidence |
|---|---|---|---|---|---|---|
| 1 | Twin Cities Kitchen Works | Anoka, 55303 (0–3) | Commissary | thekitchendoor.com/kitchen-rental/twin-cities-kitchen-works | **In the searched ZIP.** "Food truck friendly", 24/7, 35k sq ft lot, flexible rental rates | Med |
| 2 | White Rabbit Kitchen | Andover (~7) | Operator | mspmag.com (BBQ food truck to storefront) | Runs both a truck and a storefront, so the truck may sit idle in winter | Med–High |
| 3 | NEON Collective Kitchens | N. Minneapolis (~17) | Commissary/incubator | spokesman-recorder.com/2026/05/24/neon-collective-kitchens-north-minneapolis/ | Opened 2026 with 11 kitchens, aimed at food truck operators. Wants tenants and can refer member trucks | High |
| 4 | Elk River food truck business (for sale via BizQuest broker) | Elk River (~12) | Operator, seller | bizquest.com/food-trucks-for-sale-in-minnesota | Motivated seller of a 33-year business; could list the unit or rent it while it sells | Med |
| 5 | MNFood.Club shared kitchen | Blaine (~10) | Shared kitchen | MDA shared-kitchen directory (mda.state.mn.us) | Licensed 1,100 sq ft kitchen with truck dock and cold storage | Med |
| 6 | CloudKitchens Blaine (Northtown) | Blaine (~11) | Ghost kitchen | cloudkitchens.com/locations/minneapolis/blaine-avenue | Leases kitchens from 250 to 2,000+ sq ft. A lease dispute with the mall was resolved Sept 9; check it's stable | Med |
| 7 | Hermanos Locos Taco | Ham Lake (~12) | Operator | restaurantji.com (Ham Lake listing) | Started as a truck, now has 2 fixed sites, so the truck may be idle | Low–Med |
| 8 | Smokin' J's BBQ | Twin Cities (10–20) | Operator | roaminghunger.com/smokin-js-bbq-mn/ | On Ramsey's 2026 Food Truck Wednesdays list, so it already serves 55303 | Med |
| 9 | KitchenCubby | Zimmerman (~25) | Commissary | thekitchendoor.com/kitchen-rental/kitchencubby | "Commissary for food trucks, trailers and vendors"; in the MDA directory | Med |
| 10 | Dots Gray | N. Minneapolis (~17) | Commissary | thekitchendoor.com/kitchen-rental/dots-gray | Membership commissary run by the Butcher Salt truck team | Low–Med |
| 11 | Kindred Kitchen (Appetite for Change) | N. Minneapolis (~17) | Shared kitchen | spokesman-recorder.com (2017 article) | 24/7 licensed kitchen that has rented to trucks since 2010 | Low (old source) |
| 12 | Chameleon Concessions | Minneapolis SE (~22) | Builder | tcbmag.com/maneuver-to-mobile/ | 30+ years building trucks and trailers; possible trade-ins or demo units | High (operating), rentals unconfirmed |
| 13 | St. Croix Trailers | Stillwater (~33) | Builder | provenexpert.com/st-croix-trailers/ | Custom trailer builder; possible demo or used units | Med |

Contact these first: **1** (in the ZIP; also good for kitchen listings), **2**, **3** (one contact reaches many trucks), **4**, then **5/6**.

Local rule: Anoka allows food trucks only at special events and private parties, and Ramsey licenses mobile food units and runs Food Truck Wednesdays. So 55303 demand is likely for **events and private parties**. Pitch day and weekend rentals, not only monthly.

### MUSE-MN: ready-to-paste outreach prompt

```text
ROLE
You are Brad from Vendibook Customer Success, reaching out on Vendibook's behalf to
Minnesota food truck operators, builders and commissary kitchens near Anoka/Ramsey (ZIP 55303).

GOAL
Ask whether they have an idle food truck/trailer (or kitchen time) they'd rent out
this winter or for events. Renters near Anoka/Ramsey searched Vendibook 14 times in
the last 30 days and found nothing to rent nearby.

WHO (only these, one message each)
The businesses in docs/growth/supply-desk/11-rental-liquidity.md §3, in priority order
1, 2, 3, 4, 5, 6, then the rest. Use only each business's own public channel: its
website contact form, its business email listed on its own site, or its business page
inbox. Never a personal profile or personal number.

MESSAGE (adapt per business, max 90 words, plain and specific)
- Say who you are: "Brad with Vendibook, a marketplace for renting and selling food
  trucks, trailers and commercial kitchens."
- Why them, in one line, from the "why it fits" column (e.g. "your truck may sit idle
  now that the storefront is open").
- The ask: list the unit for rent free; they set daily/weekly/monthly rates, the
  deposit and the renter documents; renters book and pay through Vendibook checkout.
- Local demand: event and private-party renters around Anoka/Ramsey are searching now.
- Link (exact): https://vendibook.com/become-a-host?utm_source=muse&utm_medium=outreach&utm_campaign=muse-mn-55303
- Commissaries: also offer to list kitchen time ("commercial kitchen" listings).

GUARDRAILS (non-negotiable)
1. Disclose affiliation in every message: you are with Vendibook.
2. One message per business. No follow-up unless they reply. No bumps.
3. Business channels only. Zero DMs to individuals' personal accounts; no mass sends,
   no copy-paste blasts (each message names the business and its specific reason).
4. No invented claims: don't promise earnings, bookings, payout timing or speed; don't
   cite numbers other than "searched 14 times in the last 30 days".
5. No fake reviews, testimonials or impersonation; never pose as a renter.
6. Privacy: log only business name, public URL, date, channel and outcome. Never store
   personal phone numbers or emails.
7. If anyone says no or calls it spam: apologise once, mark "do not contact", stop.
8. First confirm the business is open (its own site or Google Business page). Skip if not.

OUTPUT
A table: business | channel used | message sent | date | outcome (sent / skipped: closed /
skipped: no business channel). Send nothing until Supply Desk reviews the first 3 drafts.
```

## Not yet live

All of this is code on `fix/paypal-webhook-config`. It goes live only with the coordinated deploy, and sending to owners still waits on the owner's approval and the Growth lead. PayPal (sandbox) and Square are untouched.
