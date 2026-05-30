
-- Feature flags table (singleton key/value)
CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.app_feature_flags TO anon, authenticated;
GRANT ALL ON public.app_feature_flags TO service_role;

ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON public.app_feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can update feature flags"
  ON public.app_feature_flags FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_feature_flags (key, enabled, description) VALUES
  ('referral_program_enabled', true,  'Master switch for the referral program. If false, /referral shows waitlist and new attributions stop.'),
  ('referral_auto_payout_enabled', false, 'When false, payout batch will not auto-transfer. Admins must mark referrals paid manually.')
ON CONFLICT (key) DO NOTHING;

-- Audit + attribution columns on referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS cookie_attribution_code text,
  ADD COLUMN IF NOT EXISTS manual_attribution_code text,
  ADD COLUMN IF NOT EXISTS pending_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text;
