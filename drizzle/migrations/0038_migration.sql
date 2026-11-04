-- lovable-cron-fallback-reviewed: armed only while scheduled Reddit posts exist (wake-on-enqueue, unschedules after drain); 5-minute posting window
create table public.reddit_scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  subreddit text not null default 'mobilefoodbiz',
  kind text not null default 'self' check (kind in ('self','link')),
  title text not null check (char_length(title) between 1 and 300),
  body text,
  url text,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','posting','posted','failed','cancelled')),
  reddit_post_id text,
  reddit_url text,
  error text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  posted_at timestamptz
);
grant all on public.reddit_scheduled_posts to service_role;
grant select on public.reddit_scheduled_posts to authenticated;
alter table public.reddit_scheduled_posts enable row level security;
create policy "Admins read reddit schedule" on public.reddit_scheduled_posts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create index reddit_scheduled_due_idx on public.reddit_scheduled_posts (scheduled_for) where status = 'scheduled';

create or replace function public.dispatch_reddit_scheduled_posts() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.reddit_scheduled_posts where status = 'scheduled') then
    if exists (select 1 from cron.job where jobname = 'reddit-scheduled-posts') then
      perform cron.unschedule('reddit-scheduled-posts');
    end if;
    return;
  end if;
  if exists (select 1 from public.reddit_scheduled_posts where status = 'scheduled' and scheduled_for <= now()) then
    perform net.http_post(
      url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/reddit-admin',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.internal_cron_secret()),
      body := '{"action":"run_due"}'::jsonb
    );
  end if;
end $$;
revoke all on function public.dispatch_reddit_scheduled_posts() from public, anon, authenticated;
grant execute on function public.dispatch_reddit_scheduled_posts() to service_role;

create or replace function public.arm_reddit_schedule() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'scheduled' and not exists (select 1 from cron.job where jobname = 'reddit-scheduled-posts') then
    perform cron.schedule('reddit-scheduled-posts', '*/5 * * * *', 'select public.dispatch_reddit_scheduled_posts()');
  end if;
  return new;
end $$;
revoke all on function public.arm_reddit_schedule() from public, anon, authenticated;
create trigger reddit_schedule_arm after insert on public.reddit_scheduled_posts
  for each row execute function public.arm_reddit_schedule();