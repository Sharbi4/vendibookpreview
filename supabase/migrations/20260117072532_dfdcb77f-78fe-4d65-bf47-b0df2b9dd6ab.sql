-- Add display_name, username, business_name, and public location fields to profiles
-- These support the public vs private profile distinction

-- Add display_name (what appears on public profile, can be different from full_name)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Add username for SEO-friendly public profile URLs (unique)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Add business_name for hosts (optional, public)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text;

-- Add public city/state (user chooses what to show publicly)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_state text;

-- Create unique index on username (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;