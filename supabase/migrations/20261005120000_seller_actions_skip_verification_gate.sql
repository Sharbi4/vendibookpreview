-- Owner decision 2026-10-05 (verification wall, option 1):
-- phone + identity verification gate buyer-initiated contact only. Sellers
-- acting on their own listings (editing/publishing, answering offers, replying
-- in their own conversations and bookings) are never gated, so an unverified
-- seller can still close a sale. New listings keep the pre-existing phone
-- check but not the identity check.
create or replace function public.guard_signup_phone_actions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid;
  row_data jsonb := to_jsonb(new);
  seller_side boolean := false;
begin
  if tg_op = 'INSERT' then
    actor := case
      when tg_table_name in ('conversation_messages', 'booking_messages') then (row_data->>'sender_id')::uuid
      when tg_table_name in ('sale_transactions', 'offers') then (row_data->>'buyer_id')::uuid
      when tg_table_name = 'listings' then (row_data->>'host_id')::uuid
      else coalesce(auth.uid(), (row_data->>'shopper_id')::uuid)
    end;
  else
    actor := auth.uid();
  end if;

  if actor is not null then
    seller_side := case tg_table_name
      when 'listings' then tg_op = 'UPDATE' and actor = (to_jsonb(old)->>'host_id')::uuid
      when 'offers' then tg_op = 'UPDATE' and actor = (row_data->>'seller_id')::uuid
      when 'sale_transactions' then tg_op = 'UPDATE' and actor = (row_data->>'seller_id')::uuid
      when 'conversations' then actor = (row_data->>'host_id')::uuid
      when 'booking_requests' then tg_op = 'UPDATE' and actor = (row_data->>'host_id')::uuid
      when 'conversation_messages' then exists (
        select 1 from public.conversations c
        where c.id = (row_data->>'conversation_id')::uuid and c.host_id = actor)
      when 'booking_messages' then exists (
        select 1 from public.booking_requests b
        where b.id = (row_data->>'booking_id')::uuid and b.host_id = actor)
      else false
    end;
  end if;

  if seller_side then
    return new;
  end if;

  if public.signup_phone_required(actor) then
    raise exception 'Verify your mobile number to finish creating your account.';
  end if;

  -- Creating a listing is supply, not contact: phone check only.
  if tg_table_name = 'listings' and tg_op = 'INSERT' then
    return new;
  end if;

  if public.signup_identity_required(actor) then
    raise exception 'Verify your identity to message, make offers, or buy on Vendibook.';
  end if;
  return new;
end
$function$;
