-- Migration: Rename vendor_lot to vendor_space and add multi-slot capacity
-- Run this in your Supabase SQL Editor before deploying the code changes

-- Step 1: Update the listing_category enum to rename vendor_lot to vendor_space
-- Note: PostgreSQL doesn't support renaming enum values directly, so we need to:
-- Option A: If you have no existing vendor_lot listings, just add the new value
-- Option B: If you have existing vendor_lot listings, update them first

-- Check if vendor_space already exists in the enum
DO $$
BEGIN
    -- Add vendor_space to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'vendor_space' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_category')
    ) THEN
        ALTER TYPE listing_category ADD VALUE 'vendor_space';
    END IF;
END
$$;

-- Step 2: Update existing vendor_lot listings to vendor_space (if any exist)
-- This needs to be run after the enum value is added
UPDATE public.listings 
SET category = 'vendor_space' 
WHERE category = 'vendor_lot';

-- Step 3: Add total_slots column to listings table for multi-slot capacity
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 1;

-- Add constraint to ensure total_slots is at least 1
ALTER TABLE public.listings 
ADD CONSTRAINT listings_total_slots_positive CHECK (total_slots >= 1);

-- Step 4: Add slots_requested column to booking_requests table
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS slots_requested INTEGER DEFAULT 1;

-- Add constraint to ensure slots_requested is at least 1
ALTER TABLE public.booking_requests 
ADD CONSTRAINT booking_requests_slots_requested_positive CHECK (slots_requested >= 1);

-- Step 5: Create index for efficient capacity queries on vendor spaces
CREATE INDEX IF NOT EXISTS idx_listings_vendor_space_slots 
ON public.listings (category, total_slots) 
WHERE category = 'vendor_space';

-- Step 6: Create index for efficient slot availability queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_slots 
ON public.booking_requests (listing_id, start_date, end_date, slots_requested) 
WHERE status IN ('approved', 'pending');

-- Optional: Remove the old vendor_lot value from enum (only if no longer used)
-- Note: PostgreSQL doesn't support removing enum values directly
-- You would need to recreate the enum type if you want to remove it completely
-- For backward compatibility, we leave vendor_lot in the enum but unused

COMMENT ON COLUMN public.listings.total_slots IS 'Total number of vendor slots available (for Vendor Space listings). Default 1 for single-slot listings.';
COMMENT ON COLUMN public.booking_requests.slots_requested IS 'Number of slots requested in this booking (for Vendor Space listings). Default 1.';
