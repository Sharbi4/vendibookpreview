ALTER TABLE public.analytics_events DROP CONSTRAINT analytics_events_listing_id_fkey,
  ADD CONSTRAINT analytics_events_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;

ALTER TABLE public.risk_flags DROP CONSTRAINT risk_flags_listing_id_fkey,
  ADD CONSTRAINT risk_flags_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;

ALTER TABLE public.contest_entries DROP CONSTRAINT contest_entries_listing_id_fkey,
  ADD CONSTRAINT contest_entries_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;