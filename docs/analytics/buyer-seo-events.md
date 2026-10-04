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

## Financing hub extension — October 2026

`/financing` now uses the same `buyer_seo_landing_view` and `buyer_seo_cta_click` contract. Internal listing links are classified as `listing_detail`; calculator links include `cta_location=calculator`. Existing financing application/handoff events remain intact.

Additional consent-gated events:

| Event | Trigger |
| --- | --- |
| `buyer_seo_financing_calculator_started` | First input edit or calculation in this mounted calculator |
| `buyer_seo_financing_calculator_completed` | Valid calculation submitted, or main budget CTA used; deduped until inputs change |
| `buyer_seo_financing_calculator_browse_clicked` | Main or category-specific budget inventory link clicked |
| `buyer_seo_financing_apply_clicked` | Application CTA used, with placement and optional listing ID |
| `buyer_seo_financing_faq_opened` | FAQ accordion opened, with stable question index |

These events carry the first buyer-SEO landing attribution, plus `page_path=/financing`. Calculator events contain non-personal planning inputs only. First-touch session storage is now written only with analytics consent. Existing signup-completed events include that attribution when consent exists; no additional signup conversion or paid event is emitted. Listing views, inquiries and checkout starts retain the existing downstream attribution behavior. Campaign UTMs are retained on calculator-to-search links, not blindly appended to partner application URLs.
