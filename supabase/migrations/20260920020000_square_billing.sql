-- Square records are separate from PayPal marketplace payments and legacy billing.
create table public.square_billing_plans (
  product_id uuid not null references public.monetization_products(id),
  environment text not null check(environment in ('sandbox','production')),
  billing_interval text not null check(billing_interval in ('monthly','quarterly','annual')),
  variation_id text not null,
  price_cents integer not null check(price_cents > 0),
  currency text not null default 'USD',
  primary key(product_id,environment,billing_interval)
);
create table public.square_billing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id), product_id uuid not null references public.monetization_products(id),
  listing_id uuid references public.listings(id), environment text not null,
  kind text not null check(kind in ('subscription','addon')), tier text,
  amount_cents integer not null check(amount_cents > 0), tax_cents integer not null default 0,
  currency text not null, billing_interval text, variation_id text, consent_id uuid,
  customer_id text, card_id text, subscription_id text unique, payment_id text unique,
  purchase_id uuid references public.monetization_purchases(id),
  status text not null default 'pending', paid_through timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index square_one_pending_product on public.square_billing_attempts(user_id,product_id,environment,coalesce(listing_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status in ('pending','processing');
alter table public.square_billing_plans enable row level security;
alter table public.square_billing_attempts enable row level security;
revoke all on public.square_billing_plans,public.square_billing_attempts from anon,authenticated;
grant select on public.square_billing_attempts to authenticated;
create policy square_billing_owner on public.square_billing_attempts for select to authenticated using(user_id=auth.uid());
grant all on public.square_billing_plans,public.square_billing_attempts to service_role;
alter table public.host_subscriptions add column if not exists square_subscription_id text;
create unique index if not exists host_square_subscription_id on public.host_subscriptions(square_subscription_id);
alter table public.monetization_purchases add column if not exists square_payment_id text;
create unique index if not exists purchase_square_payment_id on public.monetization_purchases(square_payment_id) where square_payment_id is not null;

-- Atomic fulfilment: a replay cannot extend an add-on twice.
create or replace function public.fulfill_square_addon(p_attempt uuid,p_payment text,p_amount integer,p_currency text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.square_billing_attempts; p public.monetization_products; purchase uuid; ends timestamptz; begin
 select * into a from public.square_billing_attempts where id=p_attempt for update;
 if not found or a.kind <> 'addon' or a.amount_cents+a.tax_cents <> p_amount or a.currency <> upper(p_currency) then raise exception 'Square payment does not match checkout'; end if;
 if a.status='completed' then
   if a.payment_id is distinct from p_payment then raise exception 'Different payment for completed checkout'; end if;
   return;
 end if;
 select * into p from public.monetization_products where id=a.product_id;
 insert into public.monetization_purchases(user_id,product_id,listing_id,amount_cents,currency,status,fulfillment_status,idempotency_key,payment_provider,square_payment_id,paid_at,access_starts_at,access_ends_at,tax_cents)
 values(a.user_id,a.product_id,a.listing_id,a.amount_cents,a.currency,'paid','active','square:'||a.id,'square',p_payment,now(),now(),case when p.duration_days>0 then now()+make_interval(days=>p.duration_days) else null end,a.tax_cents)
 returning id into purchase;
 if a.listing_id is not null and p.promo_type is not null and p.duration_days>0 then
   perform 1 from public.listings where id=a.listing_id for update;
   select greatest(now(),coalesce(max(ends_at),now()))+make_interval(days=>p.duration_days) into ends from public.listing_promotions where listing_id=a.listing_id and promo_type=p.promo_type and active;
   insert into public.listing_promotions(listing_id,product_id,purchase_id,promo_type,starts_at,ends_at,active) values(a.listing_id,p.id,purchase,p.promo_type,now(),ends,true)
   on conflict (listing_id,promo_type) where active=true do update set ends_at=excluded.ends_at,purchase_id=excluded.purchase_id;
   if p.promo_type in ('featured_7','featured_30','top_of_search') then
     update public.listings set featured_enabled=true,featured_at=now(),featured_expires_at=ends,featured_source='paid' where id=a.listing_id;
   end if;
 end if;
 update public.square_billing_attempts set status='completed',payment_id=p_payment,purchase_id=purchase,updated_at=now() where id=a.id;
end; $$;
revoke all on function public.fulfill_square_addon(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.fulfill_square_addon(uuid,text,integer,text) to service_role;

create unique index square_one_open_subscription on public.square_billing_attempts(user_id,environment) where kind='subscription' and status in ('pending','processing','awaiting_payment','active');
