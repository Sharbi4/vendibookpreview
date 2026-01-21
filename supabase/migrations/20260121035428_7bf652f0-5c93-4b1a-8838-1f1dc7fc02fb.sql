-- Fix security: Remove overly permissive SELECT policy on availability_alerts
DROP POLICY IF EXISTS "Anyone can view alerts by email" ON public.availability_alerts;

-- Add admin-only SELECT policy for availability_alerts
CREATE POLICY "Admins can view all availability alerts"
ON public.availability_alerts
FOR SELECT
USING (is_admin(auth.uid()));

-- Add admin-only UPDATE policy for availability_alerts (for marking notified_at, unsubscribed_at)
CREATE POLICY "Admins can update availability alerts"
ON public.availability_alerts
FOR UPDATE
USING (is_admin(auth.uid()));

-- Add admin-only SELECT policy for newsletter_subscribers
CREATE POLICY "Admins can view newsletter subscribers"
ON public.newsletter_subscribers
FOR SELECT
USING (is_admin(auth.uid()));

-- Add admin-only UPDATE policy for newsletter_subscribers (for marking unsubscribed_at)
CREATE POLICY "Admins can update newsletter subscribers"
ON public.newsletter_subscribers
FOR UPDATE
USING (is_admin(auth.uid()));