create or replace function public.queue_message_risk_scan() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(btrim(new.message),'') = '' then return new; end if;
  perform net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/message-risk-scan',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','c1599d29c002d37e940a64bf669f19a4f0e4cf8cfe429725'),
    body := jsonb_build_object('kind', case when tg_table_name='offers' then 'offer' else 'conversation_message' end, 'id', new.id)
  );
  return new;
exception when others then
  return new; -- never block messaging if the scanner is unreachable
end $$;
revoke all on function public.queue_message_risk_scan() from public, anon, authenticated;
drop trigger if exists trg_message_risk_scan on public.conversation_messages;
create trigger trg_message_risk_scan after insert on public.conversation_messages for each row execute function public.queue_message_risk_scan();
drop trigger if exists trg_offer_risk_scan on public.offers;
create trigger trg_offer_risk_scan after insert or update of message on public.offers for each row execute function public.queue_message_risk_scan();
drop policy if exists "Authenticated users can read feature flags" on public.app_feature_flags;