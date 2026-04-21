-- Referral codes (one per user)
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  give_amount NUMERIC NOT NULL DEFAULT 25,
  get_amount NUMERIC NOT NULL DEFAULT 25,
  total_referred INTEGER NOT NULL DEFAULT 0,
  total_qualified INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own referral code"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public lookup function (returns minimal info for code validation at signup)
CREATE OR REPLACE FUNCTION public.lookup_referral_code(p_code TEXT)
RETURNS TABLE(code TEXT, owner_id UUID, give_amount NUMERIC, get_amount NUMERIC)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.code, rc.user_id AS owner_id, rc.give_amount, rc.get_amount
  FROM public.referral_codes rc
  WHERE rc.code = upper(trim(p_code))
    AND rc.is_active = TRUE
  LIMIT 1;
$$;

-- Referrals (tracks redemptions)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, qualified, rewarded, void
  qualifying_event TEXT, -- 'first_booking', 'first_listing', etc
  qualifying_entity_id UUID,
  qualified_at TIMESTAMPTZ,
  referrer_reward_amount NUMERIC,
  referrer_reward_status TEXT DEFAULT 'pending',
  referrer_reward_payout_id TEXT,
  referred_reward_amount NUMERIC,
  referred_reward_status TEXT DEFAULT 'pending',
  referred_reward_payout_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view referrals they are part of"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- Share events (every share action logged for virality intelligence)
CREATE TABLE public.share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  channel TEXT NOT NULL, -- facebook, x, instagram, sms, email, whatsapp, copy, native
  content_type TEXT NOT NULL, -- listing, profile, referral, search
  entity_id UUID,
  share_url TEXT,
  caption TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_events_user ON public.share_events(user_id);
CREATE INDEX idx_share_events_entity ON public.share_events(entity_id);
CREATE INDEX idx_share_events_channel ON public.share_events(channel);
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own share events"
  ON public.share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert share events"
  ON public.share_events FOR INSERT
  WITH CHECK (true);

-- AI-generated share templates (cached per listing/channel)
CREATE TABLE public.share_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID,
  channel TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'default', -- default, hype, professional, casual
  caption TEXT NOT NULL,
  hashtags TEXT[],
  cta_text TEXT,
  generated_by_model TEXT,
  performance_score NUMERIC DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_templates_listing_channel ON public.share_templates(listing_id, channel);
ALTER TABLE public.share_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read share templates"
  ON public.share_templates FOR SELECT
  USING (true);

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- Build base from first_name or username
  v_base := upper(regexp_replace(
    COALESCE(NULLIF(NEW.first_name, ''), NULLIF(NEW.username, ''), 'USER'),
    '[^A-Za-z0-9]', '', 'g'
  ));
  v_base := left(v_base, 6);
  IF length(v_base) < 3 THEN v_base := 'VENDI'; END IF;

  LOOP
    v_code := v_base || '-' || upper(substr(md5(random()::text || NEW.id::text || clock_timestamp()::text), 1, 4));
    SELECT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempts > 5;
    v_attempts := v_attempts + 1;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, v_code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code_for_user();

-- Backfill referral codes for existing users
INSERT INTO public.referral_codes (user_id, code)
SELECT 
  p.id,
  upper(left(regexp_replace(COALESCE(NULLIF(p.first_name, ''), NULLIF(p.username, ''), 'USER'), '[^A-Za-z0-9]', '', 'g'), 6))
    || '-' || upper(substr(md5(random()::text || p.id::text), 1, 4))
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = p.id)
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_referral_codes_updated
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_referrals_updated
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_share_templates_updated
BEFORE UPDATE ON public.share_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();