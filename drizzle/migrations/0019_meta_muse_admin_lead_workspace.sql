CREATE TABLE public.meta_muse_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),revision int NOT NULL DEFAULT 1,name text NOT NULL,contact text NOT NULL DEFAULT '',intent text NOT NULL CHECK(intent IN ('buy','rent','sell')),category text,city text,budget_max numeric CHECK(budget_max>0),start_date date,end_date date,source_kind text NOT NULL CHECK(source_kind IN ('voluntary','manual_authorized')),provenance text NOT NULL,consent_evidence text NOT NULL DEFAULT '',contact_channel text NOT NULL DEFAULT 'email' CHECK(contact_channel IN ('email','phone','messenger')),contact_allowed boolean NOT NULL DEFAULT false,do_not_contact boolean NOT NULL DEFAULT false,next_follow_up date,stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','qualified','follow_up','closed')),notes text NOT NULL DEFAULT '',CHECK(end_date IS NULL OR start_date IS NULL OR end_date>=start_date));
GRANT SELECT ON public.meta_muse_leads TO authenticated; GRANT ALL ON public.meta_muse_leads TO service_role;
ALTER TABLE public.meta_muse_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.meta_muse_leads FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.meta_muse_drafts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lead_id uuid NOT NULL REFERENCES public.meta_muse_leads(id),body text NOT NULL,listing_ids uuid[] NOT NULL DEFAULT '{}',generator text NOT NULL CHECK(generator IN ('template','muse')),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','rejected')),revision int NOT NULL DEFAULT 1,lead_revision int NOT NULL,approved_by uuid,approved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.meta_muse_drafts TO authenticated; GRANT ALL ON public.meta_muse_drafts TO service_role;
ALTER TABLE public.meta_muse_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.meta_muse_drafts FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.meta_muse_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lead_id uuid NOT NULL REFERENCES public.meta_muse_leads(id),draft_id uuid REFERENCES public.meta_muse_drafts(id),actor_id uuid NOT NULL,action text NOT NULL,revision int,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.meta_muse_audit TO authenticated; GRANT SELECT,INSERT ON public.meta_muse_audit TO service_role;
ALTER TABLE public.meta_muse_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.meta_muse_audit FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.meta_muse_rate_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.meta_muse_rate_events TO service_role;
ALTER TABLE public.meta_muse_rate_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX meta_muse_rate_actor_time ON public.meta_muse_rate_events(actor_id,created_at);
CREATE FUNCTION public.meta_muse_take_rate() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,831));
IF (SELECT count(*) FROM public.meta_muse_rate_events WHERE actor_id=auth.uid() AND created_at>now()-interval '1 hour')>=10 THEN RETURN false; END IF;
INSERT INTO public.meta_muse_rate_events(actor_id) VALUES(auth.uid()); RETURN true; END $$;
REVOKE ALL ON FUNCTION public.meta_muse_take_rate() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.meta_muse_take_rate() TO authenticated;
CREATE FUNCTION public.meta_muse_listing_eligible(_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.listings; BEGIN
SELECT * INTO l FROM public.listings WHERE id=_id;
IF l.id IS NULL OR l.unlisted IS DISTINCT FROM false OR l.status<>'published' OR l.published_at IS NULL OR l.deleted_at IS NOT NULL OR l.moderation_status IS DISTINCT FROM 'clear' OR l.title ILIKE ANY(ARRAY['Demo%','QA %','QA_%','QA-%','Test %','E2E %','Smoke %','Sandbox %']) THEN RETURN false; END IF;
IF NOT coalesce((public.listing_purchase_state(_id)->>'purchasable')::boolean,false) THEN RETURN false; END IF;
IF l.mode='sale' AND (NOT coalesce((public.sale_action_state(_id)->>'can_request')::boolean,false) OR EXISTS(SELECT 1 FROM public.sale_transactions WHERE listing_id=_id AND status IN ('paid','completed','handoff_pending','disputed'))) THEN RETURN false; END IF;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.meta_muse_listing_eligible(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.meta_muse_inventory() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'mode',mode,'category',category,'city',city,'state',state,'price_sale',price_sale,'price_daily',price_daily,'price_weekly',price_weekly,'price_monthly',price_monthly,'vendibook_freight_enabled',vendibook_freight_enabled,'rental_min_days',rental_min_days,'available_from',available_from,'available_to',available_to)) FROM public.listings WHERE public.meta_muse_listing_eligible(id)),'[]'::jsonb); END $$;
REVOKE ALL ON FUNCTION public.meta_muse_inventory() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.meta_muse_inventory() TO authenticated;
CREATE FUNCTION public.meta_muse_action(_action text,_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.meta_muse_leads; d public.meta_muse_drafts; lid uuid; ids uuid[]; item uuid; av jsonb; rl public.listings; result jsonb; actor uuid:=auth.uid(); links text[];
BEGIN
IF actor IS NULL OR NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
IF _action='send' THEN RAISE EXCEPTION 'Sending disabled: no approved transport or Messenger connection'; END IF;
IF _action IN ('create_lead','edit_lead') THEN
IF length(trim(coalesce(_payload->>'name','')))=0 OR length(_payload->>'name')>200 OR length(trim(coalesce(_payload->>'provenance','')))=0 THEN RAISE EXCEPTION 'Name and provenance required'; END IF;
IF _action='create_lead' THEN
INSERT INTO public.meta_muse_leads(created_by,name,intent,source_kind,provenance) VALUES(actor,_payload->>'name',_payload->>'intent',_payload->>'source_kind',left(_payload->>'provenance',2000)) RETURNING * INTO l; lid:=l.id;
ELSE
lid:=(_payload->>'lead_id')::uuid; SELECT * INTO l FROM public.meta_muse_leads WHERE id=lid FOR UPDATE;
IF l.id IS NULL OR l.revision IS DISTINCT FROM (_payload->>'lead_revision')::int THEN RAISE EXCEPTION 'Lead changed; reload first'; END IF;
END IF;
UPDATE public.meta_muse_leads SET name=_payload->>'name',intent=_payload->>'intent',source_kind=_payload->>'source_kind',provenance=left(_payload->>'provenance',2000),contact=left(coalesce(_payload->>'contact',''),300),category=nullif(_payload->>'category',''),city=left(_payload->>'city',200),budget_max=nullif(_payload->>'budget_max','')::numeric,start_date=nullif(_payload->>'start_date','')::date,end_date=nullif(_payload->>'end_date','')::date,consent_evidence=left(coalesce(_payload->>'consent_evidence',''),2000),contact_channel=coalesce(_payload->>'contact_channel','email'),contact_allowed=coalesce((_payload->>'contact_allowed')::boolean,false),do_not_contact=coalesce((_payload->>'do_not_contact')::boolean,false),next_follow_up=nullif(_payload->>'next_follow_up','')::date,stage=coalesce(_payload->>'stage','new'),notes=left(coalesce(_payload->>'notes',''),4000),revision=revision+(CASE WHEN _action='edit_lead' THEN 1 ELSE 0 END),updated_at=now() WHERE id=lid RETURNING * INTO l;
UPDATE public.meta_muse_drafts SET status='draft',approved_by=NULL,approved_at=NULL,updated_at=now() WHERE lead_id=lid;
result:=to_jsonb(l);
ELSE
IF _action='create_draft' THEN lid:=(_payload->>'lead_id')::uuid; ELSE SELECT lead_id INTO lid FROM public.meta_muse_drafts WHERE id=(_payload->>'draft_id')::uuid; END IF;
SELECT * INTO l FROM public.meta_muse_leads WHERE id=lid FOR UPDATE;
IF l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
IF _action='create_draft' THEN
IF l.revision IS DISTINCT FROM (_payload->>'lead_revision')::int THEN RAISE EXCEPTION 'Lead changed; reload first'; END IF;
SELECT coalesce(array_agg(value::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(coalesce(_payload->'listing_ids','[]'));
IF cardinality(ids)>5 OR length(trim(coalesce(_payload->>'body','')))=0 OR length(_payload->>'body')>8000 THEN RAISE EXCEPTION 'Invalid draft'; END IF;
INSERT INTO public.meta_muse_drafts(lead_id,body,listing_ids,generator,lead_revision) VALUES(lid,_payload->>'body',ids,_payload->>'generator',l.revision) RETURNING * INTO d;
ELSE
SELECT * INTO d FROM public.meta_muse_drafts WHERE id=(_payload->>'draft_id')::uuid FOR UPDATE;
IF d.id IS NULL OR d.revision IS DISTINCT FROM (_payload->>'revision')::int THEN RAISE EXCEPTION 'Draft changed; reload first'; END IF;
IF _action='edit_draft' THEN
IF length(trim(coalesce(_payload->>'body','')))=0 OR length(_payload->>'body')>8000 THEN RAISE EXCEPTION 'Invalid draft'; END IF;
UPDATE public.meta_muse_drafts SET body=_payload->>'body',status='draft',revision=revision+1,lead_revision=l.revision,approved_at=NULL,approved_by=NULL,updated_at=now() WHERE id=d.id RETURNING * INTO d;
ELSIF _action='approve' THEN
IF d.status<>'draft' OR d.lead_revision<>l.revision OR l.do_not_contact OR NOT l.contact_allowed OR trim(l.consent_evidence)='' OR trim(l.contact)='' OR l.contact_channel='messenger' THEN RAISE EXCEPTION 'Contact eligibility or draft review blocked'; END IF;
IF l.intent<>'sell' AND cardinality(d.listing_ids)=0 THEN RAISE EXCEPTION 'A live match is required'; END IF;
FOR links IN SELECT regexp_matches(d.body,'https?://[^[:space:]]+','g') LOOP
IF NOT EXISTS(SELECT 1 FROM unnest(d.listing_ids) x WHERE links[1]='https://vendibook.com/listing/'||x::text) THEN RAISE EXCEPTION 'Only canonical matched listing links allowed'; END IF;
END LOOP;
FOREACH item IN ARRAY d.listing_ids LOOP
PERFORM 1 FROM public.listings WHERE id=item FOR SHARE;
IF NOT public.meta_muse_listing_eligible(item) THEN RAISE EXCEPTION 'Listing no longer eligible'; END IF;
SELECT * INTO rl FROM public.listings WHERE id=item;
IF rl.mode::text<>(CASE WHEN l.intent='buy' THEN 'sale' ELSE 'rent' END) OR (l.category IS NOT NULL AND rl.category::text<>(CASE WHEN l.category='commercial_kitchen' THEN 'ghost_kitchen' ELSE l.category END)) THEN RAISE EXCEPTION 'Listing requirements changed'; END IF;
IF l.intent='rent' THEN
IF l.start_date IS NULL OR l.end_date IS NULL OR l.start_date<=current_date OR l.end_date-l.start_date>366 THEN RAISE EXCEPTION 'Future rental dates required (maximum 366 days)'; END IF;
IF l.end_date-l.start_date+1<coalesce(rl.rental_min_days,1) OR (rl.available_from IS NOT NULL AND l.start_date<rl.available_from) OR (rl.available_to IS NOT NULL AND l.end_date>rl.available_to) THEN RAISE EXCEPTION 'Rental date requirements not met'; END IF;
av:=public.check_booking_availability(item,l.start_date,l.end_date);
IF NOT coalesce((av->>'available')::boolean,false) THEN RAISE EXCEPTION 'Rental unavailable for requested dates'; END IF;
END IF;
END LOOP;
UPDATE public.meta_muse_drafts SET status='approved',approved_by=actor,approved_at=now(),updated_at=now() WHERE id=d.id RETURNING * INTO d;
ELSIF _action='reject' THEN
IF d.status<>'draft' THEN RAISE EXCEPTION 'Only draft reviews can be rejected'; END IF;
UPDATE public.meta_muse_drafts SET status='rejected',approved_at=NULL,approved_by=NULL,updated_at=now() WHERE id=d.id RETURNING * INTO d;
ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END IF;
result:=to_jsonb(d);
END IF;
INSERT INTO public.meta_muse_audit(lead_id,draft_id,actor_id,action,revision) VALUES(lid,d.id,actor,_action,coalesce(d.revision,l.revision));
RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.meta_muse_action(text,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.meta_muse_action(text,jsonb) TO authenticated;