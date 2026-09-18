-- 1. Meeting type + real call timestamps on the walkthrough itself.
ALTER TABLE public.video_walkthroughs
  ADD COLUMN IF NOT EXISTS meeting_type text NOT NULL DEFAULT 'listing_walkthrough',
  ADD COLUMN IF NOT EXISTS meeting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_ended_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.video_walkthroughs
    ADD CONSTRAINT video_walkthroughs_meeting_type_check
    CHECK (meeting_type IN ('listing_walkthrough','rental_walkthrough','handoff_inspection','support_dispute'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Room profile bookkeeping. Existing vw-* room names are never renamed.
ALTER TABLE public.video_walkthrough_provider_rooms
  ADD COLUMN IF NOT EXISTS meeting_type text NOT NULL DEFAULT 'listing_walkthrough',
  ADD COLUMN IF NOT EXISTS scheduled_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS nbf_at timestamptz,
  ADD COLUMN IF NOT EXISTS room_profile_version text,
  ADD COLUMN IF NOT EXISTS join_hook_configured boolean NOT NULL DEFAULT false;

-- 3. Consent rows record the meeting type and the exact recording notice version.
ALTER TABLE public.video_walkthrough_consents
  ADD COLUMN IF NOT EXISTS meeting_type text,
  ADD COLUMN IF NOT EXISTS recording_consent_version text;

-- 4. Authoritative participant presence, written only by the join hook and webhook.
CREATE TABLE IF NOT EXISTS public.video_walkthrough_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walkthrough_id uuid NOT NULL REFERENCES public.video_walkthroughs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  room_name text,
  meeting_session_id text,
  last_participant_id text,
  is_present boolean NOT NULL DEFAULT true,
  first_joined_at timestamptz NOT NULL DEFAULT now(),
  last_joined_at timestamptz NOT NULL DEFAULT now(),
  last_left_at timestamptz,
  total_join_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (walkthrough_id, user_id)
);

GRANT SELECT ON public.video_walkthrough_participants TO authenticated;
GRANT ALL ON public.video_walkthrough_participants TO service_role;
ALTER TABLE public.video_walkthrough_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read walkthrough presence"
ON public.video_walkthrough_participants FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.video_walkthroughs w
    WHERE w.id = video_walkthrough_participants.walkthrough_id
      AND (w.buyer_id = auth.uid() OR w.seller_id = auth.uid())
  )
);

-- 5. Cloud recording state. No permanent public URL is ever stored here.
CREATE TABLE IF NOT EXISTS public.video_walkthrough_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walkthrough_id uuid NOT NULL REFERENCES public.video_walkthroughs(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'daily',
  room_name text NOT NULL,
  meeting_type text NOT NULL DEFAULT 'listing_walkthrough',
  provider_recording_id text,
  instance_id text,
  status text NOT NULL DEFAULT 'requested',
  max_duration_seconds integer,
  duration_seconds integer,
  started_at timestamptz,
  stopped_at timestamptz,
  ready_at timestamptz,
  error_code text,
  error_message text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_walkthrough_recordings_status_check
    CHECK (status IN ('requested','recording','processing','ready','error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS video_walkthrough_recordings_provider_id_key
  ON public.video_walkthrough_recordings (provider, provider_recording_id)
  WHERE provider_recording_id IS NOT NULL;

-- At most one live recording request per walkthrough: makes start idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS video_walkthrough_recordings_active_key
  ON public.video_walkthrough_recordings (walkthrough_id)
  WHERE status IN ('requested','recording');

CREATE INDEX IF NOT EXISTS video_walkthrough_recordings_walkthrough_idx
  ON public.video_walkthrough_recordings (walkthrough_id, created_at DESC);

GRANT SELECT ON public.video_walkthrough_recordings TO authenticated;
GRANT ALL ON public.video_walkthrough_recordings TO service_role;
ALTER TABLE public.video_walkthrough_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read walkthrough recordings"
ON public.video_walkthrough_recordings FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.video_walkthroughs w
    WHERE w.id = video_walkthrough_recordings.walkthrough_id
      AND (w.buyer_id = auth.uid() OR w.seller_id = auth.uid())
  )
);

-- 6. Idempotency ledger for Daily webhook deliveries.
CREATE TABLE IF NOT EXISTS public.daily_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  provider_event_id text,
  room_name text,
  session_id text,
  walkthrough_id uuid,
  event_ts timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_webhook_events_room_idx
  ON public.daily_webhook_events (room_name, event_type, created_at DESC);

GRANT SELECT ON public.daily_webhook_events TO authenticated;
GRANT ALL ON public.daily_webhook_events TO service_role;
ALTER TABLE public.daily_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read daily webhook events"
ON public.daily_webhook_events FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- 7. Single-row configuration/status of the active Daily webhook subscription.
CREATE TABLE IF NOT EXISTS public.daily_webhook_config (
  id text PRIMARY KEY DEFAULT 'default',
  provider text NOT NULL DEFAULT 'daily',
  webhook_uuid text,
  webhook_url text,
  state text NOT NULL DEFAULT 'unconfigured',
  subscribed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_webhook_config TO authenticated;
GRANT ALL ON public.daily_webhook_config TO service_role;
ALTER TABLE public.daily_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read daily webhook config"
ON public.daily_webhook_config FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- 8. updated_at triggers.
CREATE OR REPLACE FUNCTION public.touch_video_recording_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_video_walkthrough_recordings_touch ON public.video_walkthrough_recordings;
CREATE TRIGGER trg_video_walkthrough_recordings_touch
BEFORE UPDATE ON public.video_walkthrough_recordings
FOR EACH ROW EXECUTE FUNCTION public.touch_video_recording_updated_at();

DROP TRIGGER IF EXISTS trg_video_walkthrough_participants_touch ON public.video_walkthrough_participants;
CREATE TRIGGER trg_video_walkthrough_participants_touch
BEFORE UPDATE ON public.video_walkthrough_participants
FOR EACH ROW EXECUTE FUNCTION public.touch_video_recording_updated_at();

DROP TRIGGER IF EXISTS trg_daily_webhook_config_touch ON public.daily_webhook_config;
CREATE TRIGGER trg_daily_webhook_config_touch
BEFORE UPDATE ON public.daily_webhook_config
FOR EACH ROW EXECUTE FUNCTION public.touch_video_recording_updated_at();