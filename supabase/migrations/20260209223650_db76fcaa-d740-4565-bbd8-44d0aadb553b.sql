
-- Promotions config table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  rules_json JSONB DEFAULT '{}'::jsonb,
  start_at_et TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at_et TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_deadline_et TIMESTAMP WITH TIME ZONE,
  draw_at_et TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (active = true);

-- Listing rewards table
CREATE TABLE public.listing_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active_days_count INTEGER NOT NULL DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  eligible_at TIMESTAMP WITH TIME ZONE,
  payout_initiated_at TIMESTAMP WITH TIME ZONE,
  payout_completed_at TIMESTAMP WITH TIME ZONE,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  stripe_account_id TEXT,
  disqualified_at TIMESTAMP WITH TIME ZONE,
  disqualified_reason TEXT,
  admin_override BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_promotion UNIQUE (user_id, promotion_id)
);

ALTER TABLE public.listing_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON public.listing_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all rewards" ON public.listing_rewards FOR ALL USING (is_admin(auth.uid()));

-- Contest entries table
CREATE TABLE public.contest_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  facebook_post_url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_contest_entry UNIQUE (user_id, promotion_id)
);

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries" ON public.contest_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own entries" ON public.contest_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all entries" ON public.contest_entries FOR ALL USING (is_admin(auth.uid()));

-- Contest winners table
CREATE TABLE public.contest_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.contest_entries(id),
  user_id UUID NOT NULL,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_initiated_at TIMESTAMP WITH TIME ZONE,
  payout_completed_at TIMESTAMP WITH TIME ZONE,
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contest_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wins" ON public.contest_winners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view winners" ON public.contest_winners FOR SELECT USING (true);
CREATE POLICY "Admins can manage winners" ON public.contest_winners FOR ALL USING (is_admin(auth.uid()));

-- Insert the Feb 2025 promo
INSERT INTO public.promotions (name, active, start_at_et, end_at_et, entry_deadline_et, draw_at_et, rules_json)
VALUES (
  'Vendibook Launch Promo - Feb 2025',
  true,
  '2025-02-09 05:00:00+00',
  '2025-02-11 04:59:59+00',
  '2025-03-14 04:59:59+00',
  '2025-03-15 18:00:00+00',
  '{
    "listing_reward_amount": 1000,
    "contest_prize_amount": 50000,
    "active_days_required": 14,
    "max_rewards_per_user": 1,
    "currency": "usd"
  }'::jsonb
);

-- Triggers for updated_at
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listing_rewards_updated_at BEFORE UPDATE ON public.listing_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contest_entries_updated_at BEFORE UPDATE ON public.contest_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
