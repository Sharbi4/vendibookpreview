-- Grandfather legacy identity verifications into the Plaid-backed badge.
CREATE OR REPLACE FUNCTION public.is_seller_identity_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_verifications sv
    WHERE sv.user_id = _user_id
      AND sv.identity_status = 'success'
      AND sv.payment_state = 'captured'
      AND sv.verified_at IS NOT NULL
      AND sv.revoked_at IS NULL
  )
  OR EXISTS (
    -- Legacy (pre-Plaid) verified sellers stay verified permanently.
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND COALESCE(p.identity_verified, false) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.seller_identity_badges(_user_ids uuid[])
RETURNS TABLE(user_id uuid, verified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sv.user_id, sv.verified_at
  FROM public.seller_verifications sv
  WHERE sv.user_id = ANY(_user_ids)
    AND sv.identity_status = 'success'
    AND sv.payment_state = 'captured'
    AND sv.verified_at IS NOT NULL
    AND sv.revoked_at IS NULL
  UNION
  SELECT p.id, p.identity_verified_at
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
    AND COALESCE(p.identity_verified, false) = true;
$$;

CREATE OR REPLACE FUNCTION public.get_my_seller_verification()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
        'status', CASE WHEN (sv.identity_status = 'success'
                            AND sv.payment_state = 'captured'
                            AND sv.verified_at IS NOT NULL
                            AND sv.revoked_at IS NULL)
                       OR public.is_seller_identity_verified(auth.uid())
                  THEN 'verified' ELSE sv.status END,
        'identity_status', sv.identity_status,
        'payment_state', sv.payment_state,
        'verified', public.is_seller_identity_verified(auth.uid()),
        'verified_at', COALESCE(sv.verified_at,
          (SELECT p.identity_verified_at FROM public.profiles p WHERE p.id = auth.uid())),
        'revoked', sv.revoked_at IS NOT NULL,
        'retry_count', sv.retry_count,
        'retry_allowance', sv.retry_allowance,
        'terms_version', sv.terms_version,
        'updated_at', sv.updated_at
      )
      FROM public.seller_verifications sv
      WHERE sv.user_id = auth.uid()),
    jsonb_build_object(
      'status', CASE WHEN public.is_seller_identity_verified(auth.uid()) THEN 'verified' ELSE 'not_started' END,
      'verified', public.is_seller_identity_verified(auth.uid()),
      'verified_at', (SELECT p.identity_verified_at FROM public.profiles p WHERE p.id = auth.uid())
    )
  );
$$;