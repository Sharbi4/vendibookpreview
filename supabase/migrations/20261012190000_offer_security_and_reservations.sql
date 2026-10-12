-- Deploy the offer hardening through the standard Lovable migration path.
-- Safe after the earlier drizzle offer migrations; existing records are retained.
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
DROP POLICY IF EXISTS "offer parties read acceptance" ON public.offer_terms_acceptances;
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


CREATE OR REPLACE FUNCTION public.trg_guard_offer_user_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.listing_id   IS DISTINCT FROM OLD.listing_id   THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;
  IF NEW.buyer_id     IS DISTINCT FROM OLD.buyer_id     THEN RAISE EXCEPTION 'buyer_id is not user-editable'; END IF;
  IF NEW.seller_id    IS DISTINCT FROM OLD.seller_id    THEN RAISE EXCEPTION 'seller_id is not user-editable'; END IF;
  IF NEW.offer_amount IS DISTINCT FROM OLD.offer_amount THEN RAISE EXCEPTION 'offer_amount is not editable after submission'; END IF;
  IF OLD.agreed_amount IS NOT NULL AND NEW.agreed_amount IS DISTINCT FROM OLD.agreed_amount THEN RAISE EXCEPTION 'agreed price is locked'; END IF;
  IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
    IF NEW.counter_amount IS DISTINCT FROM OLD.counter_amount
       OR NEW.counter_message IS DISTINCT FROM OLD.counter_message
       OR NEW.counter_expires_at IS DISTINCT FROM OLD.counter_expires_at
       OR NEW.seller_response IS DISTINCT FROM OLD.seller_response THEN
      RAISE EXCEPTION 'buyers cannot modify seller response fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled', 'accepted', 'declined', 'expired') THEN
      RAISE EXCEPTION 'invalid buyer status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
-- Continue 0013/0014: no browser writes, serialized negotiation, immutable agreement.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.offers FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.offer_terms_acceptances FROM PUBLIC, anon, authenticated;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.submit_offer(p_listing_id uuid, p_amount numeric, p_message text, p_terms_version text, p_terms_text text, p_acknowledged boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_seller uuid; v_title text; v_id uuid; v_min numeric; t record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to make an offer' USING ERRCODE = '28000'; END IF;
  IF NOT public.account_access_active() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND account_suspended) THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '42501'; END IF;
  SELECT * INTO t FROM public.offer_terms_current();
  IF p_acknowledged IS NOT TRUE OR p_terms_version IS DISTINCT FROM t.version OR p_terms_text IS DISTINCT FROM t.body THEN
    RAISE EXCEPTION 'Please review and accept the current offer acknowledgment' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Enter a valid offer amount' USING ERRCODE = '22023'; END IF;
  SELECT host_id, title, min_offer_amount INTO v_seller, v_title, v_min FROM public.listings WHERE id = p_listing_id AND mode = 'sale' AND accepts_offers IS TRUE FOR UPDATE;
  IF v_seller IS NULL THEN RAISE EXCEPTION 'This listing is not accepting offers' USING ERRCODE = '22023'; END IF;
  IF NOT coalesce((public.listing_purchase_state(p_listing_id)->>'purchasable')::boolean, false) THEN RAISE EXCEPTION 'This listing is not accepting offers' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.offers WHERE listing_id = p_listing_id AND status IN ('accepted','purchased')) THEN RAISE EXCEPTION 'An offer has already been agreed for this listing' USING ERRCODE = '23505'; END IF;
  IF p_amount < coalesce(v_min,0) THEN RAISE EXCEPTION 'Offer is below the seller minimum' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.sale_invoices WHERE listing_id=p_listing_id AND status IN ('issued','payment_processing','paid','disputed','partially_refunded','completed')) THEN RAISE EXCEPTION 'This listing is reserved' USING ERRCODE='55000'; END IF;
  IF v_seller = v_uid THEN RAISE EXCEPTION 'You cannot make an offer on your own listing' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.offers WHERE listing_id = p_listing_id AND buyer_id = v_uid
             AND (status = 'pending' AND coalesce(expires_at, created_at + interval '48 hours') > clock_timestamp()
               OR status = 'countered' AND coalesce(counter_expires_at, responded_at + interval '48 hours', expires_at, created_at + interval '48 hours') > clock_timestamp())) THEN
    RAISE EXCEPTION 'You already have an open offer on this listing' USING ERRCODE = '23505'; END IF;
  INSERT INTO public.offers (listing_id, buyer_id, seller_id, offer_amount, message, terms_version)
  VALUES (p_listing_id, v_uid, v_seller, p_amount, nullif(left(trim(coalesce(p_message, '')), 1000), ''), t.version)
  RETURNING id INTO v_id;
  INSERT INTO public.offer_terms_acceptances (offer_id, buyer_id, listing_id, amount, terms_version, terms_text)
  VALUES (v_id, v_uid, p_listing_id, p_amount, t.version, t.body);
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_seller, 'offer', 'New offer received', format('You received a $%s offer for "%s".', to_char(p_amount, 'FM999,999,990.00'), v_title), '/dashboard/offers?offer=' || v_id);
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.respond_to_offer(p_offer_id uuid, p_action text, p_counter_amount numeric DEFAULT NULL::numeric, p_message text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); o public.offers%ROWTYPE; v_title text; v_event text; v_to uuid; v_final numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '28000'; END IF;
  IF NOT public.account_access_active() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND account_suspended) THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '42501'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id;
  IF NOT FOUND OR v_uid NOT IN (o.buyer_id, o.seller_id) THEN RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501'; END IF;
  -- Every negotiation locks listing before offer. Submissions and competing
  -- acceptances serialize on the same row; re-read offer after waiting.
  PERFORM 1 FROM public.listings WHERE id = o.listing_id FOR UPDATE;
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_uid NOT IN (o.buyer_id, o.seller_id) THEN RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501'; END IF;
  SELECT title INTO v_title FROM public.listings WHERE id = o.listing_id;

  IF p_action IN ('accept','counter') AND (
    NOT coalesce((public.listing_purchase_state(o.listing_id)->>'purchasable')::boolean, false)
    OR NOT EXISTS (SELECT 1 FROM public.listings WHERE id=o.listing_id AND host_id=o.seller_id AND mode='sale')
  ) THEN RAISE EXCEPTION 'This listing is no longer available' USING ERRCODE = '55000'; END IF;

  IF p_action IN ('accept','counter') AND EXISTS (
    SELECT 1 FROM public.sale_invoices WHERE listing_id=o.listing_id
      AND status IN ('issued','payment_processing','paid','disputed','partially_refunded','completed')
  ) THEN RAISE EXCEPTION 'This listing is reserved' USING ERRCODE='55000'; END IF;

  -- Lazy expiry: the 48-hour window is enforced here, not only in the UI.
  IF (o.status = 'pending' AND coalesce(o.expires_at, o.created_at + interval '48 hours') <= clock_timestamp()) OR (o.status = 'countered' AND coalesce(o.counter_expires_at, o.responded_at + interval '48 hours', o.expires_at, o.created_at + interval '48 hours') <= clock_timestamp()) THEN
    UPDATE public.offers SET status = 'expired' WHERE id = o.id;
    RETURN 'expired';
  END IF;

  IF v_uid = o.seller_id AND o.status = 'pending' AND p_action IN ('accept', 'decline', 'counter') THEN
    IF p_action = 'counter' THEN
      IF p_counter_amount IS NULL OR p_counter_amount <= 0 OR p_counter_amount > 10000000 OR p_counter_amount <> round(p_counter_amount, 2) THEN
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
    IF EXISTS (SELECT 1 FROM public.offers WHERE listing_id = o.listing_id AND id <> o.id AND status IN ('accepted', 'purchased')) THEN
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
END $function$;


-- This guard applies to administrators and service-role writes too.
-- A future amendment must have its own recorded mutual-consent workflow.
CREATE OR REPLACE FUNCTION public.guard_offer_agreement_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
    OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.offer_amount IS DISTINCT FROM OLD.offer_amount
    OR NEW.terms_version IS DISTINCT FROM OLD.terms_version THEN
    RAISE EXCEPTION 'Offer identity and submitted terms are immutable' USING ERRCODE='42501';
  END IF;
  IF OLD.agreed_at IS NOT NULL OR OLD.agreed_amount IS NOT NULL OR OLD.status IN ('accepted','purchased') THEN
    IF NEW.agreed_amount IS DISTINCT FROM OLD.agreed_amount OR NEW.agreed_at IS DISTINCT FROM OLD.agreed_at
      OR NEW.counter_amount IS DISTINCT FROM OLD.counter_amount
      OR (NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status='accepted' AND NEW.status='purchased')) THEN
      RAISE EXCEPTION 'Mutually accepted offer is immutable; a documented amendment is required' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_offer_agreement_immutable ON public.offers;
CREATE TRIGGER guard_offer_agreement_immutable BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.guard_offer_agreement_immutable();

REVOKE ALL ON FUNCTION public.submit_offer(uuid,numeric,text,text,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_offer(uuid,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_offer(uuid,numeric,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid,text,numeric,text) TO authenticated;


-- Durable transition history and invoice preparation handoff. No payment is authorized here.
CREATE TABLE IF NOT EXISTS public.offer_events (
  offer_id uuid NOT NULL REFERENCES public.offers(id),
  event_type text NOT NULL CHECK (event_type IN ('new_offer','counter_offer','offer_accepted','offer_declined','counter_accepted','counter_declined','cancelled','expired')),
  actor_id uuid,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error text,
  PRIMARY KEY(offer_id,event_type)
);
ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.offer_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.offer_events TO authenticated;
GRANT ALL ON public.offer_events TO service_role;
DROP POLICY IF EXISTS offer_events_participants ON public.offer_events;
CREATE POLICY offer_events_participants ON public.offer_events FOR SELECT TO authenticated
USING (public.account_access_active() AND EXISTS (
  SELECT 1 FROM public.offers o WHERE o.id=offer_id AND (auth.uid() IN (o.buyer_id,o.seller_id) OR public.is_admin(auth.uid()))
));
CREATE INDEX IF NOT EXISTS offer_events_pending ON public.offer_events(next_attempt_at) WHERE delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.record_offer_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event text; acceptance jsonb;
BEGIN
  IF TG_OP='INSERT' THEN event:='new_offer';
  ELSIF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;
  ELSE
    event:=CASE NEW.status
      WHEN 'countered' THEN 'counter_offer'
      WHEN 'accepted' THEN CASE WHEN OLD.status='countered' THEN 'counter_accepted' ELSE 'offer_accepted' END
      WHEN 'declined' THEN CASE WHEN OLD.status='countered' THEN 'counter_declined' ELSE 'offer_declined' END
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'expired' THEN 'expired'
      ELSE NULL END;
  END IF;
  IF event IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.offer_events(offer_id,event_type,actor_id,snapshot,delivered_at)
  VALUES(NEW.id,event,auth.uid(),to_jsonb(NEW),CASE WHEN event IN ('cancelled','expired') THEN now() ELSE NULL END)
  ON CONFLICT DO NOTHING;
  IF event IN ('cancelled','expired') THEN
    INSERT INTO public.notifications(user_id,type,title,message,link)
    SELECT recipient,'offer',CASE WHEN event='expired' THEN 'Offer expired' ELSE 'Offer withdrawn' END,
      'This offer is no longer open. No payment was collected.','/dashboard/offers?offer='||NEW.id
    FROM unnest(ARRAY[NEW.buyer_id,NEW.seller_id]) recipient;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS record_offer_transition ON public.offers;
CREATE TRIGGER record_offer_transition AFTER INSERT OR UPDATE OF status ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.record_offer_transition();

CREATE OR REPLACE FUNCTION public.claim_offer_email(p_offer uuid,p_event text,p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer;
BEGIN
  UPDATE public.offer_events SET lease_until=clock_timestamp()+interval '10 minutes',lease_token=p_token,attempts=attempts+1
  WHERE offer_id=p_offer AND event_type=p_event AND delivered_at IS NULL
    AND next_attempt_at<=clock_timestamp() AND (lease_until IS NULL OR lease_until<clock_timestamp());
  GET DIAGNOSTICS claimed=ROW_COUNT;
  RETURN claimed=1;
END $$;
CREATE OR REPLACE FUNCTION public.finish_offer_email(p_offer uuid,p_event text,p_token uuid,p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.offer_events SET
    delivered_at=CASE WHEN p_error IS NULL THEN clock_timestamp() ELSE NULL END,
    last_error=left(p_error,500),lease_until=NULL,lease_token=NULL,
    next_attempt_at=clock_timestamp()+ make_interval(secs=>least(21600,60*power(2,least(attempts,8)))::integer)
  WHERE offer_id=p_offer AND event_type=p_event AND lease_token=p_token;
END $$;
REVOKE ALL ON FUNCTION public.claim_offer_email(uuid,text,uuid),public.finish_offer_email(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer_email(uuid,text,uuid),public.finish_offer_email(uuid,text,uuid,text) TO service_role;


CREATE OR REPLACE FUNCTION public.expire_offer_batch()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  WITH expired AS (
    SELECT id FROM public.offers WHERE
      (status='pending' AND coalesce(expires_at,created_at+interval '48 hours')<=clock_timestamp())
      OR (status='countered' AND coalesce(counter_expires_at,responded_at+interval '48 hours',expires_at,created_at+interval '48 hours')<=clock_timestamp())
    ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.offers SET status='expired' WHERE id IN (SELECT id FROM expired);
  GET DIAGNOSTICS affected=ROW_COUNT;
  RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.expire_offer_batch() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_offer_batch() TO service_role;

-- Public action eligibility exposes no participant or invoice identifiers.
create or replace function public.sale_action_state(_listing uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare l public.listings; reservation text; purchasable boolean;
begin
  select * into l from public.listings where id=_listing;
  purchasable:=coalesce((public.listing_purchase_state(_listing)->>'purchasable')::boolean,false) and l.mode='sale';
  select case when status='completed' then 'sold'
    when status in ('issued','payment_processing') then 'payment_pending' else 'sale_pending' end
    into reservation from public.sale_invoices where listing_id=_listing
      and status in ('issued','payment_processing','paid','disputed','partially_refunded','completed') limit 1;
  return jsonb_build_object('can_request',coalesce(purchasable,false) and reservation is null,
    'can_offer',coalesce(purchasable,false) and l.accepts_offers is true and reservation is null
      and not exists(select 1 from public.offers where listing_id=_listing and status in ('accepted','purchased')),
    'minimum_offer',case when purchasable then l.min_offer_amount else null end,
    'reservation_status',reservation);
end $$;
revoke all on function public.sale_action_state(uuid) from public;
grant execute on function public.sale_action_state(uuid) to anon,authenticated,service_role;
