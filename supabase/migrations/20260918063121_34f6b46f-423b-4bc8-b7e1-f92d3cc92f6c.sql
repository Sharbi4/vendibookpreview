ALTER TABLE public.fulfillment_sessions
  ADD COLUMN IF NOT EXISTS tracking_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_driver_user_id uuid,
  ADD COLUMN IF NOT EXISTS tracking_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_latitude numeric(9,5),
  ADD COLUMN IF NOT EXISTS last_longitude numeric(9,5),
  ADD COLUMN IF NOT EXISTS last_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS destination_label text,
  ADD COLUMN IF NOT EXISTS destination_latitude numeric(9,5),
  ADD COLUMN IF NOT EXISTS destination_longitude numeric(9,5),
  ADD COLUMN IF NOT EXISTS route_distance_meters integer,
  ADD COLUMN IF NOT EXISTS route_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS route_polyline text,
  ADD COLUMN IF NOT EXISTS route_provider text,
  ADD COLUMN IF NOT EXISTS route_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_consent_version text;

CREATE POLICY "Assigned driver reads own delivery session"
  ON public.fulfillment_sessions
  FOR SELECT TO authenticated
  USING (assigned_driver_user_id = auth.uid());

ALTER TABLE public.fulfillment_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fulfillment_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.fulfillment_sessions';
  END IF;
END $$;