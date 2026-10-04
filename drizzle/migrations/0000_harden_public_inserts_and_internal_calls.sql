-- 1) Database triggers that call internal notification functions now send the scheduler secret.
DO $$
DECLARE fn text; def text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['notify_document_status_change','notify_sale_transaction_status_change','notify_booking_status_change','notify_new_conversation_message','notify_new_booking_message','notify_admin_profile_created','notify_admin_listing_published'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=fn LIMIT 1;
    IF def IS NOT NULL AND def !~ 'x-cron-secret' THEN
      def := regexp_replace(def, '''Content-Type''\s*,\s*''application/json''', '''Content-Type'', ''application/json'', ''x-cron-secret'', ''c1599d29c002d37e940a64bf669f19a4f0e4cf8cfe429725''', 'g');
      EXECUTE def;
    END IF;
  END LOOP;
END $$;

-- 2) Replace "anyone can insert anything" policies with constrained versions.
DROP POLICY IF EXISTS "Anyone can track events" ON public.analytics_events;
CREATE POLICY "Anyone can track events" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(event_name) BETWEEN 1 AND 120);

DROP POLICY IF EXISTS "Anyone can create asset requests" ON public.asset_requests;
CREATE POLICY "Anyone can create asset requests" ON public.asset_requests FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND coalesce(status,'new') = 'new'
    AND admin_notes IS NULL AND assigned_to IS NULL AND matched_listing_id IS NULL);

DROP POLICY IF EXISTS "Anyone can create availability alerts" ON public.availability_alerts;
CREATE POLICY "Anyone can create availability alerts" ON public.availability_alerts FOR INSERT TO anon, authenticated
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320 AND length(zip_code) <= 10
    AND notified_at IS NULL AND unsubscribed_at IS NULL);

DROP POLICY IF EXISTS "Public can insert blog share clicks" ON public.blog_share_clicks;
CREATE POLICY "Public can insert blog share clicks" ON public.blog_share_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (length(article_slug) BETWEEN 1 AND 200 AND length(source) <= 60);

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.blog_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.blog_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320);

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_submissions;
CREATE POLICY "Anyone can submit feedback" ON public.feedback_submissions FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND reviewed_at IS NULL AND reviewed_by IS NULL
    AND coalesce(length(message),0) <= 5000);

DROP POLICY IF EXISTS "Anyone can submit a freight request" ON public.freight_requests;
CREATE POLICY "Anyone can submit a freight request" ON public.freight_requests FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND status = 'new' AND admin_notes IS NULL
    AND quote_amount_cents IS NULL AND quoted_at IS NULL AND quoted_by IS NULL
    AND paypal_invoice_id IS NULL AND paypal_invoice_url IS NULL AND quote_sent_at IS NULL);

DROP POLICY IF EXISTS "Anyone can track views" ON public.listing_views;
CREATE POLICY "Anyone can track views" ON public.listing_views FOR INSERT TO anon, authenticated
  WITH CHECK ((viewer_id IS NULL OR viewer_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320 AND unsubscribed_at IS NULL);

DROP POLICY IF EXISTS "Anyone can insert share events" ON public.share_events;
CREATE POLICY "Anyone can insert share events" ON public.share_events FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(channel) <= 60 AND length(content_type) <= 60);

DROP POLICY IF EXISTS "Anyone can insert voice agent leads" ON public.voice_agent_leads;
CREATE POLICY "Anyone can insert voice agent leads" ON public.voice_agent_leads FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(summary) BETWEEN 1 AND 5000);

-- 3) Read-everything policies.
DROP POLICY IF EXISTS "Config readable by all" ON public.referral_program_config;
CREATE POLICY "Admins read referral config" ON public.referral_program_config FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read share templates" ON public.share_templates;
CREATE POLICY "Read templates for published listings" ON public.share_templates FOR SELECT TO anon, authenticated
  USING (listing_id IS NULL OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = share_templates.listing_id
    AND (l.status = 'published' OR l.host_id = auth.uid())));

DROP POLICY IF EXISTS "anyone reads concierge config" ON public.listing_concierge_config;
CREATE POLICY "anyone reads concierge config" ON public.listing_concierge_config FOR SELECT TO anon, authenticated
  USING (id = true);

-- 4) Storage: stop anyone from listing every file in public buckets (public links keep working).
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
CREATE POLICY "Owners can list their listing images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can view listing videos" ON storage.objects;
CREATE POLICY "Owners can list their listing videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public can read listing media" ON storage.objects;
CREATE POLICY "Owners can list their listing media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view all headers" ON storage.objects;
CREATE POLICY "Owners can list their headers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'headers' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Admins can list email assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'email-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can upload spotlight media" ON storage.objects;
CREATE POLICY "Anyone can upload spotlight media" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'spotlight-media' AND (storage.foldername(name))[1] = 'submissions'
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','heic','heif','gif'));