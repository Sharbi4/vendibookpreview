-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update the handle_new_user function to store first_name, last_name, and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  generated_username TEXT;
  username_exists BOOLEAN;
  suffix INTEGER;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
BEGIN
  -- Extract first and last name from metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  
  -- Build full_name from first + last, or use legacy full_name if provided
  IF v_first_name != '' OR v_last_name != '' THEN
    v_full_name := TRIM(CONCAT(v_first_name, ' ', v_last_name));
  ELSE
    v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  END IF;
  
  -- Create base username from full_name: lowercase, replace spaces with underscores, remove special chars
  base_username := COALESCE(
    regexp_replace(
      lower(v_full_name),
      '[^a-z0-9_]', '_', 'g'
    ),
    'user'
  );
  
  -- Clean up multiple underscores and trim
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);
  
  -- Ensure minimum length
  IF length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  
  -- Truncate to leave room for suffix
  base_username := left(base_username, 20);
  
  -- Start with base username + random suffix
  suffix := floor(random() * 9000 + 1000)::INTEGER;
  generated_username := base_username || '_' || suffix::TEXT;
  
  -- Check if username exists and regenerate if needed
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
  
  WHILE username_exists LOOP
    suffix := floor(random() * 9000 + 1000)::INTEGER;
    generated_username := base_username || '_' || suffix::TEXT;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone_number, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    NULLIF(v_first_name, ''),
    NULLIF(v_last_name, ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone_number', ''),
    generated_username,
    v_full_name
  );
  RETURN NEW;
END;
$function$;