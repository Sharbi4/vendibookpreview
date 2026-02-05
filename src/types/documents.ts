import { ListingCategory } from './listing';

// Document types enum matching database
export type DocumentType =
  | 'drivers_license'
  | 'business_license'
  | 'food_handler_certificate'
  | 'safeserve_certification'
  | 'health_department_permit'
  | 'commercial_liability_insurance'
  | 'vehicle_insurance'
  | 'certificate_of_insurance'
  | 'work_history_proof'
  | 'prior_experience_proof';

export type DocumentDeadlineType =
  | 'before_booking_request'
  | 'before_approval'
  | 'after_approval_deadline';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// Human-readable labels for document types
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  drivers_license: "Driver's License / Government ID",
  business_license: 'Business License',
  food_handler_certificate: "Food Handler's Certificate",
  safeserve_certification: 'SafeServe / Food Safety Certification',
  health_department_permit: 'Health Department Permit',
  commercial_liability_insurance: 'Commercial Liability Insurance',
  vehicle_insurance: 'Vehicle Insurance',
  certificate_of_insurance: 'Certificate of Insurance (COI)',
  work_history_proof: 'Relevant Work History Proof',
  prior_experience_proof: 'Prior Event/Kitchen Experience',
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  drivers_license: 'Valid government-issued photo ID',
  business_license: 'Current business license for food service operations',
  food_handler_certificate: 'Proof of food handling certification',
  safeserve_certification: 'SafeServe or equivalent food safety certification',
  health_department_permit: 'Local health department operating permit',
  commercial_liability_insurance: 'General liability insurance for business operations',
  vehicle_insurance: 'Vehicle insurance (for mobile units)',
  certificate_of_insurance: 'Certificate showing active insurance coverage',
  work_history_proof: 'Resume or proof of relevant work experience',
  prior_experience_proof: 'Documentation of prior event or kitchen experience',
};

export const DEADLINE_TYPE_LABELS: Record<DocumentDeadlineType, string> = {
  before_booking_request: 'Before Booking Request',
  before_approval: 'Before Host Approval',
  after_approval_deadline: 'After Approval (by deadline)',
};

export const DEADLINE_TYPE_DESCRIPTIONS: Record<DocumentDeadlineType, string> = {
  before_booking_request: 'Renter must upload documents before submitting booking request',
  before_approval: 'Renter can request booking, but host cannot approve until docs are uploaded',
  after_approval_deadline: 'Documents must be submitted by a specific deadline after approval',
};

// Document groups for organizing in UI
export interface DocumentGroup {
  label: string;
  documents: DocumentType[];
}

export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    label: 'Identity & Legal',
    documents: ['drivers_license', 'business_license'],
  },
  {
    label: 'Food Safety & Compliance',
    documents: ['food_handler_certificate', 'safeserve_certification', 'health_department_permit'],
  },
  {
    label: 'Insurance',
    documents: ['commercial_liability_insurance', 'vehicle_insurance', 'certificate_of_insurance'],
  },
  {
    label: 'Experience & Credentials',
    documents: ['work_history_proof', 'prior_experience_proof'],
  },
];

// Default documents by category
export const DEFAULT_DOCUMENTS_BY_CATEGORY: Record<ListingCategory, DocumentType[]> = {
  food_truck: [
    'drivers_license',
    'commercial_liability_insurance',
    'food_handler_certificate',
    'work_history_proof',
  ],
  food_trailer: [
    'drivers_license',
    'commercial_liability_insurance',
    'food_handler_certificate',
    'work_history_proof',
  ],
  ghost_kitchen: [
    'food_handler_certificate',
    'business_license',
    'health_department_permit',
  ],
  vendor_space: [
    'business_license',
    'commercial_liability_insurance',
    'work_history_proof',
  ],
};

// Interface for a required document setting
export interface RequiredDocumentSetting {
  document_type: DocumentType;
  is_required: boolean;
  deadline_type: DocumentDeadlineType;
  deadline_offset_hours?: number;
  description?: string;
}

// Interface for an uploaded document
export interface BookingDocument {
  id: string;
  booking_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  status: DocumentStatus;
  rejection_reason?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// Interface for listing required documents (from database)
export interface ListingRequiredDocument {
  id: string;
  listing_id: string;
  document_type: DocumentType;
  is_required: boolean;
  deadline_type: DocumentDeadlineType;
  deadline_offset_hours?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}
