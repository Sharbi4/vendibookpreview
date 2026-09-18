DROP INDEX IF EXISTS public.signnow_templates_one_active_per_kind;

CREATE UNIQUE INDEX signnow_templates_one_active_per_kind_variant
  ON public.signnow_templates (
    kind,
    (CASE
       WHEN version LIKE '%-mobile' THEN 'mobile'
       WHEN version LIKE '%-space' THEN 'space'
       ELSE 'general'
     END)
  )
  WHERE status = 'active';