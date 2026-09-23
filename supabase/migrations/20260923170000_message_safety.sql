-- Server-enforced protection for marketplace and booking chat.
begin;
create or replace function public.message_account_active(actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users u where u.id=actor and (u.banned_until is null or u.banned_until<=now()))
    and not exists(select 1 from public.profiles p where p.id=actor and p.account_suspended);
$$;
revoke all on function public.message_account_active(uuid) from public,anon;
grant execute on function public.message_account_active(uuid) to authenticated;
create table if not exists public.message_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id), check(blocker_id <> blocked_id)
);
create table if not exists public.message_safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reporter_id uuid,
  thread_kind text not null check(thread_kind in ('conversation','booking')),
  thread_id uuid not null,
  reason text not null,
  evidence jsonb not null default '[]',
  status text not null default 'open' check(status in ('open','reviewed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz, reviewed_by uuid
);
create table if not exists public.message_sending_holds (
  user_id uuid primary key,
  created_at timestamptz not null default now(),
  reason text not null
);
alter table public.message_user_blocks enable row level security;
alter table public.message_safety_events enable row level security;
alter table public.message_sending_holds enable row level security;
revoke all on public.message_user_blocks, public.message_safety_events, public.message_sending_holds from anon, authenticated;
grant select on public.message_user_blocks, public.message_safety_events, public.message_sending_holds to authenticated;
drop policy if exists own_blocks on public.message_user_blocks;
create policy own_blocks on public.message_user_blocks for select to authenticated using(blocker_id=auth.uid() and public.message_account_active());
drop policy if exists admin_safety_events on public.message_safety_events;
create policy admin_safety_events on public.message_safety_events for select to authenticated using(public.is_admin(auth.uid()) and public.message_account_active());
drop policy if exists own_or_admin_holds on public.message_sending_holds;
create policy own_or_admin_holds on public.message_sending_holds for select to authenticated using((user_id=auth.uid() or public.is_admin(auth.uid())) and public.message_account_active());
create index if not exists message_safety_open on public.message_safety_events(status,created_at desc);
create index if not exists conversation_message_safety_rate on public.conversation_messages(sender_id,created_at desc);
create index if not exists booking_message_safety_rate on public.booking_messages(sender_id,created_at desc);

create or replace function public.message_normalize(value text) returns text
language sql immutable set search_path=public as $$
  select regexp_replace(translate(lower(normalize(coalesce(value,''), NFKC)), 'аеорсухіјⅼοѕ', 'aeopcyxijlos'), '[^a-z0-9]', '', 'g')
$$;
create or replace function public.message_reserved_name(value text) returns boolean
language sql immutable set search_path=public as $$
  select public.message_normalize(value) ~ '(vend[i1l]b[o0]{2}k|supp[o0]rt|adm[i1l]n|billingteam|accountverification|securityteam|verifiedstaff)'
$$;
create or replace function public.guard_messaging_identity() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if public.is_admin(new.id) then return new; end if;
  if tg_op='UPDATE' then
    if (new.full_name,new.display_name,new.username,new.business_name,new.first_name,new.last_name)
       is not distinct from (old.full_name,old.display_name,old.username,old.business_name,old.first_name,old.last_name)
    then return new; end if;
  end if;
  if public.message_reserved_name(concat_ws(' ',new.full_name,new.display_name,new.username,new.business_name,new.first_name,new.last_name)) then
    raise exception using errcode='P0001', message='Please use your own name or business name. Support and staff names are reserved for verified Vendibook staff.';
  end if;
  return new;
end $$;
drop trigger if exists messaging_identity_guard on public.profiles;
create trigger messaging_identity_guard before insert or update on public.profiles for each row execute function public.guard_messaging_identity();

-- Only real participants may resolve a recipient. Never trust a client-supplied recipient.
create or replace function public.message_recipient(kind text, thread uuid, actor uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare h uuid; s uuid;
begin
  if kind='conversation' then select host_id,shopper_id into h,s from public.conversations where id=thread;
  elsif kind='booking' then select host_id,shopper_id into h,s from public.booking_requests where id=thread;
  else raise exception 'Invalid message thread'; end if;
  if actor is null or actor not in (h,s) or h is null or s is null or h=s then
    raise exception using errcode='42501',message='You cannot access this conversation.';
  end if;
  return case when actor=h then s else h end;
end $$;
revoke all on function public.message_recipient(text,uuid,uuid) from public,anon,authenticated;

create or replace function public.message_content_problem(body text, is_new boolean) returns text
language plpgsql immutable set search_path=public as $$
declare compact text := public.message_normalize(body); lower_body text := lower(normalize(coalesce(body,''), NFKC));
  has_link boolean;
begin
  has_link := lower_body ~ '(https?[: ]|www[.]|[a-z0-9][.](com|net|org|ee|io|co|app|test|xyz|click)([^a-z]|$))';
  if compact ~ '(treevendibook|vendibookverify|vendibookverification)' then
    return 'For your safety, payment and account verification links cannot be sent in chat. Use your dashboard.';
  end if;
  if lower_body ~ '(^|[^a-z0-9])(tr[.]ee|bit[.]ly|tinyurl[.]com|t[.]co|shorturl[.]at|cutt[.]ly|rb[.]gy|rebrand[.]ly)([^a-z0-9]|$)' then
    return 'Shortened links are not allowed in messages. Share the full destination address instead.';
  end if;
  if compact ~ '(send|enter|provide|confirm|submit|share).{0,30}(cardnumber|carddetails|creditcard|debitcard|password|verificationcode|securitycode|onetimecode)'
     or compact ~ '(verificationfee|activationfee|paymentrequiredtoreceive|paytoreceive)'
     or (has_link and compact ~ '(verify.{0,20}account|account.{0,20}verif|create.{0,20}paypal|paypal.{0,20}signup|claim.{0,20}payment|release.{0,20}(funds|payment)|account.{0,20}suspend)') then
    return 'For your safety, requests for credentials, card details, or external account verification are not allowed in chat.';
  end if;
  if compact ~ '(tr[e3][e3]|bitly|tinyurlcom|cuttly|rbgy)(vendibook|verify|payment)' then
    return 'Suspicious shortened links are not allowed in messages.';
  end if;
  if is_new and (has_link or compact ~ '(paypalm[e3]|cashapp|venmo).{0,30}(pay|send|deposit)') then
    return 'New accounts cannot send external links or payment requests yet. Discuss the listing here and use checkout for payments.';
  end if;
  return null;
end $$;

create or replace function public.guard_marketplace_message() returns trigger
language plpgsql security definer set search_path=public as $$
declare recipient uuid; kind text; thread uuid; joined timestamptz; staff boolean;
  problem text; recent_hour int; recent_day int; duplicate_targets int; new_contact boolean;
begin
  kind := case when tg_table_name='booking_messages' then 'booking' else 'conversation' end;
  thread := coalesce((to_jsonb(new)->>'conversation_id')::uuid,(to_jsonb(new)->>'booking_id')::uuid);
  recipient := public.message_recipient(kind,thread,new.sender_id);
  if auth.uid() is not null and new.sender_id<>auth.uid() and coalesce(auth.role(),'')<>'service_role' then
    raise exception using errcode='42501',message='You cannot send as another member.';
  end if;
  -- Serialize sends by this account across both chat tables, including simultaneous requests.
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text,719));
  new.created_at := now();
  select created_at into joined from auth.users where id=new.sender_id;
  staff := public.is_admin(new.sender_id);
  if joined is null or not public.message_account_active(new.sender_id) then
    raise exception using errcode='P0001',message='Messaging is unavailable for this account.';
  end if;
  if exists(select 1 from public.message_sending_holds where user_id=new.sender_id) then
    raise exception using errcode='P0001',message='Messaging is paused for a safety review. Please contact Vendibook through the Help Center.';
  end if;
  if exists(select 1 from public.message_user_blocks where (blocker_id=new.sender_id and blocked_id=recipient) or (blocker_id=recipient and blocked_id=new.sender_id)) then
    raise exception using errcode='P0001',message='Messaging is unavailable between these accounts.';
  end if;
  if not staff and exists(select 1 from public.profiles where id=new.sender_id and public.message_reserved_name(concat_ws(' ',full_name,display_name,username,business_name,first_name,last_name))) then
    raise exception using errcode='P0001',message='Please change your public name in My Account. Support and staff names are reserved.';
  end if;
  if length(coalesce(new.message,''))>5000 or (btrim(coalesce(new.message,''))='' and new.attachment_url is null) then
    raise exception 'Messages must contain text or an attachment and be at most 5000 characters.';
  end if;
  if new.attachment_url is not null then
    if new.attachment_url !~ '^https://nbrehbwfsmedbelzntqs[.]supabase[.]co/storage/v1/object/(sign|public)/message-attachments/'
       or not exists(select 1 from storage.objects where bucket_id='message-attachments'
          and name=split_part(regexp_replace(new.attachment_url,'^https://nbrehbwfsmedbelzntqs[.]supabase[.]co/storage/v1/object/(sign|public)/message-attachments/',''), '?',1)
          and split_part(name,'/',1) in (new.sender_id::text,thread::text)) then
      raise exception 'Please upload attachments through the message composer.';
    end if;
  end if;
  if not staff then
    problem := public.message_content_problem(new.message,joined>now()-interval '7 days');
    if problem is not null then raise exception using errcode='P0001',message=problem; end if;
    -- Count first outbound contacts, not replies inside existing conversations.
    with outbound as (
      select c.host_id,c.shopper_id,m.created_at from public.conversation_messages m join public.conversations c on c.id=m.conversation_id where m.sender_id=new.sender_id
      union all
      select b.host_id,b.shopper_id,m.created_at from public.booking_messages m join public.booking_requests b on b.id=m.booking_id where m.sender_id=new.sender_id
    ), contacts as (
      select case when host_id=new.sender_id then shopper_id else host_id end target,min(created_at) first_at from outbound group by 1
    ) select count(*) filter(where first_at>now()-interval '1 hour'),count(*) filter(where first_at>now()-interval '1 day'),not coalesce(bool_or(target=recipient),false)
      into recent_hour,recent_day,new_contact from contacts;
    if new_contact and (recent_hour >= case when joined>now()-interval '7 days' then 5 else 20 end
        or recent_day >= case when joined>now()-interval '7 days' then 10 else 50 end) then
      raise exception using errcode='P0001',message='New conversation limit reached. Please wait before contacting more members.';
    end if;
    with copies as (
      select case when c.host_id=new.sender_id then c.shopper_id else c.host_id end target from public.conversation_messages m join public.conversations c on c.id=m.conversation_id
        where m.sender_id=new.sender_id and m.created_at>now()-interval '1 day' and public.message_normalize(m.message)=public.message_normalize(new.message)
      union
      select case when b.host_id=new.sender_id then b.shopper_id else b.host_id end target from public.booking_messages m join public.booking_requests b on b.id=m.booking_id
        where m.sender_id=new.sender_id and m.created_at>now()-interval '1 day' and public.message_normalize(m.message)=public.message_normalize(new.message)
    ) select count(*) into duplicate_targets from copies where target<>recipient;
    if length(public.message_normalize(new.message))>=40 and duplicate_targets>=3 then
      raise exception using errcode='P0001',message='Repeated messages to multiple members were stopped for a safety review.';
    end if;
    select count(*) into recent_hour from (
      select id from public.conversation_messages where sender_id=new.sender_id and created_at>now()-interval '1 minute'
      union all select id from public.booking_messages where sender_id=new.sender_id and created_at>now()-interval '1 minute'
    ) recent;
    if recent_hour>=10 then raise exception 'You are sending messages too quickly. Please wait a minute.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists marketplace_message_safety on public.conversation_messages;
create trigger marketplace_message_safety before insert on public.conversation_messages for each row execute function public.guard_marketplace_message();
drop trigger if exists marketplace_message_safety on public.booking_messages;
create trigger marketplace_message_safety before insert on public.booking_messages for each row execute function public.guard_marketplace_message();

-- This wrapper preserves rejected-message evidence outside the failed INSERT subtransaction.
-- Direct table writes still pass through the same mandatory guards above.
create or replace function public.send_marketplace_message(kind text, thread uuid, body text, attachment jsonb default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); recipient uuid; result jsonb; problem text;
begin
  recipient:=public.message_recipient(kind,thread,actor);
  if not public.message_account_active() then raise exception 'Account closed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,719));
  begin
    if kind='conversation' then
      insert into public.conversation_messages(conversation_id,sender_id,message,attachment_url,attachment_name,attachment_type,attachment_size)
      values(thread,actor,body,attachment->>'url',attachment->>'name',attachment->>'type',(attachment->>'size')::integer)
      returning to_jsonb(conversation_messages.*) into result;
      update public.conversations set last_message_at=now() where id=thread;
    else
      insert into public.booking_messages(booking_id,sender_id,message,attachment_url,attachment_name,attachment_type)
      values(thread,actor,body,attachment->>'url',attachment->>'name',attachment->>'type')
      returning to_jsonb(booking_messages.*) into result;
    end if;
  exception when sqlstate 'P0001' then
    get stacked diagnostics problem=message_text;
  end;
  if problem is not null then
    if not exists(select 1 from public.message_safety_events where user_id=actor and reason=problem and created_at>now()-interval '1 hour') then
      insert into public.message_safety_events(user_id,thread_kind,thread_id,reason,evidence)
      values(actor,kind,thread,problem,jsonb_build_object('attempted_message',left(body,5000)));
    end if;
    if problem like 'Repeated messages%' then
      insert into public.message_sending_holds(user_id,reason) values(actor,problem) on conflict(user_id) do nothing;
    end if;
    return jsonb_build_object('success',false,'error',problem);
  end if;
  return jsonb_build_object('success',true,'message',result);
end $$;
revoke all on function public.send_marketplace_message(text,uuid,text,jsonb) from public,anon;
grant execute on function public.send_marketplace_message(text,uuid,text,jsonb) to authenticated;

create or replace function public.message_safety_context(kind text, thread uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare recipient uuid:=public.message_recipient(kind,thread,auth.uid());
begin
  if not public.message_account_active() then raise exception 'Account closed'; end if;
  return jsonb_build_object('blocked',exists(select 1 from public.message_user_blocks where blocker_id=auth.uid() and blocked_id=recipient),
    'staff',public.is_admin(recipient));
end $$;
create or replace function public.set_message_block(kind text, thread uuid, blocked boolean) returns void
language plpgsql security definer set search_path=public as $$
declare recipient uuid:=public.message_recipient(kind,thread,auth.uid());
begin
  if not public.message_account_active() then raise exception 'Account closed'; end if;
  if blocked then insert into public.message_user_blocks(blocker_id,blocked_id) values(auth.uid(),recipient) on conflict do nothing;
  else delete from public.message_user_blocks where blocker_id=auth.uid() and blocked_id=recipient; end if;
end $$;
create or replace function public.report_message_thread(kind text, thread uuid, reason text) returns void
language plpgsql security definer set search_path=public as $$
declare recipient uuid:=public.message_recipient(kind,thread,auth.uid()); snapshot jsonb;
begin
  if not public.message_account_active() then raise exception 'Account closed'; end if;
  if reason not in ('Impersonating support','Suspicious payment link','Spam or harassment') then raise exception 'Choose a report reason'; end if;
  if exists(select 1 from public.message_safety_events e where e.reporter_id=auth.uid() and e.thread_id=thread and e.status='open') then return; end if;
  if kind='conversation' then
    select jsonb_agg(to_jsonb(m)) into snapshot from (select id,sender_id,message,created_at from public.conversation_messages where conversation_id=thread and sender_id=recipient order by created_at desc limit 20) m;
  else
    select jsonb_agg(to_jsonb(m)) into snapshot from (select id,sender_id,message,created_at from public.booking_messages where booking_id=thread and sender_id=recipient order by created_at desc limit 20) m;
  end if;
  insert into public.message_safety_events(user_id,reporter_id,thread_kind,thread_id,reason,evidence) values(recipient,auth.uid(),kind,thread,reason,coalesce(snapshot,'[]'));
end $$;
create or replace function public.review_message_safety(event_id uuid, action text) returns void
language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  if not coalesce(public.is_admin(auth.uid()),false) or not public.message_account_active() then raise exception 'Admin access required'; end if;
  select user_id into target from public.message_safety_events where id=event_id;
  if target is null then raise exception 'Report not found'; end if;
  if action='pause' then
    insert into public.message_sending_holds(user_id,reason) values(target,'Paused by moderation') on conflict(user_id) do nothing;
  elsif action='restore' then delete from public.message_sending_holds where user_id=target;
  elsif action<>'dismiss' then raise exception 'Invalid moderation action'; end if;
  update public.message_safety_events set status='reviewed',reviewed_at=now(),reviewed_by=auth.uid() where id=event_id;
end $$;
revoke all on function public.message_safety_context(text,uuid),public.set_message_block(text,uuid,boolean),public.report_message_thread(text,uuid,text),public.review_message_safety(uuid,text) from public,anon;
grant execute on function public.message_safety_context(text,uuid),public.set_message_block(text,uuid,boolean),public.report_message_thread(text,uuid,text),public.review_message_safety(uuid,text) to authenticated;
-- A participant must never be able to reassign an existing thread to another account.
create or replace function public.guard_message_thread_identity() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if (new.host_id,new.shopper_id,new.listing_id) is distinct from (old.host_id,old.shopper_id,old.listing_id) then
      raise exception 'Conversation participants and listing cannot be changed.';
    end if;
    return new;
  end if;
  if new.host_id=new.shopper_id then raise exception 'You cannot message yourself.'; end if;
  if new.listing_id is null or not exists(select 1 from public.listings where id=new.listing_id and host_id=new.host_id and deleted_at is null) then
    raise exception 'Start a conversation from an available listing with its owner.';
  end if;
  if auth.uid() is not null then
    if auth.uid() not in (new.host_id,new.shopper_id) then raise exception 'You cannot create this conversation.'; end if;
    if not public.message_account_active() or exists(select 1 from public.profiles where id=auth.uid() and account_suspended)
      or exists(select 1 from public.message_sending_holds where user_id=auth.uid()) then raise exception 'Messaging is unavailable for this account.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,719));
    if (select count(*) from public.conversations where (host_id=auth.uid() or shopper_id=auth.uid()) and created_at>now()-interval '1 hour')>=20 then
      raise exception 'Conversation limit reached. Please try again later.';
    end if;
  end if;
  if exists(select 1 from public.message_user_blocks where (blocker_id=new.host_id and blocked_id=new.shopper_id) or (blocker_id=new.shopper_id and blocked_id=new.host_id)) then
    raise exception 'Messaging is unavailable between these accounts.';
  end if;
  new.created_at:=now();
  return new;
end $$;
drop trigger if exists message_thread_identity on public.conversations;
create trigger message_thread_identity before insert or update on public.conversations for each row execute function public.guard_message_thread_identity();
commit;
