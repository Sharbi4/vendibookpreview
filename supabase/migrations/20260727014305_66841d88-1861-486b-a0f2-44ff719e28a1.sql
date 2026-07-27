CREATE POLICY "Frontend can insert telemetry"
ON public.error_events
FOR INSERT
TO anon, authenticated
WITH CHECK (source = 'frontend' AND resolved = false);

GRANT INSERT ON public.error_events TO anon, authenticated;