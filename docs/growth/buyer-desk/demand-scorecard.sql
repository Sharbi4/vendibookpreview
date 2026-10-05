-- Buyer Desk demand scorecard (read-only). Companion to docs/growth/liquidity-scorecard.sql.
-- One row per window (7d, 30d). Same view exclusions as the liquidity scorecard
-- (bot agents, auto-detected scrapers, sellers viewing their own listings), plus:
--   * verified contacts (conversations, offers, booking requests) are split from
--     unverified guest inquiries (listing_leads source='guest_inquiry');
--   * zero-result searches are counted once per session+search and ignore
--     half-typed locations (under 3 characters, or no letters/digits beyond
--     "new"/"new o" style fragments), so the rate reflects real dead ends;
--   * demand intent signals: concierge requests, availability alerts, freight/
--     financing interest are reported separately.
with
scraper_uas as (
  select user_agent from listing_views
  where viewed_at > now() - interval '30 days'
  group by user_agent
  having count(distinct session_id) >= 200
     and count(*) filter (where viewer_id is not null) = 0
     and count(*)::numeric / count(distinct session_id) < 1.05
),
human_views as (
  select v.*, l.mode::text as listing_mode,
         case
           when v.referrer ~* '(facebook|fb\.|instagram|threads)' then 'social'
           when v.referrer ~* '(google|bing|duckduckgo|yahoo)' then 'search'
           when v.referrer ~* '(chatgpt|openai|perplexity|claude|gemini)' then 'ai_assistant'
           when v.referrer ~* 'vendibook\.com' then 'internal'
           when coalesce(v.referrer, '') = '' then 'direct'
           else 'other'
         end as channel,
         (v.user_agent ~* '(iphone|android|mobile)') as is_mobile
  from listing_views v
  join listings l on l.id = v.listing_id
  where coalesce(v.user_agent, '') <> ''
    and v.user_agent !~* '(bot|crawl|spider|headless|facebookexternalhit|meta-external|python|curl|lighthouse)'
    and not exists (select 1 from scraper_uas s where s.user_agent = v.user_agent)
    and v.viewer_id is distinct from l.host_id
),
verified_contacts as (
  select listing_id, created_at, 'conversation' as kind from conversations
  union all select listing_id, created_at, 'offer' from offers
  union all select listing_id, created_at, 'booking_request' from booking_requests
),
zero_results as (
  select distinct on (coalesce(session_id, id::text), lower(coalesce(metadata->>'locationText', '')), metadata->>'category', metadata->>'mode', metadata->>'query')
         created_at
  from analytics_events
  where event_name = 'search_zero_results'
    and (coalesce(metadata->>'locationText', '') = ''
         or (length(trim(metadata->>'locationText')) >= 3
             and lower(trim(metadata->>'locationText')) !~ '^(new|new [a-z]?|san|los|st|fort|ft)$'))
),
searches as (
  select distinct on (coalesce(session_id, id::text), lower(coalesce(metadata->>'locationText', '')), metadata->>'category', metadata->>'mode', metadata->>'query')
         created_at
  from analytics_events
  where event_name = 'search_performed' and coalesce(metadata->>'source', 'search_page') = 'search_page'
),
w(label, since) as (values ('7d', now() - interval '7 days'), ('30d', now() - interval '30 days'))
select
  w.label as period,
  -- Attention
  (select count(distinct session_id) from human_views where viewed_at >= w.since) as view_sessions,
  round(100.0 * (select count(distinct session_id) filter (where is_mobile) from human_views where viewed_at >= w.since)
        / nullif((select count(distinct session_id) from human_views where viewed_at >= w.since), 0), 0) as mobile_pct,
  (select count(distinct session_id) from human_views where viewed_at >= w.since and channel = 'search') as sessions_search,
  (select count(distinct session_id) from human_views where viewed_at >= w.since and channel = 'social') as sessions_social,
  (select count(distinct session_id) from human_views where viewed_at >= w.since and channel = 'ai_assistant') as sessions_ai,
  (select count(distinct session_id) from human_views where viewed_at >= w.since and channel = 'direct') as sessions_direct,
  (select count(distinct session_id) from human_views where viewed_at >= w.since and channel = 'internal') as sessions_internal,
  -- Contacts
  (select count(*) from verified_contacts where created_at >= w.since) as verified_contacts,
  (select count(*) from listing_leads where created_at >= w.since and source = 'guest_inquiry') as guest_inquiries,
  (select count(*) from listing_leads where created_at >= w.since and coalesce(source, '') <> 'guest_inquiry') as other_listing_leads,
  round(100.0 * (select count(*) from verified_contacts where created_at >= w.since)
        / nullif((select count(distinct session_id) from human_views where viewed_at >= w.since), 0), 2) as verified_bcr_pct,
  round(100.0 * ((select count(*) from verified_contacts where created_at >= w.since)
                 + (select count(*) from listing_leads where created_at >= w.since))
        / nullif((select count(distinct session_id) from human_views where viewed_at >= w.since), 0), 2) as all_contact_rate_pct,
  -- Search
  (select count(*) from searches where created_at >= w.since) as unique_searches,
  (select count(*) from zero_results where created_at >= w.since) as real_zero_result_searches,
  round(100.0 * (select count(*) from zero_results where created_at >= w.since)
        / nullif((select count(*) from searches where created_at >= w.since), 0), 1) as real_zero_result_rate_pct,
  -- Intent captured
  (select count(*) from asset_requests where created_at >= w.since and coalesce(intent, '') in ('rent', 'buy', '')) as buyer_requests,
  (select count(*) from asset_requests where created_at >= w.since and intent in ('sell', 'list')) as seller_requests,
  (select count(*) from availability_alerts where created_at >= w.since) as alert_signups,
  -- Offers
  (select count(*) from offers where created_at >= w.since) as offers,
  round(100.0 * (select count(*) from offers where created_at >= w.since and responded_at is not null)
        / nullif((select count(*) from offers where created_at >= w.since), 0), 0) as offer_response_rate_pct
from w
order by w.since desc;
