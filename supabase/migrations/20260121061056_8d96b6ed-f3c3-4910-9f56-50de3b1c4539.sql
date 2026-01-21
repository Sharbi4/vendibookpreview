-- Add attachment columns to conversation_messages
ALTER TABLE public.conversation_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Add index for messages with attachments
CREATE INDEX IF NOT EXISTS idx_conversation_messages_attachment 
ON public.conversation_messages (conversation_id) 
WHERE attachment_url IS NOT NULL;