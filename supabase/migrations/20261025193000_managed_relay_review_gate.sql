-- Private review queue. No recipient visibility until a reviewed relay was sent.
alter table public.managed_inquiries add column released_at timestamptz;
alter table public.managed_inquiries add column source_lead_id uuid unique references public.listing_leads(id);
-- Unpredictable, participant-specific reply addresses. Never returned to the client.
alter table public.managed_inquiries add column guest_reply_key uuid not null default gen_random_uuid() unique;
alter table public.managed_inquiries add column seller_reply_key uuid not null default gen_random_uuid() unique;
alter table public.managed_inquiry_messages alter column held set default true;
alter table public.managed_inquiry_messages add column released_body text;
alter table public.managed_inquiry_messages add column recipient_role text check(recipient_role in ('guest','seller'));
alter table public.managed_inquiry_messages add column send_started_at timestamptz;
alter table public.managed_inquiry_messages add column sent_at timestamptz;
alter table public.managed_inquiry_messages add column provider_email_id text unique;
alter table public.managed_inquiry_messages add column review_label text;
alter table public.managed_inquiry_messages add column source_email_id text unique;

-- Retain immutable originals and always queue new messages for review.
create function public.managed_message_queue_guard() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 new.held:=true;
 new.hold_reason:=coalesce(new.hold_reason,'Awaiting Vendibook review');
 new.recipient_role:=coalesce(new.recipient_role,case when new.sender_role='seller' then 'guest' else 'seller' end);
 return new;
end $$;
create trigger managed_message_queue_guard before insert on public.managed_inquiry_messages
for each row execute function public.managed_message_queue_guard();

create function public.import_managed_lead(p_lead uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.listing_leads; v_id uuid; v_host uuid;
begin
 select * into l from public.listing_leads where id=p_lead;
 if not found or l.source not in ('guest_inquiry','guest_request_to_buy','guest_request_to_book') then raise exception 'Not a guest inquiry'; end if;
 select host_id into v_host from public.listings where id=l.listing_id;
 if v_host is null then raise exception 'Listing unavailable'; end if;
 insert into public.managed_inquiries(listing_id,host_id,email,guest_name,token_hash,token_expires_at,request_key,ip_hash,source_lead_id,created_at,last_activity_at)
 values(l.listing_id,v_host,lower(trim(l.email)),coalesce(nullif(trim(l.name),''),'Buyer'),encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'),now()-interval '1 day',l.id,'imported-lead',l.id,l.created_at,l.created_at)
 on conflict(source_lead_id) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.managed_inquiries where source_lead_id=l.id; return v_id; end if;
 insert into public.managed_inquiry_messages(inquiry_id,sender_role,body,request_key,created_at)
 values(v_id,'guest',left(coalesce(nullif(trim(l.message),''),'I would like more information about this listing.'),5000),l.id,l.created_at);
 return v_id;
end $$;
revoke all on function public.import_managed_lead(uuid) from public,anon,authenticated;
grant execute on function public.import_managed_lead(uuid) to service_role;

create function public.queue_managed_lead() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.source in ('guest_inquiry','guest_request_to_buy','guest_request_to_book') then perform public.import_managed_lead(new.id); end if;
 return new;
end $$;
create trigger queue_managed_lead after insert on public.listing_leads for each row execute function public.queue_managed_lead();

-- A locked reservation freezes the screened body. Sending/uncertain reservations
-- are deliberately not auto-reclaimed: inspect provider evidence before retrying.
create function public.reserve_managed_relay(p_message uuid,p_body text,p_review_label text,p_reviewer uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.managed_inquiry_messages; t public.managed_inquiries;
begin
 select * into m from public.managed_inquiry_messages where id=p_message for update;
 if not found then raise exception 'Message not found'; end if;
 select * into t from public.managed_inquiries where id=m.inquiry_id;
 if t.closed_at is not null then raise exception 'Conversation closed'; end if;
 if m.sent_at is not null then return jsonb_build_object('status','already_sent','email_id',m.provider_email_id); end if;
 if m.send_started_at is not null then return jsonb_build_object('status','send_in_progress','started_at',m.send_started_at); end if;
 if p_body is null or p_review_label is null or length(trim(p_body)) not between 1 and 5000 or length(trim(p_review_label)) not between 1 and 200 then raise exception 'Reviewed message and reviewer required'; end if;
 if public.message_content_problem(p_body,true) is not null then raise exception 'Remove private contact details and unsafe content before release'; end if;
 if p_reviewer is not null and not public.is_admin(p_reviewer) then raise exception 'Admin required'; end if;
 update public.managed_inquiry_messages set released_body=trim(p_body),reviewed_by=p_reviewer,reviewed_at=now(),review_label=p_review_label,send_started_at=now() where id=m.id;
 return jsonb_build_object('status','reserved','message_id',m.id,'inquiry_id',m.inquiry_id);
end $$;
revoke all on function public.reserve_managed_relay(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_managed_relay(uuid,text,text,uuid) to service_role;

create function public.complete_managed_relay(p_message uuid,p_email_id text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.managed_inquiry_messages; t public.managed_inquiries;
begin
 select * into m from public.managed_inquiry_messages where id=p_message for update;
 if not found or m.send_started_at is null or m.released_body is null then raise exception 'Reviewed reservation required'; end if;
 if m.sent_at is not null then
  if m.provider_email_id is distinct from p_email_id then raise exception 'Different delivery already recorded'; end if;
  return;
 end if;
 if p_email_id is null or length(trim(p_email_id)) not between 1 and 300 then raise exception 'Provider email evidence required'; end if;
 select * into t from public.managed_inquiries where id=m.inquiry_id for update;
 update public.managed_inquiry_messages set held=false,sent_at=now(),provider_email_id=p_email_id where id=m.id;
 update public.managed_inquiries set released_at=coalesce(released_at,now()),last_activity_at=now() where id=t.id;
 if m.recipient_role='seller' then
  insert into public.notifications(user_id,type,title,message,link)
  values(t.host_id,'message','New reviewed listing message','Vendibook relayed a message to your inbox.','/inquiries/'||t.id);
 end if;
end $$;
revoke all on function public.complete_managed_relay(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_managed_relay(uuid,text) to service_role;

-- Gmail ingestion is operator/service-only. The caller verifies the authenticated
-- mailbox sender and matches the existing thread; body text grants no authority.
create function public.ingest_managed_reply(p_inquiry uuid,p_role text,p_body text,p_source_email_id text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; t public.managed_inquiries;
begin
 select * into t from public.managed_inquiries where id=p_inquiry for update;
 if not found or t.closed_at is not null or p_role is null or p_role not in ('guest','seller') then raise exception 'Invalid conversation'; end if;
 if p_body is null or p_source_email_id is null or length(trim(p_body)) not between 1 and 5000 or length(trim(p_source_email_id)) not between 1 and 300 then raise exception 'Message and source required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_source_email_id,519));
 if exists(select 1 from public.managed_inquiry_messages where source_email_id=p_source_email_id and (inquiry_id<>p_inquiry or sender_role<>p_role)) then raise exception 'Source already belongs to another participant or conversation'; end if;
 select id into v_id from public.managed_inquiry_messages where source_email_id=p_source_email_id;
 if v_id is not null then return v_id; end if;
 insert into public.managed_inquiry_messages(inquiry_id,sender_role,sender_id,body,request_key,source_email_id)
 values(t.id,p_role,case when p_role='seller' then t.host_id else null end,trim(p_body),gen_random_uuid(),p_source_email_id) returning id into v_id;
 update public.managed_inquiries set last_activity_at=now() where id=t.id;
 return v_id;
end $$;
revoke all on function public.ingest_managed_reply(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ingest_managed_reply(uuid,text,text,text) to service_role;
