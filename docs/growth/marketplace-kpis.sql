-- Vendibook monthly marketplace KPIs (read-only), modeled on the Version One
-- Ventures marketplace KPI template (versionone.vc/marketplace-kpi).
-- One row per month from Jan 2026. Run in the Lovable/Supabase SQL editor.
--
-- Definitions (honest-by-default):
--   * Internal accounts are excluded everywhere: admins and @vendibook.com /
--     @example.com emails. Self-dealing (buyer = seller) is excluded.
--   * Recorded GMV = rental bookings with status approved/completed or
--     payment_status paid, plus sales with status completed/paid/delivered.
--     Pending sales are reported separately ("sales pending close").
--     NOTE: Jan–Feb 2026 rentals predate the PayPal/Square stack and are mostly
--     marked unpaid; PayPal is in sandbox, so PayPal-recorded money may not be real.
--   * Revenue (est.) = recorded GMV x 12.9% nominal seller/host fee, plus
--     fulfilled seller services (boosts, Pro) from monetization_purchases.
--   * Paid CAC = $0 (no paid acquisition since launch).
--   * Sellers = hosts whose first listing was published by month end.
--   * Buyers = users with a recorded transaction. "Contacting buyers" = users
--     who opened a conversation, made an offer, or requested a booking.
--   * Real view sessions exclude bots, scraper user agents (200+ sessions,
--     ~1 view/session, never logged in) and sellers viewing their own listings.

with
months as (
  select generate_series(date '2026-01-01', date_trunc('month', now())::date, interval '1 month')::date as m
),
internal_users as (
  select r.user_id as id from user_roles r where r.role::text = 'admin'
  union
  select p.id from profiles p where coalesce(p.email, '') ~* '@(example\.com|vendibook\.com)$'
),
txns as (
  select date_trunc('month', b.created_at)::date as m, b.shopper_id as buyer_id, b.host_id as seller_id,
         b.total_price::numeric as amount, 'rental' as kind
  from booking_requests b
  where (b.status::text in ('approved', 'completed') or b.payment_status = 'paid')
    and b.shopper_id is distinct from b.host_id
    and b.shopper_id not in (select id from internal_users)
  union all
  select date_trunc('month', s.created_at)::date, s.buyer_id, s.seller_id, s.amount::numeric, 'sale'
  from sale_transactions s
  where s.status in ('completed', 'paid', 'delivered')
    and s.buyer_id is distinct from s.seller_id
    and s.buyer_id not in (select id from internal_users)
),
pending_sales as (
  select date_trunc('month', s.created_at)::date as m, sum(s.amount) as amount, count(*) as n
  from sale_transactions s
  where s.status not in ('completed', 'paid', 'delivered', 'cancelled', 'refunded')
    and s.buyer_id not in (select id from internal_users)
  group by 1
),
services as (
  select date_trunc('month', mp.created_at)::date as m, sum(mp.amount_cents) / 100.0 as amount
  from monetization_purchases mp
  where mp.status = 'fulfilled' and mp.user_id not in (select id from internal_users)
  group by 1
),
pub as (
  select l.id, l.host_id, l.mode::text as mode, l.price_sale, date_trunc('month', l.published_at)::date as m
  from listings l
  where l.published_at is not null and l.host_id not in (select id from internal_users)
),
seller_first as (
  select host_id, min(m) as m from pub group by host_id
),
buyer_first as (
  select buyer_id, min(m) as m from txns group by buyer_id
),
contacts as (
  select date_trunc('month', created_at)::date as m, shopper_id as buyer_id from conversations
  union all select date_trunc('month', created_at)::date, buyer_id from offers
  union all select date_trunc('month', created_at)::date, shopper_id from booking_requests
),
scraper_uas as (
  select user_agent from listing_views
  group by user_agent
  having count(distinct session_id) >= 200
     and count(*) filter (where viewer_id is not null) = 0
     and count(*)::numeric / count(distinct session_id) < 1.05
),
real_views as (
  select date_trunc('month', v.viewed_at)::date as m, v.session_id
  from listing_views v join listings l on l.id = v.listing_id
  where coalesce(v.user_agent, '') !~* '(bot|crawl|spider|headless|facebookexternalhit|meta-external|python|curl|lighthouse)'
    and not exists (select 1 from scraper_uas s where s.user_agent = v.user_agent)
    and v.viewer_id is distinct from l.host_id
),
base as (
  select
    mo.m,
    -- OVERALL
    coalesce((select sum(amount) from txns t where t.m = mo.m), 0) as gmv_recorded,
    (select count(*) from txns t where t.m = mo.m) as transactions,
    coalesce((select amount from pending_sales p where p.m = mo.m), 0) as sales_pending_value,
    coalesce((select n from pending_sales p where p.m = mo.m), 0) as sales_pending_count,
    coalesce((select amount from services s where s.m = mo.m), 0) as revenue_seller_services,
    -- SUPPLY
    (select count(*) from seller_first sf where sf.m <= mo.m) as total_sellers,
    (select count(*) from seller_first sf where sf.m = mo.m) as new_sellers,
    (select count(*) from pub p where p.m <= mo.m) as total_listings_published,
    (select count(*) from pub p where p.m = mo.m) as new_listings,
    (select round(avg(price_sale)) from pub p where p.m = mo.m and p.mode = 'sale') as avg_new_sale_price,
    -- BUYERS / DEMAND
    (select count(*) from buyer_first bf where bf.m <= mo.m) as total_buyers,
    (select count(*) from buyer_first bf where bf.m = mo.m) as new_buyers,
    (select count(distinct buyer_id) from contacts c where c.m = mo.m and c.buyer_id not in (select id from internal_users)) as contacting_buyers,
    (select count(*) from contacts c where c.m = mo.m and c.buyer_id not in (select id from internal_users)) as buyer_contacts,
    (select count(*) from listing_leads ll where date_trunc('month', ll.created_at)::date = mo.m) as guest_and_info_leads,
    (select count(distinct session_id) from real_views rv where rv.m = mo.m) as real_view_sessions,
    (select count(*) from profiles p where date_trunc('month', p.created_at)::date = mo.m and p.id not in (select id from internal_users)) as new_signups
  from months mo
)
select
  to_char(m, 'Mon YYYY') as month,
  gmv_recorded,
  round(100.0 * (gmv_recorded - lag(gmv_recorded) over w) / nullif(lag(gmv_recorded) over w, 0), 1) as gmv_growth_mom_pct,
  transactions,
  round(gmv_recorded / nullif(transactions, 0)) as aov,
  12.9 as take_rate_nominal_pct,
  round(gmv_recorded * 0.129, 2) as revenue_txn_fees_est,
  revenue_seller_services,
  round(gmv_recorded * 0.129 + revenue_seller_services, 2) as revenue_total_est,
  sales_pending_count,
  sales_pending_value,
  0 as paid_cac,
  round(total_buyers::numeric / nullif(total_sellers, 0), 3) as buyer_to_seller_ratio,
  total_sellers,
  new_sellers,
  round(100.0 * (total_sellers - lag(total_sellers) over w) / nullif(lag(total_sellers) over w, 0), 1) as seller_growth_mom_pct,
  total_listings_published,
  new_listings,
  round(100.0 * (total_listings_published - lag(total_listings_published) over w) / nullif(lag(total_listings_published) over w, 0), 1) as listing_growth_mom_pct,
  avg_new_sale_price,
  total_buyers,
  new_buyers,
  contacting_buyers,
  buyer_contacts,
  guest_and_info_leads,
  real_view_sessions,
  round(100.0 * buyer_contacts / nullif(real_view_sessions, 0), 2) as buyer_contact_rate_pct,
  new_signups
from base
window w as (order by m)
order by m;
