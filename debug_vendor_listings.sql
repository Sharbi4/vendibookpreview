-- Check vendor space listings
SELECT id, title, category, status, host_id, created_at 
FROM listings 
WHERE title LIKE '%Food Truck Park%' 
   OR title LIKE '%Brewery Patio%' 
   OR title LIKE '%Farmers Market%' 
   OR title LIKE '%Tech Campus%' 
   OR title LIKE '%Music Festival%' 
   OR title LIKE '%Wynwood%' 
ORDER BY created_at DESC 
LIMIT 10;

-- Update vendor_lot to vendor_space if needed
UPDATE listings 
SET category = 'vendor_space' 
WHERE category = 'vendor_lot' 
  AND (title LIKE '%Food Truck Park%' 
       OR title LIKE '%Brewery Patio%' 
       OR title LIKE '%Farmers Market%' 
       OR title LIKE '%Tech Campus%' 
       OR title LIKE '%Music Festival%' 
       OR title LIKE '%Wynwood%');

-- Check all vendor space listings after update
SELECT id, title, category, status, total_slots
FROM listings 
WHERE category = 'vendor_space' 
  AND status = 'published'
ORDER BY created_at DESC;