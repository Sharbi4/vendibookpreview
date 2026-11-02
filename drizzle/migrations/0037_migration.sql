create table public.agent_conversation_audit (
  conversation_id text primary key,
  agent_key text not null,
  agent_id text not null,
  started_at timestamptz,
  duration_secs integer,
  status text,
  call_successful text,
  termination_reason text,
  title text,
  summary text,
  needs_follow_up boolean not null default false,
  follow_up_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  fetched_at timestamptz not null default now()
);
grant select, update on public.agent_conversation_audit to authenticated;
grant all on public.agent_conversation_audit to service_role;
alter table public.agent_conversation_audit enable row level security;
create policy "admins read agent audit" on public.agent_conversation_audit for select to authenticated using (public.has_role((select auth.uid()),'admin'));
create policy "admins mark reviewed" on public.agent_conversation_audit for update to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));
create index agent_conversation_audit_started_idx on public.agent_conversation_audit (started_at desc);

create or replace function public.dispatch_agent_conversation_audit() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/agent-conversation-audit',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.internal_cron_secret()),
    body := '{}'::jsonb
  );
end $$;
revoke all on function public.dispatch_agent_conversation_audit() from public, anon, authenticated;
grant execute on function public.dispatch_agent_conversation_audit() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'agent-conversation-audit') then
    perform cron.unschedule('agent-conversation-audit');
  end if;
  perform cron.schedule('agent-conversation-audit', '15 * * * *', 'select public.dispatch_agent_conversation_audit()');
end $$;