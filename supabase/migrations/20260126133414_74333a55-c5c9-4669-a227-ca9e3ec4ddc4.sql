-- Create a function to get reviews with anonymized display names (no reviewer_id exposed)
CREATE OR REPLACE FUNCTION public.get_listing_reviews_safe(p_listing_id uuid)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  listing_id uuid,
  host_id uuid,
  rating integer,
  review_text text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  reviewer_display_name text,
  reviewer_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.booking_id,
    r.listing_id,
    r.host_id,
    r.rating,
    r.review_text,
    r.created_at,
    r.updated_at,
    -- Anonymized display name: FirstName L. format or fallbacks
    COALESCE(
      -- Try FirstName L. format
      CASE 
        WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL AND p.first_name != '' AND p.last_name != '' 
        THEN CONCAT(TRIM(p.first_name), ' ', UPPER(LEFT(TRIM(p.last_name), 1)), '.')
        -- Parse from full_name if available
        WHEN p.full_name IS NOT NULL AND p.full_name LIKE '% %'
        THEN CONCAT(
          SPLIT_PART(TRIM(p.full_name), ' ', 1), 
          ' ', 
          UPPER(LEFT(SPLIT_PART(TRIM(p.full_name), ' ', 2), 1)), 
          '.'
        )
        -- Single name from full_name
        WHEN p.full_name IS NOT NULL AND p.full_name != ''
        THEN TRIM(p.full_name)
        -- display_name fallback
        WHEN p.display_name IS NOT NULL AND p.display_name != ''
        THEN TRIM(p.display_name)
        ELSE 'Anonymous'
      END,
      'Anonymous'
    ) AS reviewer_display_name,
    p.avatar_url AS reviewer_avatar_url
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.listing_id = p_listing_id
  ORDER BY r.created_at DESC;
$$;