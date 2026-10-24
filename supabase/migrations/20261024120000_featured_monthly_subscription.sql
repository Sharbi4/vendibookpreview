-- Separate listing subscriptions from account memberships. Historical boosts stay unchanged.
alter table public.square_billing_attempts add column if not exists cancel_requested_at timestamptz;
alter table public.square_billing_attempts add column if not exists cancel_confirmed_at timestamptz;
alter table public.square_billing_attempts add column if not exists cancel_reason text;
drop index if exists public.square_one_open_subscription;
create unique index square_one_open_subscription on public.square_billing_attempts(user_id,environment)
 where kind='subscription' and tier is distinct from 'featured_listing_monthly' and status in ('pending','processing','awaiting_payment','active');
create unique index square_one_featured_listing on public.square_billing_attempts(listing_id,environment)
 where tier='featured_listing_monthly' and status in ('pending','processing','awaiting_payment','active');

insert into public.monetization_products(slug,name,category,description,billing_type,price_cents,currency,is_active,display_order,metadata)
values ('vendibook_pro_annual','Vendibook Pro Annual','host_subscription','Annual membership. Two months free. No commission discount.','recurring',79000,'USD',true,11,'{"grants_tier":"pro"}'::jsonb),
 ('featured_listing_monthly','Featured listing','listing_upgrade','Monthly visibility for one listing. Cancel anytime. Automatically cancels when sold.','recurring',4900,'USD',true,12,'{"scope":"listing","cancel_when_sold":true}'::jsonb)
on conflict(slug) do update set price_cents=excluded.price_cents,billing_type=excluded.billing_type,description=excluded.description,metadata=excluded.metadata;
insert into public.monetization_product_plans(product_id,billing_interval,price_cents,currency,provider,environment,is_active)
select id,case when slug='vendibook_pro_annual' then 'annual' else 'monthly' end,price_cents,'USD','square','live',true
from public.monetization_products where slug in ('vendibook_pro_annual','featured_listing_monthly')
on conflict(product_id,billing_interval,provider,environment) do update set price_cents=excluded.price_cents;

create or replace function public.featured_listing_sold(p_listing uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from sale_transactions where listing_id=p_listing and status::text in ('paid','buyer_confirmed','seller_confirmed','confirmed','completed','paid_out','payout_failed'))
 or exists(select 1 from sale_invoices where listing_id=p_listing and status::text in ('paid','completed'));
$$;
revoke all on function public.featured_listing_sold(uuid) from public,anon,authenticated;
grant execute on function public.featured_listing_sold(uuid) to service_role;

-- Provider-confirmed paid period only; retries never add time and legacy boosts are preserved.
create or replace function public.apply_featured_subscription_period(p_attempt uuid,p_paid_through timestamptz) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.square_billing_attempts;
begin
 select * into a from square_billing_attempts where id=p_attempt for update;
 if not found or a.tier <> 'featured_listing_monthly' or a.subscription_id is null or a.listing_id is null then raise exception 'Invalid Featured subscription'; end if;
 if p_paid_through <= now() or public.featured_listing_sold(a.listing_id) then return; end if;
 update listings set featured_enabled=true,featured_at=coalesce(featured_at,now()),
 featured_expires_at=greatest(featured_expires_at,p_paid_through),featured_source='paid'
 where id=a.listing_id and host_id=a.user_id;
end $$;
revoke all on function public.apply_featured_subscription_period(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_featured_subscription_period(uuid,timestamptz) to service_role;

-- Durable cancellation request: the sale commits even if the provider is temporarily unavailable.
create or replace function public.queue_sold_featured_cancellation() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.featured_listing_sold(new.listing_id) then
  update square_billing_attempts set cancel_requested_at=coalesce(cancel_requested_at,now()),cancel_reason='sold',updated_at=now()
   where listing_id=new.listing_id and tier='featured_listing_monthly' and cancel_confirmed_at is null;
 end if;
 return new;
end $$;
revoke all on function public.queue_sold_featured_cancellation() from public,anon,authenticated;
create trigger queue_sold_featured_transaction after insert or update of status on public.sale_transactions for each row execute function public.queue_sold_featured_cancellation();
create trigger queue_sold_featured_invoice after insert or update of status on public.sale_invoices for each row execute function public.queue_sold_featured_cancellation();

-- Deployment must provision this Vault secret with the matching edge SQUARE_RECONCILE_TOKEN.
create or replace function public.dispatch_square_reconcile() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='square_reconcile_token' limit 1;
 if token is null then raise warning 'square_reconcile_token is not configured'; return; end if;
 perform net.http_post(url:='https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/square-reconcile',headers:=jsonb_build_object('Content-Type','application/json','x-operator-token',token),body:='{}'::jsonb);
end $$;
revoke all on function public.dispatch_square_reconcile() from public,anon,authenticated;
grant execute on function public.dispatch_square_reconcile() to service_role;
select cron.schedule('square-featured-reconcile','* * * * *','select public.dispatch_square_reconcile()');
