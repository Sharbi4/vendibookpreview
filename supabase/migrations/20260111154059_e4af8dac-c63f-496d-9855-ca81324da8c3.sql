-- Create enum for document types
CREATE TYPE document_type AS ENUM (
  'drivers_license',
  'business_license',
  'food_handler_certificate',
  'safeserve_certification',
  'health_department_permit',
  'commercial_liability_insurance',
  'vehicle_insurance',
  'certificate_of_insurance',
  'work_history_proof',
  'prior_experience_proof'
);

-- Create enum for deadline types
CREATE TYPE document_deadline_type AS ENUM (
  'before_booking_request',
  'before_approval',
  'after_approval_deadline'
);

-- Create enum for document status
CREATE TYPE document_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Table for listing-level document requirements (what hosts require)
CREATE TABLE public.listing_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  deadline_type document_deadline_type NOT NULL DEFAULT 'before_approval',
  deadline_offset_hours INTEGER, -- Only used when deadline_type = 'after_approval_deadline'
  description TEXT, -- Custom description shown to renters
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, document_type)
);

-- Table for actual uploaded documents per booking
CREATE TABLE public.booking_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  UNIQUE(booking_id, document_type)
);

-- Enable RLS
ALTER TABLE public.listing_required_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listing_required_documents

-- Anyone can view requirements for published listings
CREATE POLICY "Anyone can view document requirements for published listings"
ON public.listing_required_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM listings
  WHERE listings.id = listing_required_documents.listing_id
  AND listings.status = 'published'
));

-- Hosts can view their own listing requirements
CREATE POLICY "Hosts can view their listing document requirements"
ON public.listing_required_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM listings
  WHERE listings.id = listing_required_documents.listing_id
  AND listings.host_id = auth.uid()
));

-- Hosts can create document requirements
CREATE POLICY "Hosts can create document requirements"
ON public.listing_required_documents
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM listings
  WHERE listings.id = listing_required_documents.listing_id
  AND listings.host_id = auth.uid()
));

-- Hosts can update their document requirements
CREATE POLICY "Hosts can update document requirements"
ON public.listing_required_documents
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM listings
  WHERE listings.id = listing_required_documents.listing_id
  AND listings.host_id = auth.uid()
));

-- Hosts can delete their document requirements
CREATE POLICY "Hosts can delete document requirements"
ON public.listing_required_documents
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM listings
  WHERE listings.id = listing_required_documents.listing_id
  AND listings.host_id = auth.uid()
));

-- RLS Policies for booking_documents

-- Renters can view their own uploaded documents
CREATE POLICY "Renters can view their booking documents"
ON public.booking_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM booking_requests
  WHERE booking_requests.id = booking_documents.booking_id
  AND booking_requests.shopper_id = auth.uid()
));

-- Hosts can view documents for their bookings
CREATE POLICY "Hosts can view booking documents for their listings"
ON public.booking_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM booking_requests
  WHERE booking_requests.id = booking_documents.booking_id
  AND booking_requests.host_id = auth.uid()
));

-- Renters can upload documents to their bookings
CREATE POLICY "Renters can upload documents"
ON public.booking_documents
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM booking_requests
  WHERE booking_requests.id = booking_documents.booking_id
  AND booking_requests.shopper_id = auth.uid()
));

-- Renters can update (re-upload) their pending documents
CREATE POLICY "Renters can update pending documents"
ON public.booking_documents
FOR UPDATE
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM booking_requests
    WHERE booking_requests.id = booking_documents.booking_id
    AND booking_requests.shopper_id = auth.uid()
  )
);

-- Hosts can update document status (approve/reject)
CREATE POLICY "Hosts can review documents"
ON public.booking_documents
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM booking_requests
  WHERE booking_requests.id = booking_documents.booking_id
  AND booking_requests.host_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_listing_required_documents_updated_at
BEFORE UPDATE ON public.listing_required_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_listing_required_documents_listing ON public.listing_required_documents(listing_id);
CREATE INDEX idx_booking_documents_booking ON public.booking_documents(booking_id);
CREATE INDEX idx_booking_documents_status ON public.booking_documents(status);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-documents', 'booking-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking-documents bucket
CREATE POLICY "Renters can upload their booking documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'booking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'booking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hosts can view renter documents for their bookings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.host_id = auth.uid()
    AND (storage.foldername(name))[1] = br.shopper_id::text
  )
);