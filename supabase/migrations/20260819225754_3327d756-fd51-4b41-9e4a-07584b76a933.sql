CREATE TABLE IF NOT EXISTS public.permit_path_grandfathered (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'pre_gating_data',
  note text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.permit_path_grandfathered TO authenticated;
GRANT ALL ON public.permit_path_grandfathered TO service_role;

ALTER TABLE public.permit_path_grandfathered ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grandfathered access"
ON public.permit_path_grandfathered FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view grandfathered access"
ON public.permit_path_grandfathered FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_permit_path_grandfathered_updated_at
BEFORE UPDATE ON public.permit_path_grandfathered
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: every user who already has any PermitPath data keeps their access.
INSERT INTO public.permit_path_grandfathered (user_id, source, note)
SELECT DISTINCT u.user_id, 'pre_gating_data', 'Had PermitPath data when Basic/Plus gating shipped'
FROM (
  SELECT user_id FROM public.saved_permit_roadmaps
  UNION SELECT user_id FROM public.permit_items
  UNION SELECT user_id FROM public.permit_documents
  UNION SELECT user_id FROM public.permit_progress
) u
WHERE u.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permit_path_plus(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.host_subscriptions hs
      WHERE hs.user_id = _user_id
        AND hs.status IN ('active','trialing','past_due')
        AND (
          lower(coalesce(hs.tier,'')) LIKE 'permit_path_plus%'
          OR lower(coalesce(hs.tier,'')) IN ('pro','vendibook_pro','host_pro','premium','host_growth','host_operator')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.monetization_purchases mp
      JOIN public.monetization_products pr ON pr.id = mp.product_id
      WHERE mp.user_id = _user_id
        AND mp.status IN ('paid','fulfilled')
        AND pr.slug IN ('permit_path_plus_monthly','permit_path_plus')
    )
    OR EXISTS (
      SELECT 1 FROM public.permit_path_grandfathered g
      WHERE g.user_id = _user_id
    )
$$;

REVOKE EXECUTE ON FUNCTION public.has_permit_path_plus(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_permit_path_plus(uuid) TO authenticated, service_role;