-- Update handle_new_user function to auto-generate username from full_name
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
BEGIN
  -- Create base username from full_name: lowercase, replace spaces with underscores, remove special chars
  base_username := COALESCE(
    regexp_replace(
      lower(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')),
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

  INSERT INTO public.profiles (id, email, full_name, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    generated_username,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$function$;