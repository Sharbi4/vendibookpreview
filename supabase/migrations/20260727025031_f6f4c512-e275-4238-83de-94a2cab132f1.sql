
-- ============================================================
-- SMS CONSENT & COMPLIANCE
-- ============================================================

-- 1) sms_preferences: current effective state per (user, phone)
CREATE TABLE IF NOT EXISTS public.sms_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  transactional_status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (transactional_status IN ('opted_in','opted_out','pending_verification')),
  marketing_status TEXT NOT NULL DEFAULT 'not_enrolled'
    CHECK (marketing_status IN ('not_enrolled','opted_in','opted_out')),
  consent_source TEXT,
  consent_version TEXT,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  twilio_sync_status TEXT DEFAULT 'unsynced'
    CHECK (twilio_sync_status IN ('unsynced','synced','error')),
  twilio_synced_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sms_preferences_phone_program_idx
  ON public.sms_preferences(phone_e164);
CREATE INDEX IF NOT EXISTS sms_preferences_user_idx
  ON public.sms_preferences(user_id);

GRANT SELECT, INSERT, UPDATE ON public.sms_preferences TO authenticated;
GRANT ALL ON public.sms_preferences TO service_role;
ALTER TABLE public.sms_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms preferences" ON public.sms_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sms preferences" ON public.sms_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users may only toggle status fields on their own row; they cannot forge
-- provider sync fields or backdate consent timestamps.
CREATE POLICY "Users update own sms preferences" ON public.sms_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND transactional_status IN ('opted_in','opted_out','pending_verification')
    AND marketing_status = 'not_enrolled'
  );
CREATE POLICY "Admins view all sms preferences" ON public.sms_preferences
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages sms preferences" ON public.sms_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_sms_preferences_updated
  BEFORE UPDATE ON public.sms_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) sms_consent_events: append-only audit trail
CREATE TABLE IF NOT EXISTS public.sms_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone_e164 TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('opt_in','opt_out','re_opt_in','verification_requested','verification_completed','preference_updated')),
  message_category TEXT,
  source TEXT NOT NULL
    CHECK (source IN ('signup','booking','listing','settings','sms_page','keyword','support','provider_webhook','system')),
  disclosure_version TEXT,
  disclosure_text_hash TEXT,
  terms_version TEXT,
  privacy_version TEXT,
  ip_address INET,
  user_agent TEXT,
  provider_message_sid TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_consent_events_phone_idx
  ON public.sms_consent_events(phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_consent_events_user_idx
  ON public.sms_consent_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sms_consent_events_provider_sid_idx
  ON public.sms_consent_events(provider_message_sid) WHERE provider_message_sid IS NOT NULL;

GRANT SELECT ON public.sms_consent_events TO authenticated;
GRANT ALL ON public.sms_consent_events TO service_role;
ALTER TABLE public.sms_consent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sms consent events" ON public.sms_consent_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all sms consent events" ON public.sms_consent_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role writes sms consent events" ON public.sms_consent_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) sms_suppressions: number-level suppression (STOP wins across accounts)
CREATE TABLE IF NOT EXISTS public.sms_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  sender_or_program TEXT NOT NULL DEFAULT 'vendibook_transactional',
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  provider_message_sid TEXT,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  released_by_event_id UUID REFERENCES public.sms_consent_events(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sms_suppressions_active_idx
  ON public.sms_suppressions(phone_e164, sender_or_program)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS sms_suppressions_phone_idx
  ON public.sms_suppressions(phone_e164);

GRANT SELECT ON public.sms_suppressions TO authenticated;
GRANT ALL ON public.sms_suppressions TO service_role;
ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

-- No user-facing rows exposed by phone; only admins can inspect.
CREATE POLICY "Admins read sms suppressions" ON public.sms_suppressions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages sms suppressions" ON public.sms_suppressions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) sms_message_log_v2: attempt log with consent basis
CREATE TABLE IF NOT EXISTS public.sms_message_log_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  recipient_phone_e164 TEXT NOT NULL,
  message_category TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT 'v1',
  business_purpose TEXT NOT NULL,
  consent_basis JSONB NOT NULL,
  template_variables JSONB,
  provider_message_sid TEXT,
  send_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (send_status IN ('queued','sent','blocked','failed')),
  delivery_status TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_message_log_v2_user_idx
  ON public.sms_message_log_v2(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_message_log_v2_phone_idx
  ON public.sms_message_log_v2(recipient_phone_e164, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sms_message_log_v2_provider_sid_idx
  ON public.sms_message_log_v2(provider_message_sid) WHERE provider_message_sid IS NOT NULL;

GRANT SELECT ON public.sms_message_log_v2 TO authenticated;
GRANT ALL ON public.sms_message_log_v2 TO service_role;
ALTER TABLE public.sms_message_log_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sms messages" ON public.sms_message_log_v2
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all sms messages" ON public.sms_message_log_v2
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role writes sms messages" ON public.sms_message_log_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_sms_message_log_v2_updated
  BEFORE UPDATE ON public.sms_message_log_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Backfill: migrate existing sms_subscriptions rows into sms_preferences
--    Existing opted-out numbers also get a suppression row so the new guard
--    respects historical STOPs immediately.
INSERT INTO public.sms_preferences (
  user_id, phone_e164, transactional_status, consent_source, consent_version,
  opted_in_at, opted_out_at, phone_verified_at, last_updated_at, created_at
)
SELECT
  s.user_id,
  s.phone_number,
  CASE
    WHEN s.opted_in = false OR s.opted_out_at IS NOT NULL THEN 'opted_out'
    WHEN s.verified = true AND s.accepts_transactional = true THEN 'opted_in'
    ELSE 'pending_verification'
  END,
  'legacy_backfill',
  'v1',
  CASE WHEN s.verified = true AND s.accepts_transactional = true THEN s.verified_at END,
  s.opted_out_at,
  s.verified_at,
  s.updated_at,
  s.created_at
FROM public.sms_subscriptions s
ON CONFLICT (phone_e164) DO NOTHING;

INSERT INTO public.sms_suppressions (phone_e164, sender_or_program, reason, source, suppressed_at)
SELECT DISTINCT s.phone_number, 'vendibook_transactional', 'legacy_opt_out', 'system',
       COALESCE(s.opted_out_at, now())
FROM public.sms_subscriptions s
WHERE (s.opted_in = false OR s.opted_out_at IS NOT NULL)
  AND s.phone_number IS NOT NULL
ON CONFLICT DO NOTHING;
