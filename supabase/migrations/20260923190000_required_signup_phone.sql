begin;
create table if not exists public.signup_phone_policy (
  id boolean primary key default true check(id),
  enforced_from timestamptz
);
insert into public.signup_phone_policy(id,enforced_from) values(true,null) on conflict do nothing;
create table if not exists public.signup_phone_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null,
  verified_at timestamptz not null default now()
);
create table if not exists public.signup_phone_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  attempts integer not null default 0,
  delivery_state text not null default 'reserved' check(delivery_state in ('reserved','sent','failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '10 minutes',
  used_at timestamptz
);
alter table public.signup_phone_policy enable row level security;
alter table public.signup_phone_verifications enable row level security;
alter table public.signup_phone_challenges enable row level security;
revoke all on public.signup_phone_policy,public.signup_phone_verifications,public.signup_phone_challenges from anon,authenticated;
grant select on public.signup_phone_verifications to authenticated;
grant all on public.signup_phone_policy,public.signup_phone_verifications,public.signup_phone_challenges to service_role;
drop policy if exists own_verified_phone on public.signup_phone_verifications;
create policy own_verified_phone on public.signup_phone_verifications for select to authenticated using(user_id=auth.uid());
create index if not exists signup_phone_user_rate on public.signup_phone_challenges(user_id,created_at desc);
create index if not exists signup_phone_number_rate on public.signup_phone_challenges(phone_e164,created_at desc);

create or replace function public.signup_phone_required(actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users u cross join public.signup_phone_policy p
    where u.id=actor and p.enforced_from is not null and u.created_at>=p.enforced_from
      and not exists(select 1 from public.signup_phone_verifications v where v.user_id=actor))
$$;
create or replace function public.signup_phone_status() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare challenge record;
begin
  if auth.uid() is null then raise exception 'Sign in to verify your phone.'; end if;
  select phone_e164,created_at,delivery_state,expires_at,used_at into challenge
    from public.signup_phone_challenges where user_id=auth.uid() order by created_at desc,id desc limit 1;
  return jsonb_build_object('required',public.signup_phone_required(),
    'phone',challenge.phone_e164,
    'pending',coalesce(challenge.delivery_state='sent' and challenge.used_at is null and challenge.expires_at>now(),false),
    'retry_after',greatest(0,coalesce(ceil(extract(epoch from(challenge.created_at+interval '60 seconds'-now())))::int,0)));
end $$;

-- Service-only reservation serializes rate limits by account AND destination.
create or replace function public.reserve_signup_phone_code(actor uuid, phone text, hashed_code text) returns uuid
language plpgsql security definer set search_path=public as $$
declare challenge_id uuid;
begin
  if phone !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$' or hashed_code !~ '^[a-f0-9]{64}$' then raise exception 'Enter a valid US or Canadian mobile number.'; end if;
  if not exists(select 1 from auth.users where id=actor and (banned_until is null or banned_until<=now())) then raise exception 'Account unavailable.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,931));
  perform pg_advisory_xact_lock(hashtextextended(phone,932));
  if exists(select 1 from public.sms_suppressions where phone_e164=phone and released_at is null) then
    raise exception 'Texts are blocked for this number. Use another mobile number or contact support.';
  end if;
  if exists(select 1 from public.signup_phone_challenges where (user_id=actor or phone_e164=phone) and created_at>now()-interval '60 seconds') then
    raise exception 'Please wait 60 seconds before requesting another code.';
  end if;
  if (select count(*) from public.signup_phone_challenges where (user_id=actor or phone_e164=phone) and created_at>now()-interval '1 hour')>=5
    or (select count(*) from public.signup_phone_challenges where (user_id=actor or phone_e164=phone) and created_at>now()-interval '1 day')>=10 then
    raise exception 'Too many code requests. Please try again later.';
  end if;
  update public.signup_phone_challenges set used_at=now() where user_id=actor and used_at is null;
  insert into public.signup_phone_challenges(user_id,phone_e164,code_hash) values(actor,phone,hashed_code) returning id into challenge_id;
  return challenge_id;
end $$;

create or replace function public.verify_signup_phone_code(code text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare challenge public.signup_phone_challenges%rowtype; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Sign in to verify your phone.'; end if;
  if code is null or code !~ '^[0-9]{6}$' then return jsonb_build_object('ok',false,'error','Enter the six-digit code from your text.'); end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,931));
  select * into challenge from public.signup_phone_challenges where user_id=actor order by created_at desc,id desc limit 1 for update;
  if not found or challenge.used_at is not null or challenge.delivery_state<>'sent' then
    return jsonb_build_object('ok',false,'error','Request a new code to continue.');
  end if;
  if challenge.expires_at<=now() then return jsonb_build_object('ok',false,'error','This code has expired. Request a new one.'); end if;
  if challenge.attempts>=5 then return jsonb_build_object('ok',false,'error','Too many incorrect attempts. Request a new code.'); end if;
  -- Increment while holding the lock. Failed attempts commit instead of being rolled back by an exception.
  update public.signup_phone_challenges set attempts=attempts+1 where id=challenge.id;
  if encode(extensions.digest(actor::text||':'||challenge.phone_e164||':'||code,'sha256'),'hex')<>challenge.code_hash then
    return jsonb_build_object('ok',false,'error','That code does not match. Please try again.');
  end if;
  update public.signup_phone_challenges set used_at=now() where id=challenge.id;
  insert into public.signup_phone_verifications(user_id,phone_e164) values(actor,challenge.phone_e164)
    on conflict(user_id) do update set phone_e164=excluded.phone_e164,verified_at=now();
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.reserve_signup_phone_code(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_signup_phone_code(uuid,text,text) to service_role;
revoke all on function public.signup_phone_status(),public.verify_signup_phone_code(text),public.signup_phone_required(uuid) from public,anon;
grant execute on function public.signup_phone_status(),public.verify_signup_phone_code(text),public.signup_phone_required(uuid) to authenticated,service_role;

-- Enforce the signup requirement independently of routes, local storage, or user metadata.
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
  return new;
end $$;
do $triggers$
declare t text;
begin
  foreach t in array array['listings','booking_requests','sale_transactions','offers','conversations','conversation_messages','booking_messages'] loop
    execute format('drop trigger if exists require_signup_phone on public.%I',t);
    execute format('create trigger require_signup_phone before insert or update on public.%I for each row execute function public.guard_signup_phone_actions()',t);
  end loop;
end $triggers$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  generated_username TEXT;
  username_exists BOOLEAN;
  suffix INTEGER;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_role_text TEXT;
  v_role public.app_role;
BEGIN
  v_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');

  IF v_first_name != '' OR v_last_name != '' THEN
    v_full_name := TRIM(CONCAT(v_first_name, ' ', v_last_name));
  ELSE
    v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  END IF;

  base_username := COALESCE(
    regexp_replace(lower(v_full_name), '[^a-z0-9_]', '_', 'g'),
    'user'
  );
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);
  IF length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  base_username := left(base_username, 20);

  suffix := floor(random() * 9000 + 1000)::INTEGER;
  generated_username := base_username || '_' || suffix::TEXT;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
  WHILE username_exists LOOP
    suffix := floor(random() * 9000 + 1000)::INTEGER;
    generated_username := base_username || '_' || suffix::TEXT;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone_number, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    NULLIF(v_first_name, ''),
    NULLIF(v_last_name, ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone_number', ''),
    generated_username,
    v_full_name
  )
  ON CONFLICT (id) DO NOTHING;

  -- Resolve requested role from user metadata; default to 'host'
  v_role_text := lower(COALESCE(NEW.raw_user_meta_data ->> 'role', 'host'));
  IF v_role_text NOT IN ('host', 'shopper') THEN
    v_role_text := 'host';
  END IF;
  BEGIN
    v_role := v_role_text::public.app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'host'::public.app_role;
  END;

  -- Always ensure a 'host' role exists (host is the default; shopper is additive)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'host'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If the user explicitly picked a non-host role at signup, add that too
  IF v_role IS DISTINCT FROM 'host'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Rollout remains disabled until the SMS endpoint and UI have been deployed and verified.
commit;