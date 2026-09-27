# Buyer SEO event map

Code: `src/lib/buyerSeoTracking.ts`, `src/hooks/useBuyerSeoTracking.ts`.
Sinks: first-party `analytics_events` (event_category `buyer_seo`, with session_id/route/listing_id) and GA4 `gtag('event', …)`.
Consent: every event below is sent only when `hasAnalyticsConsent()` is true.
Privacy: no names, emails, phone numbers or message text. Only paths, CTA ids, category, listing id and sanitized UTM params.

Tracked pages: `/food-trucks-for-sale`, `/food-trailers-for-sale`, `/used-food-trucks-for-sale`, `/how-to-buy-a-food-truck`, `/food-truck-prices`.

| Event | Fires when | Properties |
|---|---|---|
| `buyer_seo_landing_view` | A tracked page renders. Once per router navigation (dedupe by path + location.key) | landing_page, asset_category, utm_* |
| `buyer_seo_cta_click` | An internal link inside page content is clicked (site header/footer excluded) | landing_page, cta_id, cta_location, destination, destination_type (listing_detail, search, financing, sale_hub, buyer_guide, prices, inspection, freight, how_it_works, seller, other_internal), asset_category, listing_id |
| `buyer_seo_attributed_listing_view` | A listing detail page loads in a session that landed on a tracked page | first-touch attribution + listing_id, asset_category, listing_mode |
| `buyer_seo_attributed_inquiry_submitted` | A message to the seller or a "request info" lead is saved successfully | attribution + listing_id, inquiry_type (message, request_info) |
| `buyer_seo_attributed_checkout_started` | Sale checkout creates the order (online) or submits an in-person purchase request | attribution + listing_id, payment_path (online, in_person_request) |

Attribution is first-touch per browser tab session (`sessionStorage.vb_buyer_seo_attr`). Downstream events fire once per stage + listing per page load and do nothing without attribution.

## Measured vs not measured
- Measured: landing views, CTA clicks by location/destination, and attributed listing views, successful inquiries and checkout starts.
- A CTA click is never counted as an inquiry, checkout or purchase.
- Not measured client-side: completed or paid purchases. Payment completion is verified server-side by the PayPal webhook and is not linked to the landing page. To connect them, join `analytics_events.session_id` for `buyer_seo_attributed_checkout_started` with the transaction for the same listing/buyer on the server side.
- Not measured: rental booking starts (these pages are for-sale only), attribution across tabs, devices or after the tab closes, and visitors who decline analytics cookies.
- Existing events (listing_viewed, host_contacted, Meta InitiateCheckout/Purchase, Google Ads form conversions) are unchanged and not duplicated. The new events use their own `buyer_seo_*` names.

## Adding a CTA
Put `data-cta-location="…"` on the section and optionally `data-cta-id="…"` on the link. Links without an id get `listing_card` or `link_<path>`.

## Consent & privacy limits (2026-09-27)
- Without analytics consent nothing happens: no sessionStorage attribution, no dedupe state, no events. `getBuyerSeoAttribution()` returns null.
- Consent changes dispatch `vb:cookie-consent-change` (`notifyConsentChanged` in `src/lib/cookieConsent.ts`, called by the cookie banner and Privacy "reset"). On revoke, attribution and dedupe state are cleared. On accept while on a buyer page, that page's view fires once (deduped by router location key) and attribution is stored.
- A CTA click first ensures the landing view is recorded (deduped), so late consent/CTA-before-effect never loses landing attribution.
- UTM: only `utm_source`, `utm_medium`, `utm_campaign` are kept. `utm_term` and `utm_content` are never recorded. Values containing `@`/`%40`, "x at y dot com" patterns, or 7+ digit runs are dropped. This is a heuristic, not a guarantee.
- `destination`: pathname plus `category`/`mode` query params only (values limited to `[\w-]{1,40}`); all other query params and hashes are dropped.
