ALTER TABLE public.bs_equipment ADD COLUMN IF NOT EXISTS color_hex text CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE public.bs_builds ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE public.bs_builds ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE TABLE public.bs_delivery_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.bs_regions(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('factory_pickup','delivered','towed','flatbed','other')),
  fee_cents bigint CHECK (fee_cents >= 0),
  notes text CHECK (notes IS NULL OR length(notes) <= 300),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manufacturer_id, region_id, method)
);
COMMENT ON COLUMN public.bs_delivery_rates.fee_cents IS 'NULL = delivery quoted by manufacturer';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_delivery_rates TO authenticated;
GRANT ALL ON public.bs_delivery_rates TO service_role;
ALTER TABLE public.bs_delivery_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs admins manage delivery" ON public.bs_delivery_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs editors manage own delivery" ON public.bs_delivery_rates FOR ALL TO authenticated
  USING (public.bs_is_member(manufacturer_id, 'editor'))
  WITH CHECK (public.bs_is_member(manufacturer_id, 'editor') AND EXISTS (SELECT 1 FROM public.bs_region_assignments a WHERE a.region_id = bs_delivery_rates.region_id AND a.manufacturer_id = bs_delivery_rates.manufacturer_id AND a.ended_at IS NULL));
CREATE POLICY "bs members view own delivery" ON public.bs_delivery_rates FOR SELECT TO authenticated USING (public.bs_is_member(manufacturer_id));

CREATE TABLE public.bs_build_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES public.bs_builds(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL CHECK (actor_role IN ('customer','partner','admin')),
  kind text NOT NULL CHECK (kind IN ('submitted','review_started','message','clarification_requested','layout_change_requested','incompatible_flagged','quote_issued','rejected','customer_accepted','customer_declined')),
  body text CHECK (body IS NULL OR length(body) <= 4000),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bs_build_events TO authenticated;
GRANT ALL ON public.bs_build_events TO service_role;
ALTER TABLE public.bs_build_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES public.bs_builds(id) ON DELETE CASCADE,
  version integer NOT NULL,
  manufacturer_name text NOT NULL,
  lines jsonb NOT NULL,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  preliminary_subtotal_cents bigint,
  change_reason text,
  lead_time_weeks integer CHECK (lead_time_weeks > 0),
  delivery_terms text,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','accepted','declined','superseded')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (build_id, version)
);
GRANT SELECT ON public.bs_quotes TO authenticated;
GRANT ALL ON public.bs_quotes TO service_role;
ALTER TABLE public.bs_quotes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bs_can_see_build(_build_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bs_builds b WHERE b.id = _build_id AND (
    b.user_id = auth.uid() OR public.is_admin(auth.uid()) OR (b.status <> 'saved' AND public.bs_is_member(b.manufacturer_id))))
$$;
REVOKE ALL ON FUNCTION public.bs_can_see_build(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_can_see_build(uuid) TO authenticated;
CREATE POLICY "bs participants view events" ON public.bs_build_events FOR SELECT TO authenticated USING (public.bs_can_see_build(build_id));
CREATE POLICY "bs participants view quotes" ON public.bs_quotes FOR SELECT TO authenticated USING (public.bs_can_see_build(build_id));

DROP FUNCTION IF EXISTS public.bs_save_build(text, uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.bs_price_build(text, uuid, uuid[]);

CREATE FUNCTION public.bs_price_build(p_zip text, p_model_id uuid, p_equipment_ids uuid[], p_delivery_method text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; m public.bs_models; e public.bs_equipment; d public.bs_delivery_rates; eid uuid;
  lines jsonb := '[]'::jsonb; sub bigint := 0; quote boolean := false; problems jsonb := '[]'::jsonb; vers jsonb := '{}'::jsonb; opts jsonb;
BEGIN
  SELECT * INTO r FROM public.bs_zip_manufacturer(p_zip);
  IF r.manufacturer_id IS NULL THEN RETURN jsonb_build_object('status','not_covered'); END IF;
  SELECT * INTO m FROM public.bs_models WHERE id = p_model_id AND manufacturer_id = r.manufacturer_id AND status = 'approved';
  IF m.id IS NULL THEN RETURN jsonb_build_object('status','invalid_model'); END IF;
  IF coalesce(array_length(p_equipment_ids,1),0) > 60 THEN RETURN jsonb_build_object('status','too_many_items'); END IF;
  lines := lines || jsonb_build_object('label', m.name, 'amount_cents', m.base_price_cents, 'quote_required', m.base_price_cents IS NULL);
  IF m.base_price_cents IS NULL THEN quote := true; ELSE sub := sub + m.base_price_cents; END IF;
  FOREACH eid IN ARRAY coalesce(p_equipment_ids, '{}') LOOP
    SELECT * INTO e FROM public.bs_equipment WHERE id = eid AND manufacturer_id = r.manufacturer_id AND status = 'approved';
    IF e.id IS NULL THEN problems := problems || jsonb_build_object('id', eid, 'issue', 'unavailable'); CONTINUE; END IF;
    IF cardinality(e.compatible_model_ids) > 0 AND NOT (m.id = ANY(e.compatible_model_ids)) THEN
      problems := problems || jsonb_build_object('id', eid, 'name', e.name, 'issue', 'incompatible'); CONTINUE;
    END IF;
    lines := lines || jsonb_build_object('id', e.id, 'label', e.name, 'amount_cents', e.price_cents, 'quote_required', e.price_cents IS NULL);
    vers := vers || jsonb_build_object(e.id::text, e.version);
    IF e.price_cents IS NULL THEN quote := true; ELSE sub := sub + e.price_cents; END IF;
  END LOOP;
  SELECT coalesce(jsonb_agg(jsonb_build_object('method', method, 'fee_cents', fee_cents, 'notes', notes) ORDER BY fee_cents NULLS LAST), '[]'::jsonb) INTO opts
    FROM public.bs_delivery_rates WHERE manufacturer_id = r.manufacturer_id AND region_id = r.region_id AND active;
  IF p_delivery_method IS NOT NULL THEN
    SELECT * INTO d FROM public.bs_delivery_rates WHERE manufacturer_id = r.manufacturer_id AND region_id = r.region_id AND method = p_delivery_method AND active;
    IF d.id IS NULL THEN problems := problems || jsonb_build_object('id', NULL, 'name', 'Delivery', 'issue', 'unavailable');
    ELSE
      lines := lines || jsonb_build_object('label', 'Delivery', 'method', d.method, 'amount_cents', d.fee_cents, 'quote_required', d.fee_cents IS NULL);
      IF d.fee_cents IS NULL THEN quote := true; ELSE sub := sub + d.fee_cents; END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('status', CASE WHEN jsonb_array_length(problems) > 0 THEN 'has_problems' ELSE 'ok' END,
    'lines', lines, 'subtotal_cents', sub, 'quote_required', quote, 'problems', problems,
    'model_version', m.version, 'equipment_versions', vers, 'lead_time_weeks', m.lead_time_weeks,
    'delivery_options', opts, 'delivery_method', p_delivery_method, 'priced_at', now());
END $$;
GRANT EXECUTE ON FUNCTION public.bs_price_build(text, uuid, uuid[], text) TO anon, authenticated;

CREATE FUNCTION public.bs_save_build(p_zip text, p_model_id uuid, p_config jsonb, p_name text DEFAULT NULL, p_delivery_method text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; ids uuid[]; price jsonb; new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to save builds'; END IF;
  IF jsonb_typeof(p_config->'items') <> 'array' OR jsonb_array_length(p_config->'items') > 60 THEN RAISE EXCEPTION 'Invalid build'; END IF;
  SELECT * INTO r FROM public.bs_zip_manufacturer(p_zip);
  IF r.manufacturer_id IS NULL THEN RAISE EXCEPTION 'No build partner serves this ZIP code yet'; END IF;
  SELECT coalesce(array_agg((i->>'id')::uuid), '{}') INTO ids FROM jsonb_array_elements(p_config->'items') i;
  IF nullif(p_config->>'finish','') IS NOT NULL THEN ids := ids || (p_config->>'finish')::uuid; END IF;
  price := public.bs_price_build(p_zip, p_model_id, ids, p_delivery_method);
  IF price->>'status' <> 'ok' THEN RAISE EXCEPTION 'Build has unavailable or incompatible items'; END IF;
  INSERT INTO public.bs_builds(user_id, zip, region_id, manufacturer_id, model_id, name, config, price_snapshot, subtotal_cents, quote_required, delivery_method)
  VALUES (auth.uid(), p_zip, r.region_id, r.manufacturer_id, p_model_id, left(nullif(trim(p_name),''), 80), p_config, price,
          (price->>'subtotal_cents')::bigint, (price->>'quote_required')::boolean, p_delivery_method)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.bs_save_build(text, uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_save_build(text, uuid, jsonb, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bs_submit_build(p_build_id uuid, p_note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bs_builds;
BEGIN
  SELECT * INTO b FROM public.bs_builds WHERE id = p_build_id AND user_id = auth.uid() FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Build not found'; END IF;
  IF b.status NOT IN ('saved','changes_requested') THEN RAISE EXCEPTION 'This build is already with the build partner'; END IF;
  UPDATE public.bs_builds SET status = 'submitted', submitted_at = now(), updated_at = now() WHERE id = b.id;
  INSERT INTO public.bs_build_events(build_id, actor_id, actor_role, kind, body) VALUES (b.id, auth.uid(), 'customer', 'submitted', left(nullif(trim(p_note),''), 4000));
END $$;

CREATE OR REPLACE FUNCTION public.bs_build_message(p_build_id uuid, p_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bs_builds; role text;
BEGIN
  IF length(trim(coalesce(p_body,''))) = 0 THEN RAISE EXCEPTION 'Message is empty'; END IF;
  SELECT * INTO b FROM public.bs_builds WHERE id = p_build_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Build not found'; END IF;
  IF b.user_id = auth.uid() THEN role := 'customer';
  ELSIF b.status <> 'saved' AND public.bs_is_member(b.manufacturer_id, 'editor') THEN role := 'partner';
  ELSIF public.is_admin(auth.uid()) THEN role := 'admin';
  ELSE RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.bs_build_events(build_id, actor_id, actor_role, kind, body) VALUES (b.id, auth.uid(), role, 'message', left(trim(p_body), 4000));
END $$;

CREATE OR REPLACE FUNCTION public.bs_partner_review(p_build_id uuid, p_kind text, p_body text DEFAULT NULL, p_data jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bs_builds; next_status text;
BEGIN
  SELECT * INTO b FROM public.bs_builds WHERE id = p_build_id FOR UPDATE;
  IF b.id IS NULL OR b.status = 'saved' OR NOT (public.bs_is_member(b.manufacturer_id, 'editor') OR public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status IN ('accepted','rejected') THEN RAISE EXCEPTION 'This build is closed'; END IF;
  next_status := CASE p_kind
    WHEN 'review_started' THEN 'in_review'
    WHEN 'clarification_requested' THEN 'changes_requested'
    WHEN 'layout_change_requested' THEN 'changes_requested'
    WHEN 'incompatible_flagged' THEN 'changes_requested'
    WHEN 'rejected' THEN 'rejected'
    ELSE NULL END;
  IF next_status IS NULL THEN RAISE EXCEPTION 'Unknown review action'; END IF;
  IF p_kind <> 'review_started' AND length(trim(coalesce(p_body,''))) < 5 THEN RAISE EXCEPTION 'Explain this to the customer (at least a few words)'; END IF;
  UPDATE public.bs_quotes SET status = 'superseded' WHERE build_id = b.id AND status = 'issued' AND next_status IN ('changes_requested','rejected');
  UPDATE public.bs_builds SET status = next_status, updated_at = now() WHERE id = b.id;
  INSERT INTO public.bs_build_events(build_id, actor_id, actor_role, kind, body, data)
  VALUES (b.id, auth.uid(), CASE WHEN public.bs_is_member(b.manufacturer_id) THEN 'partner' ELSE 'admin' END, p_kind, left(nullif(trim(p_body),''), 4000), coalesce(p_data, '{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.bs_issue_quote(p_build_id uuid, p_lines jsonb, p_lead_time_weeks integer, p_delivery_terms text, p_reason text DEFAULT NULL, p_valid_days integer DEFAULT 30) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bs_builds; total bigint := 0; l jsonb; v integer; qid uuid; mname text; clean jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO b FROM public.bs_builds WHERE id = p_build_id FOR UPDATE;
  IF b.id IS NULL OR b.status = 'saved' OR NOT (public.bs_is_member(b.manufacturer_id, 'editor') OR public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status NOT IN ('submitted','in_review','quoted') THEN RAISE EXCEPTION 'Quotes can only be issued for builds under review'; END IF;
  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 OR jsonb_array_length(p_lines) > 80 THEN RAISE EXCEPTION 'Add at least one quote line'; END IF;
  IF p_valid_days IS NULL OR p_valid_days < 1 OR p_valid_days > 120 THEN RAISE EXCEPTION 'Quote must be valid for 1 to 120 days'; END IF;
  IF length(trim(coalesce(p_delivery_terms,''))) < 3 THEN RAISE EXCEPTION 'Add delivery terms'; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    IF length(trim(coalesce(l->>'label',''))) = 0 OR (l->>'amount_cents') IS NULL OR (l->>'amount_cents') !~ '^-?[0-9]{1,12}$' THEN
      RAISE EXCEPTION 'Every quote line needs a label and a whole-cent amount'; END IF;
    total := total + (l->>'amount_cents')::bigint;
    clean := clean || jsonb_build_object('label', left(trim(l->>'label'), 160), 'amount_cents', (l->>'amount_cents')::bigint);
  END LOOP;
  IF total < 0 THEN RAISE EXCEPTION 'Quote total cannot be negative'; END IF;
  IF (b.quote_required OR total <> coalesce(b.subtotal_cents, -1)) AND length(trim(coalesce(p_reason,''))) < 5 THEN
    RAISE EXCEPTION 'Explain why the final price differs from the preliminary price'; END IF;
  SELECT coalesce(max(version), 0) + 1 INTO v FROM public.bs_quotes WHERE build_id = b.id;
  SELECT name INTO mname FROM public.bs_manufacturers WHERE id = b.manufacturer_id;
  UPDATE public.bs_quotes SET status = 'superseded' WHERE build_id = b.id AND status = 'issued';
  INSERT INTO public.bs_quotes(build_id, version, manufacturer_name, lines, total_cents, preliminary_subtotal_cents, change_reason, lead_time_weeks, delivery_terms, expires_at, created_by)
  VALUES (b.id, v, mname, clean, total, b.subtotal_cents, nullif(trim(p_reason),''), p_lead_time_weeks, left(trim(p_delivery_terms), 1000), now() + make_interval(days => p_valid_days), auth.uid())
  RETURNING id INTO qid;
  UPDATE public.bs_builds SET status = 'quoted', updated_at = now() WHERE id = b.id;
  INSERT INTO public.bs_build_events(build_id, actor_id, actor_role, kind, body, data)
  VALUES (b.id, auth.uid(), CASE WHEN public.bs_is_member(b.manufacturer_id) THEN 'partner' ELSE 'admin' END, 'quote_issued', nullif(trim(p_reason),''), jsonb_build_object('quote_id', qid, 'version', v, 'total_cents', total));
  RETURN qid;
END $$;

CREATE OR REPLACE FUNCTION public.bs_respond_quote(p_quote_id uuid, p_accept boolean, p_note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.bs_quotes; b public.bs_builds;
BEGIN
  SELECT * INTO q FROM public.bs_quotes WHERE id = p_quote_id FOR UPDATE;
  SELECT * INTO b FROM public.bs_builds WHERE id = q.build_id FOR UPDATE;
  IF q.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF q.status <> 'issued' THEN RAISE EXCEPTION 'This quote is no longer open'; END IF;
  IF p_accept AND q.expires_at < now() THEN RAISE EXCEPTION 'This quote has expired; ask the build partner for a new one'; END IF;
  UPDATE public.bs_quotes SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END, responded_at = now() WHERE id = q.id;
  UPDATE public.bs_builds SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'in_review' END, updated_at = now() WHERE id = b.id;
  INSERT INTO public.bs_build_events(build_id, actor_id, actor_role, kind, body, data)
  VALUES (b.id, auth.uid(), 'customer', CASE WHEN p_accept THEN 'customer_accepted' ELSE 'customer_declined' END, left(nullif(trim(p_note),''), 4000), jsonb_build_object('quote_id', q.id, 'version', q.version));
END $$;

REVOKE ALL ON FUNCTION public.bs_submit_build(uuid, text), public.bs_build_message(uuid, text), public.bs_partner_review(uuid, text, text, jsonb),
  public.bs_issue_quote(uuid, jsonb, integer, text, text, integer), public.bs_respond_quote(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_submit_build(uuid, text), public.bs_build_message(uuid, text), public.bs_partner_review(uuid, text, text, jsonb),
  public.bs_issue_quote(uuid, jsonb, integer, text, text, integer), public.bs_respond_quote(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bs_resolve_zip(p_zip text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF p_zip IS NULL OR p_zip !~ '^[0-9]{5}$' THEN RETURN jsonb_build_object('status','invalid_zip'); END IF;
  SELECT * INTO r FROM public.bs_zip_manufacturer(p_zip);
  IF r.manufacturer_id IS NULL THEN RETURN jsonb_build_object('status','not_covered'); END IF;
  RETURN jsonb_build_object(
    'status','covered',
    'models', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id',id,'name',name,'vehicle_type',vehicle_type,'int_length_in',int_length_in,'int_width_in',int_width_in,'int_height_in',int_height_in,
        'ext_length_in',ext_length_in,'ext_width_in',ext_width_in,'door_from_in',door_from_in,'door_to_in',door_to_in,
        'window_from_in',window_from_in,'window_to_in',window_to_in,'standard_features',standard_features,
        'base_price_cents',base_price_cents,'lead_time_weeks',lead_time_weeks,'photos',photos,'glb_path',glb_path,'version',version) ORDER BY name)
      FROM public.bs_models WHERE manufacturer_id = r.manufacturer_id AND status = 'approved'), '[]'::jsonb),
    'equipment', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id',id,'name',name,'category',category,'description',description,'photos',photos,'glb_path',glb_path,
        'width_in',width_in,'depth_in',depth_in,'height_in',height_in,'weight_lb',weight_lb,'power',power,'needs',needs,
        'install_notes',install_notes,'compatible_model_ids',compatible_model_ids,'allowed_walls',allowed_walls,
        'price_cents',price_cents,'color_hex',color_hex,'version',version) ORDER BY category, name)
      FROM public.bs_equipment WHERE manufacturer_id = r.manufacturer_id AND status = 'approved'), '[]'::jsonb),
    'delivery_options', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method, 'fee_cents', fee_cents, 'notes', notes) ORDER BY fee_cents NULLS LAST)
      FROM public.bs_delivery_rates WHERE manufacturer_id = r.manufacturer_id AND region_id = r.region_id AND active), '[]'::jsonb));
END $$;

CREATE POLICY "bs assets partner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'build-studio-assets' AND (public.is_admin(auth.uid()) OR public.bs_is_member(((storage.foldername(name))[1])::uuid, 'editor')));
CREATE POLICY "bs assets partner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'build-studio-assets' AND (public.is_admin(auth.uid()) OR public.bs_is_member(((storage.foldername(name))[1])::uuid, 'editor')));
CREATE POLICY "bs assets partner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'build-studio-assets' AND (public.is_admin(auth.uid()) OR public.bs_is_member(((storage.foldername(name))[1])::uuid, 'editor')));
