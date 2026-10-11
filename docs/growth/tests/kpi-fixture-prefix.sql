-- Read-only fixture CTEs. Replace the first WITH in marketplace-kpis.sql with
-- this prefix to test the operational query without accessing customer rows.
with
user_roles(user_id, role) as (values ('admin', 'admin')),
profiles(id, email, created_at) as (values
  ('admin', 'admin@vendibook.com', timestamp '2026-01-01'),
  ('buyer', 'buyer@business.net', timestamp '2026-01-01'),
  ('seller', 'seller@business.net', timestamp '2026-01-01')),
booking_requests(created_at, shopper_id, host_id, total_price, status, payment_status) as (values
  (timestamp '2026-01-10', 'buyer', 'seller', 1000, 'approved', 'unpaid'),
  (timestamp '2026-01-10', 'buyer', 'admin', 9000, 'completed', 'paid'),
  (timestamp '2026-01-10', 'buyer', 'buyer', 9000, 'completed', 'paid')),
sale_transactions(created_at, buyer_id, seller_id, amount, status) as (values
  (timestamp '2026-01-11', 'buyer', 'seller', 20000, 'pending')),
monetization_purchases(created_at, amount_cents, status, user_id) as (values
  (timestamp '2026-01-12', 5000, 'fulfilled', 'seller')),
listings(id, host_id, mode, price_sale, published_at) as (values
  ('listing', 'seller', 'sale', 20000, timestamp '2026-01-01')),
conversations(created_at, shopper_id, host_id) as (values (timestamp '2026-01-13', 'buyer', 'seller')),
offers(created_at, buyer_id, seller_id) as (values (timestamp '2026-01-13', 'buyer', 'seller')),
listing_leads(created_at, host_id, email) as (values (timestamp '2026-01-13', 'seller', 'guest@business.net')),
listing_views(user_agent, session_id, viewer_id, viewed_at, listing_id) as (values
  ('Browser', 'session1', 'buyer', timestamp '2026-01-13', 'listing'),
  ('Browser', 'session2', 'buyer', timestamp '2026-01-13', 'listing')),
