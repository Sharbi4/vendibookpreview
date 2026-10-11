CREATE OR REPLACE FUNCTION public.is_dispute_case_participant(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dispute_cases c
    WHERE c.id = _case_id
      AND (c.buyer_id = _user_id OR c.seller_id = _user_id)
  ) OR public.has_role(_user_id, 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_dispute_case_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dispute_case_participant(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Case participants read dispute evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_dispute_case_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Case participants upload dispute evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_dispute_case_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);