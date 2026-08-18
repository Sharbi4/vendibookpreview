
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.conversation_messages cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE cm.id = message_reactions.message_id
      AND (c.host_id = auth.uid() OR c.shopper_id = auth.uid())
  )
);
