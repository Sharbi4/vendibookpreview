ALTER TABLE public.sms_consent_events DROP CONSTRAINT sms_consent_events_source_check;
ALTER TABLE public.sms_consent_events ADD CONSTRAINT sms_consent_events_source_check
  CHECK (source = ANY (ARRAY['signup','booking','listing','settings','sms_page','keyword','support','provider_webhook','system','web_form']));