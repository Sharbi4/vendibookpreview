ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS agreed_amount numeric,
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE TABLE IF NOT EXISTS public.offer_terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL UNIQUE REFERENCES public.offers(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  amount numeric NOT NULL,
  terms_version text NOT NULL,
  terms_text text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_terms_acceptances ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.offer_terms_acceptances TO authenticated;
GRANT ALL ON public.offer_terms_acceptances TO service_role;
CREATE POLICY "offer parties read acceptance" ON public.offer_terms_acceptances FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.seller_id = auth.uid()));

-- One email per offer transition (idempotency for send-offer-notification).
CREATE TABLE IF NOT EXISTS public.offer_notification_sends (
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offer_id, event_type)
);
ALTER TABLE public.offer_notification_sends ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.offer_notification_sends TO service_role;

CREATE OR REPLACE FUNCTION public.offer_terms_current()
RETURNS TABLE(version text, body text) LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 'offer-ack-2026-10-12-draft'::text,
  'I expressly request to begin the purchase process for this equipment. This offer is subject to seller approval or counteroffer. Submitting an offer does not charge me, reserve the item, or complete a purchase. If the final terms are mutually accepted, I will receive an itemized invoice for the agreed price, applicable taxes and delivery costs, and will separately authorize payment. The identified seller, not Vendibook, is the legal seller.'::text
$$;

-- Direct writes are replaced by the RPCs below.
DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can respond to offers" ON public.offers;
DROP POLICY IF EXISTS "Buyers can cancel pending offers" ON public.offers;

CREATE OR REPLACE FUNCTION public.submit_offer(p_listing_id uuid, p_amount numeric, p_message text, p_terms_version text, p_terms_text text, p_acknowledged boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_seller uuid; v_title text; v_id uuid; t record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to make an offer' USING ERRCODE = '28000'; END IF;
  SELECT * INTO t FROM public.offer_terms_current();
  IF p_acknowledged IS NOT TRUE OR p_terms_version IS DISTINCT FROM t.version OR p_terms_text IS DISTINCT FROM t.body THEN
    RAISE EXCEPTION 'Please review and accept the current offer acknowledgment' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Enter a valid offer amount' USING ERRCODE = '22023'; END IF;
  SELECT host_id, title INTO v_seller, v_title FROM public.listings WHERE id = p_listing_id AND mode = 'sale';
  IF v_seller IS NULL THEN RAISE EXCEPTION 'This listing is not accepting offers' USING ERRCODE = '22023'; END IF;
  IF v_seller = v_uid THEN RAISE EXCEPTION 'You cannot make an offer on your own listing' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.offers WHERE listing_id = p_listing_id AND buyer_id = v_uid
             AND (status = 'pending' AND coalesce(expires_at, now() + interval '1s') > now()
               OR status = 'countered' AND coalesce(counter_expires_at, now() + interval '1s') > now())) THEN
    RAISE EXCEPTION 'You already have an open offer on this listing' USING ERRCODE = '23505'; END IF;
  INSERT INTO public.offers (listing_id, buyer_id, seller_id, offer_amount, message, terms_version)
  VALUES (p_listing_id, v_uid, v_seller, p_amount, nullif(left(trim(coalesce(p_message, '')), 1000), ''), t.version)
  RETURNING id INTO v_id;
  INSERT INTO public.offer_terms_acceptances (offer_id, buyer_id, listing_id, amount, terms_version, terms_text)
  VALUES (v_id, v_uid, p_listing_id, p_amount, t.version, t.body);
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_seller, 'offer', 'New offer received', format('You received a $%s offer for "%s".', to_char(p_amount, 'FM999,999,990.00'), v_title), '/dashboard/offers?offer=' || v_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.respond_to_offer(p_offer_id uuid, p_action text, p_counter_amount numeric DEFAULT NULL, p_message text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); o public.offers%ROWTYPE; v_title text; v_event text; v_to uuid; v_final numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '28000'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_uid NOT IN (o.buyer_id, o.seller_id) THEN RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501'; END IF;
  SELECT title INTO v_title FROM public.listings WHERE id = o.listing_id;

  -- Lazy expiry: the 48-hour window is enforced here, not only in the UI.
  IF (o.status = 'pending' AND o.expires_at <= now()) OR (o.status = 'countered' AND o.counter_expires_at <= now()) THEN
    UPDATE public.offers SET status = 'expired' WHERE id = o.id;
    RETURN 'expired';
  END IF;

  IF v_uid = o.seller_id AND o.status = 'pending' AND p_action IN ('accept', 'decline', 'counter') THEN
    IF p_action = 'counter' THEN
      IF p_counter_amount IS NULL OR p_counter_amount <= 0 OR p_counter_amount <> round(p_counter_amount, 2) THEN
        RAISE EXCEPTION 'Enter a valid counteroffer amount' USING ERRCODE = '22023'; END IF;
      UPDATE public.offers SET status = 'countered', counter_amount = p_counter_amount, counter_message = nullif(left(trim(coalesce(p_message,'')),1000),''),
        counter_expires_at = now() + interval '48 hours', responded_at = now() WHERE id = o.id;
      v_event := 'counter_offer';
    ELSIF p_action = 'decline' THEN
      UPDATE public.offers SET status = 'declined', seller_response = nullif(left(trim(coalesce(p_message,'')),1000),''), responded_at = now() WHERE id = o.id;
      v_event := 'offer_declined';
    ELSE
      v_final := o.offer_amount; v_event := 'offer_accepted';
    END IF;
    v_to := o.buyer_id;
  ELSIF v_uid = o.buyer_id AND o.status = 'countered' AND p_action IN ('accept', 'decline') THEN
    IF p_action = 'decline' THEN
      UPDATE public.offers SET status = 'declined', responded_at = now() WHERE id = o.id;
      v_event := 'counter_declined';
    ELSE
      v_final := o.counter_amount; v_event := 'counter_accepted';
    END IF;
    v_to := o.seller_id;
  ELSIF v_uid = o.buyer_id AND o.status IN ('pending', 'countered') AND p_action = 'cancel' THEN
    UPDATE public.offers SET status = 'cancelled' WHERE id = o.id;
    RETURN 'cancelled';
  ELSE
    RAISE EXCEPTION 'This offer can no longer be changed' USING ERRCODE = '55000';
  END IF;

  IF v_final IS NOT NULL THEN
    -- Race-safe: only one mutually agreed offer per listing at a time.
    PERFORM 1 FROM public.listings WHERE id = o.listing_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.offers WHERE listing_id = o.listing_id AND id <> o.id AND status = 'accepted') THEN
      RAISE EXCEPTION 'Another offer on this listing was already accepted' USING ERRCODE = '23505'; END IF;
    UPDATE public.offers SET status = 'accepted', agreed_amount = v_final, agreed_at = now(), responded_at = now() WHERE id = o.id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_to, 'offer',
    CASE v_event WHEN 'counter_offer' THEN 'Counteroffer received' WHEN 'offer_declined' THEN 'Offer declined' WHEN 'counter_declined' THEN 'Counteroffer declined' ELSE 'Price agreed — payment not yet requested' END,
    CASE WHEN v_final IS NOT NULL THEN format('The price of $%s for "%s" is agreed. Nothing has been charged; an itemized invoice comes next.', to_char(v_final, 'FM999,999,990.00'), v_title)
         ELSE format('Update on your offer for "%s".', v_title) END,
    '/dashboard/offers?offer=' || o.id);
  RETURN v_event;
END $$;

REVOKE ALL ON FUNCTION public.submit_offer(uuid, numeric, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_offer(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_offer(uuid, numeric, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offer_terms_current() TO anon, authenticated;