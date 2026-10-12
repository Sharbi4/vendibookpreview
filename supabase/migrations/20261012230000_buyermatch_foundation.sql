-- BuyerMatch is a reviewed service; no automatic outreach or billing changes.
CREATE TABLE public.buyermatch_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 submissions_enabled boolean NOT NULL DEFAULT true,
 fulfillment_enabled boolean NOT NULL DEFAULT false,
 max_campaigns integer NOT NULL DEFAULT 3 CHECK(max_campaigns BETWEEN 1 AND 50),
 workflow_reference text,
 CHECK(NOT fulfillment_enabled OR length(trim(coalesce(workflow_reference,'')))>0)
);
INSERT INTO public.buyermatch_settings(id) VALUES(true);
CREATE TABLE public.buyermatch_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id uuid NOT NULL REFERENCES auth.users(id),
 listing_id uuid NOT NULL REFERENCES public.listings(id),
 status text NOT NULL DEFAULT 'pending_activation' CHECK(status IN ('pending_activation','researching','paused','completed')),
 geography text NOT NULL DEFAULT '' CHECK(length(geography)<=500),
 buyer_criteria text NOT NULL DEFAULT '' CHECK(length(buyer_criteria)<=2000),
 listing_snapshot jsonb NOT NULL,
 notifications_enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 activated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(listing_id)
);
CREATE TABLE public.buyermatch_imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 batch_key text NOT NULL CHECK(length(batch_key) BETWEEN 1 AND 100),
 records jsonb NOT NULL CHECK(jsonb_typeof(records)='array'),
 status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected')),
 submitted_by uuid NOT NULL REFERENCES auth.users(id),
 reviewed_by uuid REFERENCES auth.users(id),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 UNIQUE(campaign_id,batch_key)
);
-- Internal research only: never grant seller read access to these records.
CREATE TABLE public.buyermatch_prospects (
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 prospect_id text NOT NULL,
 record jsonb NOT NULL,
 source_import_id uuid NOT NULL REFERENCES public.buyermatch_imports(id),
 PRIMARY KEY(campaign_id,prospect_id)
);
CREATE TABLE public.buyermatch_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 source_import_id uuid NOT NULL UNIQUE REFERENCES public.buyermatch_imports(id),
 summary text NOT NULL CHECK(length(summary) BETWEEN 1 AND 2000),
 metrics jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.buyermatch_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid REFERENCES public.buyermatch_campaigns(id),
 actor_id uuid REFERENCES auth.users(id),
 action text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Resolve existing paid Pro/Operator subscriptions and previously purchased passes.
-- Null/expired dates never create an indefinite new outreach entitlement.
CREATE FUNCTION public.buyermatch_entitled(_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM host_subscriptions s WHERE s.user_id=_user
  AND regexp_replace(lower(s.tier),'_(monthly|annual)$','') IN ('pro','premium','vendibook_pro','vendibook-pro','host_pro','host-pro','host_growth','host-growth','host_operator','host-operator')
  AND s.status IN ('active','trialing','past_due','canceled','cancelled') AND s.current_period_end>now())
 OR EXISTS(SELECT 1 FROM monetization_purchases p JOIN monetization_products product ON product.id=p.product_id
  WHERE p.user_id=_user AND p.status IN ('paid','fulfilled') AND p.fulfillment_status<>'expired'
  AND p.access_ends_at>now() AND product.metadata->>'grants_tier' IN ('pro','premium'))
$$;
REVOKE ALL ON FUNCTION public.buyermatch_entitled(uuid) FROM public,anon,authenticated;

ALTER TABLE public.buyermatch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyermatch_settings,public.buyermatch_campaigns,public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_reports,public.buyermatch_audit FROM anon,authenticated;
GRANT SELECT ON public.buyermatch_campaigns,public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_reports,public.buyermatch_audit TO authenticated;
CREATE POLICY buyermatch_owner ON public.buyermatch_campaigns FOR SELECT TO authenticated USING(seller_id=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_report_owner ON public.buyermatch_reports FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.buyermatch_campaigns c WHERE c.id=campaign_id AND c.seller_id=(SELECT auth.uid())) OR public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_import_admin ON public.buyermatch_imports FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_prospect_admin ON public.buyermatch_prospects FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_audit_admin ON public.buyermatch_audit FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
GRANT ALL ON public.buyermatch_settings,public.buyermatch_campaigns,public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_reports,public.buyermatch_audit TO service_role;


CREATE FUNCTION public.buyermatch_pause_ineligible() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $
DECLARE affected integer;
BEGIN
 UPDATE public.buyermatch_campaigns c SET status='paused',updated_at=now()
 WHERE c.status IN ('pending_activation','researching') AND (
  NOT public.buyermatch_entitled(c.seller_id)
  OR NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=c.listing_id AND l.host_id=c.seller_id
   AND l.status::text='published' AND l.mode::text='sale' AND l.deleted_at IS NULL AND NOT coalesce(l.unlisted,false))
  OR EXISTS(SELECT 1 FROM public.sale_invoices i WHERE i.listing_id=c.listing_id AND i.status IN ('issued','payment_processing','paid','disputed','partially_refunded','completed')));
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected;
END $;
REVOKE ALL ON FUNCTION public.buyermatch_pause_ineligible() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buyermatch_pause_ineligible() TO service_role;

CREATE FUNCTION public.buyermatch_action(_action text,_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); admin boolean; config public.buyermatch_settings; campaign public.buyermatch_campaigns;
 listing public.listings; batch public.buyermatch_imports; item jsonb; field text; metrics jsonb; result jsonb; summary text; next_status text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 admin:=public.has_role(actor,'admin');
 IF octet_length(_payload::text)>500000 THEN RAISE EXCEPTION 'Payload too large'; END IF;
 SELECT * INTO config FROM public.buyermatch_settings WHERE id=true FOR UPDATE;
 PERFORM public.buyermatch_pause_ineligible();
 IF _action='config' THEN RETURN jsonb_build_object('is_admin',admin,'entitled',public.buyermatch_entitled(actor),'submissions_enabled',config.submissions_enabled,'fulfillment_enabled',config.fulfillment_enabled,'max_campaigns',config.max_campaigns,'workflow_reference',CASE WHEN admin THEN config.workflow_reference ELSE NULL END); END IF;
 IF _action='settings' THEN
  IF NOT admin THEN RAISE EXCEPTION 'Administrator required'; END IF;
  UPDATE public.buyermatch_settings SET submissions_enabled=(_payload->>'submissions_enabled')::boolean,fulfillment_enabled=(_payload->>'fulfillment_enabled')::boolean,
   max_campaigns=(_payload->>'max_campaigns')::integer,workflow_reference=trim(_payload->>'workflow_reference') WHERE id=true;
  INSERT INTO public.buyermatch_audit(actor_id,action) VALUES(actor,'settings_updated');
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF _action='submit' THEN
  -- Serialize submissions per seller, including distinct listings.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,8371));
  IF NOT config.submissions_enabled OR NOT public.buyermatch_entitled(actor) THEN RAISE EXCEPTION 'An active Pro entitlement and open campaign intake are required'; END IF;
  SELECT * INTO listing FROM public.listings WHERE id=(_payload->>'listing_id')::uuid FOR UPDATE;
  IF NOT FOUND OR listing.host_id<>actor OR listing.mode::text<>'sale' OR listing.status::text<>'published' OR listing.deleted_at IS NOT NULL OR coalesce(listing.unlisted,false) THEN RAISE EXCEPTION 'Choose your published, publicly listed sale listing'; END IF;
  IF EXISTS(SELECT 1 FROM sale_invoices WHERE listing_id=listing.id AND status IN ('issued','payment_processing','paid','disputed','partially_refunded','completed')) THEN RAISE EXCEPTION 'Reserved or sold listings are not eligible'; END IF;
  SELECT * INTO campaign FROM public.buyermatch_campaigns WHERE listing_id=listing.id;
  IF FOUND THEN
   IF campaign.seller_id<>actor THEN RAISE EXCEPTION 'Campaign owner changed; administrator review required'; END IF;
   RETURN to_jsonb(campaign);
  END IF;
  IF (SELECT count(*) FROM public.buyermatch_campaigns WHERE seller_id=actor AND status<>'completed')>=config.max_campaigns THEN RAISE EXCEPTION 'Campaign capacity reached'; END IF;
  INSERT INTO public.buyermatch_campaigns(seller_id,listing_id,geography,buyer_criteria,listing_snapshot)
   VALUES(actor,listing.id,coalesce(_payload->>'geography',''),coalesce(_payload->>'buyer_criteria',''),
    jsonb_build_object('title',listing.title,'category',listing.category,'make',listing.make,'model',listing.model,'price_sale',listing.price_sale,'city',listing.city,'state',listing.state,
     'cover_image_url',listing.cover_image_url,'image_urls',listing.image_urls,'description',listing.description,'highlights',listing.highlights,'included_items',listing.included_items,'condition',listing.condition))
   RETURNING * INTO campaign;
  INSERT INTO public.notifications(user_id,type,title,message,link) VALUES(actor,'system','BuyerMatch campaign submitted','Your campaign is pending activation. Research and outreach have not started.','/dashboard/buyermatch');
 ELSIF _action IN ('pause','preferences','resume','activate','complete','import','approve_import','reject_import') THEN
  SELECT * INTO campaign FROM public.buyermatch_campaigns WHERE id=(_payload->>'campaign_id')::uuid FOR UPDATE;
  IF NOT FOUND OR (campaign.seller_id<>actor AND NOT admin) THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _action IN ('activate','complete','import','approve_import','reject_import') AND NOT admin THEN RAISE EXCEPTION 'Administrator required'; END IF;
  IF _action='pause' THEN
   IF campaign.status='completed' THEN RAISE EXCEPTION 'Campaign completed'; END IF;
   UPDATE public.buyermatch_campaigns SET status='paused',updated_at=now() WHERE id=campaign.id;
  ELSIF _action='preferences' THEN
   UPDATE public.buyermatch_campaigns SET geography=coalesce(_payload->>'geography',geography),buyer_criteria=coalesce(_payload->>'buyer_criteria',buyer_criteria),
    notifications_enabled=coalesce((_payload->>'notifications_enabled')::boolean,notifications_enabled),updated_at=now() WHERE id=campaign.id;
  ELSIF _action='complete' THEN
   UPDATE public.buyermatch_campaigns SET status='completed',updated_at=now() WHERE id=campaign.id;
  ELSE
   IF NOT public.buyermatch_entitled(campaign.seller_id) THEN RAISE EXCEPTION 'Pro access has ended; new campaign activity is paused'; END IF;
   SELECT * INTO listing FROM public.listings WHERE id=campaign.listing_id FOR UPDATE;
   IF listing.host_id<>campaign.seller_id OR listing.status::text<>'published' OR listing.mode::text<>'sale' OR listing.deleted_at IS NOT NULL OR coalesce(listing.unlisted,false)
    OR EXISTS(SELECT 1 FROM sale_invoices WHERE listing_id=listing.id AND status IN ('issued','payment_processing','paid','disputed','partially_refunded','completed'))
   THEN RAISE EXCEPTION 'Listing no longer available for outreach'; END IF;
   IF _action='resume' THEN
    IF campaign.status<>'paused' THEN RAISE EXCEPTION 'Only paused campaigns can be resubmitted'; END IF;
    UPDATE public.buyermatch_campaigns SET status='pending_activation',updated_at=now() WHERE id=campaign.id;
   ELSIF _action='activate' THEN
    IF (_payload->>'research_started')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirm the approved research workflow has actually started'; END IF;
    IF NOT config.fulfillment_enabled THEN RAISE EXCEPTION 'Configure the approved fulfillment workflow before activation'; END IF;
    IF campaign.status NOT IN ('pending_activation','researching') THEN RAISE EXCEPTION 'Seller must resume participation first'; END IF;
    UPDATE public.buyermatch_campaigns SET status='researching',activated_at=coalesce(activated_at,now()),updated_at=now() WHERE id=campaign.id;
   ELSIF _action='import' THEN
    IF campaign.status<>'researching' OR NOT config.fulfillment_enabled THEN RAISE EXCEPTION 'Campaign is not active'; END IF;
    IF jsonb_typeof(_payload->'records') IS DISTINCT FROM 'array' OR jsonb_array_length(_payload->'records') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Import 1 to 500 JSON records'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(_payload->'records') r GROUP BY r->>'prospect_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate prospect in import'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(_payload->'records') LOOP
     IF jsonb_typeof(item)<>'object' OR (item->>'campaign_id')::uuid IS DISTINCT FROM campaign.id OR (item->>'listing_id')::uuid IS DISTINCT FROM campaign.listing_id
      OR length(trim(coalesce(item->>'prospect_id',''))) NOT BETWEEN 1 AND 200
      OR length(trim(coalesce(item->>'buyer_intent_summary',''))) NOT BETWEEN 1 AND 2000
      OR length(trim(coalesce(item->>'source_type','')))=0
      OR coalesce((item->>'match_confidence')::numeric,-1) NOT BETWEEN 0 AND 1
      OR item->>'outreach_status' IS NULL OR item->>'outreach_status' NOT IN ('discovered','contacted','replied','interested','qualified','introduced','inquiry','opted_out')
      OR (item->>'discovered_at')::timestamptz IS NULL OR (item->>'discovered_at')::timestamptz>now()
      OR (item->>'updated_at')::timestamptz IS NULL OR (item->>'updated_at')::timestamptz>now()
      OR (item->>'updated_at')::timestamptz<(item->>'discovered_at')::timestamptz
     THEN RAISE EXCEPTION 'Invalid research record or campaign mapping'; END IF;
     IF item->>'outreach_status' NOT IN ('discovered','opted_out') AND (length(trim(coalesce(item->>'permission_reference','')))=0
       OR length(trim(coalesce(item->>'outreach_channel','')))=0 OR (item->>'attempt_at')::timestamptz IS NULL
       OR (item->>'attempt_at')::timestamptz>now() OR (item->>'attempt_at')::timestamptz<(item->>'discovered_at')::timestamptz)
     THEN RAISE EXCEPTION 'Outreach requires documented permission, channel and attempt date'; END IF;
     -- Status alone never implies a response, qualified lead, or inquiry.
     FOREACH field IN ARRAY ARRAY['attempt','reply','interested','qualified','introduced','inquiry'] LOOP
      IF item->>(field||'_at') IS NOT NULL AND (
       (item->>(field||'_at'))::timestamptz < (item->>'discovered_at')::timestamptz
       OR (item->>(field||'_at'))::timestamptz > (item->>'updated_at')::timestamptz
       OR length(trim(coalesce(item->>(field||'_evidence'),'')))=0)
      THEN RAISE EXCEPTION 'Activity requires a valid timestamp and evidence reference'; END IF;
     END LOOP;
     IF (item->>'outreach_status'='replied' AND item->>'reply_at' IS NULL)
      OR (item->>'outreach_status'='interested' AND item->>'interested_at' IS NULL)
      OR (item->>'outreach_status'='qualified' AND item->>'qualified_at' IS NULL)
      OR (item->>'outreach_status'='introduced' AND item->>'introduced_at' IS NULL)
      OR (item->>'outreach_status'='inquiry' AND item->>'inquiry_at' IS NULL)
     THEN RAISE EXCEPTION 'Claimed activity is missing evidence'; END IF;
     IF item->>'attempt_at' IS NOT NULL AND length(trim(coalesce(item->>'permission_reference','')))=0
     THEN RAISE EXCEPTION 'Contact attempts require outreach permission'; END IF;
    END LOOP;
    INSERT INTO public.buyermatch_imports(campaign_id,batch_key,records,submitted_by)
     VALUES(campaign.id,_payload->>'batch_key',_payload->'records',actor)
     ON CONFLICT(campaign_id,batch_key) DO NOTHING RETURNING to_jsonb(buyermatch_imports.*) INTO result;
    IF result IS NULL THEN
     SELECT * INTO batch FROM public.buyermatch_imports WHERE campaign_id=campaign.id AND batch_key=_payload->>'batch_key';
     IF batch.records IS DISTINCT FROM _payload->'records' THEN RAISE EXCEPTION 'Batch key already used with different contents'; END IF;
     result:=to_jsonb(batch);
    END IF;
    INSERT INTO public.buyermatch_audit(campaign_id,actor_id,action) VALUES(campaign.id,actor,'import_staged');
    RETURN result;
   ELSE
    SELECT * INTO batch FROM public.buyermatch_imports WHERE id=(_payload->>'import_id')::uuid AND campaign_id=campaign.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Import not found'; END IF;
    IF batch.status<>'pending_review' THEN RETURN jsonb_build_object('status',batch.status); END IF;
    IF _action='reject_import' THEN
     UPDATE public.buyermatch_imports SET status='rejected',reviewed_by=actor,reviewed_at=now() WHERE id=batch.id;
    ELSE
     IF campaign.status<>'researching' OR NOT config.fulfillment_enabled THEN RAISE EXCEPTION 'Campaign is not active'; END IF;
     summary:=trim(coalesce(_payload->>'summary',''));
     IF (_payload->>'review_confirmed')::boolean IS DISTINCT FROM true OR length(summary) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Review evidence and provide a contact-free seller summary'; END IF;
     FOR item IN SELECT value FROM jsonb_array_elements(batch.records) LOOP
      IF EXISTS(SELECT 1 FROM public.buyermatch_prospects p WHERE p.campaign_id=campaign.id AND p.prospect_id=item->>'prospect_id'
       AND (p.record->>'outreach_status'='opted_out' AND item->>'outreach_status'<>'opted_out'
        OR (p.record->>'updated_at')::timestamptz>(item->>'updated_at')::timestamptz
        OR ((p.record->>'updated_at')::timestamptz=(item->>'updated_at')::timestamptz AND p.record IS DISTINCT FROM item)))
      THEN RAISE EXCEPTION 'Cannot overwrite opt-out or newer research'; END IF;
      INSERT INTO public.buyermatch_prospects(campaign_id,prospect_id,record,source_import_id) VALUES(campaign.id,item->>'prospect_id',item,batch.id)
       ON CONFLICT(campaign_id,prospect_id) DO UPDATE SET record=excluded.record,source_import_id=excluded.source_import_id;
     END LOOP;
     SELECT jsonb_build_object('discovered',count(*),
      'contacted',count(*) FILTER(WHERE p.record->>'attempt_at' IS NOT NULL),
      'responses',count(*) FILTER(WHERE p.record->>'reply_at' IS NOT NULL),
      'interested',count(*) FILTER(WHERE p.record->>'interested_at' IS NOT NULL),
      'qualified',count(*) FILTER(WHERE p.record->>'qualified_at' IS NOT NULL),
      'introduced',count(*) FILTER(WHERE p.record->>'introduced_at' IS NOT NULL),
      'inquiries',count(*) FILTER(WHERE p.record->>'inquiry_at' IS NOT NULL))
      INTO metrics FROM public.buyermatch_prospects p WHERE campaign_id=campaign.id;
     INSERT INTO public.buyermatch_reports(campaign_id,source_import_id,summary,metrics) VALUES(campaign.id,batch.id,summary,metrics);
     UPDATE public.buyermatch_imports SET status='approved',reviewed_by=actor,reviewed_at=now() WHERE id=batch.id;
     IF campaign.notifications_enabled THEN
      INSERT INTO public.notifications(user_id,type,title,message,link) VALUES(campaign.seller_id,'system','BuyerMatch report available','Reviewed campaign activity is ready to view.','/dashboard/buyermatch?campaign='||campaign.id);
     END IF;
    END IF;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Unsupported campaign action'; END IF;
 IF _action IN ('pause','resume','activate','complete') AND campaign.notifications_enabled THEN
  INSERT INTO public.notifications(user_id,type,title,message,link) VALUES(campaign.seller_id,'system','BuyerMatch campaign updated',
   CASE _action WHEN 'pause' THEN 'Campaign paused. Your reports remain available.' WHEN 'resume' THEN 'Campaign resubmitted for activation.'
    WHEN 'activate' THEN 'An operator confirmed that research has started.' ELSE 'Campaign completed. View your historical reports.' END,
   '/dashboard/buyermatch?campaign='||campaign.id);
 END IF;
 INSERT INTO public.buyermatch_audit(campaign_id,actor_id,action) VALUES(campaign.id,actor,_action);
 SELECT to_jsonb(c) INTO result FROM public.buyermatch_campaigns c WHERE c.id=campaign.id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.buyermatch_action(text,jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.buyermatch_action(text,jsonb) TO authenticated;
