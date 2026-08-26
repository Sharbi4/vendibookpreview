/**
 * Shared, listing-configurable document + insurance requirement logic.
 *
 * Hosts configure zero, one, or many requirements per listing. Nothing here
 * assumes that a rental needs insurance — every requirement (including
 * insurance) is opt-in and carries its own deadline rule.
 *
 * Blocking rules (deliberately conservative so Instant Book never breaks):
 *  - `before_booking_request` → blocks submitting the request AND blocks
 *    instant-book confirmation.
 *  - `before_approval` → blocks the host's approval on request-to-book.
 *    On instant book there is no approval step, so it behaves as
 *    "due before pickup" and never blocks confirmation.
 *  - `after_approval_deadline` → never blocks; surfaces a due date instead.
 *
 * Optional requirements (`is_required = false`) never block anything.
 */

export type RequirementDeadline =
  | 'before_booking_request'
  | 'before_approval'
  | 'after_approval_deadline';

export type UploadStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'waived';

export type RequirementStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waived';

/** Host-authored insurance detail. Nothing is a platform-wide rule. */
export interface InsuranceRequirementConfig {
  insurance_required?: boolean;
  /** Host-specified minimum general liability, in whole dollars. */
  minimum_general_liability?: number | null;
  additional_insured_required?: boolean;
  coi_required?: boolean;
  /** Coverage must be active for the full booking window. */
  must_span_booking_dates?: boolean;
  instructions?: string | null;
}

export interface RequirementConfig {
  insurance?: InsuranceRequirementConfig;
  /**
   * When true (default) a freshly uploaded document satisfies a
   * pre-booking blocker without waiting for manual host review, which keeps
   * Instant Book instant. Hosts can set false to require explicit approval.
   */
  accept_on_upload?: boolean;
}

export interface RequirementRecord {
  id: string;
  listing_id?: string;
  document_type: string;
  is_required: boolean;
  deadline_type: RequirementDeadline;
  deadline_offset_hours?: number | null;
  description?: string | null;
  title?: string | null;
  instructions?: string | null;
  requirement_config?: RequirementConfig | null;
}

export interface UploadRecord {
  id: string;
  requirement_id?: string | null;
  document_type: string;
  status: UploadStatus | string;
  file_name?: string | null;
  file_url?: string | null;
  uploaded_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

export interface EvaluatedRequirement {
  requirement: RequirementRecord;
  upload: UploadRecord | null;
  status: RequirementStatus;
  satisfied: boolean;
  /** Blocks submitting a request / confirming an instant booking. */
  blocksBooking: boolean;
  /** Blocks the host approving a request-to-book booking. */
  blocksApproval: boolean;
  label: string;
  dueLabel: string;
  insurance: InsuranceRequirementConfig | null;
}

export interface RequirementEvaluation {
  items: EvaluatedRequirement[];
  hasRequirements: boolean;
  outstandingCount: number;
  outstandingRequiredCount: number;
  bookingBlockers: EvaluatedRequirement[];
  approvalBlockers: EvaluatedRequirement[];
  canSubmitBooking: boolean;
  canConfirmInstantBook: boolean;
  canHostApprove: boolean;
  allApproved: boolean;
}

const BUILT_IN_LABELS: Record<string, string> = {
  drivers_license: "Driver's license / government ID",
  business_license: 'Business license',
  food_handler_certificate: 'Food handler certificate',
  safeserve_certification: 'ServSafe / food safety certification',
  health_department_permit: 'Health department permit',
  commercial_liability_insurance: 'Commercial liability insurance',
  vehicle_insurance: 'Vehicle insurance',
  certificate_of_insurance: 'Certificate of insurance (COI)',
  work_history_proof: 'Work history',
  prior_experience_proof: 'Prior experience',
  custom_requirement: 'Host document requirement',
};

const INSURANCE_TYPES = new Set([
  'commercial_liability_insurance',
  'vehicle_insurance',
  'certificate_of_insurance',
]);

export function isInsuranceRequirement(req: RequirementRecord): boolean {
  return INSURANCE_TYPES.has(req.document_type) || !!req.requirement_config?.insurance?.insurance_required;
}

export function requirementLabel(req: RequirementRecord): string {
  return (req.title?.trim() || BUILT_IN_LABELS[req.document_type] || 'Document').trim();
}

export function normalizeUploadStatus(status: string | null | undefined): RequirementStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'waived':
      return 'waived';
    case 'under_review':
      return 'under_review';
    case 'pending':
      return 'submitted';
    default:
      return 'not_submitted';
  }
}

export function dueLabelFor(req: RequirementRecord, isInstantBook: boolean): string {
  switch (req.deadline_type) {
    case 'before_booking_request':
      return isInstantBook ? 'Due before booking' : 'Due before you request';
    case 'before_approval':
      return isInstantBook ? 'Due before pickup' : 'Due before host approval';
    case 'after_approval_deadline':
      return req.deadline_offset_hours
        ? `Due within ${req.deadline_offset_hours}h of approval`
        : 'Due before pickup';
    default:
      return 'Due before pickup';
  }
}

function matchUpload(req: RequirementRecord, uploads: UploadRecord[]): UploadRecord | null {
  return (
    uploads.find((u) => u.requirement_id && u.requirement_id === req.id) ??
    uploads.find((u) => !u.requirement_id && u.document_type === req.document_type) ??
    null
  );
}

export function evaluateRequirements(params: {
  requirements: RequirementRecord[];
  uploads?: UploadRecord[];
  isInstantBook?: boolean;
}): RequirementEvaluation {
  const { requirements = [], uploads = [], isInstantBook = false } = params;

  const items: EvaluatedRequirement[] = requirements.map((requirement) => {
    const upload = matchUpload(requirement, uploads);
    const status = normalizeUploadStatus(upload?.status);
    const acceptOnUpload = requirement.requirement_config?.accept_on_upload !== false;

    const satisfied =
      status === 'approved' ||
      status === 'waived' ||
      (acceptOnUpload && (status === 'submitted' || status === 'under_review'));

    const isBlockingCandidate = requirement.is_required && !satisfied;

    return {
      requirement,
      upload,
      status,
      satisfied,
      blocksBooking: isBlockingCandidate && requirement.deadline_type === 'before_booking_request',
      blocksApproval:
        isBlockingCandidate &&
        !isInstantBook &&
        (requirement.deadline_type === 'before_booking_request' ||
          requirement.deadline_type === 'before_approval'),
      label: requirementLabel(requirement),
      dueLabel: dueLabelFor(requirement, isInstantBook),
      insurance: isInsuranceRequirement(requirement)
        ? requirement.requirement_config?.insurance ?? { insurance_required: true }
        : null,
    };
  });

  const bookingBlockers = items.filter((i) => i.blocksBooking);
  const approvalBlockers = items.filter((i) => i.blocksApproval);
  const outstanding = items.filter((i) => i.status !== 'approved' && i.status !== 'waived');

  return {
    items,
    hasRequirements: items.length > 0,
    outstandingCount: outstanding.length,
    outstandingRequiredCount: outstanding.filter((i) => i.requirement.is_required).length,
    bookingBlockers,
    approvalBlockers,
    canSubmitBooking: bookingBlockers.length === 0,
    canConfirmInstantBook: bookingBlockers.length === 0,
    canHostApprove: approvalBlockers.length === 0,
    allApproved: items.length > 0 && items.every((i) => i.status === 'approved' || i.status === 'waived'),
  };
}

export const REQUIREMENTS_SNAPSHOT_VERSION = 'req-v1';

export interface RequirementSnapshotEntry {
  requirement_id: string;
  document_type: string;
  label: string;
  is_required: boolean;
  deadline_type: RequirementDeadline;
  deadline_offset_hours: number | null;
  instructions: string | null;
  insurance: InsuranceRequirementConfig | null;
}

/**
 * Freeze the requirement set that applied at signing time. Later host edits to
 * the listing must never rewrite an already-signed agreement.
 */
export function buildRequirementsSnapshot(requirements: RequirementRecord[]): RequirementSnapshotEntry[] {
  return requirements.map((req) => ({
    requirement_id: req.id,
    document_type: req.document_type,
    label: requirementLabel(req),
    is_required: req.is_required,
    deadline_type: req.deadline_type,
    deadline_offset_hours: req.deadline_offset_hours ?? null,
    instructions: req.instructions ?? req.description ?? null,
    insurance: isInsuranceRequirement(req)
      ? req.requirement_config?.insurance ?? { insurance_required: true }
      : null,
  }));
}

/** Plain-language summary used in the agreement body. Never invents facts. */
export function describeRequirementsForAgreement(entries: RequirementSnapshotEntry[]): string {
  if (entries.length === 0) return 'No documents or insurance are required by the host for this rental.';
  return entries
    .map((e) => {
      const parts = [`${e.label} (${e.is_required ? 'required' : 'optional'})`];
      if (e.insurance) {
        const ins = e.insurance;
        if (ins.minimum_general_liability) parts.push(`minimum general liability $${ins.minimum_general_liability.toLocaleString()}`);
        if (ins.additional_insured_required) parts.push('host listed as additional insured');
        if (ins.coi_required) parts.push('certificate of insurance required');
        if (ins.must_span_booking_dates) parts.push('coverage must span the booking dates');
      }
      if (e.instructions) parts.push(e.instructions);
      return `- ${parts.join('; ')}`;
    })
    .join('\n');
}
