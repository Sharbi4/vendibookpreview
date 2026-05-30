
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS featured_rental_id uuid,
  ADD COLUMN IF NOT EXISTS sale_listing_ids uuid[],
  ADD COLUMN IF NOT EXISTS used_fallback_listings boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_fallback_rental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rental_section_replaced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listings_section_replaced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS section_label_sale text,
  ADD COLUMN IF NOT EXISTS section_label_rental text,
  ADD COLUMN IF NOT EXISTS test_message_id text,
  ADD COLUMN IF NOT EXISTS automation_source text;

-- Add 'broadcast_failed' to the marketing_send_status enum if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'marketing_send_status' AND e.enumlabel = 'broadcast_failed'
  ) THEN
    ALTER TYPE public.marketing_send_status ADD VALUE 'broadcast_failed';
  END IF;
END $$;
