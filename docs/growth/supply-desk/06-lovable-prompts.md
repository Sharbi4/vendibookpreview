# Supply-side Lovable prompts (ready to paste)

**Constraints baked into every prompt:**

- Payments run on **Square and PayPal**, and PayPal is intentionally in **sandbox mode**. Don't change, or recommend changing, the PayPal environment, credentials, plans or webhooks, or any Square configuration.
- Never add Stripe.
- Never claim automated seller payouts. Payouts are manual.

Ship order: **LP-1 → LP-2** (they unblock draft recovery), then LP-3, then LP-4.

---

## LP-1: One-screen "Finish & publish" for existing drafts (**SHIPPED in 87b59eea**, `src/pages/ListingFinish.tsx`; kept for reference)

```text
Problem: 108 real seller drafts can't publish. Most were saved before we added the required
disclosures step (getStageRequirements in src/lib/listings/stages.ts + the 5 attestations in
src/components/listing-wizard/stages/PublishAttestations.tsx). Returning sellers land in the
full multi-step PublishWizard and have to hunt for the new questions.

Build a route /list/finish/:listingId (auth required, owner only; anyone else → 404) that shows
ONE screen with only what's still missing for that draft, in this order:
1. Any missing disclosure fields from getStageRequirements() (condition, operational status,
   title status + lien for titled sale assets, known problems or "no known problems", what's
   included, photo-exclusions answer, sale dimensions when required). Reuse the exact same
   option catalogues and validation from stages.ts — do not create a second set of rules.
2. Any missing content requirements from the existing checklist (≥3 photos, price, title ≥5
   chars, description ≥50 chars, complete structured address). Show only the missing ones,
   using the existing inputs/components (photo uploader, address autocomplete, price input).
3. The 5 publish attestations, unchecked by default (sellers must tick them themselves).
4. A single "Publish listing" button that calls the same publish code path the PublishWizard
   uses (same server validation, same moderation, same analytics events), enabled only when
   getStageRequirements() returns [] and all attestations are checked.
Show a progress line like "3 quick answers left". Autosave every answer to the draft.
At the top show a small read-only preview card of the listing (cover photo, title, price).
If nothing is missing except attestations, the screen is just preview + attestations + button.
Fire analytics events: finish_page_viewed, finish_field_completed {field_id},
finish_publish_clicked, finish_published, finish_abandoned {first_missing_field_id}.
Add a "Finish & publish" button on each draft card in the seller dashboard linking here.

Do NOT change any payment provider, checkout, Square or PayPal configuration, or PayPal
sandbox mode. Do not add Stripe. Do not weaken or skip any disclosure or attestation.
```

## LP-2: 1-tap publish links for recovery emails and SMS

```text
For the draft-recovery emails, generate a per-draft link that opens /list/finish/:listingId.
- The link format is https://vendibook.com/list/finish/<listingId>?utm_source=email&utm_medium=lifecycle&utm_campaign=draft-recovery-<step>
  (step = e1, e2, e3, e4, s1 for SMS with utm_source=sms).
- If the seller isn't signed in, send them through the normal sign-in (magic link / OTP) and
  return them to the same /list/finish URL afterwards. Do NOT create any token that can
  publish without the seller being authenticated.
- Add a server-side helper (edge function or SQL view, read-only) that returns, per draft:
  listing_id, host email, first_name, title, category, mode, city, state, completeness %,
  the list of missing requirement labels (same logic as getStageRequirements), and whether
  the host is suppressed (email_unsubscribes / suppressed_emails) or has SMS transactional
  opt-in (sms_preferences). Exclude drafts whose host email matches example.com or
  vendibook.com and guest drafts with no host_id. The lifecycle email tool uses this as
  its audience.
- When a draft publishes or the seller clicks "I sold it / not selling", stop all further
  recovery emails/SMS for that draft and record the reason.

Do not change payments: no changes to Square config or to the PayPal environment (sandbox), credentials, plans or webhooks. No Stripe.
```

## LP-3: Make photo uploads survive bad connections

```text
We logged 33 vendi_media_upload_failed events in the last 30 days, and 87 of our drafts have
zero photos. Make photo upload in the listing wizard, /list/finish and Vendi resilient:
- Compress and resize on the client before upload (max 2560px long edge, ~80% JPEG/WebP),
  and convert HEIC/HEIF from iPhones to JPEG in the browser.
- Upload each photo independently with up to 3 automatic retries (exponential backoff), and show
  per-photo status (uploading / retrying / failed — tap to retry). One failure must
  never discard the other photos or the draft.
- Persist successfully uploaded photo URLs to the draft immediately, not only on "Next".
- Log the failure reason (size, type, network, storage error) in the existing
  vendi_media_upload_failed event metadata.
No payment changes (Square untouched; PayPal stays sandbox, with credentials, plans and webhooks unchanged).
```

## LP-4: Supply attribution (UTM → listing)

```text
Capture first-touch attribution for sellers so we can count listings per channel
(e.g. utm_campaign=muse-2 / muse-4 / draft-recovery-e1).
- On any landing, if utm_source/utm_medium/utm_campaign are present and no first-touch is
  stored yet, store them (plus landing path and timestamp) in localStorage. Wrap every read and write in try/catch.
- On signup, write them to new nullable profile columns first_touch_utm_source,
  first_touch_utm_medium, first_touch_utm_campaign, first_touch_landing_path, first_touch_at.
- On listing creation, copy the same values to new nullable listings columns
  (source_utm_source, source_utm_medium, source_utm_campaign).
- Include utm_campaign in the existing vendi_published analytics event metadata and in the
  wizard publish event.
Migration must be additive (nullable columns only, no backfill, no changes to existing rows).
No payment changes (Square untouched; PayPal stays sandbox, with credentials, plans and webhooks unchanged).
```

## LP-5: Listing health card with field anchors

```text
Extend the existing ListingHealthScoreCard (src/components/listing-wizard/ListingHealthScoreCard.tsx)
and show it on each live listing in the seller dashboard, not only on the wizard review step.
Use the Supply Desk rubric in docs/growth/supply-desk/04-listing-quality.md:
- Photos ≥8 = 25 pts, 5–7 = 15, 3–4 = 5
- Price present = 15
- Offers on (sale) or instant book on (rent) = 15
- Title status (titled sale assets) = 10
- Condition = 10
- Walkaround video = 10
- Description ≥300 characters = 5
- What's included = 5
- Year/make = 5, but only once those fields are actually stored on listings
Show the score and the top 3 fixes, each linking to /edit-listing/:id#<field>. Add stable
anchor ids in the PublishWizard for: offers, photos, details (condition/title/included),
description, video, availability. Scroll to and highlight the anchored field on load.
Never say "overpriced": the comps flag reads "Show buyers why it's worth the price".
No payment changes (Square untouched; PayPal stays sandbox, with credentials, plans and webhooks unchanged).
```

## LP-6: "Complete your profile" checklist

```text
On the seller dashboard, add a 3-item checklist card that shows until all three are done:
profile photo (profiles.avatar_url), a bio of at least 40 characters (profiles.bio, already
shown on public profiles via AboutSection), and identity verification (the existing
verification flow). Each item links straight to the right settings field. Copy: "Buyers check
who they're buying from. Sellers with a photo and bio look more trustworthy." Track
profile_checklist_viewed / profile_checklist_item_completed {item}.
No payment changes.
```

## LP-7: Offer rescue loop (spec in 05-offer-rescue.md)

```text
1) Update the offer-received-seller email template so it has three buttons: Accept $X,
   Counter, Decline. They link to /dashboard?offer=<id>&action=accept|counter|decline. On the
   dashboard, read those params and open the existing offer dialog preset to that action.
   Nothing happens without the signed-in seller confirming.
2) In send-offer-notification (new_offer), also call send-sms with template_name
   'offer_received', category 'transactional', only when the seller's
   sms_preferences.transactional_status = 'opted_in'. Body:
   "Vendibook: $X offer on your {title}. Accept, counter or decline: {short link}. Reply STOP to opt out."
3) Add nullable columns offers.seller_nudged_at, offers.admin_alerted_at and
   offers.final_reminder_at (additive migration, no backfill). Add an hourly edge function,
   offer-rescue-sweep, for pending offers with no responded_at:
   ≥12h and seller_nudged_at null → seller email + SMS (if opted in); set seller_nudged_at.
   ≥36h and admin_alerted_at null → send-admin-notification type 'offer_unanswered' with listing,
   amount, hours open and seller phone if present; final seller email; set both timestamps.
   Use idempotency keys per (offer, step). Respect send-sms quiet hours.
No payment changes (Square untouched; PayPal stays sandbox, with credentials, plans and webhooks unchanged). No Stripe.
```
