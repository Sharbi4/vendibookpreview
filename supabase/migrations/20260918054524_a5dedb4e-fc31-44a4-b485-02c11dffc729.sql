CREATE TABLE public.video_walkthrough_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  walkthrough_id uuid REFERENCES public.video_walkthroughs(id) ON DELETE SET NULL,
  consent_type text NOT NULL,
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'web',
  route text,
  user_agent text,
  camera_permission_granted boolean NOT NULL DEFAULT false,
  microphone_permission_granted boolean NOT NULL DEFAULT false,
  location_permission_required boolean NOT NULL DEFAULT false,
  location_permission_granted boolean NOT NULL DEFAULT false,
  recording_consent_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vw_consents_user ON public.video_walkthrough_consents(user_id, accepted_at DESC);
CREATE INDEX idx_vw_consents_walkthrough ON public.video_walkthrough_consents(walkthrough_id);

GRANT SELECT, INSERT ON public.video_walkthrough_consents TO authenticated;
GRANT ALL ON public.video_walkthrough_consents TO service_role;

ALTER TABLE public.video_walkthrough_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own walkthrough consents"
  ON public.video_walkthrough_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users record own walkthrough consents"
  ON public.video_walkthrough_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);