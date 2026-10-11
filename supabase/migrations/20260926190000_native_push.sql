-- Private device tokens and capability-authenticated delivery jobs.
create table public.native_push_devices (
 token text primary key check (length(token) between 20 and 4096),
 user_id uuid not null references auth.users(id) on delete cascade,
 updated_at timestamptz not null default now()
);
alter table public.native_push_devices enable row level security;
create policy native_push_owner on public.native_push_devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.native_push_devices to authenticated;
create index native_push_devices_user on public.native_push_devices(user_id);

create table public.native_push_jobs (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.notifications(id) on delete cascade,
 token text not null references public.native_push_devices(token) on delete cascade,
 capability uuid not null default gen_random_uuid(),
 status text not null default 'queued' check(status in ('queued','sending','retry','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(notification_id, token)
);
alter table public.native_push_jobs enable row level security;
revoke all on public.native_push_jobs from anon, authenticated;

create or replace function public.dispatch_native_push_jobs() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare job record;
begin
 for job in select id,capability from public.native_push_jobs
 where status in ('queued','retry') and attempts < 5 and next_attempt_at <= now()
 order by next_attempt_at limit 50 for update skip locked
 loop
  update public.native_push_jobs set next_attempt_at=now()+interval '2 minutes' where id=job.id;
  perform net.http_post(
   url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-native-push',
   headers := '{"Content-Type":"application/json"}'::jsonb,
   body := jsonb_build_object('job_id',job.id,'capability',job.capability), timeout_milliseconds := 10000);
 end loop;
end $$;
revoke all on function public.dispatch_native_push_jobs() from public, anon, authenticated;

create or replace function public.queue_native_push() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.native_push_jobs(notification_id,token)
 select NEW.id,token from public.native_push_devices where user_id=NEW.user_id
 on conflict do nothing;
 -- Dispatch failure must not roll back the account notification.
 begin perform public.dispatch_native_push_jobs(); exception when others then null; end;
 return NEW;
end $$;
revoke all on function public.queue_native_push() from public, anon, authenticated;
create trigger queue_native_push after insert on public.notifications for each row execute function public.queue_native_push();

-- Retry transport failures. Ambiguous sends are left 'sending' to avoid duplicate alerts.
-- Monitor sending jobs older than five minutes; do not blindly resend them.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('vendibook-native-push-retry','* * * * *','select public.dispatch_native_push_jobs()');
 end if;
end $$;
create or replace function public.test_native_push() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in first'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if not exists(select 1 from public.native_push_devices where user_id=uid) then raise exception 'Enable notifications on this device first'; end if;
 if exists(select 1 from public.notifications where user_id=uid and type='native_push_test' and created_at>now()-interval '1 minute') then raise exception 'Please wait a minute before sending another test'; end if;
 insert into public.notifications(user_id,type,title,message,link) values(uid,'native_push_test','Notification test','Your Android notification test was requested.','/notification-preferences');
end $$;
revoke all on function public.test_native_push() from public,anon;
grant execute on function public.test_native_push() to authenticated;

grant all on public.native_push_devices, public.native_push_jobs to service_role;
