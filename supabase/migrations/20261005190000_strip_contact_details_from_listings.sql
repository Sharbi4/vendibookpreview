-- Owner decision 2026-10-05: emails and phone numbers are removed from public
-- listing text automatically, instead of emailing sellers to take them out.
-- Buyers reach sellers through Vendibook messages, which are risk-scanned.
--
-- Applies to title, description, included_items and photos_exclusions_note on
-- every insert and update (including a draft being published). Pickup, access
-- and return instructions are left alone: they are logistics for a confirmed
-- booking. Links and payment-app names stay masked at display time by
-- _shared/contactPatterns.ts (CollapsibleDescription).
--
-- Patterns mirror supabase/functions/_shared/contactPatterns.ts (email,
-- "(at)/(dot)" obfuscation, US-shaped phone with digit boundaries so years,
-- prices and VINs never match), widened to strip an international "+NN" prefix.
-- Every removal is logged in listing_contact_redactions (admin/service only).

CREATE TABLE IF NOT EXISTS public.listing_contact_redactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  host_id uuid,
  field text NOT NULL,
  kinds text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_contact_redactions ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role and SQL admins can read or write.
CREATE INDEX IF NOT EXISTS listing_contact_redactions_listing_idx
  ON public.listing_contact_redactions (listing_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.strip_contact_details(t text, OUT cleaned text, OUT kinds text[])
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  email_re constant text := '[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(?:\s*\.\s*[a-z0-9-]+)+';
  obf_re   constant text := '[a-z0-9._%+-]+\s*(?:\(at\)|\[at\]|\sat\s)\s*[a-z0-9-]+\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}';
  phone_re constant text := '(?<![0-9])(?:\+[0-9]{1,3}[\s.-]?|1[\s.-]?)?(?:\([0-9]{3}\)|[0-9]{3})[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}(?![0-9])';
BEGIN
  cleaned := t;
  kinds := '{}';
  IF t IS NULL THEN
    RETURN;
  END IF;
  IF cleaned ~* email_re OR cleaned ~* obf_re THEN
    kinds := array_append(kinds, 'email');
    cleaned := regexp_replace(regexp_replace(cleaned, email_re, '', 'gi'), obf_re, '', 'gi');
  END IF;
  IF cleaned ~ phone_re THEN
    kinds := array_append(kinds, 'phone');
    cleaned := regexp_replace(cleaned, phone_re, '', 'g');
  END IF;
  IF cardinality(kinds) > 0 THEN
    -- Tidy the gaps the removal leaves behind; untouched text is returned as-is.
    cleaned := regexp_replace(cleaned, '[ \t]{2,}', ' ', 'g');
    cleaned := regexp_replace(cleaned, '[ \t]+(\n|$)', '\1', 'g');
  END IF;
END
$fn$;

COMMENT ON FUNCTION public.strip_contact_details(text) IS
  'Removes emails and phone numbers from listing text. Returns the cleaned text and which kinds were removed. Owner decision 2026-10-05.';

CREATE OR REPLACE FUNCTION public.listings_strip_contact_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
BEGIN
  -- QA/test fixtures carry numeric run ids in their titles and can never publish.
  IF NEW.title IS NOT NULL AND NEW.title !~* '^(qa|test|demo|e2e|smoke|sandbox)\M' THEN
    SELECT * INTO r FROM public.strip_contact_details(NEW.title);
    IF cardinality(r.kinds) > 0 THEN
      NEW.title := coalesce(nullif(btrim(r.cleaned), ''), 'Untitled listing');
      INSERT INTO public.listing_contact_redactions (listing_id, host_id, field, kinds)
      VALUES (NEW.id, NEW.host_id, 'title', r.kinds);
    END IF;
  END IF;

  SELECT * INTO r FROM public.strip_contact_details(NEW.description);
  IF cardinality(r.kinds) > 0 THEN
    NEW.description := r.cleaned;
    INSERT INTO public.listing_contact_redactions (listing_id, host_id, field, kinds)
    VALUES (NEW.id, NEW.host_id, 'description', r.kinds);
  END IF;

  SELECT * INTO r FROM public.strip_contact_details(NEW.included_items);
  IF cardinality(r.kinds) > 0 THEN
    NEW.included_items := r.cleaned;
    INSERT INTO public.listing_contact_redactions (listing_id, host_id, field, kinds)
    VALUES (NEW.id, NEW.host_id, 'included_items', r.kinds);
  END IF;

  SELECT * INTO r FROM public.strip_contact_details(NEW.photos_exclusions_note);
  IF cardinality(r.kinds) > 0 THEN
    NEW.photos_exclusions_note := r.cleaned;
    INSERT INTO public.listing_contact_redactions (listing_id, host_id, field, kinds)
    VALUES (NEW.id, NEW.host_id, 'photos_exclusions_note', r.kinds);
  END IF;

  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION public.listings_strip_contact_details() IS
  'BEFORE INSERT/UPDATE on listings: strips emails and phone numbers from public text and logs each removal. Owner decision 2026-10-05.';

-- "a00_" so it runs before the other BEFORE triggers (they fire in name order),
-- so publish checks and anything else see the cleaned text.
DROP TRIGGER IF EXISTS a00_strip_contact_details ON public.listings;
CREATE TRIGGER a00_strip_contact_details
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_strip_contact_details();

-- Clean live listings now. Drafts are cleaned by the trigger when they are saved
-- or published, so their updated_at (which drives draft reminders) is untouched.
UPDATE public.listings
   SET description = description
 WHERE status = 'published'
   AND deleted_at IS NULL
   AND (
     cardinality((public.strip_contact_details(title)).kinds) > 0
     OR cardinality((public.strip_contact_details(description)).kinds) > 0
     OR cardinality((public.strip_contact_details(included_items)).kinds) > 0
     OR cardinality((public.strip_contact_details(photos_exclusions_note)).kinds) > 0
   );
