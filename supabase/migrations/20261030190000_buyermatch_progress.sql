-- Customer-safe operational updates are separate from verified lead/outreach counts.
CREATE TABLE public.buyermatch_progress_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 update_key text NOT NULL UNIQUE CHECK(length(update_key) BETWEEN 1 AND 150),
 steps jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 next_update_at timestamptz NOT NULL CHECK(next_update_at>created_at),
 recorded_by uuid NOT NULL,
 evidence_reference text NOT NULL
);
ALTER TABLE public.buyermatch_progress_updates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyermatch_progress_updates FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,campaign_id,steps,created_at,next_update_at) ON public.buyermatch_progress_updates TO authenticated;
GRANT ALL ON public.buyermatch_progress_updates TO service_role;
CREATE POLICY progress_owner ON public.buyermatch_progress_updates FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.buyermatch_campaigns c WHERE c.id=campaign_id AND c.seller_id=(SELECT auth.uid()))
 OR public.has_role((SELECT auth.uid()),'admin'));
CREATE INDEX buyermatch_progress_campaign_time ON public.buyermatch_progress_updates(campaign_id,created_at DESC);

CREATE FUNCTION public.publish_buyermatch_progress(_campaign uuid,_key text,_steps jsonb,_next_update_at timestamptz,_evidence text)
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
  IF existing.campaign_id<>_campaign OR existing.steps<>_steps OR existing.next_update_at<>_next_update_at OR existing.evidence_reference<>_evidence THEN
   RAISE EXCEPTION 'Update key already used with different content';
  END IF;
  RETURN existing.id;
 END IF;
 IF _next_update_at IS NULL OR _next_update_at<=now() OR _next_update_at>now()+interval '7 days' THEN RAISE EXCEPTION 'Expected update must be in the next seven days'; END IF;
 INSERT INTO public.buyermatch_progress_updates(campaign_id,update_key,steps,next_update_at,recorded_by,evidence_reference)
 VALUES(_campaign,_key,_steps,_next_update_at,actor,_evidence) RETURNING id INTO result;
 -- Existing realtime subscription wakes the owner's dashboard without exposing private evidence.
 UPDATE public.buyermatch_campaigns SET updated_at=now() WHERE id=_campaign;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.publish_buyermatch_progress(uuid,text,jsonb,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_buyermatch_progress(uuid,text,jsonb,timestamptz,text) TO authenticated;
