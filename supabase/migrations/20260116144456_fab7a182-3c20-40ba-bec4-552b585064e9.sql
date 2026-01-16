-- Add column to track when document reminders were sent
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS document_reminder_sent_at TIMESTAMP WITH TIME ZONE;