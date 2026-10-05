-- Rollback for 20261005073000_seller_verification_exemption.sql.
-- Restores the production definitions captured on 2026-10-05 before the change
-- (every non-admin needs phone + ID verification for any write; UI walls everyone).

CREATE OR REPLACE FUNCTION public.guard_signup_phone_actions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor uuid; row_data jsonb:=to_jsonb(new);
begin
  if tg_op='INSERT' then
    actor:=case
      when tg_table_name in ('conversation_messages','booking_messages') then (row_data->>'sender_id')::uuid
      when tg_table_name in ('sale_transactions','offers') then (row_data->>'buyer_id')::uuid
      when tg_table_name='listings' then (row_data->>'host_id')::uuid
      else coalesce(auth.uid(),(row_data->>'shopper_id')::uuid) end;
  else actor:=auth.uid(); end if;
  if public.signup_phone_required(actor) then raise exception 'Verify your mobile number to finish creating your account.'; end if;
  if public.signup_identity_required(actor) then raise exception 'Verify your identity to message, make offers, or buy on Vendibook.'; end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.signup_phone_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare challenge record;
begin
  if auth.uid() is null then raise exception 'Sign in to verify your phone.'; end if;
  select phone_e164,created_at,delivery_state,expires_at,used_at into challenge
    from public.signup_phone_challenges where user_id=auth.uid() order by created_at desc,id desc limit 1;
  return jsonb_build_object('required',public.signup_phone_required(),
    'identity_required',public.signup_identity_required(),
    'phone',challenge.phone_e164,
    'pending',coalesce(challenge.delivery_state='sent' and challenge.used_at is null and challenge.expires_at>now(),false),
    'retry_after',greatest(0,coalesce(ceil(extract(epoch from(challenge.created_at+interval '60 seconds'-now())))::int,0)));
end $function$;
