create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;

create table if not exists internal.job_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
revoke all on internal.job_secrets from public, anon, authenticated;

insert into internal.job_secrets(name, value)
values ('cron', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

create or replace function public.internal_cron_secret() returns text
language sql stable security definer set search_path = internal, public as $$
  select value from internal.job_secrets where name = 'cron'
$$;
revoke all on function public.internal_cron_secret() from public, anon, authenticated;
grant execute on function public.internal_cron_secret() to service_role;

create or replace function public.invoke_edge_function(_fn text, _body jsonb default '{}'::jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if _fn !~ '^[a-z0-9-]+$' then raise exception 'invalid function name'; end if;
  select net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/' || _fn,
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.internal_cron_secret()),
    body := coalesce(_body, '{}'::jsonb)
  ) into rid;
  return rid;
end $$;
revoke all on function public.invoke_edge_function(text, jsonb) from public, anon, authenticated;

create or replace function public.queue_message_risk_scan() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(btrim(new.message),'') = '' then return new; end if;
  perform public.invoke_edge_function('message-risk-scan',
    jsonb_build_object('kind', case when tg_table_name='offers' then 'offer' else 'conversation_message' end, 'id', new.id));
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.queue_message_risk_scan() from public, anon, authenticated;

do $$
declare r record; def text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and p.proname in ('notify_booking_status_change','notify_document_status_change',
                               'notify_new_booking_message','notify_new_conversation_message',
                               'notify_sale_transaction_status_change')
  loop
    def := pg_get_functiondef(r.oid);
    def := regexp_replace(def, '''x-cron-secret'',\s*''[0-9a-f]{32,}''', '''x-cron-secret'', public.internal_cron_secret()', 'g');
    execute def;
  end loop;

  select pg_get_functiondef('public.apply_pending_featured_on_publish'::regproc) into def;
  def := replace(def,
    E'url := ''https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification'',\n        headers := jsonb_build_object(\n          ''Content-Type'', ''application/json'',',
    E'url := ''https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification'',\n        headers := jsonb_build_object(\n          ''Content-Type'', ''application/json'', ''x-cron-secret'', public.internal_cron_secret(),');
  execute def;
end $$;

do $$
declare j record; fn text; body jsonb;
begin
  for j in select jobid, command from cron.job loop
    fn := substring(j.command from 'functions/v1/([a-z0-9-]+)');
    if fn in ('complete-ended-bookings','send-document-reminder','expire-booking-holds','expire-stale-offers',
              'listing-visibility-sweep','monetization-reconciler','notify-expired-boosts','send-draft-reminder',
              'send-availability-alerts','send-booking-24h-reminders','send-booking-abandonment-emails',
              'send-feedback-requests','send-pending-request-reminder','send-referral-emails',
              'send-renewal-reminders','send-subscription-getting-started','signnow-agreement-sweep') then
      body := case when fn = 'send-availability-alerts'
                then jsonb_build_object('lookback_minutes', 65, 'cron', true)
                else jsonb_build_object('source', 'cron') end;
      perform cron.alter_job(j.jobid, command := format('select public.invoke_edge_function(%L, %L::jsonb)', fn, body::text));
    end if;
  end loop;
end $$;

drop policy if exists "Anyone can upload spotlight media" on storage.objects;
create policy "Users upload own spotlight media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'spotlight-media'
  and (storage.foldername(name))[1] = 'submissions'
  and (storage.foldername(name))[2] = (select auth.uid()::text)
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','heic','heif','gif'])
);