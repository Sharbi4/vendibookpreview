-- End-of-day reports may have no promised next report time.
ALTER TABLE public.buyermatch_progress_updates ALTER COLUMN next_update_at DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.publish_buyermatch_progress(_campaign uuid,_key text,_steps jsonb,_next_update_at timestamptz,_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); result uuid; step record; existing public.buyermatch_progress_updates;
BEGIN
 IF actor IS NULL OR NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF jsonb_typeof(_steps) IS DISTINCT FROM 'object' OR _steps='{}'::jsonb THEN RAISE EXCEPTION 'Progress steps required'; END IF;
 FOR step IN SELECT * FROM jsonb_each_text(_steps) LOOP
  IF step.key NOT IN ('priority','community_access','audience','financing','local_promotion','review')
   OR step.value IS NULL OR step.value NOT IN ('planned','in_progress','complete') THEN RAISE EXCEPTION 'Unsupported progress step'; END IF;
 END LOOP;
 IF length(trim(coalesce(_evidence,''))) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Private source reference required'; END IF;
 PERFORM 1 FROM public.buyermatch_campaigns WHERE id=_campaign FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 SELECT * INTO existing FROM public.buyermatch_progress_updates WHERE update_key=_key;
 IF FOUND THEN
  IF existing.campaign_id<>_campaign OR existing.steps<>_steps OR existing.next_update_at IS DISTINCT FROM _next_update_at OR existing.evidence_reference<>_evidence THEN
   RAISE EXCEPTION 'Update key already used with different content';
  END IF;
  RETURN existing.id;
 END IF;
 IF _next_update_at IS NOT NULL AND (_next_update_at<=now() OR _next_update_at>now()+interval '7 days') THEN RAISE EXCEPTION 'Expected update must be in the next seven days'; END IF;
 INSERT INTO public.buyermatch_progress_updates(campaign_id,update_key,steps,next_update_at,recorded_by,evidence_reference)
 VALUES(_campaign,_key,_steps,_next_update_at,actor,_evidence) RETURNING id INTO result;
 -- Existing realtime subscription wakes the owner's dashboard without exposing private evidence.
 UPDATE public.buyermatch_campaigns SET updated_at=now() WHERE id=_campaign;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.publish_buyermatch_progress(uuid,text,jsonb,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_buyermatch_progress(uuid,text,jsonb,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_buyermatch_status_report(_campaign uuid,_key text,_report jsonb,_next_update_at timestamptz,_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid; existing public.buyermatch_progress_updates; field text; start_at timestamptz; end_at timestamptz; placements_at timestamptz;
 allowed text[]:=ARRAY['period_start','period_end','placements_as_of','posts_live','posts_pending','posts_review','marketplace_pending','prospects_under_review','drafts_pending','new_prospects','new_replies','new_conversions','discovery_paused','follow_up_held','new_draft_prepared'];
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF jsonb_typeof(_report) IS DISTINCT FROM 'object' OR NOT (_report ?& allowed) OR (_report-allowed-ARRAY['report_kind','campaign_through','discovery_runs_approx'])<>'{}'::jsonb THEN
  RAISE EXCEPTION 'Report requires only approved public fields';
 END IF;
 IF _report ?| ARRAY['report_kind','campaign_through','discovery_runs_approx'] THEN
  IF NOT (_report ?& ARRAY['report_kind','campaign_through','discovery_runs_approx']) OR _report->>'report_kind' IS DISTINCT FROM 'day_one'
   OR jsonb_typeof(_report->'campaign_through') IS DISTINCT FROM 'string' OR (_report->>'campaign_through')!~'^\d{4}-\d{2}-\d{2}$'
   OR jsonb_typeof(_report->'discovery_runs_approx') IS DISTINCT FROM 'number' OR (_report->>'discovery_runs_approx')!~'^(0|[1-9][0-9]{0,5})$'
  THEN RAISE EXCEPTION 'Invalid day-one report'; END IF;
  IF (_report->>'campaign_through')::date < ((_report->>'period_end')::timestamptz AT TIME ZONE 'America/Phoenix')::date THEN RAISE EXCEPTION 'Campaign end precedes report'; END IF;
 END IF;
 FOREACH field IN ARRAY ARRAY['posts_live','posts_pending','posts_review','marketplace_pending','prospects_under_review','drafts_pending','new_prospects','new_replies','new_conversions'] LOOP
  IF jsonb_typeof(_report->field) IS DISTINCT FROM 'number' OR (_report->>field)!~'^(0|[1-9][0-9]{0,5})$' THEN RAISE EXCEPTION 'Report counts must be nonnegative integers'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['discovery_paused','follow_up_held','new_draft_prepared'] LOOP
  IF jsonb_typeof(_report->field) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Report status must be boolean'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['period_start','period_end','placements_as_of'] LOOP
  IF jsonb_typeof(_report->field) IS DISTINCT FROM 'string' OR (_report->>field)!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' THEN RAISE EXCEPTION 'Report time must be UTC ISO timestamp'; END IF;
 END LOOP;
 start_at:=(_report->>'period_start')::timestamptz; end_at:=(_report->>'period_end')::timestamptz; placements_at:=(_report->>'placements_as_of')::timestamptz;
 IF end_at<start_at OR end_at>now() OR placements_at>end_at THEN RAISE EXCEPTION 'Report dates must describe elapsed activity'; END IF;
 PERFORM 1 FROM public.buyermatch_campaigns WHERE id=_campaign FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 SELECT * INTO existing FROM public.buyermatch_progress_updates WHERE update_key=_key;
 IF FOUND AND existing.report IS DISTINCT FROM _report THEN RAISE EXCEPTION 'Update key already used with different report'; END IF;
 result:=public.publish_buyermatch_progress(_campaign,_key,'{"review":"planned"}'::jsonb,_next_update_at,_evidence);
 UPDATE public.buyermatch_progress_updates SET report=_report WHERE id=result AND report IS NULL;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.publish_buyermatch_status_report(uuid,text,jsonb,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_buyermatch_status_report(uuid,text,jsonb,timestamptz,text) TO authenticated;
