create or replace function public.has_permit_path_plus(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.host_subscriptions hs
      where hs.user_id = _user_id
        and hs.status in ('active','trialing','past_due')
        and (
          lower(coalesce(hs.tier,'')) like 'permit_path_plus%'
          or lower(coalesce(hs.tier,'')) in ('pro','vendibook_pro','host_pro','premium','host_growth','host_operator')
        )
    )
    or exists (
      select 1
      from public.monetization_purchases mp
      join public.monetization_products pr on pr.id = mp.product_id
      where mp.user_id = _user_id
        and mp.status in ('paid','fulfilled')
        and pr.slug in ('permit_path_plus_monthly','permit_path_plus')
    )
    -- Founding members: permit data created before Plus gating began.
    or exists (
      select 1 from public.saved_permit_roadmaps r
      where r.user_id = _user_id and r.created_at < timestamptz '2026-08-19 00:00:00+00'
    )
    or exists (
      select 1 from public.permit_items i
      where i.user_id = _user_id and i.created_at < timestamptz '2026-08-19 00:00:00+00'
    )
$$;

grant execute on function public.has_permit_path_plus(uuid) to authenticated, service_role;

drop policy if exists "Users insert their own saved roadmaps" on public.saved_permit_roadmaps;
create policy "Plus members insert their own saved roadmaps"
on public.saved_permit_roadmaps for insert to authenticated
with check (auth.uid() = user_id and public.has_permit_path_plus(auth.uid()));

drop policy if exists "Users insert their own permit items" on public.permit_items;
create policy "Plus members insert their own permit items"
on public.permit_items for insert to authenticated
with check (auth.uid() = user_id and public.has_permit_path_plus(auth.uid()));

drop policy if exists "Users insert their own permit documents" on public.permit_documents;
create policy "Plus members insert their own permit documents"
on public.permit_documents for insert to authenticated
with check (auth.uid() = user_id and public.has_permit_path_plus(auth.uid()));