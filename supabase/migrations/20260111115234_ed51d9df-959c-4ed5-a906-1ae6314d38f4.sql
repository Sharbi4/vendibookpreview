-- Add column to track when Stripe onboarding was started
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_onboarding_started_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_incomplete_onboarding 
ON public.profiles (stripe_onboarding_started_at) 
WHERE stripe_account_id IS NOT NULL 
AND (stripe_onboarding_complete IS NULL OR stripe_onboarding_complete = false);