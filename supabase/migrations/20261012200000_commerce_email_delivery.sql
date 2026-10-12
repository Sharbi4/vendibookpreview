alter table public.commerce_events
  add column email_lease_token uuid,
  add column email_lease_until timestamptz;
create index commerce_email_due on public.commerce_events(email_next_attempt_at) where email_sent_at is null;

create function public.claim_commerce_emails(_token uuid,_actor uuid default null)
returns setof public.commerce_events language sql security definer set search_path=public as $$
  update public.commerce_events e set email_lease_token=_token,
    email_lease_until=clock_timestamp()+interval '10 minutes',
    email_attempts=e.email_attempts+1
  where e.id in (
    select q.id from public.commerce_events q
    where q.email_sent_at is null and q.email_next_attempt_at<=clock_timestamp()
      and (q.email_lease_until is null or q.email_lease_until<clock_timestamp())
      and (_actor is null or q.actor_id=_actor)
    order by q.created_at,q.id limit 10 for update skip locked
  ) returning e.*;
$$;
create function public.finish_commerce_email(_event uuid,_token uuid,_error text default null)
returns void language sql security definer set search_path=public as $$
  update public.commerce_events set
    email_sent_at=case when _error is null then clock_timestamp() else null end,
    email_last_error=left(_error,500),email_lease_token=null,email_lease_until=null,
    email_next_attempt_at=clock_timestamp()+make_interval(secs=>least(21600,60*power(2,least(email_attempts,8)))::integer)
  where id=_event and email_lease_token=_token;
$$;
revoke all on function public.claim_commerce_emails(uuid,uuid),public.finish_commerce_email(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_commerce_emails(uuid,uuid),public.finish_commerce_email(uuid,uuid,text) to service_role;
