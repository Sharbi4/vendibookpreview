
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(p_limit int DEFAULT 10)
RETURNS TABLE (
  rank int,
  referrer_id uuid,
  display_name text,
  qualified_count bigint,
  is_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH month_start AS (
    SELECT date_trunc('month', now()) AS d
  ),
  agg AS (
    SELECT
      r.referrer_id,
      count(*)::bigint AS qualified_count
    FROM public.referrals r, month_start ms
    WHERE r.status IN ('qualified','approved','paid','rewarded')
      AND r.qualified_at IS NOT NULL
      AND r.qualified_at >= ms.d
    GROUP BY r.referrer_id
  ),
  ranked AS (
    SELECT
      agg.referrer_id,
      agg.qualified_count,
      rank() OVER (ORDER BY agg.qualified_count DESC, agg.referrer_id) AS rnk
    FROM agg
  )
  SELECT
    r.rnk::int AS rank,
    r.referrer_id,
    COALESCE(
      NULLIF(trim(split_part(coalesce(p.full_name,''), ' ', 1)), '') ||
      CASE
        WHEN split_part(coalesce(p.full_name,''), ' ', 2) <> ''
          THEN ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
        ELSE ''
      END,
      'Vendibook Host'
    ) AS display_name,
    r.qualified_count,
    (auth.uid() = r.referrer_id) AS is_me
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.referrer_id
  WHERE r.rnk <= greatest(p_limit, 1)
     OR r.referrer_id = auth.uid()
  ORDER BY r.rnk ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(int) TO anon, authenticated, service_role;
