# Offer rescue — send-ready copy (2026-10-05)

There are only **2 real offers** on record, and both expired with no seller response. The two Oct 4 offers ($67k and $30k, both cancelled) came from an account the safety system **deactivated for trying to move sellers off-platform under a different identity**. Do **not** rescue those, and do not contact that buyer.

Send via **Resend** using the `generic-notice` master-design template (data at the bottom), one email per person. IDs are listed so ops can pull emails from the admin tools; contact details are deliberately not stored in the repo.

---

## R-1 · Seguin, TX · "My Food Trailer" · $15,000 offer on $20,000 (expired 2026-09-13)

- Offer `71ae1a2b-1a6d-4faf-ae10-51cc6582afa4` · listing `c649440f-d3df-4f3a-a622-e118767efb4d`
- Seller `20434a7d…` (last active 2026-06-11) · buyer `cb0a4b02…` (active only 2026-09-11)
- Listing is still published, scores 50 in the CSV, and offers are off.

**To the seller**
Subject: A buyer offered $15,000 for your food trailer

> Hi {first_name},
>
> On September 11 a buyer offered **$15,000** on your food trailer listed at $20,000. The offer expired before you saw it. Offers on Vendibook stay open 48 hours, and our only alert was a single email.
>
> If you're still selling, reply to this email and I'll let the buyer know you're open to talking. You can also counter from your dashboard: https://vendibook.com/dashboard?utm_source=email&utm_medium=concierge&utm_campaign=offer-rescue
>
> If it's already sold, reply "sold" and I'll take the listing down for you.
>
> Brad  
> Customer Success, Vendibook

**To the buyer** (send only after the seller says they're still selling)
Subject: The seller of the Seguin food trailer would like to talk

> Hi {first_name}, your $15,000 offer on the food trailer in Seguin, TX expired before the seller saw it. They're still selling and open to an offer. You can make a new one here: https://vendibook.com/listing/c649440f-d3df-4f3a-a622-e118767efb4d?utm_source=email&utm_medium=concierge&utm_campaign=offer-rescue
>
> Brad  
> Customer Success, Vendibook

---

## R-2 · Bradenton, FL · "Food trailer (Indian food truck)" · $22,000 offer on $40,000 (expired 2026-06-11)

- Offer `a4ab5437-a5d3-4e99-8c61-e0ab91ab910d` · listing `efa664df-1f34-421f-90f8-2ebc88e471fd`
- Seller `33fb896d…` (last active 2026-06-09) · buyer `c71c552b…` (active only 2026-06-09)
- Four months old. Send to the **seller only**, as a still-selling check. Re-contact the buyer only if the seller says yes.

**To the seller**
Subject: Is your Bradenton food trailer still for sale?

> Hi {first_name},
>
> Back in June a buyer offered **$22,000** on your food trailer (listed at $40,000). The offer expired before you responded. Our alerts were thin back then, and that's on us.
>
> Is it still for sale? Reply "yes" and I'll help you update the listing. Two quick fixes would help: turn on offers with a minimum you're comfortable with, and answer the condition and title questions. Reply "sold" and I'll take it down.
>
> Brad  
> Customer Success, Vendibook

---

## After sending

- Log each reply (still selling / sold / no reply after 7 days).
- A "sold" reply means ops archives the listing (status only).
- No reply after 7 days on a listing with seller inactivity >90 days: flag for the stale-listing review rather than archiving automatically.

---

## Send-ready template data (Resend, `generic-notice`, master design)

**R-1 seller** (host `20434a7d`):
```json
{
 "subject": "A buyer offered $15,000 for your food trailer",
 "preview": "A buyer offered $15,000 for your food trailer",
 "kicker": "Missed offer",
 "heading": "You had a $15,000 offer",
 "greeting": "Hi {first_name},",
 "paragraphs": [
  "On September 11 a buyer offered $15,000 for your food trailer, listed at $20,000. The offer expired before you saw it. Offers on Vendibook stay open 48 hours, and our only alert back then was a single email.",
  "If you're still selling, reply to this email and I'll let the buyer know you're open to talking.",
  "If it's already sold, reply \"sold\" and I'll take the listing down for you."
 ],
 "details": [
  {
   "label": "Offer",
   "value": "$15,000"
  },
  {
   "label": "Your asking price",
   "value": "$20,000"
  },
  {
   "label": "Offer date",
   "value": "Sep 11, 2026"
  }
 ],
 "ctaLabel": "View your listing",
 "ctaUrl": "https://vendibook.com/listing/c649440f-d3df-4f3a-a622-e118767efb4d?utm_source=email&utm_medium=concierge&utm_campaign=offer-rescue",
 "footnote": "Brad \u00b7 Customer Success, Vendibook"
}
```

**R-2 seller** (host `33fb896d`):
```json
{
 "subject": "Is your Bradenton food trailer still for sale?",
 "preview": "Is your Bradenton food trailer still for sale?",
 "kicker": "Missed offer",
 "heading": "Is it still for sale?",
 "greeting": "Hi {first_name},",
 "paragraphs": [
  "Back in June a buyer offered $22,000 for your food trailer, listed at $40,000. The offer expired before you responded. Our alerts were thin back then, and that's on us.",
  "Is it still for sale? Reply \"yes\" and I'll help you update the listing. Two quick fixes would help: turn on offers with a minimum you're comfortable with, and answer the condition and title questions.",
  "Reply \"sold\" and I'll take it down."
 ],
 "details": [
  {
   "label": "Offer",
   "value": "$22,000"
  },
  {
   "label": "Your asking price",
   "value": "$40,000"
  },
  {
   "label": "Offer date",
   "value": "Jun 9, 2026"
  }
 ],
 "ctaLabel": "Edit your listing",
 "ctaUrl": "https://vendibook.com/edit-listing/efa664df-1f34-421f-90f8-2ebc88e471fd?utm_source=email&utm_medium=concierge&utm_campaign=offer-rescue",
 "footnote": "Brad \u00b7 Customer Success, Vendibook"
}
```

The R-1 buyer follow-up uses the same template and is sent only after the seller confirms they're still selling.
