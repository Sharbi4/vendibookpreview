-- Add video_urls column to listings table for video uploads
ALTER TABLE public.listings 
ADD COLUMN video_urls text[] DEFAULT ARRAY[]::text[];

-- Add comment for documentation
COMMENT ON COLUMN public.listings.video_urls IS 'Array of video URLs uploaded for the listing';