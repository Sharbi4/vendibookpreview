create table if not exists public.operations_settings (
  id text primary key check(id='post_publish_feedback'), enabled boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
revoke all on public.operations_settings from anon,authenticated;
grant select,update on public.operations_settings to authenticated;
grant all on public.operations_settings to service_role;
alter table public.operations_settings enable row level security;
create policy operations_settings_admin on public.operations_settings for all to authenticated using(public.is_admin(auth.uid())) with check(public.is_admin(auth.uid()));

create table if not exists public.operations_actions (
 id uuid primary key, actor_id uuid not null references public.profiles(id), action text not null,
 target_id uuid, status text not null default 'processing', result jsonb, created_at timestamptz not null default now()
);
revoke all on public.operations_actions from anon,authenticated;
grant select on public.operations_actions to authenticated;
grant all on public.operations_actions to service_role;
alter table public.operations_actions enable row level security;
create policy operations_actions_admin on public.operations_actions for select to authenticated using(public.is_admin(auth.uid()));

alter table public.feedback_email_sent add column if not exists dispatch_status text not null default 'legacy_unknown';
alter table public.feedback_email_sent add column if not exists last_error text;
alter table public.feedback_email_sent add column if not exists attempts integer not null default 0;
alter table public.feedback_email_sent add column if not exists updated_at timestamptz not null default now();
alter table public.sms_message_log_v2 add column if not exists dispatch_key text;
create unique index if not exists sms_message_log_dispatch_key_unique on public.sms_message_log_v2(dispatch_key) where dispatch_key is not null;
create or replace function public.operations_us_state(value text) returns text language sql immutable set search_path = public as $$ select coalesce((select code from (values ('AL','ALABAMA'),('AK','ALASKA'),('AZ','ARIZONA'),('CO','COLORADO'),('FL','FLORIDA'),('GA','GEORGIA'),('IN','INDIANA'),('KS','KANSAS'),('ME','MAINE'),('MA','MASSACHUSETTS'),('MN','MINNESOTA'),('NJ','NEW JERSEY'),('NC','NORTH CAROLINA'),('ND','NORTH DAKOTA'),('OK','OKLAHOMA'),('PA','PENNSYLVANIA'),('SD','SOUTH DAKOTA'),('TX','TEXAS'),('WY','WYOMING'),('CT','CONNECTICUT'),('MO','MISSOURI'),('WV','WEST VIRGINIA'),('IL','ILLINOIS'),('NM','NEW MEXICO'),('AR','ARKANSAS'),('CA','CALIFORNIA'),('DE','DELAWARE'),('DC','DISTRICT OF COLUMBIA'),('HI','HAWAII'),('IA','IOWA'),('KY','KENTUCKY'),('MD','MARYLAND'),('MI','MICHIGAN'),('MS','MISSISSIPPI'),('MT','MONTANA'),('NH','NEW HAMPSHIRE'),('NY','NEW YORK'),('OH','OHIO'),('OR','OREGON'),('TN','TENNESSEE'),('UT','UTAH'),('VA','VIRGINIA'),('WA','WASHINGTON'),('WI','WISCONSIN'),('NE','NEBRASKA'),('SC','SOUTH CAROLINA'),('ID','IDAHO'),('NV','NEVADA'),('VT','VERMONT'),('LA','LOUISIANA'),('RI','RHODE ISLAND')) s(code,name) where upper(trim(value)) in (code,name)), 'UNKNOWN') $$;

create or replace function public.admin_operations_snapshot(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare v_start timestamptz; v_now timestamptz := now(); result jsonb;
begin
 if not coalesce(public.is_admin(auth.uid()),false) then raise exception 'Admin required' using errcode='42501'; end if;
 if p_days not in (7,30,90) then raise exception 'Choose 7, 30 or 90 days'; end if;
 v_start := date_trunc('day',v_now at time zone 'UTC') at time zone 'UTC' - make_interval(days=>p_days-1);
 with
 inventory as materialized (
   select l.id,l.published_at,public.operations_us_state(l.state) state from public.listings l
   join public.profiles p on p.id=l.host_id
   where l.status='published' and l.published_at is not null and l.deleted_at is null and l.moderation_status='clear'
    and coalesce(l.unlisted,false)=false and coalesce(p.account_suspended,false)=false
    and not (l.title ilike any(array['Demo%','QA %','QA_%','QA-%','Test %','E2E %','Smoke %','Sandbox %']))
 ),
 demand as materialized (
   select d.created_at,public.operations_us_state(l.state) state from (
     select listing_id,created_at from public.booking_requests where created_at>=v_start
     union all select listing_id,created_at from public.offers where created_at>=v_start
     union all select listing_id,created_at from public.listing_leads where created_at>=v_start
   ) d join public.listings l on l.id=d.listing_id
   where coalesce(l.unlisted,false)=false and not (l.title ilike any(array['Demo%','QA %','QA_%','QA-%','Test %','E2E %','Smoke %','Sandbox %']))
 ),
 users_range as materialized (select created_at,public.operations_us_state(state) state from public.profiles where created_at >= v_start - make_interval(days=>p_days)),
 emails as materialized (select id,template_name,status,created_at,recipient_email from public.email_send_log where created_at>=v_start and coalesce(metadata->>'test_mode','false')<>'true'),
 feedback_range as materialized (select id,context_type,rating,nps,message,created_at,reviewed_at from public.feedback_submissions where created_at>=v_start and (rating is not null or nps is not null or nullif(trim(message),'') is not null)),
 paid as materialized (
   select distinct on (r.sale_transaction_id) r.id,r.reference,r.sale_transaction_id,r.captured_at,r.gross_amount_cents
   from public.payment_records r where r.payment_status='completed' and r.sale_transaction_id is not null and coalesce(r.balance_due_cents,0)=0
   order by r.sale_transaction_id,r.captured_at desc nulls last
 ),
 states as (select state from inventory union select state from demand union select state from users_range where created_at>=v_start),
 series as (select generate_series(v_start,v_now,interval '1 day') as bucket)
 select jsonb_build_object(
  'generated_at',v_now,'days',p_days,
  'metrics',jsonb_build_object(
   'signups',(select count(*) from users_range where created_at>=v_start),
   'previous_signups',(select count(*) from users_range where created_at<v_start),
   'published',(select count(*) from inventory where published_at>=v_start),
   'active_supply',(select count(*) from inventory),
   'demand',(select count(*) from demand),
   'paid_orders',(select count(*) from paid where captured_at>=v_start),
   'gross_cents',(select coalesce(sum(gross_amount_cents),0) from paid where captured_at>=v_start),
   'subscribers',(select count(*) from marketplace_update_preferences where email_status='confirmed' and confirmed_at>=v_start),
   'signup_requests',(select count(distinct email) from marketplace_update_requests where created_at>=v_start),
   'receipt_resends',(select count(*) from payment_audit_log where action='order.resend_receipt' and created_at>=v_start and new_value->>'sent'='true'),
   'feedback_received',(select count(*) from feedback_range),
   'feedback_pending',(select count(*) from feedback_range where reviewed_at is null)
  ),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('day',to_char(bucket at time zone 'UTC','YYYY-MM-DD'),
    'signups',(select count(*) from users_range u where u.created_at>=s.bucket and u.created_at<s.bucket+interval '1 day'),
    'published',(select count(*) from inventory i where i.published_at>=s.bucket and i.published_at<s.bucket+interval '1 day'),
    'demand',(select count(*) from demand d where d.created_at>=s.bucket and d.created_at<s.bucket+interval '1 day')) order by bucket),'[]'::jsonb) from series s),
  'regions',(select coalesce(jsonb_agg(jsonb_build_object('state',state,'supply',(select count(*) from inventory i where i.state=s.state),'demand',(select count(*) from demand d where d.state=s.state),'signups',(select count(*) from users_range u where u.state=s.state and created_at>=v_start))),'[]'::jsonb) from states s),
  'email',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (select status,count(*) from emails group by status) e),
  'marketing',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (select status,count(*) from blog_campaign_sends where created_at>=v_start and coalesce(is_test,false)=false group by status) e),
  'sms',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (select send_status status,count(*) from sms_message_log_v2 where created_at>=v_start and coalesce(delivery_status,'')<>'test_mode_dry_run' group by send_status) s),
  'sms_delivery',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (select delivery_status status,count(*) from sms_message_log_v2 where created_at>=v_start and delivery_status in ('delivered','undelivered','failed') group by delivery_status) s),
  'legacy_sms',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (select status,count(*) from sms_send_log where created_at>=v_start and coalesce(metadata->>'test_mode','false')<>'true' group by status) s),
  'recent_email',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (select id,template_name,status,created_at,left(recipient_email,2)||'***@'||split_part(recipient_email,'@',2) recipient from emails order by created_at desc limit 20) e),
  'recent_sms',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (select id,template_id,send_status,delivery_status,failure_reason,created_at,'*** '||right(recipient_phone_e164,4) recipient from sms_message_log_v2 where created_at>=v_start order by created_at desc limit 20) s),
  'feedback',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from (select * from feedback_range order by created_at desc limit 30) f),
  'inbound',(select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from (select id,body,action_taken,created_at,matched_user_id user_id from sms_inbound_messages where created_at>=v_start order by created_at desc limit 20) i),
  'orders',(select coalesce(jsonb_agg(to_jsonb(o)),'[]'::jsonb) from (select p.id,p.reference,l.title,t.status,t.shipping_status,p.captured_at,p.gross_amount_cents,t.fulfillment_type from paid p join sale_transactions t on t.id=p.sale_transaction_id join listings l on l.id=t.listing_id where p.captured_at>=v_start order by p.captured_at desc limit 20) o),
  'workflow',jsonb_build_object('enabled',(select enabled from operations_settings where id='post_publish_feedback'),'delay_hours',24,
    'sent',(select count(*) from feedback_email_sent where context_type='listing_publish' and sent_at>=v_start and dispatch_status='sent'),
    'failed',(select count(*) from feedback_email_sent where context_type='listing_publish' and sent_at>=v_start and dispatch_status='failed'),
    'suppressed',(select count(*) from feedback_email_sent where context_type='listing_publish' and sent_at>=v_start and dispatch_status='suppressed'),
    'pending',(select count(*) from feedback_email_sent where context_type='listing_publish' and sent_at>=v_start and dispatch_status in ('processing','legacy_unknown')))
 ) into result;
 return result;
end; $$;
revoke all on function public.admin_operations_snapshot(integer) from public,anon;
grant execute on function public.admin_operations_snapshot(integer) to authenticated;

-- Atomic recipient/day and listing claims; service-only. Failed attempts can
-- retry the same provider idempotency key, never a second request for a listing.
create or replace function public.claim_post_publish_feedback(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item record; claim_id uuid; result jsonb := '[]'::jsonb;
begin
 if not coalesce((select enabled from operations_settings where id='post_publish_feedback'),false) then return result; end if;
 for item in
   select l.id,l.title,l.host_id,p.email,p.first_name,p.full_name
   from listings l join profiles p on p.id=l.host_id
   left join feedback_email_sent f on f.context_type='listing_publish' and f.context_id=l.id
   where l.status='published' and l.deleted_at is null and l.moderation_status='clear'
     and coalesce(l.unlisted,false)=false and coalesce(p.account_suspended,false)=false
     and p.email is not null and trim(p.email)<>''
     and l.published_at<now()-interval '24 hours' and l.published_at>now()-interval '7 days'
     and not (l.title ilike any(array['Demo%','QA %','QA_%','QA-%','Test %','E2E %','Smoke %','Sandbox %']))
     and (f.id is null or (f.dispatch_status='failed' and f.attempts<3))
     and not exists(select 1 from feedback_email_sent recent where lower(recent.recipient_email)=lower(p.email) and recent.sent_at>=now()-interval '24 hours' and recent.context_id<>l.id and recent.dispatch_status in ('sent','processing'))
   order by l.published_at limit 1000
 loop
   exit when jsonb_array_length(result)>=least(greatest(p_limit,1),100);
   if not pg_try_advisory_xact_lock(hashtextextended(lower(item.email),72641)) then continue; end if;
   if exists(select 1 from feedback_email_sent recent where lower(recent.recipient_email)=lower(item.email) and recent.sent_at>=now()-interval '24 hours' and recent.context_id<>item.id and recent.dispatch_status in ('sent','processing')) then continue; end if;
   claim_id := null;
   insert into feedback_email_sent(context_type,context_id,recipient_email,dispatch_status,attempts,sent_at)
   values('listing_publish',item.id,item.email,'processing',1,now())
   on conflict(context_type,context_id) do update set dispatch_status='processing',attempts=feedback_email_sent.attempts+1,updated_at=now(),sent_at=now()
   where feedback_email_sent.dispatch_status='failed' and feedback_email_sent.attempts<3
   returning id into claim_id;
   if claim_id is not null then result:=result||jsonb_build_array(to_jsonb(item)||jsonb_build_object('claim_id',claim_id)); end if;
 end loop;
 return result;
end; $$;
revoke all on function public.claim_post_publish_feedback(integer) from public,anon,authenticated;
grant execute on function public.claim_post_publish_feedback(integer) to service_role;