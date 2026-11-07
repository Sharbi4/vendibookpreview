CREATE TABLE public.guest_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow text NOT NULL CHECK (flow IN ('sale','rental')),
  listing_id uuid NOT NULL,
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 5 AND 200),
  total_price numeric,
  request_only boolean NOT NULL DEFAULT false,
  start_date date,
  end_date date,
  resume_path text,
  email_2h_sent_at timestamptz,
  email_24h_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, listing_id, flow)
);

GRANT SELECT ON public.guest_checkout_drafts TO authenticated;
GRANT ALL ON public.guest_checkout_drafts TO service_role;

ALTER TABLE public.guest_checkout_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view guest checkout drafts"
ON public.guest_checkout_drafts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX guest_checkout_drafts_sweep_idx
  ON public.guest_checkout_drafts (updated_at) WHERE completed_at IS NULL;

-- Financing is APPROVE only since the owner's 2026-11-05 switch.
ALTER TABLE public.financing_leads ALTER COLUMN provider SET DEFAULT 'approve';
UPDATE public.financing_leads SET provider = 'approve'
WHERE provider = 'equinox' AND created_at >= '2026-11-05T07:00:00Z';