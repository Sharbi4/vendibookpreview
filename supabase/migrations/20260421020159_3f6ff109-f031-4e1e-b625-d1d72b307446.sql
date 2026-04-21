DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='quiet_hours_start') THEN
    ALTER TABLE public.profiles ADD COLUMN quiet_hours_start time DEFAULT '21:00:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='quiet_hours_end') THEN
    ALTER TABLE public.profiles ADD COLUMN quiet_hours_end time DEFAULT '08:00:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='quiet_hours_timezone') THEN
    ALTER TABLE public.profiles ADD COLUMN quiet_hours_timezone text DEFAULT 'America/Los_Angeles';
  END IF;
END $$;