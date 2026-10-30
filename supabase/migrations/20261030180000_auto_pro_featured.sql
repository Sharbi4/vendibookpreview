-- Pro's existing one-Boost-per-billing-period benefit activates without a click.
-- Never publishes a draft or bypasses moderation. All benefit writes are atomic.
CREATE UNIQUE INDEX pro_boost_credits_user_period_end_uidx
  ON public.pro_boost_credits(user_id,period_end);
CREATE OR REPLACE FUNCTION public.activate_pro_featured(p_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  sub public.host_subscriptions;
  credit public.pro_boost_credits;
  item public.listings;
  product public.monetization_products;
  v_purchase_id uuid;
  period_start_at timestamptz;
  ends timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pro-featured:'||p_user::text,0));
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND account_suspended=true) THEN RETURN NULL; END IF;
  SELECT * INTO sub FROM public.host_subscriptions
    WHERE user_id=p_user AND status='active' AND current_period_end>now()
      AND regexp_replace(lower(tier),'_(monthly|annual)$','') IN ('pro','vendibook_pro','vendibook-pro')
    ORDER BY current_period_end DESC,id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Square does not supply current_period_start. Reuse recorded periods first,
  -- and use the previous paid-through boundary on renewal, never webhook time.
  IF NOT EXISTS(SELECT 1 FROM public.pro_boost_credits WHERE user_id=p_user
      AND period_end=sub.current_period_end) THEN
    SELECT greatest(coalesce(sub.current_period_start,sub.created_at),
      coalesce(max(period_end),sub.created_at)) INTO period_start_at
      FROM public.pro_boost_credits WHERE user_id=p_user AND period_end<sub.current_period_end;
    IF period_start_at>=sub.current_period_end THEN RETURN NULL; END IF;
    INSERT INTO public.pro_boost_credits(user_id,subscription_id,period_start,period_end,source)
      VALUES(p_user,sub.id,period_start_at,sub.current_period_end,'vendibook_pro')
      ON CONFLICT DO NOTHING;
  END IF;
  SELECT * INTO credit FROM public.pro_boost_credits
    WHERE user_id=p_user AND status='available' AND period_start<=now()
      AND period_end>now() AND period_end=sub.current_period_end
    ORDER BY period_end,id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO product FROM public.monetization_products WHERE slug='boost-featured-30';
  IF NOT FOUND OR product.promo_type IS NULL OR product.duration_days IS NULL OR product.duration_days<=0 THEN
    RAISE EXCEPTION 'Featured Boost product is not configured';
  END IF;
  ends:=now()+make_interval(days=>product.duration_days);
  SELECT * INTO item FROM public.listings l
    WHERE host_id=p_user AND status='published' AND published_at IS NOT NULL
      AND deleted_at IS NULL AND unlisted IS NOT TRUE AND moderation_status='clear'
      AND NOT public.featured_listing_sold(l.id)
      -- Keep a credit available if every listing already has the full benefit.
      AND NOT (coalesce(featured_enabled,false) AND coalesce(featured_expires_at,now())>=ends)
    ORDER BY (coalesce(featured_enabled,false) AND coalesce(featured_expires_at,now())>now()),
      published_at DESC,id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.monetization_purchases(user_id,product_id,listing_id,amount_cents,currency,
    status,fulfillment_status,idempotency_key,payment_provider,access_starts_at,access_ends_at,metadata)
    VALUES(p_user,product.id,item.id,0,'USD','fulfilled','active','pro-credit:'||credit.id,'manual',now(),ends,
      jsonb_build_object('source','vendibook_pro_boost_credit','credit_id',credit.id,
        'period_end',credit.period_end,'activation','automatic')) RETURNING id INTO v_purchase_id;
  INSERT INTO public.listing_promotions(listing_id,product_id,purchase_id,promo_type,starts_at,ends_at,active)
    VALUES(item.id,product.id,v_purchase_id,product.promo_type,now(),ends,true)
    ON CONFLICT(listing_id,promo_type) WHERE active=true DO UPDATE
      SET ends_at=greatest(listing_promotions.ends_at,excluded.ends_at),purchase_id=excluded.purchase_id;
  UPDATE public.listings SET featured_enabled=true,featured_at=now(),
    featured_expires_at=greatest(featured_expires_at,ends),featured_source='pro'
    WHERE id=item.id;
  UPDATE public.pro_boost_credits SET status='used',used_at=now(),listing_id=item.id,
    purchase_id=v_purchase_id,
    metadata=metadata||jsonb_build_object('activation','automatic') WHERE id=credit.id;
  INSERT INTO public.notifications(user_id,type,title,message,link)
    VALUES(p_user,'purchase','Your Pro Featured Boost is live',
      'Your included Featured Boost has been applied automatically to '||item.title||'. No extra charge.',
      '/listing/'||item.id);
  RETURN item.id;
END $$;
REVOKE ALL ON FUNCTION public.activate_pro_featured(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pro_featured(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.on_pro_subscription_featured()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.activate_pro_featured(NEW.user_id);
  RETURN NEW;
END $$;
CREATE TRIGGER pro_subscription_featured AFTER INSERT OR UPDATE OF status,tier,current_period_start,current_period_end
  ON public.host_subscriptions FOR EACH ROW EXECUTE FUNCTION public.on_pro_subscription_featured();

CREATE OR REPLACE FUNCTION public.on_pro_listing_featured()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='published' AND NEW.published_at IS NOT NULL AND NEW.deleted_at IS NULL
    AND NEW.unlisted IS NOT TRUE AND NEW.moderation_status='clear' THEN
    PERFORM public.activate_pro_featured(NEW.host_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pro_listing_featured AFTER INSERT OR UPDATE OF status,published_at,moderation_status,unlisted,deleted_at
  ON public.listings FOR EACH ROW EXECUTE FUNCTION public.on_pro_listing_featured();
REVOKE ALL ON FUNCTION public.on_pro_subscription_featured() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.on_pro_listing_featured() FROM PUBLIC,anon,authenticated;

