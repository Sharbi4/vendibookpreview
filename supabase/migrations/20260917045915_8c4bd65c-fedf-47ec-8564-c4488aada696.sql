CREATE OR REPLACE FUNCTION public.seller_payment_readiness(_seller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gating boolean := false;
  _row record;
  _reasons text[] := ARRAY[]::text[];
  _ready boolean := false;
BEGIN
  SELECT COALESCE(enabled, false) INTO _gating
  FROM public.app_feature_flags
  WHERE key = 'paypal_multiparty_enabled'
  LIMIT 1;

  _gating := COALESCE(_gating, false);

  IF _seller_id IS NULL THEN
    RETURN jsonb_build_object('gating_active', _gating, 'ready', false, 'reasons', to_jsonb(ARRAY['not_connected']::text[]));
  END IF;

  SELECT onboarding_status, primary_email_confirmed, payments_receivable, merchant_id
    INTO _row
  FROM public.seller_paypal_accounts
  WHERE user_id = _seller_id AND archived_at IS NULL
  LIMIT 1;

  IF _row IS NULL THEN
    _reasons := ARRAY['not_connected'];
  ELSE
    IF _row.onboarding_status IS DISTINCT FROM 'ready' THEN
      _reasons := _reasons || 'onboarding_incomplete';
    END IF;
    IF _row.primary_email_confirmed IS DISTINCT FROM true THEN
      _reasons := _reasons || 'primary_email_unconfirmed';
    END IF;
    IF _row.payments_receivable IS DISTINCT FROM true THEN
      _reasons := _reasons || 'payments_not_receivable';
    END IF;
    IF _row.merchant_id IS NULL THEN
      _reasons := _reasons || 'merchant_missing';
    END IF;
    _ready := array_length(_reasons, 1) IS NULL;
  END IF;

  RETURN jsonb_build_object('gating_active', _gating, 'ready', _ready, 'reasons', to_jsonb(_reasons));
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_payment_readiness(uuid) TO anon, authenticated, service_role;