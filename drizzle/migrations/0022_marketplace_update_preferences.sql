create table public.marketplace_update_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null, name text not null default '', role text not null check(role in ('renter','buyer','host','seller')),
  zip text not null check(zip ~ '^[0-9]{5}$'), topics text[] not null check(topics <@ array['listings','regulations','news']::text[] and cardinality(topics)>0),
  phone_e164 text, sms_consent boolean not null default false,
  consent_version text not null, sms_disclosure text, source text not null,
  user_id uuid references auth.users(id) on delete set null,
  token_hash text not null unique, ip_hash text not null, user_agent text,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
  confirmed_at timestamptz, code_hash text, code_expires_at timestamptz, code_sent_at timestamptz,
  code_delivered boolean not null default false, code_attempts int not null default 0,
  constraint update_phone_consent check((phone_e164 is null and not sms_consent) or (phone_e164 ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$' and sms_consent))
);
create table public.marketplace_update_preferences (
  email text primary key, request_id uuid not null references public.marketplace_update_requests(id),
  name text not null, role text not null check(role in ('renter','buyer','host','seller')),
  zip text not null, topics text[] not null, user_id uuid references auth.users(id) on delete set null,
  email_status text not null default 'confirmed' check(email_status in ('confirmed','unsubscribed')),
  phone_e164 text, sms_status text not null default 'not_requested' check(sms_status in ('not_requested','pending_verification','verified','opted_out')),
  sms_verified_at timestamptz, confirmed_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.marketplace_update_rate_limits (bucket text primary key, hits int not null, resets_at timestamptz not null);
alter table public.marketplace_update_requests enable row level security;
alter table public.marketplace_update_preferences enable row level security;
alter table public.marketplace_update_rate_limits enable row level security;
revoke all on public.marketplace_update_requests,public.marketplace_update_preferences,public.marketplace_update_rate_limits from anon,authenticated;
grant all on public.marketplace_update_requests,public.marketplace_update_preferences,public.marketplace_update_rate_limits to service_role;
create index on public.marketplace_update_preferences(role,zip) where email_status='confirmed';
create index on public.marketplace_update_preferences(phone_e164) where phone_e164 is not null;
create index on public.marketplace_update_requests(email,created_at);

create function public.reserve_update_action(p_bucket text,p_limit int,p_seconds int) returns boolean
language plpgsql security definer set search_path=public as $$
declare current_hits int;
begin
  insert into marketplace_update_rate_limits(bucket,hits,resets_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
  on conflict(bucket) do update set hits=case when marketplace_update_rate_limits.resets_at<=now() then 1 else marketplace_update_rate_limits.hits+1 end,
    resets_at=case when marketplace_update_rate_limits.resets_at<=now() then now()+make_interval(secs=>p_seconds) else marketplace_update_rate_limits.resets_at end
  returning hits into current_hits;
  return current_hits<=p_limit;
end $$;

-- Only a bearer of the emailed token can confirm or change these preferences.
create function public.confirm_marketplace_updates(p_hash text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r marketplace_update_requests; p marketplace_update_preferences;
begin
  select * into r from marketplace_update_requests where token_hash=p_hash for update;
  if not found or r.expires_at<=now() then return jsonb_build_object('error','This link expired. Please subscribe again.'); end if;
  if exists(select 1 from email_unsubscribes where lower(email)=r.email) or
     exists(select 1 from suppressed_emails where lower(email)=r.email) then
    return jsonb_build_object('error','This email is opted out or unavailable. Contact support to update your email preferences.');
  end if;
  if r.confirmed_at is null then
    insert into marketplace_update_preferences(email,request_id,name,role,zip,topics,user_id,phone_e164,sms_status)
      values(r.email,r.id,r.name,r.role,r.zip,r.topics,r.user_id,r.phone_e164,case when r.sms_consent then 'pending_verification' else 'not_requested' end)
    on conflict(email) do update set request_id=excluded.request_id,name=excluded.name,role=excluded.role,zip=excluded.zip,topics=excluded.topics,
      user_id=excluded.user_id,phone_e164=excluded.phone_e164,sms_status=excluded.sms_status,sms_verified_at=null,email_status='confirmed',updated_at=now();
    -- Keep this segmented audience separate from legacy all-subscriber broadcasts.
    update marketplace_update_requests set confirmed_at=now() where id=r.id;
  end if;
  select * into p from marketplace_update_preferences where email=r.email and request_id=r.id;
  if not found then return jsonb_build_object('error','Your preferences have changed. Use your most recent confirmation email.'); end if;
  return jsonb_build_object('ok',true,'role',p.role,'zip',p.zip,'sms_status',p.sms_status,'phone',p.phone_e164);
end $$;

create function public.verify_update_phone(p_hash text,p_code_hash text) returns boolean
language plpgsql security definer set search_path=public as $$
declare r marketplace_update_requests;
begin
  select * into r from marketplace_update_requests where token_hash=p_hash for update;
  if not found or r.confirmed_at is null or r.expires_at<=now() or not r.code_delivered or r.code_expires_at<=now() or r.code_attempts>=5 then return false; end if;
  update marketplace_update_requests set code_attempts=code_attempts+1 where id=r.id;
  if r.code_hash is distinct from p_code_hash then return false; end if;
  if exists(select 1 from sms_suppressions where phone_e164=r.phone_e164 and released_at is null) then return false; end if;
  update marketplace_update_preferences set sms_status='verified',sms_verified_at=now(),updated_at=now()
    where email=r.email and request_id=r.id and sms_status='pending_verification';
  if not found then return false; end if;
  update marketplace_update_requests set code_hash=null,code_delivered=false where id=r.id;
  return true;
end $$;

-- Existing STOP and email-unsubscribe flows also suppress this separate program.
create function public.suppress_marketplace_updates() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if TG_TABLE_NAME='sms_suppressions' then
    if new.released_at is null then
      update marketplace_update_preferences set sms_status='opted_out',updated_at=now() where phone_e164=new.phone_e164;
    end if;
  elsif TG_TABLE_NAME='newsletter_subscribers' then
    if new.unsubscribed_at is not null then
      update marketplace_update_preferences set email_status='unsubscribed',updated_at=now() where email=lower(new.email);
    end if;
  else
    update marketplace_update_preferences set email_status='unsubscribed',updated_at=now() where email=lower(new.email);
  end if;
  return new;
end $$;
create trigger updates_sms_stop after insert or update on public.sms_suppressions for each row execute function public.suppress_marketplace_updates();
create trigger updates_email_stop after insert or update on public.email_unsubscribes for each row execute function public.suppress_marketplace_updates();
create trigger updates_newsletter_stop after insert or update on public.newsletter_subscribers for each row execute function public.suppress_marketplace_updates();
revoke all on function public.reserve_update_action(text,int,int),public.confirm_marketplace_updates(text),public.verify_update_phone(text,text),public.suppress_marketplace_updates() from public,anon,authenticated;
grant execute on function public.reserve_update_action(text,int,int),public.confirm_marketplace_updates(text),public.verify_update_phone(text,text) to service_role;

-- Campaign preparation must specify the audience role and selected topic.
-- ZIPs are explicit campaign geography, never inferred from personal data.
create function public.marketplace_updates_audience(p_role text,p_topic text,p_zips text[] default null)
returns table(email text,name text,role text,zip text,topics text[],phone_e164 text,sms_status text)
language sql stable security definer set search_path=public as $$
  select p.email,p.name,p.role,p.zip,p.topics,p.phone_e164,
    case when exists(select 1 from sms_suppressions s where s.phone_e164=p.phone_e164 and s.released_at is null) then 'opted_out' else p.sms_status end
  from marketplace_update_preferences p
  where p.email_status='confirmed' and p.role=p_role and p_topic=any(p.topics)
    and (p_zips is null or p.zip=any(p_zips))
    and not exists(select 1 from email_unsubscribes u where lower(u.email)=p.email)
    and not exists(select 1 from suppressed_emails e where lower(e.email)=p.email)
  order by p.confirmed_at;
$$;
revoke all on function public.marketplace_updates_audience(text,text,text[]) from public,anon,authenticated;
grant execute on function public.marketplace_updates_audience(text,text,text[]) to service_role;