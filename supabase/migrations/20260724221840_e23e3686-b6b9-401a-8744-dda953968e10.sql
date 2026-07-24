CREATE OR REPLACE FUNCTION public.acknowledge_transaction_terms(_terms_id uuid, _ip inet, _ua text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.transaction_terms
     SET acknowledged_at = COALESCE(acknowledged_at, now()),
         acknowledged_ip = COALESCE(acknowledged_ip, _ip),
         acknowledged_user_agent = COALESCE(acknowledged_user_agent, _ua)
   WHERE id = _terms_id
     AND buyer_id = auth.uid();
END;
$function$;