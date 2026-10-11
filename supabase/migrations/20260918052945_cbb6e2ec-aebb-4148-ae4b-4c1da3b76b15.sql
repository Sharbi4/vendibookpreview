ALTER TABLE public.video_walkthrough_provider_rooms
  ADD COLUMN IF NOT EXISTS scheduled_starts_at timestamptz;
ALTER TABLE public.video_walkthrough_provider_rooms
  ALTER COLUMN room_url DROP NOT NULL;

ALTER TABLE public.video_walkthrough_events
  DROP CONSTRAINT IF EXISTS video_walkthrough_events_event_type_check;
ALTER TABLE public.video_walkthrough_events
  ADD CONSTRAINT video_walkthrough_events_event_type_check
  CHECK (event_type IN ('requested','scheduled','rescheduled','cancelled','buyer_joined','seller_joined','completed','no_show','access_granted','participant_left'));

CREATE UNIQUE INDEX IF NOT EXISTS video_walkthrough_events_join_dedupe
  ON public.video_walkthrough_events (walkthrough_id, actor_id, event_type, (metadata->>'meeting_session_id'))
  WHERE event_type IN ('buyer_joined','seller_joined') AND metadata ? 'meeting_session_id';