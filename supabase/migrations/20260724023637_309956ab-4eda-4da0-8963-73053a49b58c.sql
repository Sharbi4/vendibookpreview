
-- Backend guard: prevent QA/Demo/Test/E2E/Smoke titled listings from ever being published.
CREATE OR REPLACE FUNCTION public.enforce_no_test_listing_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  test_pattern TEXT := '^(demo|qa[ _-]|test |e2e |smoke )';
BEGIN
  IF NEW.status = 'published' AND NEW.title IS NOT NULL
     AND NEW.title ~* test_pattern THEN
    RAISE EXCEPTION 'Test/QA titled listings cannot be published (title=%).', NEW.title
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_no_test_listing_publish ON public.listings;
CREATE TRIGGER trg_enforce_no_test_listing_publish
BEFORE INSERT OR UPDATE OF status, title ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_no_test_listing_publish();

-- Backend feed view: what the homepage/browse pages should read from.
-- Excludes test-titled rows regardless of status.
CREATE OR REPLACE VIEW public.public_listings
WITH (security_invoker = on) AS
SELECT *
FROM public.listings
WHERE status = 'published'
  AND (title IS NULL OR title !~* '^(demo|qa[ _-]|test |e2e |smoke )');

GRANT SELECT ON public.public_listings TO anon, authenticated;

-- Sweep: archive any currently published test-titled listings so DB matches the rule.
UPDATE public.listings
SET status = 'archived'
WHERE status = 'published'
  AND title ~* '^(demo|qa[ _-]|test |e2e |smoke )';
