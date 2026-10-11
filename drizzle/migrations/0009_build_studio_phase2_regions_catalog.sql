-- Build Studio Phase 2: manufacturers, regions, versioned catalog, server pricing.
CREATE TABLE public.bs_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  contact_email text,
  integration_mode text NOT NULL DEFAULT 'manual' CHECK (integration_mode IN ('manual','csv','api','feed')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_manufacturers TO authenticated;
GRANT ALL ON public.bs_manufacturers TO service_role;
ALTER TABLE public.bs_manufacturers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_manufacturer_members (
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (manufacturer_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_manufacturer_members TO authenticated;
GRANT ALL ON public.bs_manufacturer_members TO service_role;
ALTER TABLE public.bs_manufacturer_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bs_is_member(_manufacturer_id uuid, _min_role text DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bs_manufacturer_members m
    WHERE m.manufacturer_id = _manufacturer_id AND m.user_id = auth.uid()
      AND (_min_role = 'viewer' OR m.role IN ('owner','editor')))
$$;

CREATE TABLE public.bs_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_regions TO authenticated;
GRANT ALL ON public.bs_regions TO service_role;
ALTER TABLE public.bs_regions ENABLE ROW LEVEL SECURITY;

-- A 3-digit ZIP prefix belongs to at most one region (primary key prevents overlap).
CREATE TABLE public.bs_region_zip3 (
  zip3 text PRIMARY KEY CHECK (zip3 ~ '^[0-9]{3}$'),
  region_id uuid NOT NULL REFERENCES public.bs_regions(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_region_zip3 TO authenticated;
GRANT ALL ON public.bs_region_zip3 TO service_role;
ALTER TABLE public.bs_region_zip3 ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_region_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.bs_regions(id) ON DELETE CASCADE,
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id),
  assigned_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX bs_region_one_active ON public.bs_region_assignments(region_id) WHERE ended_at IS NULL;
GRANT SELECT ON public.bs_region_assignments TO authenticated;
GRANT ALL ON public.bs_region_assignments TO service_role;
ALTER TABLE public.bs_region_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id) ON DELETE CASCADE,
  sku text NOT NULL CHECK (length(trim(sku)) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  vehicle_type text NOT NULL DEFAULT 'food_trailer' CHECK (vehicle_type IN ('food_trailer','food_truck')),
  ext_length_in numeric CHECK (ext_length_in > 0),
  ext_width_in numeric CHECK (ext_width_in > 0),
  ext_height_in numeric CHECK (ext_height_in > 0),
  int_length_in numeric NOT NULL CHECK (int_length_in BETWEEN 60 AND 480),
  int_width_in numeric NOT NULL CHECK (int_width_in BETWEEN 48 AND 120),
  int_height_in numeric NOT NULL CHECK (int_height_in BETWEEN 60 AND 120),
  gvwr_lb integer CHECK (gvwr_lb > 0),
  door_from_in numeric, door_to_in numeric,
  window_from_in numeric, window_to_in numeric,
  standard_features text[] NOT NULL DEFAULT '{}',
  base_price_cents bigint CHECK (base_price_cents >= 0),
  lead_time_weeks integer CHECK (lead_time_weeks > 0),
  photos text[] NOT NULL DEFAULT '{}',
  glb_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','inactive')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manufacturer_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_models TO authenticated;
GRANT ALL ON public.bs_models TO service_role;
ALTER TABLE public.bs_models ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id) ON DELETE CASCADE,
  sku text NOT NULL CHECK (length(trim(sku)) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  category text NOT NULL DEFAULT 'Other' CHECK (category IN ('Cooking','Refrigeration','Prep','Sanitation','Ventilation','Electrical','Generator','Solar & battery','Serving window','Interior finish','Exterior finish','Other')),
  supplier text,
  description text,
  photos text[] NOT NULL DEFAULT '{}',
  glb_path text,
  width_in numeric NOT NULL CHECK (width_in > 0 AND width_in <= 240),
  depth_in numeric NOT NULL CHECK (depth_in > 0 AND depth_in <= 96),
  height_in numeric NOT NULL CHECK (height_in > 0 AND height_in <= 110),
  weight_lb numeric CHECK (weight_lb > 0),
  power text,
  needs text[] NOT NULL DEFAULT '{}',
  install_notes text,
  compatible_model_ids uuid[] NOT NULL DEFAULT '{}',
  allowed_walls text[] NOT NULL DEFAULT '{back,service}',
  price_cents bigint CHECK (price_cents >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','inactive')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manufacturer_id, sku)
);
COMMENT ON COLUMN public.bs_equipment.price_cents IS 'NULL = requires manufacturer quote';
COMMENT ON COLUMN public.bs_equipment.compatible_model_ids IS 'Empty = compatible with every model of this manufacturer';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bs_equipment TO authenticated;
GRANT ALL ON public.bs_equipment TO service_role;
ALTER TABLE public.bs_equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_catalog_history (
  id bigserial PRIMARY KEY,
  manufacturer_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id, version)
);
GRANT SELECT ON public.bs_catalog_history TO authenticated;
GRANT ALL ON public.bs_catalog_history TO service_role;
ALTER TABLE public.bs_catalog_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zip text NOT NULL CHECK (zip ~ '^[0-9]{5}$'),
  region_id uuid NOT NULL REFERENCES public.bs_regions(id),
  manufacturer_id uuid NOT NULL REFERENCES public.bs_manufacturers(id),
  model_id uuid NOT NULL REFERENCES public.bs_models(id),
  name text,
  config jsonb NOT NULL,
  price_snapshot jsonb NOT NULL,
  subtotal_cents bigint,
  quote_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','submitted','in_review','changes_requested','quoted','rejected','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.bs_builds TO authenticated;
GRANT ALL ON public.bs_builds TO service_role;
ALTER TABLE public.bs_builds ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bs_coverage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip text NOT NULL CHECK (zip ~ '^[0-9]{5}$'),
  email text NOT NULL CHECK (length(email) BETWEEN 5 AND 255 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.bs_coverage_requests TO anon, authenticated;
GRANT SELECT ON public.bs_coverage_requests TO authenticated;
GRANT ALL ON public.bs_coverage_requests TO service_role;
ALTER TABLE public.bs_coverage_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "bs admins manage manufacturers" ON public.bs_manufacturers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs members view own manufacturer" ON public.bs_manufacturers FOR SELECT TO authenticated USING (public.bs_is_member(id));
CREATE POLICY "bs admins manage members" ON public.bs_manufacturer_members FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs members view own membership" ON public.bs_manufacturer_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bs admins manage regions" ON public.bs_regions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs admins manage zip3" ON public.bs_region_zip3 FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs admins view assignments" ON public.bs_region_assignments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "bs members view own assignments" ON public.bs_region_assignments FOR SELECT TO authenticated USING (public.bs_is_member(manufacturer_id));
CREATE POLICY "bs admins manage models" ON public.bs_models FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs members view models" ON public.bs_models FOR SELECT TO authenticated USING (public.bs_is_member(manufacturer_id));
CREATE POLICY "bs editors insert models" ON public.bs_models FOR INSERT TO authenticated WITH CHECK (public.bs_is_member(manufacturer_id, 'editor'));
CREATE POLICY "bs editors update models" ON public.bs_models FOR UPDATE TO authenticated USING (public.bs_is_member(manufacturer_id, 'editor')) WITH CHECK (public.bs_is_member(manufacturer_id, 'editor'));
CREATE POLICY "bs editors delete draft models" ON public.bs_models FOR DELETE TO authenticated USING (public.bs_is_member(manufacturer_id, 'editor') AND status = 'draft');
CREATE POLICY "bs admins manage equipment" ON public.bs_equipment FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "bs members view equipment" ON public.bs_equipment FOR SELECT TO authenticated USING (public.bs_is_member(manufacturer_id));
CREATE POLICY "bs editors insert equipment" ON public.bs_equipment FOR INSERT TO authenticated WITH CHECK (public.bs_is_member(manufacturer_id, 'editor'));
CREATE POLICY "bs editors update equipment" ON public.bs_equipment FOR UPDATE TO authenticated USING (public.bs_is_member(manufacturer_id, 'editor')) WITH CHECK (public.bs_is_member(manufacturer_id, 'editor'));
CREATE POLICY "bs editors delete draft equipment" ON public.bs_equipment FOR DELETE TO authenticated USING (public.bs_is_member(manufacturer_id, 'editor') AND status = 'draft');
CREATE POLICY "bs admins view history" ON public.bs_catalog_history FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "bs members view own history" ON public.bs_catalog_history FOR SELECT TO authenticated USING (public.bs_is_member(manufacturer_id));
CREATE POLICY "bs users view own builds" ON public.bs_builds FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bs users delete own saved builds" ON public.bs_builds FOR DELETE TO authenticated USING (user_id = auth.uid() AND status = 'saved');
CREATE POLICY "bs admins view builds" ON public.bs_builds FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "bs members view submitted builds" ON public.bs_builds FOR SELECT TO authenticated USING (status <> 'saved' AND public.bs_is_member(manufacturer_id));
CREATE POLICY "bs anyone requests coverage" ON public.bs_coverage_requests FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "bs admins view coverage requests" ON public.bs_coverage_requests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Only admins approve; partners can't move records between manufacturers; version + history on every change.
CREATE OR REPLACE FUNCTION public.bs_catalog_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_adm boolean := auth.uid() IS NULL OR public.is_admin(auth.uid());
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.manufacturer_id <> OLD.manufacturer_id THEN RAISE EXCEPTION 'Catalog records cannot change manufacturer'; END IF;
    IF NOT is_adm AND NEW.status = 'approved' AND OLD.status <> 'approved' THEN RAISE EXCEPTION 'Only Vendibook can approve catalog records'; END IF;
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  ELSE
    IF NOT is_adm AND NEW.status = 'approved' THEN RAISE EXCEPTION 'Only Vendibook can approve catalog records'; END IF;
    NEW.version := 1;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bs_catalog_history_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.bs_catalog_history(manufacturer_id, table_name, record_id, version, snapshot, changed_by)
  VALUES (NEW.manufacturer_id, TG_TABLE_NAME, NEW.id, NEW.version, to_jsonb(NEW), auth.uid());
  RETURN NULL;
END $$;

CREATE TRIGGER bs_models_guard BEFORE INSERT OR UPDATE ON public.bs_models FOR EACH ROW EXECUTE FUNCTION public.bs_catalog_guard();
CREATE TRIGGER bs_models_history AFTER INSERT OR UPDATE ON public.bs_models FOR EACH ROW EXECUTE FUNCTION public.bs_catalog_history_write();
CREATE TRIGGER bs_equipment_guard BEFORE INSERT OR UPDATE ON public.bs_equipment FOR EACH ROW EXECUTE FUNCTION public.bs_catalog_guard();
CREATE TRIGGER bs_equipment_history AFTER INSERT OR UPDATE ON public.bs_equipment FOR EACH ROW EXECUTE FUNCTION public.bs_catalog_history_write();

-- ZIP -> active region -> approved manufacturer (never exposed) -> approved catalog.
CREATE OR REPLACE FUNCTION public.bs_zip_manufacturer(p_zip text, OUT region_id uuid, OUT manufacturer_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, a.manufacturer_id
  FROM public.bs_region_zip3 z
  JOIN public.bs_regions r ON r.id = z.region_id AND r.status = 'active'
  JOIN public.bs_region_assignments a ON a.region_id = r.id AND a.ended_at IS NULL
  JOIN public.bs_manufacturers m ON m.id = a.manufacturer_id AND m.status = 'approved'
  WHERE p_zip ~ '^[0-9]{5}$' AND z.zip3 = left(p_zip, 3)
$$;
REVOKE ALL ON FUNCTION public.bs_zip_manufacturer(text) FROM PUBLIC, anon, authenticated;

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
        'price_cents',price_cents,'version',version) ORDER BY category, name)
      FROM public.bs_equipment WHERE manufacturer_id = r.manufacturer_id AND status = 'approved'), '[]'::jsonb));
END $$;
GRANT EXECUTE ON FUNCTION public.bs_resolve_zip(text) TO anon, authenticated;

-- Authoritative preliminary price in integer cents. Items not belonging to the ZIP's partner are rejected.
CREATE OR REPLACE FUNCTION public.bs_price_build(p_zip text, p_model_id uuid, p_equipment_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; m public.bs_models; e public.bs_equipment; eid uuid;
  lines jsonb := '[]'::jsonb; sub bigint := 0; quote boolean := false; problems jsonb := '[]'::jsonb; vers jsonb := '{}'::jsonb;
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
  RETURN jsonb_build_object('status', CASE WHEN jsonb_array_length(problems) > 0 THEN 'has_problems' ELSE 'ok' END,
    'lines', lines, 'subtotal_cents', sub, 'quote_required', quote, 'problems', problems,
    'model_version', m.version, 'equipment_versions', vers, 'lead_time_weeks', m.lead_time_weeks,
    'delivery', 'Quoted by build partner', 'priced_at', now());
END $$;
GRANT EXECUTE ON FUNCTION public.bs_price_build(text, uuid, uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bs_save_build(p_zip text, p_model_id uuid, p_config jsonb, p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; ids uuid[]; price jsonb; new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to save builds'; END IF;
  IF jsonb_typeof(p_config->'items') <> 'array' OR jsonb_array_length(p_config->'items') > 60 THEN RAISE EXCEPTION 'Invalid build'; END IF;
  SELECT * INTO r FROM public.bs_zip_manufacturer(p_zip);
  IF r.manufacturer_id IS NULL THEN RAISE EXCEPTION 'No build partner serves this ZIP code yet'; END IF;
  SELECT coalesce(array_agg((i->>'id')::uuid), '{}') INTO ids FROM jsonb_array_elements(p_config->'items') i;
  price := public.bs_price_build(p_zip, p_model_id, ids);
  IF price->>'status' NOT IN ('ok') THEN RAISE EXCEPTION 'Build has unavailable or incompatible items'; END IF;
  INSERT INTO public.bs_builds(user_id, zip, region_id, manufacturer_id, model_id, name, config, price_snapshot, subtotal_cents, quote_required)
  VALUES (auth.uid(), p_zip, r.region_id, r.manufacturer_id, p_model_id, left(nullif(trim(p_name),''), 80), p_config, price,
          (price->>'subtotal_cents')::bigint, (price->>'quote_required')::boolean)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.bs_save_build(text, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_save_build(text, uuid, jsonb, text) TO authenticated;

-- Admin: assign a region to an approved manufacturer, ending the previous assignment (history kept).
CREATE OR REPLACE FUNCTION public.bs_assign_region(p_region_id uuid, p_manufacturer_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.bs_region_assignments SET ended_at = now() WHERE region_id = p_region_id AND ended_at IS NULL;
  IF p_manufacturer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bs_manufacturers WHERE id = p_manufacturer_id AND status = 'approved') THEN
      RAISE EXCEPTION 'Manufacturer must be approved first';
    END IF;
    INSERT INTO public.bs_region_assignments(region_id, manufacturer_id, assigned_by) VALUES (p_region_id, p_manufacturer_id, auth.uid());
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bs_assign_region(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_assign_region(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bs_add_member_by_email(p_manufacturer_id uuid, p_email text, p_role text DEFAULT 'editor') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'No Vendibook account with that email'; END IF;
  INSERT INTO public.bs_manufacturer_members(manufacturer_id, user_id, role) VALUES (p_manufacturer_id, uid, p_role)
  ON CONFLICT (manufacturer_id, user_id) DO UPDATE SET role = EXCLUDED.role;
END $$;
REVOKE ALL ON FUNCTION public.bs_add_member_by_email(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_add_member_by_email(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.bs_is_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bs_is_member(uuid, text) TO authenticated;
