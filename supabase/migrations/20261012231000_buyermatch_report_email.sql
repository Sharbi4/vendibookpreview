-- One report email per campaign per UTC day. New reports always remain in-app.
CREATE TABLE public.buyermatch_email_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 report_id uuid NOT NULL REFERENCES public.buyermatch_reports(id),
 digest_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 next_attempt_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',
 attempts integer NOT NULL DEFAULT 0,
 delivered_at timestamptz,
 lease_token uuid,
 lease_until timestamptz,
 last_error text,
 UNIQUE(campaign_id,digest_day)
);
ALTER TABLE public.buyermatch_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyermatch_email_queue FROM anon,authenticated;
GRANT ALL ON public.buyermatch_email_queue TO service_role;
CREATE FUNCTION public.buyermatch_queue_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.buyermatch_email_queue(campaign_id,report_id) VALUES(NEW.campaign_id,NEW.id)
 ON CONFLICT(campaign_id,digest_day) DO UPDATE SET report_id=excluded.report_id
 WHERE buyermatch_email_queue.attempts=0 AND buyermatch_email_queue.delivered_at IS NULL;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.buyermatch_queue_report() FROM public,anon,authenticated;
CREATE TRIGGER buyermatch_report_email AFTER INSERT ON public.buyermatch_reports FOR EACH ROW EXECUTE FUNCTION public.buyermatch_queue_report();
CREATE FUNCTION public.claim_buyermatch_emails(_token uuid) RETURNS SETOF public.buyermatch_email_queue
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.buyermatch_email_queue e SET lease_token=_token,lease_until=now()+interval '10 minutes',attempts=e.attempts+1
 WHERE e.id IN (SELECT q.id FROM public.buyermatch_email_queue q WHERE q.delivered_at IS NULL AND q.next_attempt_at<=now()
 AND (q.lease_until IS NULL OR q.lease_until<now()) ORDER BY q.next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING e.*;
$$;
CREATE FUNCTION public.finish_buyermatch_email(_id uuid,_token uuid,_error text DEFAULT null) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.buyermatch_email_queue SET delivered_at=CASE WHEN _error IS NULL THEN now() ELSE NULL END,
 last_error=left(_error,500),lease_token=null,lease_until=null,next_attempt_at=now()+interval '1 hour'
 WHERE id=_id AND lease_token=_token;
$$;
REVOKE ALL ON FUNCTION public.claim_buyermatch_emails(uuid),public.finish_buyermatch_email(uuid,uuid,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_buyermatch_emails(uuid),public.finish_buyermatch_email(uuid,uuid,text) TO service_role;
