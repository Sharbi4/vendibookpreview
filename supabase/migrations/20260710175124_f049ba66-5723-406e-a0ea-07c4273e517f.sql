-- 1. Acknowledgment ledger columns
ALTER TABLE public.transaction_terms
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_ip inet,
  ADD COLUMN IF NOT EXISTS acknowledged_user_agent text;

-- 2. Owner-scoped acknowledgment RPC (SECURITY DEFINER so we don't need broad UPDATE grants)
CREATE OR REPLACE FUNCTION public.acknowledge_transaction_terms(
  _terms_id uuid,
  _ip inet,
  _ua text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transaction_terms
     SET acknowledged_at = COALESCE(acknowledged_at, now()),
         acknowledged_ip = COALESCE(acknowledged_ip, _ip),
         acknowledged_user_agent = COALESCE(acknowledged_user_agent, _ua)
   WHERE id = _terms_id
     AND (
       renter_id = auth.uid()
       OR buyer_id = auth.uid()
     );
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_transaction_terms(uuid, inet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_transaction_terms(uuid, inet, text) TO authenticated;

-- 3. Storage policy fix — booking-documents cross-host leak.
-- The old policy scoped host reads by (shopper_id) folder only, so a host who ever
-- booked with a shopper could read that shopper's docs from unrelated bookings with
-- other hosts. Scope by the specific booking_id folder (2nd path segment) instead.
DROP POLICY IF EXISTS "Hosts can view renter documents for their bookings"
  ON storage.objects;

CREATE POLICY "Hosts can view renter documents for their bookings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND EXISTS (
    SELECT 1
      FROM public.booking_requests br
     WHERE br.host_id = auth.uid()
       AND br.id::text = (storage.foldername(name))[2]
  )
);