-- Close video walkthroughs left at scheduled/rescheduled after their slot ended.
-- Same evidence rule as video-walkthrough-exit: completed only when both sides
-- joined (buyer+seller, or host+renter); otherwise no_show. Runs hourly and
-- only touches slots that ended more than an hour ago.
create or replace function public.close_stale_video_walkthroughs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_status text;
  v_count integer := 0;
begin
  for v_row in
    select w.id,
      (select array_agg(distinct e.event_type) from public.video_walkthrough_events e
        where e.walkthrough_id = w.id
          and e.event_type in ('buyer_joined', 'seller_joined', 'host_joined', 'renter_joined')) as joins
    from public.video_walkthroughs w
    where w.status in ('scheduled', 'rescheduled')
      and w.ends_at < now() - interval '1 hour'
    for update of w skip locked
  loop
    v_status := case
      when coalesce(v_row.joins, '{}') @> array['buyer_joined', 'seller_joined']
        or coalesce(v_row.joins, '{}') @> array['host_joined', 'renter_joined'] then 'completed'
      else 'no_show'
    end;
    update public.video_walkthroughs
      set status = v_status,
          completed_at = case when v_status = 'completed' then coalesce(completed_at, now()) else completed_at end
      where id = v_row.id and status in ('scheduled', 'rescheduled');
    insert into public.video_walkthrough_events (walkthrough_id, actor_id, event_type, metadata)
      values (v_row.id, null, v_status, jsonb_build_object('source', 'auto_close_after_slot'));
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.close_stale_video_walkthroughs() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'close-stale-video-walkthroughs') then
    perform cron.unschedule('close-stale-video-walkthroughs');
  end if;
  perform cron.schedule('close-stale-video-walkthroughs', '17 * * * *', 'select public.close_stale_video_walkthroughs()');
end $$;
