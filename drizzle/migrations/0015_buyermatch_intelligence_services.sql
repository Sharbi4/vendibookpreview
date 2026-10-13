CREATE TABLE public.buyermatch_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), submissions_enabled boolean NOT NULL DEFAULT true, fulfillment_enabled boolean NOT NULL DEFAULT false, max_campaigns integer NOT NULL DEFAULT 3 CHECK(max_campaigns BETWEEN 1 AND 50), workflow_reference text);
GRANT ALL ON public.buyermatch_settings TO service_role;
ALTER TABLE public.buyermatch_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.buyermatch_campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL REFERENCES public.profiles(id), listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id), status text NOT NULL DEFAULT 'pending_activation' CHECK(status IN ('pending_activation','approved','researching','paused','completed','rejected')), geography text NOT NULL DEFAULT '' CHECK(length(geography)<=500), buyer_criteria text NOT NULL DEFAULT '' CHECK(length(buyer_criteria)<=2000), listing_snapshot jsonb NOT NULL, notifications_enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), activated_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.buyermatch_campaigns TO authenticated;
GRANT ALL ON public.buyermatch_campaigns TO service_role;
ALTER TABLE public.buyermatch_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyermatch_owner ON public.buyermatch_campaigns FOR SELECT TO authenticated USING(seller_id=(select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE TABLE public.buyermatch_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id), summary text NOT NULL CHECK(length(summary) BETWEEN 1 AND 2000), metrics jsonb NOT NULL DEFAULT '{}', published_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.buyermatch_reports TO authenticated;
GRANT ALL ON public.buyermatch_reports TO service_role;
ALTER TABLE public.buyermatch_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyermatch_report_owner ON public.buyermatch_reports FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.buyermatch_campaigns c WHERE c.id=campaign_id AND c.seller_id=(select auth.uid())) OR public.has_role((select auth.uid()),'admin'));
CREATE TABLE public.buyermatch_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE CHECK(length(event_key) BETWEEN 1 AND 150), campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id), listing_id uuid NOT NULL REFERENCES public.listings(id), event_type text NOT NULL CHECK(event_type IN ('platform_researched','buyer_opportunity_identified','outreach_proposed','outreach_approved','outreach_sent','delivery_confirmed','buyer_response_received','inquiry_qualified','follow_up_recommended')), occurred_at timestamptz NOT NULL CHECK(occurred_at<=now()), source text NOT NULL CHECK(length(source) BETWEEN 1 AND 100), verification_status text NOT NULL CHECK(verification_status IN ('observed','verified')), outcome text NOT NULL DEFAULT '' CHECK(length(outcome)<=500), next_step text NOT NULL DEFAULT '' CHECK(length(next_step)<=500), feedback text CHECK(feedback IN ('interested','needs_financing','price_concern','not_interested')), evidence_reference text NOT NULL CHECK(length(evidence_reference) BETWEEN 1 AND 1000), recorded_by uuid NOT NULL REFERENCES public.profiles(id));
GRANT SELECT(id,event_key,campaign_id,listing_id,event_type,occurred_at,source,verification_status,outcome,next_step,feedback) ON public.buyermatch_events TO authenticated;
GRANT ALL ON public.buyermatch_events TO service_role;
ALTER TABLE public.buyermatch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyermatch_event_owner ON public.buyermatch_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.buyermatch_campaigns c WHERE c.id=campaign_id AND c.seller_id=(select auth.uid())) OR public.has_role((select auth.uid()),'admin'));
CREATE TABLE public.buyermatch_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id), listing_id uuid NOT NULL REFERENCES public.listings(id), approval_event_id uuid NOT NULL UNIQUE REFERENCES public.buyermatch_events(id), token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''), source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.buyermatch_links TO authenticated;
GRANT ALL ON public.buyermatch_links TO service_role;
ALTER TABLE public.buyermatch_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyermatch_link_owner ON public.buyermatch_links FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.buyermatch_campaigns c WHERE c.id=campaign_id AND c.seller_id=(select auth.uid())) OR public.has_role((select auth.uid()),'admin'));
CREATE TABLE public.buyermatch_visits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), link_id uuid NOT NULL REFERENCES public.buyermatch_links(id), visitor_session uuid NOT NULL, visited_at timestamptz NOT NULL DEFAULT now(), visit_day date NOT NULL DEFAULT current_date, referrer_host text CHECK(length(referrer_host)<=200), UNIQUE(link_id,visitor_session,visit_day));
GRANT ALL ON public.buyermatch_visits TO service_role;
ALTER TABLE public.buyermatch_visits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.buyermatch_entitled(_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM host_subscriptions s WHERE s.user_id=_user AND regexp_replace(lower(s.tier),'_(monthly|annual)$','') IN ('pro','premium','vendibook_pro','vendibook-pro','host_pro','host-pro','host_growth','host-growth','host_operator','host-operator') AND s.status IN ('active','trialing','past_due','canceled','cancelled') AND s.current_period_end>now()) OR EXISTS(SELECT 1 FROM monetization_purchases p JOIN monetization_products product ON product.id=p.product_id WHERE p.user_id=_user AND p.status IN ('paid','fulfilled') AND p.fulfillment_status<>'expired' AND p.access_ends_at>now() AND product.metadata->>'grants_tier' IN ('pro','premium')) $$;
REVOKE ALL ON FUNCTION public.buyermatch_entitled(uuid) FROM public,anon,authenticated;
CREATE FUNCTION public.buyermatch_action(_action text,_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); admin boolean; config public.buyermatch_settings; c public.buyermatch_campaigns; l public.listings; e public.buyermatch_events; result jsonb;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 admin:=public.has_role(actor,'admin');
 IF jsonb_typeof(_payload)<>'object' OR octet_length(_payload::text)>20000 THEN RAISE EXCEPTION 'Invalid payload'; END IF;
 SELECT * INTO config FROM public.buyermatch_settings WHERE id=true;
 IF NOT FOUND THEN config.submissions_enabled:=true; config.fulfillment_enabled:=false; config.max_campaigns:=3; END IF;
 IF _action='config' THEN RETURN jsonb_build_object('is_admin',admin,'entitled',public.buyermatch_entitled(actor),'submissions_enabled',config.submissions_enabled,'fulfillment_enabled',config.fulfillment_enabled,'max_campaigns',config.max_campaigns,'workflow_reference',CASE WHEN admin THEN config.workflow_reference ELSE NULL END); END IF;
 IF _action='settings' THEN
  IF NOT admin THEN RAISE EXCEPTION 'Administrator required'; END IF;
  IF (_payload->>'fulfillment_enabled')::boolean AND length(trim(coalesce(_payload->>'workflow_reference','')))=0 THEN RAISE EXCEPTION 'Approved workflow reference required'; END IF;
  INSERT INTO public.buyermatch_settings(id,submissions_enabled,fulfillment_enabled,max_campaigns,workflow_reference) VALUES(true,(_payload->>'submissions_enabled')::boolean,(_payload->>'fulfillment_enabled')::boolean,(_payload->>'max_campaigns')::integer,_payload->>'workflow_reference') ON CONFLICT(id) DO UPDATE SET submissions_enabled=excluded.submissions_enabled,fulfillment_enabled=excluded.fulfillment_enabled,max_campaigns=excluded.max_campaigns,workflow_reference=excluded.workflow_reference;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF _action='submit' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,8371));
  IF NOT config.submissions_enabled OR NOT public.buyermatch_entitled(actor) THEN RAISE EXCEPTION 'Current Pro access and open campaign intake are required'; END IF;
  SELECT * INTO l FROM public.listings WHERE id=(_payload->>'listing_id')::uuid FOR UPDATE;
  IF NOT FOUND OR l.host_id<>actor OR l.mode::text<>'sale' OR l.status::text<>'published' OR l.deleted_at IS NOT NULL OR coalesce(l.unlisted,false) THEN RAISE EXCEPTION 'Choose your published sale listing'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_transactions WHERE listing_id=l.id AND status IN ('paid','completed','payment_processing','disputed')) THEN RAISE EXCEPTION 'Reserved or sold listing is not eligible'; END IF;
  SELECT * INTO c FROM public.buyermatch_campaigns WHERE listing_id=l.id;
  IF FOUND THEN IF c.seller_id<>actor THEN RAISE EXCEPTION 'Campaign ownership changed'; END IF; RETURN to_jsonb(c); END IF;
  IF (SELECT count(*) FROM public.buyermatch_campaigns WHERE seller_id=actor AND status NOT IN ('completed','rejected'))>=config.max_campaigns THEN RAISE EXCEPTION 'Campaign capacity reached'; END IF;
  INSERT INTO public.buyermatch_campaigns(seller_id,listing_id,geography,buyer_criteria,listing_snapshot) VALUES(actor,l.id,coalesce(_payload->>'geography',''),coalesce(_payload->>'buyer_criteria',''),jsonb_build_object('title',l.title,'price_sale',l.price_sale,'city',l.city,'state',l.state,'cover_image_url',l.cover_image_url,'image_urls',l.image_urls,'description',l.description,'included_items',l.included_items,'condition',l.condition)) RETURNING * INTO c;
 ELSE
  SELECT * INTO c FROM public.buyermatch_campaigns WHERE id=(_payload->>'campaign_id')::uuid FOR UPDATE;
  IF NOT FOUND OR (c.seller_id<>actor AND NOT admin) THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _action='engagement' THEN RETURN jsonb_build_object('visits',(SELECT count(*) FROM public.buyermatch_visits v JOIN public.buyermatch_links k ON k.id=v.link_id WHERE k.campaign_id=c.id),'unique_sessions',(SELECT count(DISTINCT visitor_session) FROM public.buyermatch_visits v JOIN public.buyermatch_links k ON k.id=v.link_id WHERE k.campaign_id=c.id),'daily',coalesce((SELECT jsonb_agg(d) FROM (SELECT v.visit_day as day,count(*) as visits FROM public.buyermatch_visits v JOIN public.buyermatch_links k ON k.id=v.link_id WHERE k.campaign_id=c.id GROUP BY v.visit_day ORDER BY v.visit_day) d),'[]'::jsonb)); END IF;
  IF _action='preferences' THEN UPDATE public.buyermatch_campaigns SET geography=coalesce(_payload->>'geography',geography),buyer_criteria=coalesce(_payload->>'buyer_criteria',buyer_criteria),notifications_enabled=coalesce((_payload->>'notifications_enabled')::boolean,notifications_enabled),updated_at=now() WHERE id=c.id;
  ELSIF _action='pause' THEN IF c.status IN ('completed','rejected') THEN RAISE EXCEPTION 'Campaign closed'; END IF; UPDATE public.buyermatch_campaigns SET status='paused',updated_at=now() WHERE id=c.id;
  ELSIF _action='resume' THEN IF c.status<>'paused' OR NOT public.buyermatch_entitled(c.seller_id) THEN RAISE EXCEPTION 'Current Pro access and paused campaign required'; END IF; UPDATE public.buyermatch_campaigns SET status='pending_activation',updated_at=now() WHERE id=c.id;
  ELSIF _action IN ('approve','activate','complete','reject','event','link','brief') THEN
   IF NOT admin THEN RAISE EXCEPTION 'Administrator required'; END IF;
   IF _action IN ('approve','activate','event','link','brief') THEN
    SELECT * INTO l FROM public.listings WHERE id=c.listing_id;
    IF NOT public.buyermatch_entitled(c.seller_id) OR l.host_id<>c.seller_id OR l.status::text<>'published' OR l.deleted_at IS NOT NULL OR coalesce(l.unlisted,false) OR EXISTS(SELECT 1 FROM public.sale_transactions WHERE listing_id=l.id AND status IN ('paid','completed','payment_processing','disputed')) THEN RAISE EXCEPTION 'Current entitlement and available owned listing required'; END IF;
   END IF;
   IF _action='approve' THEN IF c.status<>'pending_activation' THEN RAISE EXCEPTION 'Campaign must be pending review'; END IF; UPDATE public.buyermatch_campaigns SET status='approved',updated_at=now() WHERE id=c.id;
   ELSIF _action='activate' THEN IF c.status<>'approved' OR NOT config.fulfillment_enabled OR (_payload->>'research_started')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Approved campaign and confirmed operational workflow required'; END IF; UPDATE public.buyermatch_campaigns SET status='researching',activated_at=coalesce(activated_at,now()),updated_at=now() WHERE id=c.id;
   ELSIF _action='complete' THEN UPDATE public.buyermatch_campaigns SET status='completed',updated_at=now() WHERE id=c.id;
   ELSIF _action='reject' THEN IF length(trim(coalesce(_payload->>'reason','')))=0 THEN RAISE EXCEPTION 'Rejection explanation required'; END IF; UPDATE public.buyermatch_campaigns SET status='rejected',updated_at=now() WHERE id=c.id;
   ELSIF _action='brief' THEN RETURN jsonb_build_object('campaign_id',c.id,'listing_id',c.listing_id,'listing',c.listing_snapshot,'geography',c.geography,'buyer_criteria',c.buyer_criteria,'instructions','Research public buying intent; no outreach without documented approval. Return observed events with unique IDs and evidence for staff verification.');
   ELSIF _action='event' THEN
    IF c.status<>'researching' OR NOT config.fulfillment_enabled THEN RAISE EXCEPTION 'Campaign is not active'; END IF;
    IF (_payload->>'listing_id')::uuid IS DISTINCT FROM c.listing_id OR (_payload->>'review_confirmed')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verify event evidence and listing mapping'; END IF;
    INSERT INTO public.buyermatch_events(event_key,campaign_id,listing_id,event_type,occurred_at,source,verification_status,outcome,next_step,feedback,evidence_reference,recorded_by) VALUES(_payload->>'event_id',c.id,c.listing_id,_payload->>'event_type',(_payload->>'timestamp')::timestamptz,_payload->>'source',_payload->>'verification_status',coalesce(_payload->>'outcome',''),coalesce(_payload->>'next_step',''),_payload->>'feedback',_payload->>'evidence_reference',actor) ON CONFLICT(event_key) DO NOTHING RETURNING * INTO e;
    IF NOT FOUND THEN SELECT * INTO e FROM public.buyermatch_events WHERE event_key=_payload->>'event_id'; IF e.campaign_id<>c.id OR e.listing_id<>c.listing_id OR e.event_type IS DISTINCT FROM _payload->>'event_type' OR e.occurred_at IS DISTINCT FROM (_payload->>'timestamp')::timestamptz OR e.source IS DISTINCT FROM _payload->>'source' OR e.verification_status IS DISTINCT FROM _payload->>'verification_status' OR e.evidence_reference IS DISTINCT FROM _payload->>'evidence_reference' OR e.outcome IS DISTINCT FROM coalesce(_payload->>'outcome','') OR e.next_step IS DISTINCT FROM coalesce(_payload->>'next_step','') OR e.feedback IS DISTINCT FROM _payload->>'feedback' THEN RAISE EXCEPTION 'Event ID already used with different content'; END IF; END IF;
    RETURN jsonb_build_object('id',e.id);
   ELSE
    SELECT * INTO e FROM public.buyermatch_events WHERE id=(_payload->>'approval_event_id')::uuid AND campaign_id=c.id AND event_type='outreach_approved' AND verification_status='verified';
    IF NOT FOUND THEN RAISE EXCEPTION 'Verified outreach approval required'; END IF;
    INSERT INTO public.buyermatch_links(campaign_id,listing_id,approval_event_id,source) VALUES(c.id,c.listing_id,e.id,e.source) ON CONFLICT(approval_event_id) DO NOTHING;
    SELECT to_jsonb(k) INTO result FROM public.buyermatch_links k WHERE approval_event_id=e.id; RETURN result;
   END IF;
  ELSE RAISE EXCEPTION 'Unsupported campaign action'; END IF;
 END IF;
 SELECT * INTO c FROM public.buyermatch_campaigns WHERE id=c.id;
 IF c.notifications_enabled AND _action IN ('submit','approve','activate','pause','resume','complete','reject') THEN INSERT INTO public.notifications(user_id,type,title,message,link) VALUES(c.seller_id,'system','BuyerMatch campaign updated',CASE c.status WHEN 'pending_activation' THEN 'Pending review. No outreach has started.' WHEN 'approved' THEN 'Campaign approved; awaiting operator activation.' WHEN 'researching' THEN 'An operator confirmed research has started.' WHEN 'rejected' THEN coalesce(_payload->>'reason','Campaign rejected') ELSE 'Campaign '||c.status||'.' END,'/dashboard/buyermatch?campaign='||c.id); END IF;
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.buyermatch_action(text,jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.buyermatch_action(text,jsonb) TO authenticated;
CREATE FUNCTION public.buyermatch_track_visit(_token text,_listing_id uuid,_session uuid,_consent boolean,_referrer_host text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE k public.buyermatch_links; BEGIN IF _consent IS DISTINCT FROM true OR _session IS NULL OR length(_token)<>64 THEN RETURN false; END IF; SELECT * INTO k FROM public.buyermatch_links WHERE token=_token AND listing_id=_listing_id; IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.buyermatch_campaigns c JOIN public.listings l ON l.id=c.listing_id WHERE c.id=k.campaign_id AND c.status='researching' AND public.buyermatch_entitled(c.seller_id) AND l.status::text='published' AND l.deleted_at IS NULL) THEN RETURN false; END IF; INSERT INTO public.buyermatch_visits(link_id,visitor_session,referrer_host) VALUES(k.id,_session,left(_referrer_host,200)) ON CONFLICT(link_id,visitor_session,visit_day) DO NOTHING; RETURN true; END $$;
REVOKE ALL ON FUNCTION public.buyermatch_track_visit(text,uuid,uuid,boolean,text) FROM public;
GRANT EXECUTE ON FUNCTION public.buyermatch_track_visit(text,uuid,uuid,boolean,text) TO anon,authenticated;
COMMENT ON TABLE public.buyermatch_visits IS 'Consent-gated unverified browser sessions, one visit per link/session/day; never qualified buyers or leads. Raw sessions are not client-readable.';