import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BookingDocumentUpload, type StagedDocument } from '@/components/booking/BookingDocumentUpload';
import type { ListingRequiredDocument } from '@/hooks/useRequiredDocuments';

vi.mock('@/components/journey', () => ({ TrustModule: () => null, DOCUMENT_TRUST_POINTS: [], DOCUMENT_DISCLAIMER: '' }));
vi.mock('@/components/booking/InsuranceEducationCard', () => ({ InsuranceEducationCard: () => <p>Insurance information</p> }));
afterEach(cleanup);
const req = (document_type: ListingRequiredDocument['document_type'], overrides = {}): ListingRequiredDocument => ({
  id: document_type, listing_id: 'listing-a', document_type, is_required: true,
  deadline_type: 'before_approval', deadline_offset_hours: null, description: null, ...overrides,
});
const staged = (documentType: StagedDocument['documentType']): StagedDocument => ({ documentType, file: new File(['proof'], 'proof.pdf', { type: 'application/pdf' }) });
function show(requiredDocs: ListingRequiredDocument[], stagedDocuments: StagedDocument[] = []) {
  const onComplete = vi.fn();
  render(<BookingDocumentUpload requiredDocs={requiredDocs} stagedDocuments={stagedDocuments} onDocumentsChange={vi.fn()} onComplete={onComplete} />);
  return onComplete;
}
it('shows only the host-selected types, titles and instructions', () => {
  show([req('certificate_of_insurance', { title: 'Host COI', instructions: 'Name our kitchen as additional insured.' })]);
  expect(screen.getByText('Host COI')).toBeInTheDocument();
  expect(screen.getByText('Name our kitchen as additional insured.')).toBeInTheDocument();
  expect(screen.queryByText(/Government ID/)).not.toBeInTheDocument();
  expect(screen.queryByText('Business License')).not.toBeInTheDocument();
});
it('counts selected listing documents, not unrelated staged files or only pre-booking blockers', () => {
  show([req('business_license'), req('certificate_of_insurance')], [staged('business_license'), staged('certificate_of_insurance'), staged('drivers_license')]);
  expect(screen.getByText('2 of 2 files selected')).toBeInTheDocument();
  expect(screen.queryByText('3/0')).not.toBeInTheDocument();
  expect(screen.getAllByText('Selected')).toHaveLength(2);
});
it('allows later and optional requirements to be provided from the booking', () => {
  const done = show([req('business_license'), req('certificate_of_insurance', { is_required: false })]);
  expect(screen.getByRole('region', { name: 'Required later' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Optional documents' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue without uploads' }));
  expect(done).toHaveBeenCalledOnce();
  expect(screen.queryByText('Insurance information')).not.toBeInTheDocument();
});
it('requires the exact pre-booking document before continuing', () => {
  show([req('business_license', { deadline_type: 'before_booking_request' })], [staged('drivers_license')]);
  expect(screen.getByRole('button', { name: 'Upload 1 more document' })).toBeDisabled();
  expect(screen.getByText('0 of 1 files selected')).toBeInTheDocument();
});
it('does not render a zero denominator for a host with no requirements', () => {
  const done = show([]);
  expect(screen.getByText('This host has not requested any documents for this listing.')).toBeInTheDocument();
  expect(screen.queryByText(/files selected/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue without uploads' }));
  expect(done).toHaveBeenCalledOnce();
});
