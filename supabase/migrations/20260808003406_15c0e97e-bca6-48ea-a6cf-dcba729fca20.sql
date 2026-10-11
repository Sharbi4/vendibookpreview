DELETE FROM public.listings
WHERE host_id IN (
  SELECT id FROM public.profiles
  WHERE lower(email) IN (
    'atlasmom421@gmail.com',
    'ellemh13@gmail.com',
    'darlingsherla@gmail.com',
    'ellemh1313@gmail.com',
    'shawnnaharbin@vendibook.com'
  )
)
AND NOT EXISTS (
  SELECT 1 FROM public.protected_sales ps WHERE ps.listing_id = public.listings.id
);