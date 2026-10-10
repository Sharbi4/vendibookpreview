CREATE OR REPLACE FUNCTION public.sync_verified_phone_to_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  -- Fill only a blank profile phone; never overwrite a number the member entered.
  update public.profiles set phone_number = new.phone_e164
   where id = new.user_id and coalesce(trim(phone_number), '') = '';
  return new;
end $$;
REVOKE ALL ON FUNCTION public.sync_verified_phone_to_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_verified_phone_to_profile ON public.signup_phone_verifications;
CREATE TRIGGER trg_sync_verified_phone_to_profile
AFTER INSERT OR UPDATE OF phone_e164 ON public.signup_phone_verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_verified_phone_to_profile();

-- Backfill existing verified members whose profile phone is blank.
UPDATE public.profiles p SET phone_number = v.phone_e164
  FROM public.signup_phone_verifications v
 WHERE v.user_id = p.id AND coalesce(trim(p.phone_number), '') = '';