-- Anonymous, structured campaign reports. No free-text identities or private evidence.
CREATE OR REPLACE FUNCTION public.publish_buyermatch_monitoring_report(_campaign uuid,_key text,_report jsonb,_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid; existing public.buyermatch_progress_updates; field text; follow_date jsonb;
 start_at timestamptz; end_at timestamptz; digest jsonb; item jsonb; contacted integer:=0; review_v2 boolean:=false;
 counts text[]:=ARRAY['actions_logged','facebook_items_reviewed','threads_items_reviewed','new_prospects','qualified_matches','comments_published','conversations_started','new_replies','interested_buyers','links_shared','meetings_requested','new_conversions','follow_ups_pending','cumulative_actions','prospects_under_review'];
 allowed text[];
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF _report ? 'review_digest' THEN
  IF _report ? 'campaign_digest' THEN RAISE EXCEPTION 'Only one digest version allowed'; END IF;
  _report:=(_report-'review_digest')||jsonb_build_object('campaign_digest',_report->'review_digest');
  review_v2:=true;
 END IF;
 allowed:=counts||ARRAY['report_kind','period_start','period_end','follow_up_dates','placement_status'];
 IF jsonb_typeof(_report) IS DISTINCT FROM 'object' OR NOT (_report ?& allowed) OR (_report-allowed-ARRAY['drafts_held','scored_prospects','score_threshold','listing_verified_at','draft_hold_reason','conversations_in_progress','campaign_digest'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Report requires only approved public fields'; END IF;
 IF _report->>'report_kind' IS DISTINCT FROM 'monitoring' OR coalesce(_report->>'placement_status','') NOT IN ('awaiting_reconciliation','updated_report') OR (_report->>'placement_status'='updated_report' AND NOT (_report ? 'campaign_digest')) THEN RAISE EXCEPTION 'Invalid monitoring status'; END IF;
 FOREACH field IN ARRAY counts LOOP
  IF _report ? 'campaign_digest' AND field<>'prospects_under_review' AND _report->field='null'::jsonb THEN CONTINUE; END IF;
  IF field IN ('actions_logged','facebook_items_reviewed','threads_items_reviewed','cumulative_actions','interested_buyers','meetings_requested','conversations_started') AND _report->field='null'::jsonb THEN CONTINUE; END IF;
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

 FOREACH field IN ARRAY ARRAY['drafts_held','scored_prospects','score_threshold','conversations_in_progress'] LOOP
  IF _report ? field AND (jsonb_typeof(_report->field) IS DISTINCT FROM 'number' OR (_report->>field)!~'^(0|[1-9][0-9]{0,5})$') THEN RAISE EXCEPTION 'Pipeline counts must be nonnegative integers'; END IF;
 END LOOP;
 IF (_report ? 'scored_prospects') <> (_report ? 'score_threshold') THEN RAISE EXCEPTION 'Scored prospects require their threshold'; END IF;
 IF (_report->>'scored_prospects')::integer > (_report->>'prospects_under_review')::integer THEN RAISE EXCEPTION 'Scored prospects exceed tracked prospects'; END IF;
 IF _report ? 'draft_hold_reason' AND _report->>'draft_hold_reason' IS DISTINCT FROM 'channel_unavailable' THEN RAISE EXCEPTION 'Invalid draft hold reason'; END IF;
 IF _report ? 'listing_verified_at' THEN
  IF jsonb_typeof(_report->'listing_verified_at') IS DISTINCT FROM 'string' OR (_report->>'listing_verified_at')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' THEN RAISE EXCEPTION 'Invalid listing verification timestamp'; END IF;
  IF (_report->>'listing_verified_at')::timestamptz > end_at THEN RAISE EXCEPTION 'Listing verification exceeds reporting period'; END IF;
 END IF;


 IF _report ? 'campaign_digest' THEN
  digest:=_report->'campaign_digest';
  IF jsonb_typeof(digest) IS DISTINCT FROM 'object' OR NOT (digest ?& ARRAY['campaign_start','report_date','searches_24h','direct_outreach_total','promotions','prospects']) OR (digest-ARRAY['campaign_start','report_date','searches_24h','direct_outreach_total','promotions','prospects','equipment_highlights','review_update','mode','outreach_last_date'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid campaign digest fields'; END IF;
  IF digest ? 'review_update' AND jsonb_typeof(digest->'review_update') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid review update flag'; END IF;
  IF digest ? 'mode' AND coalesce(digest->>'mode','') NOT IN ('sale','rent') THEN RAISE EXCEPTION 'Invalid campaign mode'; END IF;
  IF digest ? 'outreach_last_date' THEN
   IF jsonb_typeof(digest->'outreach_last_date') IS DISTINCT FROM 'string' OR (digest->>'outreach_last_date')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid last outreach date'; END IF;
   IF (digest->>'outreach_last_date')::date NOT BETWEEN (digest->>'campaign_start')::date AND (digest->>'report_date')::date OR (digest->>'direct_outreach_total')::integer<1 THEN RAISE EXCEPTION 'Invalid last outreach date'; END IF;
  END IF;
  IF digest ? 'equipment_highlights' THEN
   IF jsonb_typeof(digest->'equipment_highlights') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid equipment highlights'; END IF;
   IF jsonb_array_length(digest->'equipment_highlights')>4 THEN RAISE EXCEPTION 'Too many equipment highlights'; END IF;
   FOR item IN SELECT value FROM jsonb_array_elements(digest->'equipment_highlights') LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR coalesce(item#>>'{}','') NOT IN ('full_kitchen','cummins_under_1000_hours_with_records','new_tires','westinghouse_generator') THEN RAISE EXCEPTION 'Invalid equipment highlight'; END IF;
   END LOOP;
  END IF;
  FOREACH field IN ARRAY ARRAY['searches_24h','direct_outreach_total'] LOOP
   IF jsonb_typeof(digest->field) IS DISTINCT FROM 'number' OR (digest->>field)!~'^(0|[1-9][0-9]{0,5})$' THEN RAISE EXCEPTION 'Invalid digest count'; END IF;
  END LOOP;
  FOREACH field IN ARRAY ARRAY['campaign_start','report_date'] LOOP
   IF jsonb_typeof(digest->field) IS DISTINCT FROM 'string' OR (digest->>field)!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid digest date'; END IF;
  END LOOP;
  IF (digest->>'campaign_start')::date>(digest->>'report_date')::date OR (digest->>'report_date')::date>(end_at AT TIME ZONE 'America/Phoenix')::date THEN RAISE EXCEPTION 'Invalid digest date order'; END IF;
  IF jsonb_typeof(digest->'promotions') IS DISTINCT FROM 'array' OR jsonb_typeof(digest->'prospects') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Digest arrays required'; END IF;
  IF jsonb_array_length(digest->'promotions')>50 OR jsonb_array_length(digest->'prospects')>50 OR jsonb_array_length(digest->'prospects')<>(_report->>'prospects_under_review')::integer THEN RAISE EXCEPTION 'Digest prospect totals must match'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(digest->'promotions') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT (item ?& ARRAY['channel','status','date','time_utc','group_members']) OR (item-ARRAY['channel','status','date','time_utc','group_members'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid promotion fields'; END IF;
   IF coalesce(item->>'channel','') NOT IN ('facebook','threads','instagram','food_truck_group','buy_sell_group') OR coalesce(item->>'status','') NOT IN ('published','pending_approval') THEN RAISE EXCEPTION 'Invalid promotion status'; END IF;
   IF jsonb_typeof(item->'date') IS DISTINCT FROM 'string' OR (item->>'date')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid promotion date'; END IF;
   IF (item->>'date')::date NOT BETWEEN (digest->>'campaign_start')::date AND (digest->>'report_date')::date THEN RAISE EXCEPTION 'Promotion outside campaign period'; END IF;
   IF item->'group_members'<>'null'::jsonb AND (jsonb_typeof(item->'group_members') IS DISTINCT FROM 'number' OR (item->>'group_members')!~'^(0|[1-9][0-9]{0,8})$' OR item->>'channel' NOT IN ('food_truck_group','buy_sell_group')) THEN RAISE EXCEPTION 'Invalid group membership'; END IF;
   IF item->'time_utc'<>'null'::jsonb THEN
    IF jsonb_typeof(item->'time_utc') IS DISTINCT FROM 'string' OR (item->>'time_utc')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' THEN RAISE EXCEPTION 'Invalid promotion timestamp'; END IF;
    IF (item->>'time_utc')::timestamptz>end_at OR ((item->>'time_utc')::timestamptz AT TIME ZONE 'America/Phoenix')::date<>(item->>'date')::date THEN RAISE EXCEPTION 'Promotion timestamp mismatch'; END IF;
   END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(digest->'prospects') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT (item ?& ARRAY['profile','score','status','posted_on','contacted_at']) OR (item-ARRAY['profile','score','status','posted_on','contacted_at','follow_up_on'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid prospect fields'; END IF;
   IF coalesce(item->>'profile','') NOT IN ('full_kitchen','direct_outreach','payment_terms','restaurant_transition','equipped_value','catering_launch','financing_paperwork','colorado_buyer','staffing_before_purchase','buyer_review','short_rental','recurring_rental') OR coalesce(item->>'status','') NOT IN ('final_review','awaiting_reply','qualification','monitoring','held','stand_down','capacity_review','draft_revision','location_review') THEN RAISE EXCEPTION 'Invalid prospect profile'; END IF;
   IF item->'score'<>'null'::jsonb AND (jsonb_typeof(item->'score') IS DISTINCT FROM 'number' OR (item->>'score')!~'^(0|[1-9][0-9]{0,2})$' OR (item->>'score')::numeric>100) THEN RAISE EXCEPTION 'Invalid prospect score'; END IF;
   IF item ? 'follow_up_on' AND item->'follow_up_on'<>'null'::jsonb THEN
    IF jsonb_typeof(item->'follow_up_on') IS DISTINCT FROM 'string' OR (item->>'follow_up_on')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid prospect follow-up date'; END IF;
    IF (item->>'follow_up_on')::date < (digest->>'campaign_start')::date THEN RAISE EXCEPTION 'Follow-up predates campaign'; END IF;
   END IF;
   IF item->'posted_on'<>'null'::jsonb THEN
    IF jsonb_typeof(item->'posted_on') IS DISTINCT FROM 'string' OR (item->>'posted_on')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid prospect post date'; END IF;
    IF (item->>'posted_on')::date>(digest->>'report_date')::date THEN RAISE EXCEPTION 'Future prospect post'; END IF;
   END IF;
   IF item->'contacted_at'<>'null'::jsonb THEN
    IF jsonb_typeof(item->'contacted_at') IS DISTINCT FROM 'string' OR (item->>'contacted_at')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' THEN RAISE EXCEPTION 'Invalid contact timestamp'; END IF;
    IF (item->>'contacted_at')::timestamptz>end_at THEN RAISE EXCEPTION 'Future outreach'; END IF;
    contacted:=contacted+1;
   ELSIF item->>'status'='awaiting_reply' OR item->>'profile'='direct_outreach' THEN RAISE EXCEPTION 'Completed outreach requires contact time';
   END IF;
  END LOOP;
  IF contacted>(digest->>'direct_outreach_total')::integer THEN RAISE EXCEPTION 'Outreach count mismatch'; END IF;
 END IF;

 IF review_v2 THEN
  _report:=(_report-'campaign_digest')||jsonb_build_object('review_digest',_report->'campaign_digest');
 END IF;
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
