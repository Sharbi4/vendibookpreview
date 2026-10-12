
-- Durable transition history and invoice preparation handoff. No payment is authorized here.
CREATE TABLE public.offer_events (
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
CREATE POLICY offer_events_participants ON public.offer_events FOR SELECT TO authenticated
USING (public.account_access_active() AND EXISTS (
  SELECT 1 FROM public.offers o WHERE o.id=offer_id AND (auth.uid() IN (o.buyer_id,o.seller_id) OR public.is_admin(auth.uid()))
));
CREATE INDEX offer_events_pending ON public.offer_events(next_attempt_at) WHERE delivered_at IS NULL;

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
