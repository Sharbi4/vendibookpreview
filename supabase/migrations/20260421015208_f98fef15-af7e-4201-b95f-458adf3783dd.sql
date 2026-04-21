
-- Orchestration rules
CREATE TABLE public.orchestration_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  default_channel text NOT NULL DEFAULT 'inapp',
  priority text NOT NULL DEFAULT 'normal',
  cooldown_minutes integer NOT NULL DEFAULT 60,
  respect_quiet_hours boolean NOT NULL DEFAULT true,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_hint text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orchestration_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rules" ON public.orchestration_rules FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Anyone can read enabled rules" ON public.orchestration_rules FOR SELECT USING (enabled = true);

-- User journey state
CREATE TABLE public.user_journey_state (
  user_id uuid PRIMARY KEY,
  stage text NOT NULL DEFAULT 'new',
  segment_tags text[] NOT NULL DEFAULT '{}',
  listings_count integer NOT NULL DEFAULT 0,
  published_count integer NOT NULL DEFAULT 0,
  bookings_as_host integer NOT NULL DEFAULT 0,
  bookings_as_guest integer NOT NULL DEFAULT 0,
  last_login_at timestamptz,
  last_touched_at timestamptz NOT NULL DEFAULT now(),
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_journey_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own journey" ON public.user_journey_state FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Orchestration decisions log
CREATE TABLE public.orchestration_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_id uuid,
  chosen_channel text,
  priority text,
  suppressed boolean NOT NULL DEFAULT false,
  suppression_reason text,
  rationale text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orchestration_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view decisions" ON public.orchestration_decisions FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX idx_orch_decisions_user_event ON public.orchestration_decisions(user_id, event_type, created_at DESC);
CREATE INDEX idx_journey_stage ON public.user_journey_state(stage);

-- Updated-at triggers
CREATE TRIGGER trg_orch_rules_updated BEFORE UPDATE ON public.orchestration_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_journey_updated BEFORE UPDATE ON public.user_journey_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules
INSERT INTO public.orchestration_rules (event_type, default_channel, priority, cooldown_minutes, template_hint) VALUES
  ('user_signup', 'inapp', 'normal', 0, 'Welcome + first listing nudge'),
  ('listing_published', 'inapp', 'high', 0, 'Celebrate + share kit'),
  ('listing_draft_stale', 'sms', 'normal', 1440, 'Gentle nudge to finish'),
  ('booking_request_received', 'sms', 'high', 0, 'Respond fast to win'),
  ('booking_confirmed', 'inapp', 'high', 0, 'Prep checklist + share'),
  ('booking_completed', 'inapp', 'normal', 0, 'Ask for review + rebook'),
  ('payout_received', 'inapp', 'normal', 0, 'Celebrate + grow tips'),
  ('referral_redeemed', 'inapp', 'high', 0, 'Thank + invite more'),
  ('listing_low_views', 'inapp', 'normal', 4320, 'Optimization tips'),
  ('search_no_results', 'inapp', 'normal', 1440, 'Suggest alerts')
ON CONFLICT (event_type) DO NOTHING;
