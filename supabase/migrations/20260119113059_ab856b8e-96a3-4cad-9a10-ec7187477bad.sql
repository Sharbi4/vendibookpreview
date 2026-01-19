-- Add missing push_enabled column to notification_preferences table
-- This column is referenced by several notification triggers

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;