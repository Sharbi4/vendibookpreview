CREATE TABLE public.seller_video_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  default_duration_minutes integer NOT NULL DEFAULT 20 CHECK (default_duration_minutes IN (15,20,30)),
  minimum_notice_minutes integer NOT NULL DEFAULT 120 CHECK (minimum_notice_minutes IN (120,720,1440)),
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes IN (0,15,30)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_video_settings TO authenticated;
GRANT ALL ON public.seller_video_settings TO service_role;
ALTER TABLE public.seller_video_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_video_settings_owner ON public.seller_video_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.seller_video_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_local_time time NOT NULL,
  end_local_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_local_time < end_local_time),
  UNIQUE (seller_id, weekday, start_local_time, end_local_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_video_availability TO authenticated;
GRANT ALL ON public.seller_video_availability TO service_role;
ALTER TABLE public.seller_video_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_video_availability_owner ON public.seller_video_availability FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

CREATE TABLE public.seller_video_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_video_blackouts TO authenticated;
GRANT ALL ON public.seller_video_blackouts TO service_role;
ALTER TABLE public.seller_video_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_video_blackouts_owner ON public.seller_video_blackouts FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE INDEX seller_video_blackouts_seller_time_idx ON public.seller_video_blackouts(seller_id, starts_at, ends_at);

CREATE TABLE public.video_walkthroughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','rescheduled','cancelled','completed','no_show')),
  requested_topics text[] NOT NULL DEFAULT '{}',
  buyer_note text CHECK (char_length(buyer_note) <= 1000),
  provider text NOT NULL DEFAULT 'daily' CHECK (provider IN ('daily')),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seller_id <> buyer_id),
  CHECK (starts_at < ends_at)
);
GRANT SELECT ON public.video_walkthroughs TO authenticated;
GRANT ALL ON public.video_walkthroughs TO service_role;
ALTER TABLE public.video_walkthroughs ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_walkthroughs_participant_read ON public.video_walkthroughs FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE INDEX video_walkthroughs_participant_time_idx ON public.video_walkthroughs(buyer_id, seller_id, starts_at);
CREATE INDEX video_walkthroughs_listing_time_idx ON public.video_walkthroughs(listing_id, starts_at);
CREATE UNIQUE INDEX video_walkthroughs_seller_start_unique ON public.video_walkthroughs(seller_id, starts_at) WHERE status IN ('scheduled','rescheduled');

CREATE TABLE public.video_walkthrough_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walkthrough_id uuid NOT NULL REFERENCES public.video_walkthroughs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('requested','scheduled','rescheduled','cancelled','buyer_joined','seller_joined','completed','no_show')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_walkthrough_events TO authenticated;
GRANT ALL ON public.video_walkthrough_events TO service_role;
ALTER TABLE public.video_walkthrough_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_walkthrough_events_participant_read ON public.video_walkthrough_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.video_walkthroughs w WHERE w.id = walkthrough_id AND auth.uid() IN (w.buyer_id, w.seller_id)));
CREATE INDEX video_walkthrough_events_walkthrough_idx ON public.video_walkthrough_events(walkthrough_id, created_at);

CREATE TABLE public.video_walkthrough_provider_rooms (
  walkthrough_id uuid PRIMARY KEY REFERENCES public.video_walkthroughs(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'daily',
  room_name text NOT NULL UNIQUE,
  room_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.video_walkthrough_provider_rooms TO service_role;
ALTER TABLE public.video_walkthrough_provider_rooms ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER seller_video_settings_updated BEFORE UPDATE ON public.seller_video_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seller_video_availability_updated BEFORE UPDATE ON public.seller_video_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seller_video_blackouts_updated BEFORE UPDATE ON public.seller_video_blackouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER video_walkthroughs_updated BEFORE UPDATE ON public.video_walkthroughs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER video_walkthrough_provider_rooms_updated BEFORE UPDATE ON public.video_walkthrough_provider_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_video_walkthrough(
  _listing_id uuid,
  _starts_at timestamptz,
  _conversation_id uuid DEFAULT NULL,
  _requested_topics text[] DEFAULT '{}',
  _buyer_note text DEFAULT NULL
) RETURNS public.video_walkthroughs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_seller uuid;
  v_settings public.seller_video_settings%ROWTYPE;
  v_ends timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_row public.video_walkthroughs;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT host_id INTO v_seller FROM public.listings WHERE id = _listing_id AND status = 'published';
  IF v_seller IS NULL THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
  IF v_seller = v_user THEN RAISE EXCEPTION 'owner_cannot_schedule'; END IF;
  SELECT * INTO v_settings FROM public.seller_video_settings WHERE user_id = v_seller AND enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'walkthroughs_unavailable'; END IF;
  IF _starts_at < now() + make_interval(mins => v_settings.minimum_notice_minutes) THEN RAISE EXCEPTION 'minimum_notice_required'; END IF;
  v_ends := _starts_at + make_interval(mins => v_settings.default_duration_minutes);
  v_local_start := _starts_at AT TIME ZONE v_settings.timezone;
  v_local_end := v_ends AT TIME ZONE v_settings.timezone;
  IF NOT EXISTS (SELECT 1 FROM public.seller_video_availability a WHERE a.seller_id = v_seller AND a.active AND a.weekday = extract(dow FROM v_local_start)::smallint AND v_local_start::time >= a.start_local_time AND v_local_end::time <= a.end_local_time) THEN RAISE EXCEPTION 'slot_outside_availability'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_seller::text, 0));
  IF EXISTS (SELECT 1 FROM public.seller_video_blackouts b WHERE b.seller_id = v_seller AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(_starts_at,v_ends,'[)')) THEN RAISE EXCEPTION 'slot_blacked_out'; END IF;
  IF EXISTS (SELECT 1 FROM public.video_walkthroughs w WHERE w.seller_id = v_seller AND w.status IN ('scheduled','rescheduled') AND tstzrange(w.starts_at - make_interval(mins => v_settings.buffer_minutes), w.ends_at + make_interval(mins => v_settings.buffer_minutes),'[)') && tstzrange(_starts_at,v_ends,'[)')) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  IF _conversation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = _conversation_id AND c.listing_id = _listing_id AND v_user IN (c.host_id,c.shopper_id)) THEN RAISE EXCEPTION 'invalid_conversation'; END IF;
  INSERT INTO public.video_walkthroughs(listing_id,seller_id,buyer_id,conversation_id,starts_at,ends_at,timezone_snapshot,requested_topics,buyer_note)
  VALUES(_listing_id,v_seller,v_user,_conversation_id,_starts_at,v_ends,v_settings.timezone,COALESCE(_requested_topics,'{}'),nullif(left(trim(_buyer_note),1000),'')) RETURNING * INTO v_row;
  INSERT INTO public.video_walkthrough_events(walkthrough_id,actor_id,event_type) VALUES(v_row.id,v_user,'requested'),(v_row.id,v_user,'scheduled');
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.create_video_walkthrough(uuid,timestamptz,uuid,text[],text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reschedule_video_walkthrough(_walkthrough_id uuid, _starts_at timestamptz)
RETURNS public.video_walkthroughs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_old public.video_walkthroughs%ROWTYPE; v_settings public.seller_video_settings%ROWTYPE; v_ends timestamptz; v_local_start timestamp; v_local_end timestamp; v_row public.video_walkthroughs%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM public.video_walkthroughs WHERE id=_walkthrough_id AND v_user IN (buyer_id,seller_id) FOR UPDATE;
  IF NOT FOUND OR v_old.status NOT IN ('scheduled','rescheduled') THEN RAISE EXCEPTION 'walkthrough_not_manageable'; END IF;
  SELECT * INTO v_settings FROM public.seller_video_settings WHERE user_id=v_old.seller_id AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'walkthroughs_unavailable'; END IF;
  IF _starts_at < now() + make_interval(mins => v_settings.minimum_notice_minutes) THEN RAISE EXCEPTION 'minimum_notice_required'; END IF;
  v_ends := _starts_at + make_interval(mins => v_settings.default_duration_minutes); v_local_start := _starts_at AT TIME ZONE v_settings.timezone; v_local_end := v_ends AT TIME ZONE v_settings.timezone;
  IF NOT EXISTS (SELECT 1 FROM public.seller_video_availability a WHERE a.seller_id=v_old.seller_id AND a.active AND a.weekday=extract(dow FROM v_local_start)::smallint AND v_local_start::time>=a.start_local_time AND v_local_end::time<=a.end_local_time) THEN RAISE EXCEPTION 'slot_outside_availability'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_old.seller_id::text,0));
  IF EXISTS (SELECT 1 FROM public.seller_video_blackouts b WHERE b.seller_id=v_old.seller_id AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(_starts_at,v_ends,'[)')) OR EXISTS (SELECT 1 FROM public.video_walkthroughs w WHERE w.seller_id=v_old.seller_id AND w.id<>v_old.id AND w.status IN ('scheduled','rescheduled') AND tstzrange(w.starts_at-make_interval(mins=>v_settings.buffer_minutes),w.ends_at+make_interval(mins=>v_settings.buffer_minutes),'[)') && tstzrange(_starts_at,v_ends,'[)')) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  UPDATE public.video_walkthroughs SET starts_at=_starts_at, ends_at=v_ends, timezone_snapshot=v_settings.timezone, status='rescheduled' WHERE id=v_old.id RETURNING * INTO v_row;
  INSERT INTO public.video_walkthrough_events(walkthrough_id,actor_id,event_type,metadata) VALUES(v_old.id,v_user,'rescheduled',jsonb_build_object('previous_starts_at',v_old.starts_at,'previous_ends_at',v_old.ends_at));
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.reschedule_video_walkthrough(uuid,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_video_walkthrough(_walkthrough_id uuid)
RETURNS public.video_walkthroughs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_row public.video_walkthroughs%ROWTYPE;
BEGIN
  UPDATE public.video_walkthroughs SET status='cancelled',cancelled_at=now() WHERE id=_walkthrough_id AND v_user IN (buyer_id,seller_id) AND status IN ('scheduled','rescheduled') RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'walkthrough_not_manageable'; END IF;
  INSERT INTO public.video_walkthrough_events(walkthrough_id,actor_id,event_type) VALUES(v_row.id,v_user,'cancelled');
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_video_walkthrough(uuid) TO authenticated;