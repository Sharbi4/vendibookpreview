-- Run via the backend SQL runner (needs owner privileges). Ends by raising ALL_CHECKS_PASSED or the first failing check; always rolls back.
BEGIN;
CREATE TEMP TABLE ids AS SELECT gen_random_uuid() a_mfr, gen_random_uuid() b_mfr, gen_random_uuid() a_reg, gen_random_uuid() b_reg,
  gen_random_uuid() a_user, gen_random_uuid() b_user, gen_random_uuid() a_model, gen_random_uuid() b_model,
  gen_random_uuid() a_eq, gen_random_uuid() a_quote, gen_random_uuid() b_eq;
GRANT SELECT ON ids TO authenticated;
INSERT INTO bs_manufacturers(id,name,status,is_demo) SELECT a_mfr,'DEMO Alpha','approved',true FROM ids UNION ALL SELECT b_mfr,'DEMO Beta','approved',true FROM ids;
INSERT INTO bs_manufacturer_members SELECT a_mfr,a_user,'editor' FROM ids UNION ALL SELECT b_mfr,b_user,'editor' FROM ids;
INSERT INTO bs_regions(id,name) SELECT a_reg,'Test A' FROM ids UNION ALL SELECT b_reg,'Test B' FROM ids;
INSERT INTO bs_region_zip3 SELECT '850',a_reg FROM ids UNION ALL SELECT '891',b_reg FROM ids;
INSERT INTO bs_region_assignments(region_id,manufacturer_id) SELECT a_reg,a_mfr FROM ids UNION ALL SELECT b_reg,b_mfr FROM ids;
INSERT INTO bs_models(id,manufacturer_id,sku,name,int_length_in,int_width_in,int_height_in,base_price_cents,status)
  SELECT a_model,a_mfr,'A16','Alpha 16',192,90,90,2800000,'approved' FROM ids UNION ALL SELECT b_model,b_mfr,'B14','Beta 14',168,90,90,2500000,'approved' FROM ids;
INSERT INTO bs_equipment(id,manufacturer_id,sku,name,category,width_in,depth_in,height_in,price_cents,status)
  SELECT a_eq,a_mfr,'G36','Griddle','Cooking',36,30,36,240050,'approved' FROM ids UNION ALL
  SELECT a_quote,a_mfr,'HOOD','Custom hood','Ventilation',96,30,24,NULL,'approved' FROM ids UNION ALL
  SELECT b_eq,b_mfr,'F40','Fryer','Cooking',16,31,45,180000,'approved' FROM ids;

DO $$ DECLARE i ids; r jsonb; BEGIN SELECT * INTO i FROM ids;
  -- ZIP resolution is stable and hides the manufacturer
  r := bs_resolve_zip('85004'); ASSERT r->>'status'='covered' AND r->'models'->0->>'id'=i.a_model::text AND r::text NOT LIKE '%Alpha''%' AND NOT (r ? 'manufacturer_id'), 'zip A';
  ASSERT bs_resolve_zip('89101')->'models'->0->>'id'=i.b_model::text, 'zip B';
  ASSERT bs_resolve_zip('10001')->>'status'='not_covered', 'uncovered';
  ASSERT bs_resolve_zip('85A04')->>'status'='invalid_zip', 'invalid';
  -- integer-cent pricing
  r := bs_price_build('85004', i.a_model, ARRAY[i.a_eq, i.a_eq]);
  ASSERT (r->>'subtotal_cents')::bigint = 2800000+240050*2 AND r->>'quote_required'='false', 'price';
  -- missing price -> quote required, not invented
  r := bs_price_build('85004', i.a_model, ARRAY[i.a_quote]);
  ASSERT r->>'quote_required'='true' AND (r->>'subtotal_cents')::bigint=2800000, 'quote';
  -- cannot use another partner's model or equipment via client tampering
  ASSERT bs_price_build('85004', i.b_model, '{}')->>'status'='invalid_model', 'tamper model';
  ASSERT bs_price_build('85004', i.a_model, ARRAY[i.b_eq])->>'status'='has_problems', 'tamper eq';
  -- incompatibility
  UPDATE bs_equipment SET compatible_model_ids = ARRAY[gen_random_uuid()] WHERE id=i.a_eq;
  ASSERT bs_price_build('85004', i.a_model, ARRAY[i.a_eq])->'problems'->0->>'issue'='incompatible', 'incompat';
  UPDATE bs_equipment SET compatible_model_ids='{}' WHERE id=i.a_eq;
  -- one active partner per region
  BEGIN INSERT INTO bs_region_assignments(region_id,manufacturer_id) VALUES (i.a_reg,i.b_mfr); RAISE EXCEPTION 'dup allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  -- versioning + history
  UPDATE bs_equipment SET price_cents=250000 WHERE id=i.a_eq;
  ASSERT (SELECT version FROM bs_equipment WHERE id=i.a_eq)=4 AND (SELECT count(*) FROM bs_catalog_history WHERE record_id=i.a_eq)=4, 'history';
  -- disabled region stops resolving
  UPDATE bs_regions SET status='disabled' WHERE id=i.b_reg;
  ASSERT bs_resolve_zip('89101')->>'status'='not_covered', 'disabled';
END $$;

-- Partner isolation under RLS
SELECT set_config('request.jwt.claims', json_build_object('sub',a_user,'role','authenticated')::text, true) FROM ids;
SET LOCAL ROLE authenticated;
DO $$ DECLARE i ids; n int; BEGIN SELECT * INTO i FROM ids;
  SELECT count(*) INTO n FROM bs_equipment WHERE manufacturer_id=i.b_mfr; ASSERT n=0, 'sees other partner';
  UPDATE bs_models SET base_price_cents=1 WHERE id=i.b_model; GET DIAGNOSTICS n = ROW_COUNT; ASSERT n=0, 'edits other partner';
  INSERT INTO bs_models(manufacturer_id,sku,name,int_length_in,int_width_in,int_height_in,status) VALUES (i.a_mfr,'A20','Alpha 20',240,90,90,'submitted');
  BEGIN UPDATE bs_models SET status='approved' WHERE sku='A20'; RAISE EXCEPTION 'self-approve allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='self-approve allowed' THEN RAISE; END IF; END;
  BEGIN PERFORM bs_assign_region(i.a_reg, i.a_mfr); RAISE EXCEPTION 'self-assign allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='self-assign allowed' THEN RAISE; END IF; END;
  SELECT count(*) INTO n FROM bs_regions; ASSERT n=0, 'partner sees regions';
END $$;
DO $$ BEGIN RAISE EXCEPTION 'ALL_CHECKS_PASSED'; END $$;
ROLLBACK;
