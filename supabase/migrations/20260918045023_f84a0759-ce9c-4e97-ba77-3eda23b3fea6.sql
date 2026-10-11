
-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.is_handoff_participant(_sale uuid, _booking uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT st.buyer_id = auth.uid() OR st.seller_id = auth.uid()
    FROM public.sale_transactions st WHERE st.id = _sale
  ), false)
  OR COALESCE((
    SELECT br.shopper_id = auth.uid() OR br.host_id = auth.uid()
    FROM public.booking_requests br WHERE br.id = _booking
  ), false)
  OR public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

-- ============ fulfillment_sessions ============
CREATE TABLE public.fulfillment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid,
  mode text NOT NULL CHECK (mode IN ('vendibook_freight','seller_delivery','third_party_driver','buyer_pickup')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','en_route','arrived','handoff','completed','cancelled')),
  driver_name text,
  driver_email text,
  driver_phone text,
  location_consent boolean NOT NULL DEFAULT false,
  location_consent_at timestamptz,
  location_consent_by uuid,
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fulfillment_sessions_target_ck CHECK (sale_transaction_id IS NOT NULL OR booking_id IS NOT NULL)
);
GRANT SELECT ON public.fulfillment_sessions TO authenticated;
GRANT ALL ON public.fulfillment_sessions TO service_role;
ALTER TABLE public.fulfillment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read fulfillment sessions" ON public.fulfillment_sessions
  FOR SELECT TO authenticated
  USING (public.is_handoff_participant(sale_transaction_id, booking_id));

-- ============ gps_trip_events ============
CREATE TABLE public.gps_trip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_session_id uuid NOT NULL REFERENCES public.fulfillment_sessions(id) ON DELETE CASCADE,
  latitude numeric(9,5) NOT NULL,
  longitude numeric(9,5) NOT NULL,
  accuracy_m numeric,
  source text NOT NULL DEFAULT 'browser',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gps_trip_events_session_idx ON public.gps_trip_events(fulfillment_session_id, recorded_at);
GRANT SELECT ON public.gps_trip_events TO authenticated;
GRANT ALL ON public.gps_trip_events TO service_role;
ALTER TABLE public.gps_trip_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read trip checkpoints" ON public.gps_trip_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fulfillment_sessions fs
    WHERE fs.id = fulfillment_session_id
      AND public.is_handoff_participant(fs.sale_transaction_id, fs.booking_id)
  ));

-- ============ secure_driver_links ============
CREATE TABLE public.secure_driver_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_session_id uuid NOT NULL REFERENCES public.fulfillment_sessions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  driver_name text,
  driver_email text,
  driver_phone text,
  created_by uuid,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  first_used_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.secure_driver_links TO service_role;
ALTER TABLE public.secure_driver_links ENABLE ROW LEVEL SECURITY;
-- no authenticated grants: tokens are server-only.

-- ============ handoff_sessions ============
CREATE TABLE public.handoff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_session_id uuid REFERENCES public.fulfillment_sessions(id) ON DELETE SET NULL,
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid,
  mode text NOT NULL CHECK (mode IN ('vendibook_freight','seller_delivery','third_party_driver','buyer_pickup')),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started','code_verified','walkthrough','decision','signature','completed','cancelled')),
  pickup_code text,
  pickup_code_verified_at timestamptz,
  recording_consent_seller_at timestamptz,
  recording_consent_buyer_at timestamptz,
  walkthrough_completed_at timestamptz,
  buyer_decision text CHECK (buyer_decision IN ('accepted','accepted_with_exceptions','issue_reported')),
  buyer_decision_at timestamptz,
  buyer_decision_notes text,
  location_lat numeric(9,5),
  location_lng numeric(9,5),
  location_captured_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handoff_sessions_target_ck CHECK (sale_transaction_id IS NOT NULL OR booking_id IS NOT NULL)
);
GRANT SELECT ON public.handoff_sessions TO authenticated;
GRANT ALL ON public.handoff_sessions TO service_role;
ALTER TABLE public.handoff_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read handoff sessions" ON public.handoff_sessions
  FOR SELECT TO authenticated
  USING (public.is_handoff_participant(sale_transaction_id, booking_id));

-- ============ handoff_media ============
CREATE TABLE public.handoff_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_session_id uuid NOT NULL REFERENCES public.handoff_sessions(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'handoff-evidence',
  storage_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('video','photo','document')),
  kind text NOT NULL DEFAULT 'walkthrough',
  uploaded_by uuid,
  uploaded_by_role text,
  byte_size bigint,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX handoff_media_session_idx ON public.handoff_media(handoff_session_id);
GRANT SELECT, INSERT ON public.handoff_media TO authenticated;
GRANT ALL ON public.handoff_media TO service_role;
ALTER TABLE public.handoff_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read handoff media" ON public.handoff_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.handoff_sessions hs
    WHERE hs.id = handoff_session_id
      AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
  ));
CREATE POLICY "Participants add handoff media" ON public.handoff_media
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.handoff_sessions hs
      WHERE hs.id = handoff_session_id
        AND hs.finalized = false
        AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
    )
  );

-- ============ handoff_exceptions ============
CREATE TABLE public.handoff_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_session_id uuid NOT NULL REFERENCES public.handoff_sessions(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'noted' CHECK (severity IN ('noted','significant','blocking')),
  reported_by uuid,
  reported_by_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.handoff_exceptions TO authenticated;
GRANT ALL ON public.handoff_exceptions TO service_role;
ALTER TABLE public.handoff_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read handoff exceptions" ON public.handoff_exceptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.handoff_sessions hs
    WHERE hs.id = handoff_session_id
      AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
  ));

-- ============ handoff_signatures ============
CREATE TABLE public.handoff_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_session_id uuid NOT NULL REFERENCES public.handoff_sessions(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'signnow',
  envelope_id text,
  document_id text,
  signer_role text NOT NULL DEFAULT 'buyer',
  signer_email text,
  status text NOT NULL DEFAULT 'not_configured'
    CHECK (status IN ('not_configured','pending','sent','viewed','signed','declined','error')),
  acknowledgment_type text CHECK (acknowledgment_type IN ('accepted','accepted_with_exceptions','issue_reported')),
  signed_at timestamptz,
  signed_document_path text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.handoff_signatures TO authenticated;
GRANT ALL ON public.handoff_signatures TO service_role;
ALTER TABLE public.handoff_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read handoff signatures" ON public.handoff_signatures
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.handoff_sessions hs
    WHERE hs.id = handoff_session_id
      AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
  ));

-- ============ shipment_tracking_events ============
CREATE TABLE public.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  fulfillment_session_id uuid REFERENCES public.fulfillment_sessions(id) ON DELETE SET NULL,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text NOT NULL DEFAULT 'label_created'
    CHECK (status IN ('label_created','picked_up','in_transit','out_for_delivery','delivered','exception','cancelled')),
  description text,
  estimated_delivery_at timestamptz,
  event_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  recorded_by uuid,
  paypal_sync_status text NOT NULL DEFAULT 'not_attempted'
    CHECK (paypal_sync_status IN ('not_attempted','skipped_missing_config','pending','synced','failed')),
  paypal_debug_id text,
  paypal_sync_error text,
  paypal_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipment_tracking_sale_idx ON public.shipment_tracking_events(sale_transaction_id, event_at);
GRANT SELECT ON public.shipment_tracking_events TO authenticated;
GRANT ALL ON public.shipment_tracking_events TO service_role;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read shipment tracking" ON public.shipment_tracking_events
  FOR SELECT TO authenticated
  USING (public.is_handoff_participant(sale_transaction_id, booking_id));

-- ============ transaction_evidence_events ============
CREATE TABLE public.transaction_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  handoff_session_id uuid REFERENCES public.handoff_sessions(id) ON DELETE SET NULL,
  fulfillment_session_id uuid REFERENCES public.fulfillment_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  actor_id uuid,
  actor_role text,
  actor_label text,
  status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transaction_evidence_sale_idx ON public.transaction_evidence_events(sale_transaction_id, occurred_at);
CREATE INDEX transaction_evidence_booking_idx ON public.transaction_evidence_events(booking_id, occurred_at);
GRANT SELECT ON public.transaction_evidence_events TO authenticated;
GRANT ALL ON public.transaction_evidence_events TO service_role;
ALTER TABLE public.transaction_evidence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read evidence timeline" ON public.transaction_evidence_events
  FOR SELECT TO authenticated
  USING (public.is_handoff_participant(sale_transaction_id, booking_id));

-- ============ updated_at triggers ============
CREATE TRIGGER fulfillment_sessions_updated_at BEFORE UPDATE ON public.fulfillment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER handoff_sessions_updated_at BEFORE UPDATE ON public.handoff_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER handoff_signatures_updated_at BEFORE UPDATE ON public.handoff_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
