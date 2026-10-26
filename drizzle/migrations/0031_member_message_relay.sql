alter table public.conversation_messages add column if not exists held_for_relay boolean not null default false;
alter table public.booking_messages add column if not exists held_for_relay boolean not null default false;

create or replace function public.hold_member_message_for_relay()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.held_for_relay := true;
  end if;
  return new;
end $$;

create or replace function public.guard_relay_flag_update()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.held_for_relay is distinct from old.held_for_relay and auth.uid() is not null and not public.is_admin(auth.uid()) then
    raise exception 'not allowed';
  end if;
  return new;
end $$;

create or replace function public.alert_support_held_message()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  perform net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-message-email',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.internal_cron_secret()),
    body := jsonb_build_object('relay_alert', true, 'table', TG_TABLE_NAME, 'message_id', NEW.id::text)
  );
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists a_hold_for_relay on public.conversation_messages;
create trigger a_hold_for_relay before insert on public.conversation_messages
  for each row execute function public.hold_member_message_for_relay();
drop trigger if exists a_hold_for_relay on public.booking_messages;
create trigger a_hold_for_relay before insert on public.booking_messages
  for each row execute function public.hold_member_message_for_relay();

drop trigger if exists guard_relay_flag on public.conversation_messages;
create trigger guard_relay_flag before update on public.conversation_messages
  for each row execute function public.guard_relay_flag_update();
drop trigger if exists guard_relay_flag on public.booking_messages;
create trigger guard_relay_flag before update on public.booking_messages
  for each row execute function public.guard_relay_flag_update();

drop trigger if exists z_alert_support_held on public.conversation_messages;
create trigger z_alert_support_held after insert on public.conversation_messages
  for each row when (new.held_for_relay) execute function public.alert_support_held_message();
drop trigger if exists z_alert_support_held on public.booking_messages;
create trigger z_alert_support_held after insert on public.booking_messages
  for each row when (new.held_for_relay) execute function public.alert_support_held_message();

drop trigger if exists on_new_conversation_message on public.conversation_messages;
create trigger on_new_conversation_message after insert on public.conversation_messages
  for each row when (not new.held_for_relay) execute function public.notify_new_conversation_message();
drop trigger if exists on_new_booking_message on public.booking_messages;
create trigger on_new_booking_message after insert on public.booking_messages
  for each row when (not new.held_for_relay) execute function public.notify_new_booking_message();

alter table public.conversation_messages
  add column if not exists relayed_from uuid unique references public.conversation_messages(id),
  add column if not exists relayed_at timestamptz,
  add column if not exists relayed_by uuid references auth.users(id),
  add column if not exists relay_declined_at timestamptz,
  add column if not exists relay_decline_reason text;
alter table public.booking_messages
  add column if not exists relayed_from uuid unique references public.booking_messages(id),
  add column if not exists relayed_at timestamptz,
  add column if not exists relayed_by uuid references auth.users(id),
  add column if not exists relay_declined_at timestamptz,
  add column if not exists relay_decline_reason text;

drop policy if exists "Users can view messages in their conversations" on public.conversation_messages;
create policy "Users can view messages in their conversations" on public.conversation_messages
  for select using (
    ((sender_id = auth.uid() and relayed_at is null) or not held_for_relay)
    and exists (select 1 from public.conversations c
                where c.id = conversation_messages.conversation_id
                  and (c.host_id = auth.uid() or c.shopper_id = auth.uid())));

drop policy if exists "Hosts can view booking messages" on public.booking_messages;
create policy "Hosts can view booking messages" on public.booking_messages
  for select using (
    ((sender_id = auth.uid() and relayed_at is null) or not held_for_relay)
    and exists (select 1 from public.booking_requests br
                where br.id = booking_messages.booking_id and br.host_id = auth.uid()));

drop policy if exists "Shoppers can view booking messages" on public.booking_messages;
create policy "Shoppers can view booking messages" on public.booking_messages
  for select using (
    ((sender_id = auth.uid() and relayed_at is null) or not held_for_relay)
    and exists (select 1 from public.booking_requests br
                where br.id = booking_messages.booking_id and br.shopper_id = auth.uid()));

create or replace function public.relay_held_member_message(
  p_table text, p_message uuid, p_body text default null,
  p_relayed_by uuid default null, p_include_attachment boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m record;
  v_body text;
  v_problem text;
  v_copy uuid;
begin
  if p_table not in ('conversation_messages', 'booking_messages') then
    raise exception 'Unsupported message table';
  end if;
  if p_relayed_by is not null and not public.is_admin(p_relayed_by) then
    raise exception 'Admin required';
  end if;

  if p_table = 'conversation_messages' then
    select * into m from public.conversation_messages where id = p_message for update;
  else
    select * into m from public.booking_messages where id = p_message for update;
  end if;
  if not found then raise exception 'Message not found'; end if;

  if m.relayed_at is not null then
    if p_table = 'conversation_messages' then
      select id into v_copy from public.conversation_messages where relayed_from = p_message;
    else
      select id into v_copy from public.booking_messages where relayed_from = p_message;
    end if;
    return v_copy;
  end if;
  if not m.held_for_relay then raise exception 'Message is not awaiting relay'; end if;
  if m.relay_declined_at is not null then raise exception 'Message was declined'; end if;

  v_body := btrim(coalesce(p_body, m.message, ''));
  if v_body = '' and not (p_include_attachment and m.attachment_url is not null) then
    raise exception 'Relayed message is empty';
  end if;
  if length(v_body) > 5000 then raise exception 'Relayed message is longer than 5000 characters'; end if;
  v_problem := public.message_content_problem(v_body, false);
  if v_problem is not null then
    raise exception 'Remove private contact details or unsafe content before relaying: %', v_problem;
  end if;

  if p_table = 'conversation_messages' then
    insert into public.conversation_messages
      (conversation_id, sender_id, message, attachment_url, attachment_name, attachment_type, attachment_size, held_for_relay, relayed_from)
    values
      (m.conversation_id, m.sender_id, v_body,
       case when p_include_attachment then m.attachment_url end,
       case when p_include_attachment then m.attachment_name end,
       case when p_include_attachment then m.attachment_type end,
       case when p_include_attachment then m.attachment_size end,
       false, m.id)
    returning id into v_copy;
    update public.conversation_messages set relayed_at = now(), relayed_by = p_relayed_by where id = m.id;
    update public.conversations set last_message_at = now() where id = m.conversation_id;
  else
    insert into public.booking_messages
      (booking_id, sender_id, message, attachment_url, attachment_name, attachment_type, held_for_relay, relayed_from)
    values
      (m.booking_id, m.sender_id, v_body,
       case when p_include_attachment then m.attachment_url end,
       case when p_include_attachment then m.attachment_name end,
       case when p_include_attachment then m.attachment_type end,
       false, m.id)
    returning id into v_copy;
    update public.booking_messages set relayed_at = now(), relayed_by = p_relayed_by where id = m.id;
  end if;
  return v_copy;
end $$;

create or replace function public.decline_held_member_message(
  p_table text, p_message uuid, p_reason text, p_declined_by uuid default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m record;
begin
  if p_table not in ('conversation_messages', 'booking_messages') then
    raise exception 'Unsupported message table';
  end if;
  if p_declined_by is not null and not public.is_admin(p_declined_by) then
    raise exception 'Admin required';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'A decline reason is required';
  end if;
  if p_table = 'conversation_messages' then
    select * into m from public.conversation_messages where id = p_message for update;
  else
    select * into m from public.booking_messages where id = p_message for update;
  end if;
  if not found then raise exception 'Message not found'; end if;
  if m.relayed_at is not null then raise exception 'Message was already relayed'; end if;
  if not m.held_for_relay then raise exception 'Message is not awaiting relay'; end if;
  if p_table = 'conversation_messages' then
    update public.conversation_messages
      set relay_declined_at = coalesce(relay_declined_at, now()), relay_decline_reason = btrim(p_reason), relayed_by = p_declined_by
      where id = m.id;
  else
    update public.booking_messages
      set relay_declined_at = coalesce(relay_declined_at, now()), relay_decline_reason = btrim(p_reason), relayed_by = p_declined_by
      where id = m.id;
  end if;
end $$;

revoke all on function public.relay_held_member_message(text, uuid, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.relay_held_member_message(text, uuid, text, uuid, boolean) to service_role;
revoke all on function public.decline_held_member_message(text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.decline_held_member_message(text, uuid, text, uuid) to service_role;

create index if not exists conversation_messages_awaiting_relay_idx on public.conversation_messages (created_at)
  where held_for_relay and relayed_at is null and relay_declined_at is null;
create index if not exists booking_messages_awaiting_relay_idx on public.booking_messages (created_at)
  where held_for_relay and relayed_at is null and relay_declined_at is null;