
-- Create message_reactions table for emoji reactions on messages
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_messages cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE cm.id = message_reactions.message_id
    AND (c.host_id = auth.uid() OR c.shopper_id = auth.uid())
  )
);

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions in their conversations"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_messages cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE cm.id = message_reactions.message_id
    AND (c.host_id = auth.uid() OR c.shopper_id = auth.uid())
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Also enable realtime for conversation_messages UPDATE events (for read receipts)
-- conversation_messages should already be in realtime for INSERT, but let's ensure UPDATE works
