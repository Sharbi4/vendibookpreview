-- Add foreign key constraints for conversations table to profiles
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_shopper_id_fkey 
FOREIGN KEY (shopper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;