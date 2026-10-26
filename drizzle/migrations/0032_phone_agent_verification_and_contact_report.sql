create table if not exists public.phone_agent_verifications (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('text', 'email')),
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_agent_verifications_conversation_idx
  on public.phone_agent_verifications (conversation_id, created_at desc);
alter table public.phone_agent_verifications enable row level security;
revoke all on public.phone_agent_verifications from anon, authenticated;
grant all on public.phone_agent_verifications to service_role;

create or replace function public.dispatch_agent_contact_report() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/agent-contact-report',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.internal_cron_secret()),
    body := '{}'::jsonb
  );
end $$;
revoke all on function public.dispatch_agent_contact_report() from public, anon, authenticated;
grant execute on function public.dispatch_agent_contact_report() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'agent-contact-report') then
    perform cron.unschedule('agent-contact-report');
  end if;
  perform cron.schedule('agent-contact-report', '5 */2 * * *', 'select public.dispatch_agent_contact_report()');
end $$;