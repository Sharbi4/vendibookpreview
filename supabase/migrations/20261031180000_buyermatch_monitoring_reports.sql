-- Reviewed monitoring snapshots keep research volume separate from outreach and leads.
-- Fixed public fields only; source identities and evidence remain in restricted columns.
-- Separate from report so older cached clients cannot misread a new report shape.
ALTER TABLE public.buyermatch_progress_updates ADD COLUMN monitoring_report jsonb;
GRANT SELECT(monitoring_report) ON public.buyermatch_progress_updates TO authenticated;
CREATE OR REPLACE FUNCTION public.publish_buyermatch_monitoring_report(_campaign uuid,_key text,_report jsonb,_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid; existing public.buyermatch_progress_updates; field text; follow_date jsonb;
 start_at timestamptz; end_at timestamptz;
 counts text[]:=ARRAY['actions_logged','facebook_items_reviewed','threads_items_reviewed','new_prospects','qualified_matches','comments_published','conversations_started','new_replies','interested_buyers','links_shared','meetings_requested','new_conversions','follow_ups_pending','cumulative_actions','prospects_under_review'];
 allowed text[];
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 allowed:=counts||ARRAY['report_kind','period_start','period_end','follow_up_dates','placement_status'];
 IF jsonb_typeof(_report) IS DISTINCT FROM 'object' OR NOT (_report ?& allowed) OR (_report-allowed)<>'{}'::jsonb THEN RAISE EXCEPTION 'Report requires only approved public fields'; END IF;
 IF _report->>'report_kind' IS DISTINCT FROM 'monitoring' OR _report->>'placement_status' IS DISTINCT FROM 'awaiting_reconciliation' THEN RAISE EXCEPTION 'Invalid monitoring status'; END IF;
 FOREACH field IN ARRAY counts LOOP
  IF jsonb_typeof(_report->field) IS DISTINCT FROM 'number' OR (_report->>field)!~'^(0|[1-9][0-9]{0,5})$' THEN RAISE EXCEPTION 'Report counts must be nonnegative integers'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['period_start','period_end'] LOOP
  IF jsonb_typeof(_report->field) IS DISTINCT FROM 'string' OR (_report->>field)!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' THEN RAISE EXCEPTION 'Report time must be UTC ISO timestamp'; END IF;
 END LOOP;
 start_at:=(_report->>'period_start')::timestamptz; end_at:=(_report->>'period_end')::timestamptz;
 IF end_at<start_at OR end_at>now() THEN RAISE EXCEPTION 'Report dates must describe elapsed activity'; END IF;
 IF (_report->>'cumulative_actions')::integer < (_report->>'actions_logged')::integer THEN RAISE EXCEPTION 'Cumulative actions cannot be below period actions'; END IF;
 IF jsonb_typeof(_report->'follow_up_dates') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Follow-up dates must be an array'; END IF;
 IF jsonb_array_length(_report->'follow_up_dates')>20 THEN RAISE EXCEPTION 'Too many follow-up dates'; END IF;
 FOR follow_date IN SELECT value FROM jsonb_array_elements(_report->'follow_up_dates') LOOP
  IF jsonb_typeof(follow_date) IS DISTINCT FROM 'string' OR (follow_date#>>'{}')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid follow-up date'; END IF;
  IF (follow_date#>>'{}')::date < (end_at AT TIME ZONE 'America/Phoenix')::date THEN RAISE EXCEPTION 'Follow-up date precedes report'; END IF;
 END LOOP;
 PERFORM 1 FROM public.buyermatch_campaigns WHERE id=_campaign FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 SELECT * INTO existing FROM public.buyermatch_progress_updates WHERE update_key=_key;
 IF FOUND AND existing.monitoring_report IS DISTINCT FROM _report THEN RAISE EXCEPTION 'Update key already used with different report'; END IF;
 result:=public.publish_buyermatch_progress(_campaign,_key,'{"review":"planned"}'::jsonb,NULL,_evidence);
 UPDATE public.buyermatch_progress_updates SET monitoring_report=_report WHERE id=result AND monitoring_report IS NULL;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.publish_buyermatch_monitoring_report(uuid,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_buyermatch_monitoring_report(uuid,text,jsonb,text) TO authenticated;
