-- ============================================
-- OVERBOOKING PREVENTION: Server-side validation
-- ============================================

-- Function to check booking availability with full conflict detection
CREATE OR REPLACE FUNCTION public.check_booking_availability(
  p_listing_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_is_hourly_booking BOOLEAN DEFAULT FALSE,
  p_hourly_slots JSONB DEFAULT NULL,
  p_slot_number INTEGER DEFAULT NULL,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_total_slots INTEGER;
  v_current_date DATE;
  v_slots_booked INTEGER;
  v_day_entry JSONB;
  v_hour_value TEXT;
  v_hour_count INTEGER;
  v_blocked_exists BOOLEAN;
BEGIN
  -- Fetch listing capacity
  SELECT total_slots, hourly_enabled, daily_enabled
  INTO v_listing
  FROM public.listings WHERE id = p_listing_id;
  
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('available', FALSE, 'error', 'Listing not found');
  END IF;
  
  v_total_slots := COALESCE(v_listing.total_slots, 1);
  
  -- Check for blocked dates first
  SELECT EXISTS (
    SELECT 1 FROM public.listing_blocked_dates
    WHERE listing_id = p_listing_id
      AND blocked_date >= p_start_date
      AND blocked_date <= p_end_date
  ) INTO v_blocked_exists;
  
  IF v_blocked_exists AND NOT p_is_hourly_booking THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'error', 'Some dates in your selection are blocked by the host'
    );
  END IF;
  
  -- For specific slot bookings, check that slot only
  IF p_slot_number IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.booking_requests
      WHERE listing_id = p_listing_id
        AND slot_number = p_slot_number
        AND status IN ('pending', 'approved')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND NOT (end_date < p_start_date OR start_date > p_end_date)
    ) THEN
      RETURN jsonb_build_object(
        'available', FALSE,
        'error', format('Slot %s is already booked for these dates', p_slot_number)
      );
    END IF;
    -- Slot-specific booking passed check
    RETURN jsonb_build_object('available', TRUE);
  END IF;
  
  -- For daily bookings without specific slot, check total capacity per day
  IF NOT COALESCE(p_is_hourly_booking, FALSE) THEN
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
      -- Count bookings that overlap this date
      SELECT COALESCE(SUM(
        CASE 
          WHEN slot_number IS NOT NULL THEN 1
          ELSE 1
        END
      ), 0) INTO v_slots_booked
      FROM public.booking_requests
      WHERE listing_id = p_listing_id
        AND status IN ('pending', 'approved')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND COALESCE(is_hourly_booking, FALSE) = FALSE
        AND start_date <= v_current_date
        AND end_date >= v_current_date;
      
      IF v_slots_booked >= v_total_slots THEN
        RETURN jsonb_build_object(
          'available', FALSE,
          'error', format('No availability for %s - all %s slots are booked', v_current_date, v_total_slots)
        );
      END IF;
      v_current_date := v_current_date + 1;
    END LOOP;
    
    RETURN jsonb_build_object('available', TRUE);
  END IF;
  
  -- For hourly bookings, check each hour in hourly_slots
  IF COALESCE(p_is_hourly_booking, FALSE) AND p_hourly_slots IS NOT NULL THEN
    FOR v_day_entry IN SELECT * FROM jsonb_array_elements(p_hourly_slots)
    LOOP
      -- Check if there's a full-day booking blocking this date
      IF EXISTS (
        SELECT 1 FROM public.booking_requests
        WHERE listing_id = p_listing_id
          AND status IN ('pending', 'approved')
          AND COALESCE(is_hourly_booking, FALSE) = FALSE
          AND start_date <= (v_day_entry->>'date')::DATE
          AND end_date >= (v_day_entry->>'date')::DATE
          AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      ) THEN
        RETURN jsonb_build_object(
          'available', FALSE,
          'error', format('Date %s has a full-day booking and cannot accept hourly bookings', v_day_entry->>'date')
        );
      END IF;
      
      -- Check each hour for capacity
      FOR v_hour_value IN SELECT * FROM jsonb_array_elements_text(v_day_entry->'slots')
      LOOP
        -- Count existing hourly bookings for this specific hour
        SELECT COUNT(*) INTO v_hour_count
        FROM public.booking_requests br,
             jsonb_array_elements(br.hourly_slots) AS slot_entry,
             jsonb_array_elements_text(slot_entry->'slots') AS booked_hour
        WHERE br.listing_id = p_listing_id
          AND br.status IN ('pending', 'approved')
          AND COALESCE(br.is_hourly_booking, FALSE) = TRUE
          AND (p_exclude_booking_id IS NULL OR br.id != p_exclude_booking_id)
          AND slot_entry->>'date' = v_day_entry->>'date'
          AND booked_hour = v_hour_value;
        
        IF v_hour_count >= v_total_slots THEN
          RETURN jsonb_build_object(
            'available', FALSE,
            'error', format('Time slot %s on %s is fully booked', v_hour_value, v_day_entry->>'date')
          );
        END IF;
      END LOOP;
    END LOOP;
    
    RETURN jsonb_build_object('available', TRUE);
  END IF;
  
  -- Default: available
  RETURN jsonb_build_object('available', TRUE);
END;
$$;

-- Trigger function to validate booking before insert
CREATE OR REPLACE FUNCTION public.validate_booking_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Skip validation for cancelled or declined bookings
  IF NEW.status IN ('cancelled', 'declined') THEN
    RETURN NEW;
  END IF;
  
  v_result := public.check_booking_availability(
    NEW.listing_id,
    NEW.start_date,
    NEW.end_date,
    COALESCE(NEW.is_hourly_booking, FALSE),
    NEW.hourly_slots,
    NEW.slot_number,
    -- For updates, exclude the current booking from the check
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
  );
  
  IF NOT (v_result->>'available')::BOOLEAN THEN
    RAISE EXCEPTION 'Booking conflict: %', v_result->>'error';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS check_booking_conflicts ON public.booking_requests;
CREATE TRIGGER check_booking_conflicts
BEFORE INSERT OR UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_availability();

-- Create partial unique index to prevent exact duplicate slot bookings
-- (This is a backup constraint in addition to the trigger)
DROP INDEX IF EXISTS idx_unique_slot_booking;
CREATE UNIQUE INDEX idx_unique_slot_booking
ON public.booking_requests (listing_id, slot_number, start_date, end_date)
WHERE status IN ('pending', 'approved') 
  AND slot_number IS NOT NULL;