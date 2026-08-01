-- ============ payment_attempts ============
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE CASCADE,
  buyer_id uuid,
  provider public.payment_provider NOT NULL DEFAULT 'paypal',
  provider_order_id text,
  provider_capture_id text,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'created',
  failure_category text,
  failure_code text,
  failure_message_safe text,
  failure_message_internal text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT payment_attempts_status_chk CHECK (status IN (
    'created','approval_pending','approved','capture_pending','captured',
    'capture_failed_retryable','capture_failed_terminal','cancelled','expired'
  ))
);
CREATE INDEX idx_payment_attempts_record ON public.payment_attempts(payment_record_id, attempt_number DESC);
CREATE INDEX idx_payment_attempts_buyer ON public.payment_attempts(buyer_id, created_at DESC);
CREATE UNIQUE INDEX idx_payment_attempts_idem ON public.payment_attempts(idempotency_key) WHERE idempotency_key IS NOT NULL;

GRANT SELECT ON public.payment_attempts TO authenticated;
GRANT ALL ON public.payment_attempts TO service_role;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view their own payment attempts"
ON public.payment_attempts FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ payment_receipts ============
CREATE TABLE public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  template_name text NOT NULL DEFAULT 'payment-receipt',
  template_version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  failure_reason text,
  last_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_receipts_status_chk CHECK (status IN ('queued','sending','sent','failed','suppressed'))
);
CREATE UNIQUE INDEX idx_payment_receipts_unique
  ON public.payment_receipts(payment_record_id, template_name);

GRANT SELECT ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and admins view receipt delivery"
ON public.payment_receipts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.payment_records pr
    WHERE pr.id = payment_receipts.payment_record_id AND pr.buyer_id = auth.uid()
  )
);

-- ============ order_timeline_events ============
CREATE TABLE public.order_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  event_code text NOT NULL,
  title text NOT NULL,
  description text,
  actor_role text,
  visibility text NOT NULL DEFAULT 'buyer',
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_timeline_visibility_chk CHECK (visibility IN ('buyer','seller','both','admin'))
);
CREATE INDEX idx_order_timeline_record ON public.order_timeline_events(payment_record_id, created_at);
CREATE UNIQUE INDEX idx_order_timeline_dedupe ON public.order_timeline_events(dedupe_key) WHERE dedupe_key IS NOT NULL;

GRANT SELECT ON public.order_timeline_events TO authenticated;
GRANT ALL ON public.order_timeline_events TO service_role;
ALTER TABLE public.order_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view order timeline"
ON public.order_timeline_events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.payment_records pr
    WHERE pr.id = order_timeline_events.payment_record_id
      AND (
        (pr.buyer_id = auth.uid() AND order_timeline_events.visibility IN ('buyer','both'))
        OR (pr.seller_id = auth.uid() AND order_timeline_events.visibility IN ('seller','both'))
      )
  )
);

-- updated_at triggers
CREATE TRIGGER trg_payment_attempts_updated_at
BEFORE UPDATE ON public.payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_payment_receipts_updated_at
BEFORE UPDATE ON public.payment_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();