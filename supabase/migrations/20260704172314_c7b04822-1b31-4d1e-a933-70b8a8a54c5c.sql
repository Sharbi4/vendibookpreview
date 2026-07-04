-- Restrict conversation-participant profile access to only safe display fields.
-- Previously, the policy "Users can view profiles of conversation participants"
-- exposed the FULL profiles row (including stripe_account_id, phone_number,
-- addresses, email, etc.) to any user who shared a conversation with them.
-- Replace it with a SECURITY DEFINER RPC that returns ONLY display fields.

DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_conversation_participant_profile(_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      -- Caller must share a conversation with the target user
      EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE (c.host_id = auth.uid() AND c.shopper_id = p.id)
           OR (c.shopper_id = auth.uid() AND c.host_id = p.id)
      )
      -- Or caller is viewing themselves
      OR p.id = auth.uid()
      -- Or caller is admin
      OR public.is_admin(auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_participant_profile(uuid) TO authenticated;
