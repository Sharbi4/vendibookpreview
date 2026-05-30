
-- ============================================================
-- REFERRAL PROGRAM v2 — Supply / Purchase / Rental
-- ============================================================

-- 1. Extend existing referrals table
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_type text,
  ADD COLUMN IF NOT EXISTS reward_amount numeric,
  ADD COLUMN IF NOT EXISTS transaction_id uuid,
  ADD COLUMN IF NOT EXISTS on_hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS payout_date timestamptz,
  ADD COLUMN IF NOT EXISTS attribution_source text;  -- 'cookie' | 'manual_code' | 'signup_link'

ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_program_type_chk
    CHECK (program_type IS NULL OR program_type IN ('supply','purchase','rental'));

-- 2. Extend profiles with referral money / compliance state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_ytd_earnings numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_w9_collected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_terms_version_accepted text;

-- 3. Add referral_code to bookings + sales for checkout attribution
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS referral_code text;

-- ============================================================
-- 4. Click log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  program_type text,
  destination_path text,
  hashed_ip text,
  user_agent text,
  device_type text,
  source_header text,
  country text,
  region text,
  converted_to_signup boolean NOT NULL DEFAULT false,
  signup_user_id uuid,
  cookie_set boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created ON public.referral_clicks(created_at DESC);

GRANT SELECT ON public.referral_clicks TO authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all clicks" ON public.referral_clicks
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Owners view own clicks" ON public.referral_clicks
  FOR SELECT TO authenticated USING (
    code IN (SELECT code FROM public.referral_codes WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5. Status change log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by_user_id uuid,
  changed_by_source text NOT NULL DEFAULT 'system',  -- 'system' | 'admin' | 'user'
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_status_log_referral ON public.referral_status_log(referral_id);

GRANT SELECT ON public.referral_status_log TO authenticated;
GRANT ALL ON public.referral_status_log TO service_role;
ALTER TABLE public.referral_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all status logs" ON public.referral_status_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Referrer views own status logs" ON public.referral_status_log
  FOR SELECT TO authenticated USING (
    referral_id IN (SELECT id FROM public.referrals WHERE referrer_id = auth.uid())
  );

-- ============================================================
-- 6. Payouts ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  amount_gross numeric NOT NULL,
  stripe_fee numeric NOT NULL DEFAULT 0,
  amount_net numeric NOT NULL,
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'pending',  -- pending | sent | paid | failed
  failure_reason text,
  referral_ids uuid[] NOT NULL DEFAULT '{}',
  attempted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON public.referral_payouts(referrer_id);

GRANT SELECT ON public.referral_payouts TO authenticated;
GRANT ALL ON public.referral_payouts TO service_role;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own payouts" ON public.referral_payouts
  FOR SELECT TO authenticated USING (referrer_id = auth.uid());
CREATE POLICY "Admins view all payouts" ON public.referral_payouts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- 7. Fraud flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_id uuid,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',  -- low | medium | high
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_referral ON public.referral_fraud_flags(referral_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_unresolved ON public.referral_fraud_flags(resolved_at) WHERE resolved_at IS NULL;

GRANT SELECT ON public.referral_fraud_flags TO authenticated;
GRANT ALL ON public.referral_fraud_flags TO service_role;
ALTER TABLE public.referral_fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fraud flags" ON public.referral_fraud_flags
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 8. Terms acceptance ledger (timestamped + IP for legal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL,
  ip_address text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user ON public.referral_terms_acceptance(user_id);

GRANT SELECT, INSERT ON public.referral_terms_acceptance TO authenticated;
GRANT ALL ON public.referral_terms_acceptance TO service_role;
ALTER TABLE public.referral_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User inserts own acceptance" ON public.referral_terms_acceptance
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User views own acceptance" ON public.referral_terms_acceptance
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- 9. W-9 records (data only — actual PDF stored separately)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_w9_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  taxpayer_name text NOT NULL,
  tax_id_last4 text NOT NULL,
  address_line text,
  address_city text,
  address_state text,
  address_zip text,
  storage_path text,
  collected_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referral_w9_records TO authenticated;
GRANT ALL ON public.referral_w9_records TO service_role;
ALTER TABLE public.referral_w9_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own w9" ON public.referral_w9_records
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin reads w9" ON public.referral_w9_records
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- 10. Program config (admin-tunable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_program_config (
  program_type text PRIMARY KEY,
  reward_amount numeric NOT NULL,
  min_transaction_value numeric NOT NULL DEFAULT 0,
  hold_days integer NOT NULL DEFAULT 0,
  monthly_cap integer,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.referral_program_config TO anon, authenticated;
GRANT ALL ON public.referral_program_config TO service_role;
ALTER TABLE public.referral_program_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config readable by all" ON public.referral_program_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin updates config" ON public.referral_program_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin inserts config" ON public.referral_program_config
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Seed three programs
INSERT INTO public.referral_program_config (program_type, reward_amount, min_transaction_value, hold_days, monthly_cap)
VALUES
  ('supply',  150, 0,    7,  NULL),
  ('purchase',500, 3000, 14, 10),
  ('rental',  50,  150,  2,  NULL)
ON CONFLICT (program_type) DO NOTHING;

-- ============================================================
-- 11. Helper RPC: log status change (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_referral_status_change(
  p_referral_id uuid,
  p_new_status text,
  p_source text DEFAULT 'system',
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_old text;
BEGIN
  SELECT status INTO v_old FROM public.referrals WHERE id = p_referral_id;
  UPDATE public.referrals
    SET status = p_new_status,
        updated_at = now(),
        qualified_at = CASE WHEN p_new_status = 'qualified' AND qualified_at IS NULL THEN now() ELSE qualified_at END,
        payout_date = CASE WHEN p_new_status = 'paid' THEN now() ELSE payout_date END
    WHERE id = p_referral_id;
  INSERT INTO public.referral_status_log (referral_id, old_status, new_status, changed_by_source, changed_by_user_id, note)
    VALUES (p_referral_id, v_old, p_new_status, p_source,
            CASE WHEN p_source = 'admin' THEN auth.uid() ELSE NULL END,
            p_note);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_referral_status_change(uuid, text, text, text) TO authenticated, service_role;

-- ============================================================
-- 12. Admin RPC: set program config
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_referral_config(
  p_program_type text,
  p_reward_amount numeric,
  p_min_transaction_value numeric,
  p_hold_days integer,
  p_monthly_cap integer,
  p_is_active boolean
) RETURNS public.referral_program_config
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.referral_program_config;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.referral_program_config
    SET reward_amount = p_reward_amount,
        min_transaction_value = p_min_transaction_value,
        hold_days = p_hold_days,
        monthly_cap = p_monthly_cap,
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE program_type = p_program_type
    RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_referral_config(text, numeric, numeric, integer, integer, boolean) TO authenticated;

-- ============================================================
-- 13. RPC: list payable referrers (used by weekly cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_payable_referrers(p_min_payout numeric DEFAULT 50)
RETURNS TABLE(referrer_id uuid, total_owed numeric, referral_ids uuid[])
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.referrer_id,
         SUM(r.reward_amount)::numeric AS total_owed,
         array_agg(r.id) AS referral_ids
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referrer_id
  WHERE r.status = 'qualified'
    AND (r.on_hold_until IS NULL OR r.on_hold_until <= now())
    AND p.stripe_onboarding_complete = true
    AND p.referral_suspended = false
    AND (p.referral_ytd_earnings < 500 OR p.referral_w9_collected = true)
  GROUP BY r.referrer_id
  HAVING SUM(r.reward_amount) >= p_min_payout;
$$;
GRANT EXECUTE ON FUNCTION public.list_payable_referrers(numeric) TO service_role;

-- ============================================================
-- 14. RPC: monthly purchase referral count (cap enforcement)
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_purchase_referrals_this_month(p_referrer_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.referrals
  WHERE referrer_id = p_referrer_id
    AND program_type = 'purchase'
    AND status IN ('qualified','paid')
    AND created_at >= date_trunc('month', now());
$$;
GRANT EXECUTE ON FUNCTION public.count_purchase_referrals_this_month(uuid) TO authenticated, service_role;
