-- Add document review status to booking_requests for escrow hold during document review
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS document_review_status text DEFAULT 'not_required' 
CHECK (document_review_status IN ('not_required', 'pending_upload', 'pending_review', 'approved', 'rejected'));

-- Add column to track when documents were approved
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS documents_approved_at timestamptz;

-- Add column to track who approved the documents
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS documents_approved_by uuid;

-- Add rejection reason for documents
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS document_rejection_reason text;

-- Add index for faster queries on document review status
CREATE INDEX IF NOT EXISTS idx_booking_requests_document_review_status 
ON public.booking_requests(document_review_status) 
WHERE document_review_status IN ('pending_upload', 'pending_review');

-- Comment on the new columns
COMMENT ON COLUMN public.booking_requests.document_review_status IS 'Document review workflow: not_required, pending_upload, pending_review, approved, rejected';
COMMENT ON COLUMN public.booking_requests.documents_approved_at IS 'Timestamp when admin approved all documents';
COMMENT ON COLUMN public.booking_requests.documents_approved_by IS 'Admin user who approved the documents';
COMMENT ON COLUMN public.booking_requests.document_rejection_reason IS 'Reason provided if documents were rejected';