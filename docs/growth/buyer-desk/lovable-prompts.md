# Buyer-Side Website Changes: Lovable Prompts

Paste each block into Lovable for the "Vendibook Marketplace" project, one at a time. They're ordered by expected impact on Buyer Contact Rate (clean baseline 0.80% → target 1.5%).
**Payment constraint (owner, overrides project knowledge):** Vendibook uses **Square and PayPal, never Stripe.** PayPal is **intentionally in sandbox mode**. None of these prompts change, or recommend changing, the PayPal environment, credentials, plans or webhooks. Each prompt repeats this line so Lovable sees it.

Code basis: branch `fix/paypal-webhook-config`. Sale pages render through `SaleListingLayout` (desktop) and `SaleListingMobile` (mobile). Both use `SaleStickyActionBar`, which today has only **Make Offer** and **Buy**, and `SalePurchaseCard`. Messaging goes through `MessageHostForm`, which redirects logged-out users to `/auth` (the login wall). Offers go through `AuthGateOfferModal` → `MakeOfferModal`.

**Trust-gate constraint (AGENTS.md):** `guard_signup_phone_actions` blocks inserts into offers, conversations, conversation_messages, booking_requests and sale_transactions until the actor has verified phone + identity (Plaid IDV), and `message-risk-scan` alerts admins about risky messages. LP-1 and LP-2 lower the *friction* (ask first, verify inline) but **never let an unverified person reach a seller**. Don't weaken or bypass the trigger.

---

### LP-1 · Mobile "Ask a question" on the sale bar, verified inline instead of a login wall
```
On SALE listings, update src/components/listing-detail/sale/SaleStickyActionBar.tsx (used by SaleListingMobile and SaleListingLayout). It currently shows only "Make Offer" and "Buy". Add a primary "Ask a question" button. Keep "Buy" and keep "Make Offer" only when accepts_offers is true; when offers are off, show "Ask a question" + "Buy". On narrow screens, if three buttons don't fit, put Make Offer in a "More" overflow. Add the same entry point to the desktop SalePurchaseCard.

"Ask a question" opens a bottom sheet. Step 1 (no account yet): the message, prefilled with "Hi, is this still available?", plus 3 one-tap chips: "Is it still available?", "Does it pass health inspection?", "Can I see it this week?". Step 2: "Where should the seller reply?" with first name, mobile number and email. Step 3: verify inside the same sheet using the existing signup flow (phone code, then identity verification via the existing signup-verify / signup-refresh / PhoneVerificationPrompt components). That creates a lightweight account in place, with no redirect to /auth and the typed message preserved. Only after verification succeeds, create the conversation + first conversation_message exactly as MessageHostForm does today, so guard_signup_phone_actions and message-risk-scan still apply. If the visitor abandons at step 3, save their draft in sessionStorage and show "Finish verifying to send" the next time they open the sheet. Never send unverified text to the seller, and never write a guest message to listing_leads as a way around the trust gate.

Also change src/components/messaging/MessageHostForm.tsx so logged-out users get this same in-place flow instead of navigate('/auth'). Do not change guard_signup_phone_actions or the verification requirements. Fire analytics_events 'buyer_question_opened', 'buyer_question_verify_started', 'buyer_question_verified', 'buyer_question_sent' (with listing_id) so we can see where people drop off. Do not touch payment code. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-1b · Harden guest inquiries (commit 13e5949b, built but not yet published)
Status: the Growth lead shipped guest inquiries. Logged-out buyers enter an email, the question goes to listing_leads (source='guest_inquiry'), and notify-listing-lead emails the concierge (full contact), the seller (question only, no contact) and the buyer. The relay design is good. Two gaps against the trust gate need fixing **before publishing**:
1. The buyer's free text reaches the seller unscanned. A scammer can put a phone number, email or link in the question and skip both phone/ID verification and message-risk-scan.
2. There's no abuse limit. Anonymous inserts plus a function with `verify_jwt=false` mean anyone can flood sellers and the support inbox, or use the buyer-confirmation email to mail-bomb someone else's address.
```
Harden the guest inquiry flow (MessageHostForm guest path + supabase/functions/notify-listing-lead):
1) Before notifying the seller, run the question through the same risk check as message-risk-scan. If it's flagged, or if it contains a phone number, email address or URL, do NOT send the seller email or in-app notification. Send it only to the concierge inbox, marked "held for review". Otherwise, mask any contact-like strings in the seller copy (e.g. "[contact removed, reply on Vendibook]").
2) Add abuse limits: max 3 guest inquiries per email per 24h, max 1 per email per listing per 24h, and an IP/session-based limit (use a DB check in the edge function, keyed on a hashed IP passed from the client request). Add a Cloudflare Turnstile or honeypot field to the guest form. If over the limit, save the lead but skip all emails.
3) Send the buyer confirmation email only once per email address per 24h.
4) Add a "Reply via Vendibook" button to the seller email that opens a conversation the concierge connects once the buyer completes phone + ID verification. Don't expose buyer contact details to sellers, and don't modify guard_signup_phone_actions.
Track analytics_events 'guest_inquiry_held', 'guest_inquiry_rate_limited'. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-2 · Offer first, verify in place (replace the up-front auth gate)
```
Today AuthGateOfferModal stops logged-out users before they can even type an offer (SaleListingMobile / SaleListingLayout). Change the order: let a logged-out visitor open MakeOfferModal and enter the offer amount (validate ≥ min_offer_amount if set) and an optional message first. On "Send offer", run the same in-place verification as LP-1 (name, mobile, email, phone code, identity verification via the existing signup components), keeping the typed offer in component state and sessionStorage. Only after verification succeeds, insert the offer normally as the verified buyer, so guard_signup_phone_actions and message-risk-scan apply unchanged and the seller is notified as today. Do not create offers rows for unverified users, do not add a 'pending_verification' offer status, and do not modify the trigger. If the visitor abandons, show "Your $X offer is saved. Finish verifying to send it" when they return. Track 'offer_draft_started', 'offer_verify_started', 'offer_sent'. No payment is collected at offer time. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-3 · Trust fields required, plus a listing-quality nudge for sellers
```
1) In the listing wizard (src/components/listing-wizard), make these required before publishing a SALE listing: condition, title_status, operational_status, and for food_truck also year_built, make, and mileage. Add a "Permits / insignia" short text field (e.g., "CA HCD insignia", "Maricopa County approved", "None"), saved to a new nullable text column listings.permit_status.
2) On sale listing pages (SaleQuickSpecs, rendered by SaleListingLayout and SaleListingMobile), show a "Key facts" strip above the description: Title · Condition · Runs/Towable · Year · Permits. If a value is missing, show "Ask seller" linking to the Ask-a-question sheet with that question prefilled.
3) In the host dashboard, add a "Listing quality" card per listing scoring: photos ≥ 8, description ≥ 300 chars, all key facts set, offers on, correct category. List the missing items with one-click fixes (e.g., a "Turn on offers" toggle). Weekly host digest email includes the score and the top missing item. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-4 · Show the estimated monthly payment where buyers decide
```
Financing already exists on sale listings: FinancingActionPanel, the src/lib/financing/calculator.ts calculator, FinancingCalculator, and PayPalPayLaterMessage in SalePurchaseCard. Don't build a new calculator. Reuse calculator.ts to show one "≈ $X/mo est." line (a) under the price on sale listing cards in search and home results, and (b) next to the price in SaleStickyActionBar on mobile, only when isFinanceableSaleListing(listing) is true. Use the same disclosure text the existing financing components use, and tapping it opens the existing FinancingActionPanel. Track 'monthly_estimate_click'. Don't add any new lender or payment processor. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-5 · Stop counting scraper views and host self-views
```
Listing view counts are inflated: ~3,700 of ~4,800 monthly sessions come from one scraper user agent ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", one view per session, never logged in), and hosts viewing their own listings are counted too. Wherever listing_views are inserted, skip the insert when: the user agent matches the shared bot regex (bot|crawl|spider|preview|headless|facebookexternalhit|python|curl|...), OR equals that exact Chrome/119 string, OR the viewer is the listing's host_id, OR the session already viewed this listing in the last 30 minutes. Put the regex in one shared module used by the client and by edge functions (analytics-rollup, send-host-weekly-digests, send-daily-digests, generate-listing-insights) so host-facing view counts and admin metrics use the same human-only definition. Add an is_bot boolean column default false instead of deleting history, and backfill it for existing rows matching the rules. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-6 · Offers stop expiring silently
```
Offers currently expire after 48h with no notice. Change to: (a) email + in-app notification to the seller at creation, again at 24h remaining, and at 4h remaining ("Respond to $X offer on [title] before it expires"), with one-click Accept / Counter / Decline links; (b) when an offer expires, email the buyer "The seller didn't respond in time" with 3 similar live listings (same category, nearest state, ±30% price) and a "Re-send offer" button that extends 48h once; (c) show a countdown on the offer in both dashboards (HostOffersSection, BuyerOffersSection). Add a scheduled edge function for reminders. Track 'offer_reminder_sent', 'offer_expired_buyer_notified'. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-7 · Zero-results page that captures demand
```
When search returns zero results (Search.tsx; event search_zero_results), replace the empty state with: (1) "Nothing exactly here yet. Closest matches:", automatically widening radius to 250 miles, then nationwide, for the same category and mode, showing up to 6 listings; (2) a "Tell us what you need. We'll find it." form (category, buy/rent, city/state, budget min/max, timeline, email or phone; no login, because this goes to the Vendibook team, not to a seller) that inserts into asset_requests with source_page='zero_results' and the search metadata. Debounce the zero-results analytics event until the location input has been idle for 1.5s and contains ≥ 3 characters, so partial typing ("new", "new o") is not counted. For vendor_lot / vendor_space with zero supply, show "Be first to list a vendor space" for hosts as a secondary CTA. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-8 · Category sanity check
```
In the listing wizard, if the title contains "trailer" but category is food_truck (or "truck" with category food_trailer), show an inline prompt: "Looks like a trailer. Switch category so trailer buyers can find it?" with a one-click switch. Add an admin view listing all published listings with this mismatch. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-9 · "Why buy on Vendibook" trust + fulfillment strip (Market Capture: trust/fulfillment wedge)
```
On sale listing pages (SaleListingLayout desktop, SaleListingMobile mobile), add a compact "Buy with confidence" strip directly under the price in SalePurchaseCard / above the fold on mobile. Show only the items that are true for this listing, using existing data and components:
- "Verified members": every buyer and seller verifies phone + ID before messaging or offers (show only if signup_phone_required and signup_identity_required are enabled).
- "PayPal-verified seller": reuse PayPalVerifiedSellerTrust when paypalBusinessVerified is true.
- "Free shipping" when Vendibook Freight is enabled and the seller covers it, or "Nationwide delivery available" when the buyer pays. Never show the freight rate or computed freight cost when the seller covers it (AGENTS.md rule).
- "Financing available" when isFinanceableSaleListing(listing) is true (opens the existing FinancingActionPanel).
- "Clean title · No lien" only when title_status = 'clean' and has_lien = 'no'.
- "Remote notary closing" when proof_notary_enabled is true.
Each item gets a one-line tooltip. Add the same strip (max 3 items) to sale listing cards in search results. Track 'trust_strip_item_click' with the item key. Don't add new claims or badges beyond these. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

### LP-10 · Price vs. comps (price transparency instead of a price war)
```
Add a small "Price check" line to sale listing pages and cards: compare price_sale with the median price_sale of published, non-deleted sale listings in the same category (and the same subcategory when there are at least 5 comps; otherwise category only). Show "$X below typical" (green) when the price is 10%+ under the median, "Around typical" within ±10%, and nothing when it's above (don't shame sellers publicly). Compute the medians in a SQL view or RPC refreshed hourly, not on the client. Tooltip: "Based on N similar listings on Vendibook. Not an appraisal." In the host dashboard, show sellers whose price is 25%+ above the median a private nudge: "Similar listings ask about $Y. Consider turning on offers." Track 'price_check_shown' with the bucket. Payments: Square and PayPal only, never Stripe; PayPal stays in sandbox. Do not change the PayPal environment, credentials, plans or webhooks.
```

