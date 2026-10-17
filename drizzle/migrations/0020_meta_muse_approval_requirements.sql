CREATE FUNCTION public.meta_muse_validate_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.meta_muse_leads; r public.listings; item uuid; state_code text; city_name text; loc text; price numeric; BEGIN
IF NEW.status<>'approved' THEN RETURN NEW; END IF;
SELECT * INTO l FROM public.meta_muse_leads WHERE id=NEW.lead_id;
IF l.stage='closed' THEN RAISE EXCEPTION 'Closed lead cannot be approved'; END IF;
loc:=lower(trim(coalesce(l.city,'')));
IF loc ~ ',\s*[a-z]{2}$' THEN state_code:=upper(right(loc,2)); city_name:=trim(split_part(loc,',',1)); ELSIF loc ~ '^[a-z]{2}$' THEN state_code:=upper(loc); ELSE city_name:=loc; END IF;
FOREACH item IN ARRAY NEW.listing_ids LOOP
SELECT * INTO r FROM public.listings WHERE id=item;
IF l.intent='sell' THEN RAISE EXCEPTION 'Seller acquisition drafts must not contain buyer inventory links'; END IF;
IF l.category='vendor_space' AND r.category::text NOT IN ('vendor_space','vendor_lot') THEN RAISE EXCEPTION 'Category mismatch'; END IF;
price:=CASE WHEN l.intent='buy' THEN r.price_sale ELSE r.price_daily END;
IF l.budget_max IS NOT NULL AND price IS NOT NULL AND price>l.budget_max THEN RAISE EXCEPTION 'Listing now exceeds lead budget'; END IF;
IF loc<>'' AND city_name IS DISTINCT FROM lower(trim(r.city)) AND state_code IS DISTINCT FROM upper(r.state) AND NOT(l.intent='buy' AND coalesce(r.vendibook_freight_enabled,false)) THEN RAISE EXCEPTION 'Location needs normalized city, state before approval'; END IF;
END LOOP; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.meta_muse_validate_approval() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER meta_muse_approval_requirements BEFORE UPDATE OF status ON public.meta_muse_drafts FOR EACH ROW EXECUTE FUNCTION public.meta_muse_validate_approval();