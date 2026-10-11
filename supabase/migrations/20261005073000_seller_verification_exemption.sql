-- Seller verification exemption (owner decision 2026-10-05).
-- Already applied to production on 2026-10-05 ~07:25 UTC; this file records it.
-- Idempotent: CREATE OR REPLACE only, no data changes.
--
-- Sellers acting on their OWN listings are never blocked by the phone/ID
-- gate: editing listings, replying in conversations on their listings,
-- answering offers, managing bookings and sales. Ownership is checked against
-- the stored row (OLD) and the listing, never client-supplied values alone.
-- Buyer-initiated contact (conversation, offer, booking, purchase) and
-- starting a conversation as a host still require phone + ID verification.
-- Creating a listing requires phone verification only.
-- signup_phone_status() no longer walls listing hosts in the UI.
-- Scam protection: message-risk-scan (per message) + hourly trust-safety-sweep.

CREATE OR REPLACE FUNCTION public.guard_signup_phone_actions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid;
  row_data jsonb := to_jsonb(new);
  old_data jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
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

  -- Sellers acting on their OWN listings are never blocked (owner decision
  -- 2026-10-05). Ownership is checked against the stored row (OLD) and the
  -- listing itself, never against client-supplied values alone, and
  -- conversations can only be started by verified members.
  if actor is not null then
    seller_side := case tg_table_name
      when 'listings' then tg_op = 'UPDATE'
        and actor = (old_data->>'host_id')::uuid and actor = (row_data->>'host_id')::uuid
      when 'offers' then tg_op = 'UPDATE'
        and actor = (old_data->>'seller_id')::uuid and actor = (row_data->>'seller_id')::uuid
      when 'sale_transactions' then tg_op = 'UPDATE'
        and actor = (old_data->>'seller_id')::uuid and actor = (row_data->>'seller_id')::uuid
      when 'booking_requests' then tg_op = 'UPDATE'
        and actor = (old_data->>'host_id')::uuid and actor = (row_data->>'host_id')::uuid
      when 'conversations' then tg_op = 'UPDATE'
        and actor = (old_data->>'host_id')::uuid and actor = (row_data->>'host_id')::uuid
        and exists (select 1 from public.listings l
                    where l.id = (old_data->>'listing_id')::uuid and l.host_id = actor)
      when 'conversation_messages' then exists (
        select 1 from public.conversations c
        join public.listings l on l.id = c.listing_id
        where c.id = (row_data->>'conversation_id')::uuid
          and c.host_id = actor and l.host_id = actor)
      when 'booking_messages' then exists (
        select 1 from public.booking_requests b
        join public.listings l on l.id = b.listing_id
        where b.id = (row_data->>'booking_id')::uuid
          and b.host_id = actor and l.host_id = actor)
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

CREATE OR REPLACE FUNCTION public.signup_phone_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare challenge record; is_host boolean;
begin
  if auth.uid() is null then raise exception 'Sign in to verify your phone.'; end if;
  select phone_e164,created_at,delivery_state,expires_at,used_at into challenge
    from public.signup_phone_challenges where user_id=auth.uid() order by created_at desc,id desc limit 1;
  -- Sellers are never walled (owner decision 2026-10-05): anyone who hosts a
  -- listing can keep working on their listings and answer buyers. Buyer-side
  -- contact is still gated server-side by guard_signup_phone_actions.
  is_host := exists(select 1 from public.listings l where l.host_id = auth.uid() and l.deleted_at is null);
  return jsonb_build_object('required', case when is_host then false else public.signup_phone_required() end,
    'identity_required', case when is_host then false else public.signup_identity_required() end,
    'phone',challenge.phone_e164,
    'pending',coalesce(challenge.delivery_state='sent' and challenge.used_at is null and challenge.expires_at>now(),false),
    'retry_after',greatest(0,coalesce(ceil(extract(epoch from(challenge.created_at+interval '60 seconds'-now())))::int,0)));
end $function$;
