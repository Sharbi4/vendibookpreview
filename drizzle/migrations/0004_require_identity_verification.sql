alter table public.signup_phone_policy add column if not exists identity_enforced_from timestamptz;

create or replace function public.signup_identity_required(actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users u cross join public.signup_phone_policy p
    where u.id=actor and p.identity_enforced_from is not null
      and not exists(select 1 from public.user_roles r where r.user_id=actor and r.role='admin')
      and not exists(select 1 from public.profiles pr where pr.id=actor and pr.identity_verified is true))
$$;
revoke all on function public.signup_identity_required(uuid) from public, anon;
grant execute on function public.signup_identity_required(uuid) to authenticated, service_role;

create or replace function public.signup_phone_status() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare challenge record;
begin
  if auth.uid() is null then raise exception 'Sign in to verify your phone.'; end if;
  select phone_e164,created_at,delivery_state,expires_at,used_at into challenge
    from public.signup_phone_challenges where user_id=auth.uid() order by created_at desc,id desc limit 1;
  return jsonb_build_object('required',public.signup_phone_required(),
    'identity_required',public.signup_identity_required(),
    'phone',challenge.phone_e164,
    'pending',coalesce(challenge.delivery_state='sent' and challenge.used_at is null and challenge.expires_at>now(),false),
    'retry_after',greatest(0,coalesce(ceil(extract(epoch from(challenge.created_at+interval '60 seconds'-now())))::int,0)));
end $$;

create or replace function public.guard_signup_phone_actions() returns trigger
language plpgsql security definer set search_path=public as $$
declare actor uuid; row_data jsonb:=to_jsonb(new);
begin
  if tg_op='INSERT' then
    actor:=case
      when tg_table_name in ('conversation_messages','booking_messages') then (row_data->>'sender_id')::uuid
      when tg_table_name in ('sale_transactions','offers') then (row_data->>'buyer_id')::uuid
      when tg_table_name='listings' then (row_data->>'host_id')::uuid
      else coalesce(auth.uid(),(row_data->>'shopper_id')::uuid) end;
  else actor:=auth.uid(); end if;
  if public.signup_phone_required(actor) then raise exception 'Verify your mobile number to finish creating your account.'; end if;
  if public.signup_identity_required(actor) then raise exception 'Verify your identity to message, make offers, or buy on Vendibook.'; end if;
  return new;
end $$;