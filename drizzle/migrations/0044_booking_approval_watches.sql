CREATE TABLE public.booking_approval_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  remind_host_at timestamptz,
  host_reminded_at timestamptz,
  admin_notified_at timestamptz,
  closed_at timestamptz,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_approval_watches TO authenticated;
GRANT ALL ON public.booking_approval_watches TO service_role;

ALTER TABLE public.booking_approval_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view booking approval watches"
ON public.booking_approval_watches FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_booking_approval_watch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.booking_approval_watches w
             WHERE w.booking_id = NEW.id AND w.closed_at IS NULL) THEN
    BEGIN
      PERFORM public.invoke_edge_function('booking-approval-watch',
        jsonb_build_object('booking_id', NEW.id, 'event', 'status_change'));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'booking approval watch dispatch failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.notify_booking_approval_watch() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER booking_approval_watch_status
AFTER UPDATE OF status ON public.booking_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_booking_approval_watch();

INSERT INTO public.booking_approval_watches (booking_id, admin_user_id, remind_host_at)
VALUES ('ecb9fbb8-9c87-4b92-a625-6537ed5e00fc', 'f99253cf-6fb3-4f55-a08e-3cbf63228373', '2026-11-17 01:55:00+00')
ON CONFLICT (booking_id) DO NOTHING;

SELECT cron.schedule(
  'booking-approval-reminder-ecb9fbb8',
  '55 1 17 11 *',
  $$select public.invoke_edge_function('booking-approval-watch', '{"booking_id":"ecb9fbb8-9c87-4b92-a625-6537ed5e00fc","event":"reminder"}'::jsonb); select cron.unschedule('booking-approval-reminder-ecb9fbb8');$$
);