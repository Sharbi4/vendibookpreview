-- Vendibook liquidity scorecard (read-only).
-- Run in the Lovable/Supabase SQL editor. One row, trailing 7d and 30d windows.
--
-- North star: Buyer Contact Rate = qualified buyer contacts / human listing-view sessions.
-- A "buyer contact" is any buyer-initiated touch on a specific listing:
--   conversations, offers, booking_requests, listing_leads, asset_requests with a listing_id.
-- Bot-like user agents are excluded from views.

with
human_views as (
  select * from listing_views
  where coalesce(user_agent, '') !~* '(bot|crawl|spider|headless|facebookexternalhit|meta-external|python|curl|lighthouse)'
),
contacts as (
  select listing_id, created_at, 'conversation' as kind from conversations
  union all select listing_id, created_at, 'offer' from offers
  union all select listing_id, created_at, 'booking_request' from booking_requests
  union all select listing_id, created_at, 'listing_lead' from listing_leads
  union all select listing_id, created_at, 'asset_request' from asset_requests where listing_id is not null
),
live as (
  select * from listings where status::text = 'published' and deleted_at is null
),
w(label, since) as (values ('7d', now() - interval '7 days'), ('30d', now() - interval '30 days'))
select
  w.label as period,

  -- SUPPLY
  (select count(*) from live) as live_listings,
  (select count(*) from live where mode::text = 'sale') as live_sale,
  (select count(*) from live where mode::text = 'rent') as live_rent,
  (select count(*) from listings where published_at >= w.since and deleted_at is null) as new_listings,
  (select count(*) from listings where status::text = 'draft' and deleted_at is null) as stuck_drafts,

  -- DEMAND
  (select count(distinct session_id) from human_views where viewed_at >= w.since) as view_sessions,
  (select count(*) from contacts where created_at >= w.since) as buyer_contacts,
  (select count(*) from offers where created_at >= w.since) as offers,
  (select count(*) from analytics_events where event_name = 'search_performed' and created_at >= w.since) as searches,
  (select count(*) from analytics_events where event_name = 'search_zero_results' and created_at >= w.since) as zero_result_searches,

  -- LIQUIDITY
  round(100.0 * (select count(*) from contacts where created_at >= w.since)
        / nullif((select count(distinct session_id) from human_views where viewed_at >= w.since), 0), 3) as buyer_contact_rate_pct,
  round(100.0 * (select count(distinct listing_id) from contacts where created_at >= w.since)
        / nullif((select count(*) from live), 0), 1) as pct_listings_with_contact,
  round(100.0 * (select count(*) from analytics_events where event_name = 'search_zero_results' and created_at >= w.since)
        / nullif((select count(*) from analytics_events where event_name = 'search_performed' and created_at >= w.since), 0), 1) as zero_result_rate_pct,
  round(100.0 * (select count(*) from offers where created_at >= w.since and responded_at is not null)
        / nullif((select count(*) from offers where created_at >= w.since), 0), 0) as offer_response_rate_pct,

  -- TRANSACTIONS
  (select count(*) from sale_transactions where created_at >= w.since) as sale_transactions,
  (select count(*) from booking_requests where paid_at >= w.since) as paid_bookings,
  (select coalesce(sum(amount), 0) from sale_transactions where created_at >= w.since) as sale_gmv
from w
order by w.since desc;

-- Hot-but-cold listings: high human views, zero buyer contacts in 30d.
-- These are the listings Muse should push hardest and the seller should be coached on (price, offers, photos).
-- select l.id, l.title, l.city, l.state, l.price_sale, l.accepts_offers,
--        coalesce(array_length(l.image_urls,1),0) as photos, count(distinct v.session_id) as sessions_30d
-- from listings l
-- join listing_views v on v.listing_id = l.id and v.viewed_at > now() - interval '30 days'
-- where l.status::text = 'published' and l.deleted_at is null
--   and not exists (select 1 from offers o where o.listing_id = l.id and o.created_at > now() - interval '30 days')
--   and not exists (select 1 from conversations c where c.listing_id = l.id and c.created_at > now() - interval '30 days')
-- group by l.id order by sessions_30d desc limit 25;
