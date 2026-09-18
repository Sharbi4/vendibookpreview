CREATE TABLE IF NOT EXISTS public.signnow_templates (
  kind text PRIMARY KEY,
  signnow_template_id text NOT NULL,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signnow_templates TO service_role;

ALTER TABLE public.signnow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view signnow templates"
ON public.signnow_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.signnow_templates TO authenticated;