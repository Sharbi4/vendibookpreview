begin;
-- Retain only routing metadata, never removed message content or phishing URLs.
create table if not exists public.removed_spam_conversations (
  conversation_id uuid not null,
  recipient_id uuid not null,
  sender_id uuid not null,
  removed_at timestamptz not null default now(),
  primary key (conversation_id, recipient_id)
);
alter table public.removed_spam_conversations enable row level security;
revoke all on public.removed_spam_conversations from anon, authenticated;
grant all on public.removed_spam_conversations to service_role;

create or replace function public.get_removed_conversation_notice(_conversation_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from auth.users u where u.id=r.sender_id)
    then 'spam_removed' else 'spam_sender_deleted' end
  from public.removed_spam_conversations r
  where r.conversation_id=_conversation_id and r.recipient_id=auth.uid()
  limit 1;
$$;
revoke all on function public.get_removed_conversation_notice(uuid) from public,anon;
grant execute on function public.get_removed_conversation_notice(uuid) to authenticated;

-- Moderation must use this before deleting a confirmed spam thread/account.
-- Ordinary account closures and inaccessible conversations are never marked spam.
create or replace function public.remove_confirmed_spam_conversation(_conversation_id uuid, _sender_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.conversations%rowtype;
begin
  if auth.role() is distinct from 'service_role' and not coalesce(public.is_admin(auth.uid()),false) then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  select * into c from public.conversations where id=_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  if _sender_id is null or _sender_id not in (c.host_id,c.shopper_id) then
    raise exception 'Sender must belong to this conversation';
  end if;
  insert into public.removed_spam_conversations(conversation_id,recipient_id,sender_id)
  values(c.id,case when c.host_id=_sender_id then c.shopper_id else c.host_id end,_sender_id)
  on conflict do nothing;
  delete from public.conversation_messages where conversation_id=c.id;
  delete from public.conversations where id=c.id;
end $$;
revoke all on function public.remove_confirmed_spam_conversation(uuid,uuid) from public,anon;
grant execute on function public.remove_confirmed_spam_conversation(uuid,uuid) to authenticated,service_role;
commit;
