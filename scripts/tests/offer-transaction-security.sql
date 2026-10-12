-- Apply migrations 0015 and 0016 first. Test fixtures always roll back.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.expect_denied(command text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE denied boolean := false;
BEGIN
  BEGIN EXECUTE command;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE IN ('42501','22023','23505','55000','28000','P0001') THEN denied := true; ELSE RAISE; END IF;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unexpected success: %', command; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('f0100000-0000-4000-8000-000000000001','offer-buyer@example.invalid','{}'),
('f0100000-0000-4000-8000-000000000002','offer-seller@example.invalid','{}'),
('f0100000-0000-4000-8000-000000000003','offer-outsider@example.invalid','{}');
INSERT INTO public.profiles(id,email,identity_verified)
SELECT id,email,true FROM auth.users WHERE id::text LIKE 'f0100000-%'
ON CONFLICT(id) DO UPDATE SET identity_verified=true;
INSERT INTO public.signup_phone_verifications(user_id,phone_e164) VALUES
('f0100000-0000-4000-8000-000000000001','+12025550111'),
('f0100000-0000-4000-8000-000000000002','+12025550112'),
('f0100000-0000-4000-8000-000000000003','+12025550113');
INSERT INTO public.listings(id,host_id,title,description,mode,category,fulfillment_type,status,published_at,accepts_offers,price_sale,image_urls,city,state,title_status)
VALUES ('f0200000-0000-4000-8000-000000000001','f0100000-0000-4000-8000-000000000002','Offer regression fixture','Rollback-only fixture for the authorized offer security regression tests.','sale','food_truck','pickup','published',now(),true,1000,ARRAY['https://example.invalid/1','https://example.invalid/2','https://example.invalid/3'],'Phoenix','AZ','clean');
SELECT set_config('request.jwt.claims','{"sub":"f0100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE t record; offer_id uuid;
BEGIN
  SELECT * INTO t FROM public.offer_terms_current();
  PERFORM pg_temp.expect_denied(format('SELECT public.submit_offer(%L,100,NULL,%L,%L,false)','f0200000-0000-4000-8000-000000000001',t.version,t.body));
  PERFORM pg_temp.expect_denied(format('SELECT public.submit_offer(%L,''NaN'',NULL,%L,%L,true)','f0200000-0000-4000-8000-000000000001',t.version,t.body));
  offer_id := public.submit_offer('f0200000-0000-4000-8000-000000000001',800,NULL,t.version,t.body,true);
  PERFORM set_config('test.offer_id',offer_id::text,true);
  PERFORM pg_temp.expect_denied(format('UPDATE public.offers SET offer_amount=1 WHERE id=%L',offer_id));
  PERFORM pg_temp.expect_denied(format('UPDATE public.offers SET status=''accepted'' WHERE id=%L',offer_id));
  PERFORM pg_temp.expect_denied(format('DELETE FROM public.offers WHERE id=%L',offer_id));
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''accept'')',offer_id));
  PERFORM pg_temp.expect_denied(format('SELECT public.submit_offer(%L,700,NULL,%L,%L,true)','f0200000-0000-4000-8000-000000000001',t.version,t.body));
  IF NOT EXISTS (SELECT 1 FROM public.offer_terms_acceptances a WHERE a.offer_id= current_setting('test.offer_id')::uuid AND terms_text=t.body AND terms_version=t.version AND accepted_at IS NOT NULL) THEN RAISE EXCEPTION 'Consent missing'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"f0100000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.offers WHERE id=current_setting('test.offer_id')::uuid) THEN RAISE EXCEPTION 'Outsider can read offer'; END IF;
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''accept'')',current_setting('test.offer_id')));
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"f0100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''counter'',''NaN'')',current_setting('test.offer_id')));
  IF public.respond_to_offer(current_setting('test.offer_id')::uuid,'counter',900,'Counter test') <> 'counter_offer' THEN RAISE EXCEPTION 'Counter failed'; END IF;
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''counter'',950)',current_setting('test.offer_id')));
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"f0100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.respond_to_offer(current_setting('test.offer_id')::uuid,'accept') <> 'counter_accepted' THEN RAISE EXCEPTION 'Acceptance failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.offers WHERE id=current_setting('test.offer_id')::uuid AND agreed_amount=900 AND agreed_at IS NOT NULL AND status='accepted') THEN RAISE EXCEPTION 'Agreement missing'; END IF;
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''accept'')',current_setting('test.offer_id')));
  PERFORM pg_temp.expect_denied(format('SELECT public.respond_to_offer(%L,''cancel'')',current_setting('test.offer_id')));
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $$ BEGIN
  PERFORM pg_temp.expect_denied(format('UPDATE public.offers SET agreed_amount=1 WHERE id=%L',current_setting('test.offer_id')));
  PERFORM pg_temp.expect_denied(format('UPDATE public.offers SET agreed_at=now()+interval ''1 day'' WHERE id=%L',current_setting('test.offer_id')));
END $$;

DO $$ DECLARE e record; token uuid:=gen_random_uuid(); BEGIN
  IF (SELECT count(*) FROM public.offer_events WHERE offer_id=current_setting('test.offer_id')::uuid)<>3 THEN RAISE EXCEPTION 'Transition history missing'; END IF;
  IF NOT public.claim_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token) THEN RAISE EXCEPTION 'Claim failed'; END IF;
  IF public.claim_offer_email(current_setting('test.offer_id')::uuid,'new_offer',gen_random_uuid()) THEN RAISE EXCEPTION 'Concurrent claim allowed'; END IF;
  PERFORM public.finish_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token,'Transient test failure');
  SELECT * INTO e FROM public.offer_events WHERE offer_id=current_setting('test.offer_id')::uuid AND event_type='new_offer';
  IF e.delivered_at IS NOT NULL OR e.next_attempt_at<=now() OR e.lease_token IS NOT NULL THEN RAISE EXCEPTION 'Retry was lost'; END IF;
  IF public.claim_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token) THEN RAISE EXCEPTION 'Backoff bypassed'; END IF;
  UPDATE public.offer_events SET next_attempt_at=now()-interval '1 second' WHERE offer_id=current_setting('test.offer_id')::uuid AND event_type='new_offer';
  IF NOT public.claim_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token) THEN RAISE EXCEPTION 'Retry claim failed'; END IF;
  PERFORM public.finish_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token,NULL);
  IF public.claim_offer_email(current_setting('test.offer_id')::uuid,'new_offer',token) THEN RAISE EXCEPTION 'Delivered event reclaimed'; END IF;
END $$;

ROLLBACK;
