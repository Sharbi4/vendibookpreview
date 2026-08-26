import { describe, it, expect } from 'vitest';
import {
  evaluateRequirements,
  buildRequirementsSnapshot,
  type RequirementRecord,
  type UploadRecord,
} from '@/lib/documents/requirements';
import { deriveAgreementState } from '@/lib/documents/agreementStatus';

const req = (over: Partial<RequirementRecord> = {}): RequirementRecord => ({
  id: over.id ?? 'r1',
  document_type: 'certificate_of_insurance',
  is_required: true,
  deadline_type: 'before_booking_request',
  ...over,
});

describe('rental requirement evaluation', () => {
  it('A. instant book with no requirements has zero friction', () => {
    const e = evaluateRequirements({ requirements: [], isInstantBook: true });
    expect(e.hasRequirements).toBe(false);
    expect(e.canConfirmInstantBook).toBe(true);
    expect(e.bookingBlockers).toHaveLength(0);
  });

  it('B. instant book with COI due before booking blocks confirmation until satisfied', () => {
    const requirements = [req()];
    const blocked = evaluateRequirements({ requirements, isInstantBook: true });
    expect(blocked.canConfirmInstantBook).toBe(false);
    expect(blocked.bookingBlockers).toHaveLength(1);

    const uploads: UploadRecord[] = [
      { id: 'u1', requirement_id: 'r1', document_type: 'certificate_of_insurance', status: 'approved' },
    ];
    const cleared = evaluateRequirements({ requirements, uploads, isInstantBook: true });
    expect(cleared.canConfirmInstantBook).toBe(true);
  });

  it('C. instant book with COI due before pickup confirms, but stays outstanding', () => {
    const e = evaluateRequirements({
      requirements: [req({ deadline_type: 'before_approval' })],
      isInstantBook: true,
    });
    expect(e.canConfirmInstantBook).toBe(true);
    expect(e.outstandingRequiredCount).toBe(1);
    expect(e.items[0].dueLabel).toBe('Due before pickup');
  });

  it('D/E. request-to-book: only true blockers block, optional never does', () => {
    const e = evaluateRequirements({
      requirements: [
        req({ id: 'r1', deadline_type: 'before_approval' }),
        req({ id: 'r2', document_type: 'business_license', is_required: false, deadline_type: 'before_booking_request' }),
        req({ id: 'r3', document_type: 'drivers_license', deadline_type: 'after_approval_deadline', deadline_offset_hours: 48 }),
      ],
      isInstantBook: false,
    });
    expect(e.canSubmitBooking).toBe(true);
    expect(e.canHostApprove).toBe(false);
    expect(e.approvalBlockers.map((i) => i.requirement.id)).toEqual(['r1']);
    expect(e.items[2].dueLabel).toContain('48h');
  });

  it('F. snapshot freezes the requirement set at signing time', () => {
    const snap = buildRequirementsSnapshot([req({ title: 'COI' })]);
    expect(snap.requirements).toHaveLength(1);
    expect(snap.version).toBeTruthy();
    // Later host edits are a new array and must not mutate the snapshot.
    const snapshotJson = JSON.stringify(snap);
    buildRequirementsSnapshot([]);
    expect(JSON.stringify(snap)).toBe(snapshotJson);
  });

  it('rejected uploads are never treated as satisfied', () => {
    const e = evaluateRequirements({
      requirements: [req()],
      uploads: [{ id: 'u1', document_type: 'certificate_of_insurance', status: 'rejected' }],
      isInstantBook: true,
    });
    expect(e.canConfirmInstantBook).toBe(false);
  });
});

describe('G. agreement status degrades gracefully', () => {
  it('missing document reads as not created and blocks nothing', () => {
    const s = deriveAgreementState(null, 'user-1');
    expect(s.status).toBe('not_created');
    expect(s.actionRequired).toBe(false);
  });

  it('surfaces review & sign then waiting-for-host', () => {
    const doc = {
      status: 'sent',
      signers: [
        { role: 'renter' as const, user_id: 'user-1' },
        { role: 'host' as const, user_id: 'user-2' },
      ],
    };
    expect(deriveAgreementState(doc, 'user-1').label).toBe('Review & sign agreement');

    const partly = {
      status: 'partially_signed',
      signers: [
        { role: 'renter' as const, user_id: 'user-1', signed_at: '2026-01-01T00:00:00Z' },
        { role: 'host' as const, user_id: 'user-2' },
      ],
    };
    expect(deriveAgreementState(partly, 'user-1').label).toBe('Waiting for host signature');
    expect(deriveAgreementState({ status: 'completed', signers: [] }, 'user-1').complete).toBe(true);
  });
});
