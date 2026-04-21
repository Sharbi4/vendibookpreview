-- SMS verification codes
CREATE TABLE public.sms_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_verification_codes_user ON public.sms_verification_codes(user_id, created_at DESC);

ALTER TABLE public.sms_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification codes"
ON public.sms_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification codes"
ON public.sms_verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Atomic referral counter
CREATE OR REPLACE FUNCTION public.increment_referral_counter(p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_codes
  SET total_referred = COALESCE(total_referred, 0) + 1
  WHERE user_id = p_owner_id;
END;
$$;