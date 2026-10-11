CREATE OR REPLACE FUNCTION public.guard_referral_codes_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean := (auth.uid() IS NULL) OR public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.give_amount := 25;
    NEW.get_amount := 25;
    NEW.total_referred := 0;
    NEW.total_qualified := 0;
    NEW.total_earned := 0;
  ELSE
    NEW.give_amount := OLD.give_amount;
    NEW.get_amount := OLD.get_amount;
    NEW.total_referred := OLD.total_referred;
    NEW.total_qualified := OLD.total_qualified;
    NEW.total_earned := OLD.total_earned;
    NEW.user_id := OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_referral_codes_financials() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_referral_codes_financials ON public.referral_codes;
CREATE TRIGGER trg_guard_referral_codes_financials
BEFORE INSERT OR UPDATE ON public.referral_codes
FOR EACH ROW EXECUTE FUNCTION public.guard_referral_codes_financials();