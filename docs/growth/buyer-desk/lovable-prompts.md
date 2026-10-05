# Buyer-Side Website Changes: Lovable Prompts

Paste each block into Lovable for the "Vendibook Marketplace" project, one at a time. They're ordered by expected impact on Buyer Contact Rate (clean baseline 0.80% → target 1.5%).
**Project constraint: payments are PayPal only. Never add Stripe or Stripe-based financing.**

---

### LP-1 · Mobile "Ask a question" on the sale bar, no login required
```
On the listing detail page (src/pages/ListingDetail.tsx) for SALE listings, update the mobile sticky bottom bar so it shows two buttons side by side: a primary "Ask a question" and a secondary "Make an offer" (offer only if accepts_offers is true; otherwise "Request price info").

"Ask a question" opens a bottom sheet that does NOT require login. Fields: first name, email OR phone (one required), a message prefilled with "Hi, is this still available? I'd like to know about [title status / condition / what's included]", and 3 one-tap quick questions as chips: "Is it still available?", "Does it pass health inspection?", "Can I see it this week?". Submit inserts into listing_leads (listing_id, host_id, name, email, phone, message, source='mobile_ask_question'), shows a success state "Sent! The seller usually replies by email or text," and emails the host using the existing notification email function.

If the user is logged in, prefill their info and also create/append to a conversation as today. Fire analytics_events 'buyer_question_opened' and 'buyer_question_sent' with listing_id. Do the same for desktop in the right-rail contact card. Do not touch payment code. Payments stay PayPal only; never add Stripe.
```

### LP-2 · Guest offers (remove the login wall before offers)
```
Allow logged-out visitors to submit an offer on sale listings where accepts_offers = true. The offer modal collects offer amount (validate ≥ min_offer_amount if set), optional message, name, and email. On submit: create the offer in a 'pending_verification' state via an edge function, send a magic-link email ("Confirm your $X offer on [title]"), and when the link is clicked, create or sign in the account, attach the offer to that user and set status to 'pending' so the seller gets notified as today. Show "Check your email to confirm your offer" after submit. Track analytics_events 'guest_offer_started', 'guest_offer_confirmed'. No payment is collected at offer time; any later payment stays PayPal only (never Stripe).
```

### LP-3 · Trust fields required, plus a listing-quality nudge for sellers
```
1) In the listing wizard (src/components/listing-wizard), make these required before publishing a SALE listing: condition, title_status, operational_status, and for food_truck also year_built, make, and mileage. Add a "Permits / insignia" short text field (e.g., "CA HCD insignia", "Maricopa County approved", "None"), saved to a new nullable text column listings.permit_status.
2) On the listing detail page, show a "Key facts" strip above the description: Title · Condition · Runs/Towable · Year · Permits. If a value is missing, show "Ask seller" linking to the Ask-a-question sheet with that question prefilled.
3) In the host dashboard, add a "Listing quality" card per listing scoring: photos ≥ 8, description ≥ 300 chars, all key facts set, offers on, correct category. List the missing items with one-click fixes (e.g., a "Turn on offers" toggle). Weekly host digest email includes the score and the top missing item.
```

### LP-4 · Estimated monthly payment line (informational, no lender integration)
```
On sale listing cards and the listing detail price block, under the price show "≈ $X/mo est." computed client-side as a simple amortized payment: 10% down, 60 months, 12% APR (constants in a single config file). Tooltip: "Estimate only. Not a loan offer. Rates and terms vary by lender." Do not integrate any lender or payment processor; do not add Stripe. Hide for listings under $5,000. Track 'monthly_estimate_tooltip_open'.
```

### LP-5 · Stop counting scraper views and host self-views
```
Listing view counts are inflated: ~3,700 of ~4,800 monthly sessions come from one scraper user agent ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", one view per session, never logged in), and hosts viewing their own listings are counted too. Wherever listing_views are inserted, skip the insert when: the user agent matches the shared bot regex (bot|crawl|spider|preview|headless|facebookexternalhit|python|curl|...), OR equals that exact Chrome/119 string, OR the viewer is the listing's host_id, OR the session already viewed this listing in the last 30 minutes. Put the regex in one shared module used by the client and by edge functions (analytics-rollup, send-host-weekly-digests, send-daily-digests, generate-listing-insights) so host-facing view counts and admin metrics use the same human-only definition. Add an is_bot boolean column default false instead of deleting history, and backfill it for existing rows matching the rules.
```

### LP-6 · Offers stop expiring silently
```
Offers currently expire after 48h with no notice. Change to: (a) email + in-app notification to the seller at creation, again at 24h remaining, and at 4h remaining ("Respond to $X offer on [title] before it expires"), with one-click Accept / Counter / Decline links; (b) when an offer expires, email the buyer "The seller didn't respond in time" with 3 similar live listings (same category, nearest state, ±30% price) and a "Re-send offer" button that extends 48h once; (c) show a countdown on the offer in both dashboards (HostOffersSection, BuyerOffersSection). Add a scheduled edge function for reminders. Track 'offer_reminder_sent', 'offer_expired_buyer_notified'.
```

### LP-7 · Zero-results page that captures demand
```
When search returns zero results (Search.tsx; event search_zero_results), replace the empty state with: (1) "Nothing exactly here yet. Closest matches:", automatically widening radius to 250 miles, then nationwide, for the same category and mode, showing up to 6 listings; (2) a "Tell us what you need. We'll find it." form (category, buy/rent, city/state, budget min/max, timeline, email or phone; no login) that inserts into asset_requests with source_page='zero_results' and the search metadata. Debounce the zero-results analytics event until the location input has been idle for 1.5s and contains ≥ 3 characters, so partial typing ("new", "new o") is not counted. For vendor_lot / vendor_space with zero supply, show "Be first to list a vendor space" for hosts as a secondary CTA.
```

### LP-8 · Category sanity check
```
In the listing wizard, if the title contains "trailer" but category is food_truck (or "truck" with category food_trailer), show an inline prompt: "Looks like a trailer. Switch category so trailer buyers can find it?" with a one-click switch. Add an admin view listing all published listings with this mismatch.
```
