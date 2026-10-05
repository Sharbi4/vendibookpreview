# Ops Drafts: Ready to Send (2026-10-05)

Route via the concierge inbox. Requester contact details live in `asset_requests` (look up by id); none are copied here. UTM on every link: `utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops`.

---

## A. Unmatched asset requests

### A1 · Atlanta trailer rental, bakery/café concept (asset_request `3b173035-e87f-4f53-8a54-78a515ee5d25`, 2026-08-16)
Context: rent, Atlanta, budget "≤$500" (unit not given), 1–3 months. They came from the Lilburn listing. Status still `new`, 7 weeks unanswered.

**Subject:** Your Atlanta food trailer rental: 2 options available now

> Hi {first_name},
>
> Sorry we're slow getting back to you about renting a food trailer in Atlanta for your bakery/café concept. Two fully equipped trailers in the Atlanta area are available now:
>
> • **2026 Fully Loaded Food Trailer, Lilburn, GA**: $350/day, **$1,200/week, or $5,000/month**. Instant Book is on.
> https://vendibook.com/listing/c8d152a4-dbc2-4239-8e0a-56cecac50266?utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops
>
> • **Fully Loaded Food Trailer, Rex, GA**: $300/day or $1,600/week (3-day minimum)
> https://vendibook.com/listing/f13ba587-0d95-48f3-9a18-3bb92e540e05?utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops
>
> You mentioned a budget of about $500. If that's per week or per month, neither trailer fits yet. Reply with your dates and how you'd use the trailer (weekend markets or daily service), and I'll ask both owners whether they'd do a longer-term rate for 1–3 months.
>
> Thanks,
> Vendibook Concierge
> (Payments go through Vendibook; please don't send money outside the platform.)

### A2 · Atlanta trailer rental (asset_request `132e8451-384d-4bef-a5c1-5a301aef82f8`, 2026-07-14)
Context: rent, Atlanta, no budget, name or timeline given. Status `new`, about 12 weeks unanswered.

**Subject:** Still looking for a food trailer to rent in Atlanta?

> Hi there,
>
> You asked us about renting a food trailer in Atlanta. Sorry it took us this long to reply. If you're still looking, two equipped trailers in the Atlanta area are available now:
>
> • Lilburn, GA: $350/day · $1,200/week · $5,000/month, Instant Book
> https://vendibook.com/listing/c8d152a4-dbc2-4239-8e0a-56cecac50266?utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops
> • Rex, GA: $300/day · $1,600/week
> https://vendibook.com/listing/f13ba587-0d95-48f3-9a18-3bb92e540e05?utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops
>
> Send us your dates and budget and we'll check availability with the owners for you.
>
> Vendibook Concierge

### A3 · Tucson food-truck seller (asset_request `9152316a-eb4e-4d22-9b62-f78fe0e66ef5`, 2026-06-12)
Context: intent `sell`, truck under $25k. A supply lead: buyer demand for trucks under $35k is 6–15 sessions per listing.

**Subject:** Buyers are looking for trucks like yours

> Hi {first_name},
>
> Back in June you asked about selling your food truck. Trucks under $35k are among the most-viewed listings on Vendibook right now, and we have only a handful in Arizona.
>
> Listing is free and takes about 10 minutes: https://vendibook.com/sell-my-food-truck?utm_source=email&utm_medium=concierge&utm_campaign=buyer-desk-ops
> Tips that get messages: 8+ photos (include the kitchen), year/make/mileage, title status, whether it runs, and turn on "Accept offers." You can also turn on Vendibook Freight so out-of-state buyers can have it shipped.
>
> Reply here if you'd like us to help write the listing.
>
> Vendibook Concierge

**After sending:** set `asset_requests.status` to `contacted` for all three (an ops/admin action in the dashboard, not done by Buyer Desk).

---

## B. Seller fix nudges: hot-but-cold top 15 (send as in-app message + email)

Template: *"Hi {first_name}, your listing **{title}** had **{N} real buyer visits** in the last 30 days but no messages yet. One change usually fixes that: **{fix}**. Update it here: {edit link}. Vendibook Concierge"*

| Listing | N (30d) | {fix} |
|---|---:|---|
| [Lemonade Trailer, Charlotte NC](https://vendibook.com/listing/a3ead971-38c7-4c0c-8f3f-2b02185c7c2f) | 46 | "fill in condition, title status and whether it's health-permit ready, and turn on offers" |
| [Food Trailer for Rent, Boca Raton FL](https://vendibook.com/listing/7757ad2a-dae9-4d1c-a9bf-68d703bb53ba) | 24 | "repair the fridges or list it as-is at about $200/day, and add 8+ photos" |
| [Dreamfly Airstream, Stoughton MA](https://vendibook.com/listing/587b1919-9828-46ef-bba8-76da9553f962) | 18 | "add a spec list: dimensions, VIN/title, electrical, and included equipment" |
| [Turnkey Food Truck, Hiram GA](https://vendibook.com/listing/c4113bc0-bd6e-41d5-bfd5-7eb135465c36) | 18 | "add the year, make, model and mileage, and turn on offers" |
| [Mailbox-Style Trailer, Lexington KY](https://vendibook.com/listing/63f45b26-62bc-489e-a43f-8ae56f37217b) | 16 | "add 5–8 lines on size, power, water and what's included; you marked it negotiable, so turn on offers" |
| [Coffee Trailer, San Francisco CA](https://vendibook.com/listing/a02adafe-ad00-40cb-90c7-2a8ccc55f469) | 15 | "switch the category to Food Trailer → Coffee so trailer buyers can find it, and fix the title typo ('Tailer')" |
| [Food Trailer, Colleyville TX](https://vendibook.com/listing/cc3c8214-e327-4670-99ed-e1425494cc8c) | 15 | "use a specific title, add 8+ photos including the inside, and fill in condition and title" |
| [Modern Taco Trailer, Houston TX](https://vendibook.com/listing/171bf57c-6225-4188-819f-81d4230a9a17) | 15 | "add 8+ photos and a monthly rate" |
| [SDG 37' Kitchen, Birch Run MI](https://vendibook.com/listing/f814bc22-d682-4ddf-818e-049472578f49) | 15 | "turn on financing (if eligible) so buyers see a monthly payment" |
| [Food Trailer for Rent, Rex GA](https://vendibook.com/listing/f13ba587-0d95-48f3-9a18-3bb92e540e05) | 15 | "add a monthly rate (the Lilburn trailer that's getting messages has one) and set condition" |
| [2009 Workhorse, Cottonwood Heights UT](https://vendibook.com/listing/b6f99adb-53a4-4f02-90f8-cc66c87ad33b) | 14 | "confirm it runs, and turn on offers (similar step vans ask about $35k)" |
| [2002 Workhorse P42, Chambersburg PA](https://vendibook.com/listing/dc2dd4ff-cc23-41a8-8a4f-4e496fc6ff62) | 14 | "add photos of the inside and the kitchen" |
| [8x22 Food Trailer, Frostproof FL](https://vendibook.com/listing/acb2ab5c-afc8-45e1-96d0-45b9d6ca001a) | 14 | "retitle it '8x22 Food Trailer w/ Hood + Fire Suppression' and turn on offers" |
| [Catering Trailer, Emeryville CA](https://vendibook.com/listing/9ad68341-90d5-4dd7-b745-17041bdbc0c2) | 13 | "say whether it has a CA HCD insignia, and turn on offers" |
| [Compact Trailer, Aiken SC](https://vendibook.com/listing/1707a6d0-76e7-4ad0-8a31-403b6a5b047e) | 13 | "turn on offers" |

## C. Contact details in descriptions (check each first; the phone regex can match long price strings)

> Hi {first_name}, quick tip on **{title}**: please keep phone numbers, emails and links out of the description. Deals that move off Vendibook lose our scam screening and payment protection. Buyers can message you and make offers right on the listing, and every member verifies their phone and ID first. Mind removing them? {edit link}

Listings: `f1a879a6-6c16-4c17-b902-a2c84b1036ff` (WA ice cream trailer), `8d19aa3e-9c58-4a48-8557-5a87b4b2d4f9` (MI turnkey trailer), `c96a0bae-53c4-4df4-b895-b90e3d50703b` (AR pizza truck), `22701ef2-b32e-49fd-a38a-513ee38b605b` (FL 2026 trailer).
Code fix (sent to Growth lead): mask contact details in listing descriptions on the buyer-facing page, reusing the guest-inquiry patterns. See LP-11.
