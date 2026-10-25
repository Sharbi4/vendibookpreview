-- Guest contact information is private to Vendibook, never seller-readable.
drop policy if exists "Hosts can view their listing leads" on public.listing_leads;
create policy "Admins review private listing leads" on public.listing_leads for select to authenticated
 using(public.is_admin(auth.uid()));

create table public.managed_inquiries (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.listings(id),
 host_id uuid not null references auth.users(id),
 email text not null, guest_name text not null,
 token_hash text not null, token_expires_at timestamptz not null,
 request_key uuid not null unique, ip_hash text not null,
 verified_at timestamptz, closed_at timestamptz, access_sent_at timestamptz not null default now(),
 created_at timestamptz not null default now(), last_activity_at timestamptz not null default now()
);
create table public.managed_inquiry_messages (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null references public.managed_inquiries(id),
 sender_role text not null check(sender_role in ('guest','seller','support')),
 sender_id uuid references auth.users(id),
 body text not null check(length(body) between 1 and 5000),
 held boolean not null default false, hold_reason text,
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 request_key uuid not null unique,
 created_at timestamptz not null default now()
);
create index managed_inquiry_owner on public.managed_inquiries(host_id,last_activity_at desc);
create index managed_inquiry_email on public.managed_inquiries(email,created_at desc);
create index managed_inquiry_ip on public.managed_inquiries(ip_hash,created_at desc);
create index managed_inquiry_thread on public.managed_inquiry_messages(inquiry_id,created_at);
alter table public.managed_inquiries enable row level security;
alter table public.managed_inquiry_messages enable row level security;
revoke all on public.managed_inquiries,public.managed_inquiry_messages from public,anon,authenticated;
grant all on public.managed_inquiries,public.managed_inquiry_messages to service_role;

create or replace function public.create_managed_inquiry(p_listing uuid,p_email text,p_name text,p_body text,p_token_hash text,p_request uuid,p_ip_hash text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_host uuid; problem text;
begin
 p_email:=lower(trim(p_email));
 if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email)>320 or length(trim(p_name)) not between 1 and 120 or length(trim(p_body)) not between 1 and 5000 or length(p_token_hash)<>64 then raise exception 'Invalid inquiry'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_email,517));
 perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,518));
 select id into v_id from public.managed_inquiries where request_key=p_request;
 if v_id is not null then raise exception 'Request already saved. Check your email.'; end if;
 if (select count(*) from public.managed_inquiries where email=p_email and created_at>now()-interval '1 hour')>=2
 or (select count(*) from public.managed_inquiries where ip_hash=p_ip_hash and created_at>now()-interval '1 day')>=10 then raise exception 'Please wait before requesting another email'; end if;
 select host_id into v_host from public.listings where id=p_listing and public.is_listing_publicly_visible(id);
 if v_host is null then raise exception 'Listing unavailable'; end if;
 problem:=public.message_content_problem(p_body,true);
 if lower(p_body) ~ '(cash[ -]?app|venmo|zelle|telegram|whatsapp|pay.{0,15}outside|avoid.{0,15}fee)' then problem:=coalesce(problem,'Off-platform coordination requires review'); end if;
 insert into public.managed_inquiries(listing_id,host_id,email,guest_name,token_hash,token_expires_at,request_key,ip_hash)
 values(p_listing,v_host,p_email,trim(p_name),p_token_hash,now()+interval '7 days',p_request,p_ip_hash) returning id into v_id;
 insert into public.managed_inquiry_messages(inquiry_id,sender_role,body,held,hold_reason,request_key)
 values(v_id,'guest',trim(p_body),problem is not null,problem,p_request);
 return v_id;
end $$;
revoke all on function public.create_managed_inquiry(uuid,text,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_managed_inquiry(uuid,text,text,text,text,uuid,text) to service_role;

create or replace function public.append_managed_inquiry_message(p_inquiry uuid,p_role text,p_actor uuid,p_body text,p_request uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.managed_inquiries; m public.managed_inquiry_messages; problem text; v_id uuid;
begin
 select * into t from public.managed_inquiries where id=p_inquiry for update;
 if not found or t.closed_at is not null then raise exception 'Conversation unavailable'; end if;
 if p_role='seller' and (p_actor is distinct from t.host_id or not public.message_account_active(p_actor)) then raise exception 'Not authorized'; end if;
 if p_role='support' and (p_actor is null or not public.is_admin(p_actor)) then raise exception 'Not authorized'; end if;
 if p_role not in ('guest','seller','support') or length(trim(p_body)) not between 1 and 5000 then raise exception 'Invalid message'; end if;
 select * into m from public.managed_inquiry_messages where request_key=p_request;
 if found then
  if m.inquiry_id<>p_inquiry or m.sender_role<>p_role or m.sender_id is distinct from p_actor then raise exception 'Invalid request'; end if;
  return m.id;
 end if;
 if (select count(*) from public.managed_inquiry_messages where inquiry_id=p_inquiry and sender_role=p_role and created_at>now()-interval '1 minute')>=5 then raise exception 'Please wait before sending another message'; end if;
 problem:=public.message_content_problem(p_body,true);
 if lower(p_body) ~ '(cash[ -]?app|venmo|zelle|telegram|whatsapp|pay.{0,15}outside|avoid.{0,15}fee)' then problem:=coalesce(problem,'Off-platform coordination requires review'); end if;
 insert into public.managed_inquiry_messages(inquiry_id,sender_role,sender_id,body,held,hold_reason,request_key)
 values(p_inquiry,p_role,p_actor,trim(p_body),problem is not null,problem,p_request) returning id into v_id;
 update public.managed_inquiries set last_activity_at=now() where id=p_inquiry;
 return v_id;
end $$;
revoke all on function public.append_managed_inquiry_message(uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.append_managed_inquiry_message(uuid,text,uuid,text,uuid) to service_role;
