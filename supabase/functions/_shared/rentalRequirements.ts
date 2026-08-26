// deno-lint-ignore-file no-explicit-any
/**
 * Server-side mirror of src/lib/documents/requirements.ts used to freeze the
 * requirement set into a signed agreement. Keep the two in sync.
 */

export const REQUIREMENTS_SNAPSHOT_VERSION = 'req-v1';
export const RENTAL_AGREEMENT_VERSION = 'rental-agreement-v2';
export const BILL_OF_SALE_VERSION = 'bill-of-sale-v2';

const LABELS: Record<string, string> = {
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

export interface RequirementRow {
  id: string;
  document_type: string;
  is_required: boolean;
  deadline_type: string;
  deadline_offset_hours: number | null;
  description: string | null;
  title: string | null;
  instructions: string | null;
  requirement_config: any;
}

export function buildRequirementsSnapshot(rows: RequirementRow[]) {
  return rows.map((r) => {
    const insuranceCfg = r.requirement_config?.insurance ?? null;
    const isInsurance = INSURANCE_TYPES.has(r.document_type) || !!insuranceCfg?.insurance_required;
    return {
      requirement_id: r.id,
      document_type: r.document_type,
      label: (r.title || LABELS[r.document_type] || 'Document').trim(),
      is_required: !!r.is_required,
      deadline_type: r.deadline_type,
      deadline_offset_hours: r.deadline_offset_hours ?? null,
      instructions: r.instructions ?? r.description ?? null,
      insurance: isInsurance ? insuranceCfg ?? { insurance_required: true } : null,
    };
  });
}

export function describeRequirements(entries: ReturnType<typeof buildRequirementsSnapshot>): string {
  if (!entries.length) {
    return 'The Host has not required any documents or insurance for this rental.';
  }
  return entries
    .map((e) => {
      const parts = [`${e.label} (${e.is_required ? 'required' : 'optional'})`];
      const ins = e.insurance;
      if (ins) {
        if (ins.minimum_general_liability) {
          parts.push(`minimum general liability $${Number(ins.minimum_general_liability).toLocaleString()}`);
        }
        if (ins.additional_insured_required) parts.push('Host listed as additional insured');
        if (ins.coi_required) parts.push('certificate of insurance required');
        if (ins.must_span_booking_dates) parts.push('coverage must span the booking dates');
        if (ins.instructions) parts.push(String(ins.instructions));
      }
      if (e.instructions) parts.push(String(e.instructions));
      return `- ${parts.join('; ')}`;
    })
    .join('\n');
}

export function describeInsuranceSection(entries: ReturnType<typeof buildRequirementsSnapshot>): string {
  const insured = entries.filter((e) => e.insurance);
  if (!insured.length) {
    return 'The Host has not required insurance coverage for this rental. Renter remains responsible for any coverage required by law or by the venue.';
  }
  return [
    'Renter shall maintain the insurance coverage specified by the Host below for the full rental period:',
    describeRequirements(insured),
  ].join('\n');
}
