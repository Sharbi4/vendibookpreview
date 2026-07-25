ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_panel_dismissed_at timestamptz;