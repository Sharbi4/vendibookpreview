create table public.listing_sold_declarations (
 listing_id uuid primary key references public.listings(id),
 seller_id uuid not null references auth.users(id),
 declared_at timestamptz not null default now()
);
alter table public.listing_sold_declarations enable row level security;
revoke all on public.listing_sold_declarations from anon,authenticated;
grant select on public.listing_sold_declarations to authenticated;
create policy own_sold_declarations on public.listing_sold_declarations for select to authenticated
 using (seller_id=auth.uid() or public.is_admin(auth.uid()));

create or replace function public.featured_listing_sold(p_listing uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.listing_sold_declarations where listing_id=p_listing)
 or exists(select 1 from public.sale_transactions where listing_id=p_listing and status::text in ('paid','buyer_confirmed','seller_confirmed','confirmed','completed','paid_out','payout_failed'))
 or exists(select 1 from public.sale_invoices where listing_id=p_listing and status::text in ('paid','completed'));
$$;
revoke all on function public.featured_listing_sold(uuid) from public,anon,authenticated;
grant execute on function public.featured_listing_sold(uuid) to service_role;

create or replace function public.mark_listing_sold(p_listing uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.listings;
begin
 if auth.uid() is null or not public.message_account_active() then raise exception 'Sign in to manage your listing'; end if;
 select * into l from public.listings where id=p_listing for update;
 if not found or l.host_id<>auth.uid() or l.mode::text<>'sale' then raise exception 'Only the seller can mark this sale listing sold'; end if;
 insert into public.listing_sold_declarations(listing_id,seller_id) values(l.id,auth.uid()) on conflict do nothing;
 update public.listings set status='archived',featured_enabled=false,updated_at=now() where id=l.id;
 update public.square_billing_attempts set cancel_requested_at=coalesce(cancel_requested_at,now()),cancel_reason='sold',updated_at=now()
 where listing_id=l.id and tier='featured_listing_monthly' and cancel_confirmed_at is null;
end $$;
revoke all on function public.mark_listing_sold(uuid) from public,anon;
grant execute on function public.mark_listing_sold(uuid) to authenticated;