
-- 1. Host subscription hardening columns
ALTER TABLE public.host_subscriptions
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT,
  ADD COLUMN IF NOT EXISTS revoke_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Restrict admin writes: admins may view but not directly write; only service_role writes
DROP POLICY IF EXISTS "admins manage host subscriptions" ON public.host_subscriptions;
CREATE POLICY "admins view host subscriptions"
  ON public.host_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Webhook events: retry bookkeeping
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- 4. Tier helper (usable in RLS + edge functions via RPC)
CREATE OR REPLACE FUNCTION public.user_has_tier(_user_id UUID, _min_tier TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rank AS (
    SELECT CASE lower(_min_tier)
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'premium' THEN 3
      ELSE 99
    END AS need
  ),
  cur AS (
    SELECT CASE lower(coalesce(tier,'free'))
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'premium' THEN 3
      ELSE 0
    END AS have
    FROM public.host_subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','trialing','past_due')
      AND (revoke_at_period_end = FALSE OR current_period_end > now())
    ORDER BY updated_at DESC
    LIMIT 1
  )
  SELECT COALESCE((SELECT have FROM cur), 0) >= (SELECT need FROM rank);
$$;

GRANT EXECUTE ON FUNCTION public.user_has_tier(UUID, TEXT) TO authenticated, anon, service_role;
