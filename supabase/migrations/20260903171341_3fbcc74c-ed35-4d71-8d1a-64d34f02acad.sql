CREATE TABLE public.freight_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  pickup_location text NOT NULL,
  delivery_location text NOT NULL,
  equipment_type text NOT NULL,
  year text,
  length_ft text,
  width_ft text,
  height_ft text,
  weight_lbs text,
  runs_and_drives text,
  pickup_date date,
  deliver_by_date date,
  notes text,
  source_page text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.freight_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freight_requests TO authenticated;
GRANT ALL ON public.freight_requests TO service_role;

ALTER TABLE public.freight_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a freight request"
  ON public.freight_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view freight requests"
  ON public.freight_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update freight requests"
  ON public.freight_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete freight requests"
  ON public.freight_requests FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_freight_requests_created_at ON public.freight_requests (created_at DESC);
CREATE INDEX idx_freight_requests_status ON public.freight_requests (status);

CREATE TRIGGER update_freight_requests_updated_at
  BEFORE UPDATE ON public.freight_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();