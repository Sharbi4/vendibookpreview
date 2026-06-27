
-- =========================================================
-- 1) asset_requests: strip PII from public listing via a view
-- =========================================================

DROP POLICY IF EXISTS "Anyone can view public wanted requests" ON public.asset_requests;

CREATE OR REPLACE VIEW public.asset_requests_public
WITH (security_invoker = on) AS
SELECT
  id,
  title,
  asset_type,
  city,
  state,
  budget_min,
  budget_max,
  start_date,
  end_date,
  notes,
  created_at,
  is_public
FROM public.asset_requests
WHERE is_public = true;

GRANT SELECT ON public.asset_requests_public TO anon, authenticated;

-- Base table still readable by owners and admins via the remaining policies
-- ("Users can view their own asset requests", "Admins can view all asset requests").

-- =========================================================
-- 2) contest_winners: remove public read access
-- =========================================================

DROP POLICY IF EXISTS "Anyone can view winners" ON public.contest_winners;
REVOKE SELECT ON public.contest_winners FROM anon;

-- Remaining policies: "Users can view their own wins" + "Admins can manage winners"
-- which already cover the legitimate access paths.
