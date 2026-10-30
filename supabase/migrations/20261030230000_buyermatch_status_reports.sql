-- Reviewed external operations reports remain separate from verified event metrics.
ALTER TABLE public.buyermatch_progress_updates ADD COLUMN report jsonb;
GRANT SELECT(report) ON public.buyermatch_progress_updates TO authenticated;

CREATE FUNCTION public.publish_buyermatch_status_report(_campaign uuid,_key text,_report jsonb,_next_update_at timestamptz,_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid; existing public.buyermatch_progress_updates; field text; start_at timestamptz; end_at timestamptz; placements_at timestamptz;
 allowed text[]:=ARRAY['period_start','period_end','placements_as_of','posts_live','posts_pending','posts_review','marketplace_pending','prospects_under_review','drafts_pending','new_prospects','new_replies','new_conversions','discovery_paused','follow_up_held','new_draft_prepared'];
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF jsonb_typeof(_report) IS DISTINCT FROM 'object' OR NOT (_report ?& allowed) OR (_report-allowed)<>'{}'::jsonb THEN
  RAISE EXCEPTION 'Report requires only approved public fields';
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
