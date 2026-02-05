-- Add total_slots column to listings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'total_slots') THEN
        ALTER TABLE public.listings ADD COLUMN total_slots integer DEFAULT 1;
    END IF;
END $$;

-- Create slot_names column for named slots (e.g., "Spot A", "Spot B")
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'slot_names') THEN
        ALTER TABLE public.listings ADD COLUMN slot_names text[] DEFAULT NULL;
    END IF;
END $$;

-- Add slot selection to booking_requests
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'slot_number') THEN
        ALTER TABLE public.booking_requests ADD COLUMN slot_number integer DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'slot_name') THEN
        ALTER TABLE public.booking_requests ADD COLUMN slot_name text DEFAULT NULL;
    END IF;
END $$;

-- Update listing_category enum to include vendor_space (if vendor_lot exists, rename it)
DO $$
BEGIN
    -- Check if vendor_space already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'listing_category' AND e.enumlabel = 'vendor_space'
    ) THEN
        -- Check if vendor_lot exists
        IF EXISTS (
            SELECT 1 FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'listing_category' AND e.enumlabel = 'vendor_lot'
        ) THEN
            -- Add vendor_space first
            ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'vendor_space';
        END IF;
    END IF;
END $$;