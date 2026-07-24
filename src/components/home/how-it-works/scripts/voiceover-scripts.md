# How Vendibook Works — Voiceover, Captions, Transcripts

Brand voice: confident, friendly, entrepreneurial, trustworthy, clear, modern,
encouraging. Never use "guaranteed", "risk-free", "instant approval",
"everyone is verified", or "Vendibook handles everything". Spell the brand
"Vendibook" (one word, capital V) every time.

Each video is ~60s, six scenes of ~10s. Captions are burned-in via the scene
`caption` prop and also toggleable in the modal.

---

## 1. Buying on Vendibook (≈60s)

**Voiceover**

> Every food business starts with the right equipment. On Vendibook, you can
> search food trucks and trailers by location, price, and features — and
> compare them side by side. Review photos, specs, and seller information all
> in one place. Message the seller directly, ask questions, and arrange an
> inspection. When you're ready, move through the purchase steps together —
> sign the paperwork, choose a payment option, and get to work. Find the
> equipment. Build the business.

**Caption cues (mm:ss)**

| Time | Caption |
|---|---|
| 0:00 | Your food business starts with the right equipment. |
| 0:10 | Search. Compare. Find the right fit. |
| 0:20 | Photos, specs, seller info — all in one place. |
| 0:30 | Connect directly and make an informed decision. |
| 0:40 | Sign documents and choose a payment option. |
| 0:50 | Find the equipment. Build the business. |

**Transcript**: see `data/explainers.ts` → `buying.transcript`.

---

## 2. Renting on Vendibook (≈60s)

**Voiceover**

> Not ready to buy? Renting on Vendibook lets you start sooner. Browse rentals
> by location, dates, and equipment. Pick the truck or trailer you need and
> send a request to the host. Complete identity verification and upload the
> required documents. Coordinate pickup or delivery through Vendibook
> messaging. Then run your business — a festival, a catering event, or a
> pop-up. Rent the equipment. Test your concept. Grow from there.

**Caption cues**

| Time | Caption |
|---|---|
| 0:00 | Start sooner without buying upfront. |
| 0:10 | Browse rentals by location, dates, and equipment. |
| 0:20 | Pick your dates and send a request. |
| 0:30 | Clear steps. Organized documentation. |
| 0:40 | Coordinate pickup or delivery through Vendibook. |
| 0:50 | Rent the equipment. Test your concept. Grow from there. |

---

## 3. Selling on Vendibook (≈60s)

**Voiceover**

> Got equipment you're no longer using? Turn it into your next opportunity.
> Listing on Vendibook is free. Upload photos, add equipment details and the
> asking price, and publish. Buyers actively searching for trucks and trailers
> will find you. Answer inquiries, schedule inspections, and complete the sale
> together. List for free. Reach serious buyers. Sell smarter.

**Caption cues**

| Time | Caption |
|---|---|
| 0:00 | Turn your equipment into your next opportunity. |
| 0:10 | Create your listing in a few simple steps. |
| 0:20 | Reach buyers actively searching for equipment. |
| 0:30 | Answer questions and schedule inspections. |
| 0:40 | Review the agreement and complete the sale. |
| 0:50 | List for free. Reach serious buyers. Sell smarter. |

---

## 4. Hosting on Vendibook (≈60s)

**Voiceover**

> Unused availability can become income. List your food truck, trailer,
> commercial kitchen, or vendor space on Vendibook. Add photos, pricing, and
> rules. Qualified renters discover your listing and send requests. Review
> their profile, dates, and documents, then approve when you're ready.
> Manage bookings and communicate from one dashboard. Make your equipment or
> space work harder for you.

**Caption cues**

| Time | Caption |
|---|---|
| 0:00 | Your unused availability could become income. |
| 0:10 | Create a host listing with photos, pricing, and rules. |
| 0:20 | Qualified renters discover your listing. |
| 0:30 | Review renter profile, dates, and documents. |
| 0:40 | Manage bookings and communicate from one dashboard. |
| 0:50 | Make your equipment or space work harder for you. |

---

## Production notes

- Music: warm, subtle, mid-tempo — think fintech / travel-marketplace
  explainer, not children's cartoon.
- Pacing: match caption timings; leave breath between scene transitions.
- Motion: match the in-app animated version — same beats, same spacing.
- When an MP4 is produced, add its path to the explainer's `videoSource`
  field in `src/components/home/how-it-works/data/explainers.ts`. The modal
  will use it automatically without any UI changes.
