create or replace function public.signup_phone_required(actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users u cross join public.signup_phone_policy p
    where u.id=actor and p.enforced_from is not null
      and not exists(select 1 from public.user_roles r where r.user_id=actor and r.role='admin')
      and not exists(select 1 from public.signup_phone_verifications v where v.user_id=actor))
$$;