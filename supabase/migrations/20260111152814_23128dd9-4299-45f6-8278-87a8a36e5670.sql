-- Fix 1: Remove the overly permissive newsletter_subscribers SELECT policy
-- The INSERT policy allows anyone to subscribe, but SELECT shouldn't expose all emails
DROP POLICY IF EXISTS "Users can view their own subscription" ON newsletter_subscribers;

-- No replacement SELECT policy needed - subscriptions are write-only
-- Unsubscribe functionality should use signed tokens in emails, not database queries