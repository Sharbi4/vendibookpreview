-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  booking_request_email BOOLEAN NOT NULL DEFAULT true,
  booking_request_inapp BOOLEAN NOT NULL DEFAULT true,
  booking_response_email BOOLEAN NOT NULL DEFAULT true,
  booking_response_inapp BOOLEAN NOT NULL DEFAULT true,
  message_email BOOLEAN NOT NULL DEFAULT true,
  message_inapp BOOLEAN NOT NULL DEFAULT true,
  document_email BOOLEAN NOT NULL DEFAULT true,
  document_inapp BOOLEAN NOT NULL DEFAULT true,
  sale_email BOOLEAN NOT NULL DEFAULT true,
  sale_inapp BOOLEAN NOT NULL DEFAULT true,
  dispute_email BOOLEAN NOT NULL DEFAULT true,
  dispute_inapp BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();