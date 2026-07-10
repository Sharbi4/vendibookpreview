# How It Works — Listing Walkthrough Copy (Draft for Review)

Contextual walkthrough shown on listing detail pages. 3–4 steps per variant. Mobile-first. No misleading protection/guarantee claims. Every variant ends with a CTA that starts the correct workflow, plus a link to FAQ and Support.

Global rules applied:
- No "guaranteed", "protected", "insured", "verified safe" language.
- Fees stated verbatim from memory: rentals 12.9% + 12.9%; card sales 12.9% seller / $0 buyer; Pay-in-Person **sales** 100% free; Pay-in-Person **rentals** still owe the 12.9% host commission.
- Payouts: rentals 24h after start; sales 25 days after buyer confirmation.
- Precise address is masked until a booking is confirmed / instant-booked.
- Support hours: Mon–Fri 9am–5pm AZ, (725) 755-9598, support@vendibook.com.

---

## Variant A — Buy Now (Sale · card payment via Stripe)

**Trigger:** Listing `mode = "sale"` and `accept_card_payment = true`.

**Header:** How buying on Vendibook works

1. **Review the listing**
   Check specs, photos, condition notes, and the seller's storefront. Message the seller with any questions before you check out.

2. **Pay securely with card**
   Checkout runs through Stripe. Your card is charged when you place the order. Vendibook holds the funds until you confirm the item.

3. **Coordinate pickup or delivery**
   The seller's full address unlocks after payment. Arrange pickup, local delivery, or freight in the Messages thread. Freight is calculated at $4.50/mile if the seller offers it.

4. **Confirm the item, seller gets paid**
   You have a confirmation window to inspect the item. Funds release to the seller 25 days after your confirmation. Something wrong? Open a dispute from your order page.

**Primary CTA:** Buy Now — $[price]
**Secondary:** Message the Seller · Make an Offer
**Footer links:** Buyer FAQ · Refund & Dispute Policy · Contact Support

---

## Variant B — Buy Now (Sale · Pay in Person / cash only)

**Trigger:** Listing `mode = "sale"` and `accept_card_payment = false`.

**Header:** How Pay-in-Person purchases work

1. **Contact the seller**
   Introduce yourself and lock in a meeting time and place. Vendibook Messages keeps the conversation on-record.

2. **Meet, inspect, and pay directly**
   You pay the seller in person — cash, check, or whatever you both agree on. Vendibook doesn't process the payment and doesn't take a fee on Pay-in-Person sales.

3. **Mark the sale complete**
   Both sides confirm the sale in the app so the listing closes and reviews unlock.

> **Heads up:** Pay-in-Person means no Vendibook-processed payment and no platform-side refund path. Meet in a safe public space. Bring someone. Verify the item before handing over money.

**Primary CTA:** Contact Seller
**Secondary:** Save Listing
**Footer links:** Safe-Meetup Checklist · Contact Support

---

## Variant C — Rent · Request to Book

**Trigger:** Listing `mode = "rent"` and instant book off.

**Header:** How Request to Book works

1. **Pick your dates or hours**
   Choose the days (or hours, if the host offers hourly) you need. You'll see the full price breakdown — nightly/hourly rate, service fee, and total — before you send anything.

2. **Send the request**
   Your card is authorized, not charged. The host has 24 hours to accept, decline, or counter.

3. **Host accepts → payment runs**
   Once accepted, your card is charged and the pickup address unlocks. Declined or expired? The authorization is released with no charge.

4. **Pick up, use, return, review**
   Meet the host at the pickup time. Return on schedule. The host is paid 24 hours after your rental starts. Leave a review to help the next renter.

**Total shown at checkout:** rental subtotal + 12.9% service fee.
**Primary CTA:** Request to Book
**Secondary:** Message the Host · Check Availability
**Footer links:** Cancellation Policy · Renter FAQ · Contact Support

---

## Variant D — Rent · Instant Book

**Trigger:** Listing `mode = "rent"` and instant book on.

**Header:** How Instant Book works

1. **Pick your dates or hours**
   Availability is live. If the calendar shows it green, you can book it.

2. **Pay and confirm instantly**
   Your card is charged immediately. Booking is confirmed the moment payment clears — no host approval wait.

3. **Get pickup details**
   The full pickup address and host contact info unlock right after payment.

4. **Pick up, use, return, review**
   Return on schedule. The host is paid 24 hours after your rental starts.

**Primary CTA:** Book Instantly
**Secondary:** Message the Host
**Footer links:** Cancellation Policy · Renter FAQ · Contact Support

---

## Variant E — Rent · Pay in Person

**Trigger:** Listing `mode = "rent"` and host allows off-platform payment.

**Header:** How Pay-in-Person rentals work

1. **Send a booking request**
   Choose your dates and confirm you're paying the host directly. The host reviews and approves in Messages.

2. **Meet and pay the host**
   Handle payment however you both agreed — cash, check, transfer. Vendibook doesn't process the payment.

3. **Use the space or equipment, return on schedule**

> **Fee note:** Even though you're paying the host directly, the 12.9% Vendibook host commission still applies to the rental. Your host will handle that on their end.

**Primary CTA:** Request to Book (Pay in Person)
**Secondary:** Message the Host
**Footer links:** Host Commission FAQ · Contact Support

---

## Variant F — Make an Offer (any sale listing accepting offers)

**Trigger:** Listing `mode = "sale"` and offers enabled.

**Header:** How offers work

1. **Send your price**
   Type in what you're willing to pay. The seller sees it right away.

2. **Seller accepts, declines, or counters**
   Offers expire in 48 hours if there's no response. Counters keep the thread going until one side accepts.

3. **Checkout at the agreed price**
   Once accepted, checkout opens at that price. Payment terms match the seller's setup (card or Pay in Person).

**Primary CTA:** Make an Offer
**Footer links:** Offer Rules · Contact Support

---

## Shared UI Behavior

- **Placement:** Collapsed accordion directly under the booking widget on mobile; sidebar card on desktop. Auto-expand once, then remember dismissal per listing in `localStorage`.
- **Trigger:** Also opens as a bottom sheet when the user taps the primary CTA for the first time in a session — dismiss to proceed.
- **Non-blocking:** Never gates the CTA. User can proceed at any step.
- **Accessibility:** `role="region"`, `aria-labelledby`, keyboard-navigable step list, `prefers-reduced-motion` respected, 16px min font on inputs.
- **Analytics events:** `walkthrough_viewed`, `walkthrough_step_expanded`, `walkthrough_cta_clicked`, `walkthrough_dismissed` — with `variant` (A–F) and `listing_id`.
- **Testing matrix:** each variant against listings with/without offers, with/without hourly, with/without freight, with/without instant book, on 384px + desktop.

---

## Open questions for you

1. Any wording you want changed (tone, terminology, order)?
2. Should Variant B (Pay-in-Person sale) include the "meet in a safe public spot" advisory, or keep it purely procedural?
3. For Variant C, do you want to expose the exact 12.9% service fee number in the walkthrough, or keep it in the price breakdown only?
4. Ready for me to build the component after you sign off on copy, or do you want to iterate on wording first?
