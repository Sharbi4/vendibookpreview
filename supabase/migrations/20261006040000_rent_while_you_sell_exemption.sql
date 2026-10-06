-- "Rent it while you sell it": a seller creating the linked rental copy of
-- their OWN live sale listing is a seller acting on their own listing (same
-- asset, starts no contact), so the member trust gate must not block it.
-- Extends the seller_side exemption in guard_signup_phone_actions.
DO $$
DECLARE definition text; patched text;
BEGIN
  SELECT pg_get_functiondef('public.guard_signup_phone_actions()'::regprocedure) INTO definition;
  patched := replace(definition,
$old$      when 'listings' then tg_op = 'UPDATE'
        and actor = (old_data->>'host_id')::uuid and actor = (row_data->>'host_id')::uuid$old$,
$new$      when 'listings' then (tg_op = 'UPDATE'
        and actor = (old_data->>'host_id')::uuid and actor = (row_data->>'host_id')::uuid)
        or (tg_op = 'INSERT' and row_data->>'mode' = 'rent' and row_data->>'source_listing_id' is not null
            and actor = (row_data->>'host_id')::uuid
            and exists (select 1 from public.listings s
                        where s.id = (row_data->>'source_listing_id')::uuid
                          and s.host_id = actor and s.mode = 'sale' and s.deleted_at is null
                          and s.status in ('published', 'paused')))$new$);
  IF patched = definition THEN
    RAISE EXCEPTION 'guard_signup_phone_actions changed shape; patch not applied';
  END IF;
  EXECUTE patched;
END $$;
