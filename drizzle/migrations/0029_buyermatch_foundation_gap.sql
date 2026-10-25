-- Foundation gap: production already had buyermatch_settings/campaigns/reports from the earlier BuyerMatch migrations; this adds the missing imports/prospects/audit tables from 20261012230000_buyermatch_foundation.sql so the rentals update can apply.
CREATE TABLE public.buyermatch_imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 batch_key text NOT NULL CHECK(length(batch_key) BETWEEN 1 AND 100),
 records jsonb NOT NULL CHECK(jsonb_typeof(records)='array'),
 status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected')),
 submitted_by uuid NOT NULL REFERENCES auth.users(id),
 reviewed_by uuid REFERENCES auth.users(id),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 UNIQUE(campaign_id,batch_key)
);
-- Internal research only: never grant seller read access to these records.
CREATE TABLE public.buyermatch_prospects (
 campaign_id uuid NOT NULL REFERENCES public.buyermatch_campaigns(id),
 prospect_id text NOT NULL,
 record jsonb NOT NULL,
 source_import_id uuid NOT NULL REFERENCES public.buyermatch_imports(id),
 PRIMARY KEY(campaign_id,prospect_id)
);
CREATE TABLE public.buyermatch_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid REFERENCES public.buyermatch_campaigns(id),
 actor_id uuid REFERENCES auth.users(id),
 action text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buyermatch_reports ADD COLUMN source_import_id uuid REFERENCES public.buyermatch_imports(id) UNIQUE;
ALTER TABLE public.buyermatch_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyermatch_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_audit FROM anon,authenticated;
GRANT SELECT ON public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_audit TO authenticated;
CREATE POLICY buyermatch_import_admin ON public.buyermatch_imports FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_prospect_admin ON public.buyermatch_prospects FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
CREATE POLICY buyermatch_audit_admin ON public.buyermatch_audit FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin'));
GRANT ALL ON public.buyermatch_imports,public.buyermatch_prospects,public.buyermatch_audit TO service_role;