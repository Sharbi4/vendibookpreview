-- Add missing booking notification columns to notification_preferences table
-- These columns are referenced by notification triggers

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS booking_inapp boolean NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS booking_email boolean NOT NULL DEFAULT true;