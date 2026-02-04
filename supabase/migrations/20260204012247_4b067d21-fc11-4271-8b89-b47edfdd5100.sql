-- Add subcategory column to listings table
ALTER TABLE listings 
ADD COLUMN subcategory text;

-- Add index for filtering performance
CREATE INDEX idx_listings_subcategory ON listings(subcategory);