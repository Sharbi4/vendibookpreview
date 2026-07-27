
-- 1) Update handle_new_user to also insert the user's role (SECURITY DEFINER bypasses RLS)
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
  v_role_text TEXT;
  v_role public.app_role;
BEGIN
  v_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');

  IF v_first_name != '' OR v_last_name != '' THEN
    v_full_name := TRIM(CONCAT(v_first_name, ' ', v_last_name));
  ELSE
    v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  END IF;

  base_username := COALESCE(
    regexp_replace(lower(v_full_name), '[^a-z0-9_]', '_', 'g'),
    'user'
  );
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);
  IF length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  base_username := left(base_username, 20);

  suffix := floor(random() * 9000 + 1000)::INTEGER;
  generated_username := base_username || '_' || suffix::TEXT;
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
  )
  ON CONFLICT (id) DO NOTHING;

  -- Resolve requested role from user metadata; default to 'host'
  v_role_text := lower(COALESCE(NEW.raw_user_meta_data ->> 'role', 'host'));
  BEGIN
    v_role := v_role_text::public.app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'host'::public.app_role;
  END;

  -- Always ensure a 'host' role exists (host is the default; shopper is additive)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'host'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If the user explicitly picked a non-host role at signup, add that too
  IF v_role IS DISTINCT FROM 'host'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Backfill: give 'host' role to every existing profile that doesn't already have it
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'host'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = p.id AND r.role = 'host'::public.app_role
)
ON CONFLICT (user_id, role) DO NOTHING;
