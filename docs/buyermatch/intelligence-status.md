# BuyerMatch seller intelligence

## Functional
- Dedicated dashboard and `/dashboard/buyermatch/membership`; existing provider-aware management/cancellation and pricing selection.
- Missing deployed BuyerMatch tables/RPC caused the confirmed loading failure; installed services without altering memberships or payments.
- Owner/entitlement-checked submission; pending review, approved, active, paused, completed, rejected states. Subscription never initiates outreach.
- Staff event ingestion through authenticated `buyermatch_action('event', payload)`, unique event IDs and conflicting replay rejection. Evidence references are not seller-readable.
- Verified event counts/outcomes, separate browser-session link engagement, historical report display and listing readiness suggestions.
- `buyermatch_action('link', ...)` requires a verified outreach-approved event; one opaque link per approval.
- Normal listings preserved; consent-gated visit collection aggregates one link/session/day. Raw visitor sessions remain private.
- Astra recommendations endpoint deployed; requires authenticated campaign owner/current Pro. Suggestions create no campaign activity.

## Event contract
Call authenticated `buyermatch_action` as administrator, action `event`, with `campaign_id`, `listing_id`, `event_id` (unique source ID), `event_type`, `timestamp` (not future), `source`, `verification_status` (`observed` or `verified`), `evidence_reference`, `review_confirmed: true`; optional `outcome`, `next_step`, `feedback`.
Types: platform_researched, buyer_opportunity_identified, outreach_proposed, outreach_approved, outreach_sent, delivery_confirmed, buyer_response_received, inquiry_qualified, follow_up_recommended.
Feedback: interested, needs_financing, price_concern, not_interested. Link visits use a separate consent-aware endpoint, never verified buyer interest.

## Remaining integration/verification limits
- No connected Muse service found. Authenticated staff event entry works; automated Muse transport and approved operational workflow are required. Fulfillment stays disabled until configured.
- No geography claims without legitimately collected data, no email-open metrics. Sessions are not individual people; anonymous anti-bot qualification is unavailable.
- Listing views stay in existing listing analytics, not invented campaign metrics.
- Billing amount/cadence appears only when recorded in membership metadata; missing historical amounts remain unavailable, never substituted with current catalog prices.
- Signed-in owner was a nonmember with no eligible sale listings: locked dashboard/membership browser-tested; unauthorized submit/settings/AI rejected. Paid campaign activation and a real Astra result need a current member-owned campaign. No entitlement granted or customer/payment data changed for testing.
- Frontend unpublished. No charges/outreach sent. Existing notification systems preserved; campaign state alerts are in-app, no new campaign email automation claimed.

## Verification
Six dashboard/intelligence tests passed; preview build OK. Desktop/mobile locked preview and membership rendered without runtime errors or horizontal overflow.