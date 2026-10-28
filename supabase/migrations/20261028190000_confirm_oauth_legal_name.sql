-- Google (and other OAuth) sign-ups get their name from the provider, which
-- may be a nickname or incomplete. Ask them once to confirm their legal name
-- (LegalNamePrompt shows when name_parts_confirmed is false; saving sets it
-- true and fills legal_first_name / legal_last_name). Owner, 2026-10-28.
create or replace function public.flag_oauth_name_unconfirmed()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (
    select 1 from auth.users u
    where u.id = new.id and coalesce(u.raw_app_meta_data->>'provider', 'email') <> 'email'
  ) then
    new.name_parts_confirmed := false;
  end if;
  return new;
end $$;

drop trigger if exists flag_oauth_name_unconfirmed on public.profiles;
create trigger flag_oauth_name_unconfirmed
  before insert on public.profiles
  for each row execute function public.flag_oauth_name_unconfirmed();

-- Existing OAuth members who haven't verified their ID confirm once too.
-- Admins are never prompted.
update public.profiles p set name_parts_confirmed = false
from auth.users u
where u.id = p.id
  and coalesce(u.raw_app_meta_data->>'provider', 'email') <> 'email'
  and coalesce(p.identity_verified, false) = false
  and p.name_parts_confirmed is distinct from false
  and not exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'admin');
