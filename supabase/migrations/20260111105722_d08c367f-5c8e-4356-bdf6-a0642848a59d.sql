-- Create messages table for booking conversations
CREATE TABLE public.booking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Hosts can view messages for their bookings
CREATE POLICY "Hosts can view booking messages"
ON public.booking_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_id AND br.host_id = auth.uid()
  )
);

-- Shoppers can view messages for their bookings
CREATE POLICY "Shoppers can view booking messages"
ON public.booking_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_id AND br.shopper_id = auth.uid()
  )
);

-- Hosts can send messages to their bookings
CREATE POLICY "Hosts can send booking messages"
ON public.booking_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_id AND br.host_id = auth.uid()
  )
);

-- Shoppers can send messages to their bookings
CREATE POLICY "Shoppers can send booking messages"
ON public.booking_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_id AND br.shopper_id = auth.uid()
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.booking_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_id AND (br.host_id = auth.uid() OR br.shopper_id = auth.uid())
  )
  AND sender_id != auth.uid()
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;