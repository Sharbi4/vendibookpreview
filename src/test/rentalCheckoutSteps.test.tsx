import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const state = vi.hoisted(() => ({
  listing: { id: 'listing-a', host_id: 'host', title: 'Rental trailer', category: 'food_trailer', mode: 'rent', price_daily: 100, fulfillment_type: 'pickup', status: 'published' },
  docs: [] as any[], requirementsError: false, retry: vi.fn(),
  contact: { firstName: 'Test', lastName: 'Renter', phoneNumber: '6025550123', address1: '123 Main St', city: 'Phoenix', state: 'AZ', zipCode: '85001', agreedToTerms: true },
  business: { licenseType: 'llc', employeeCount: 'just_me', intendedUse: 'Weekend catering', cuisineType: 'Tacos' },
}));
vi.mock('@/hooks/useListing', () => ({ useListing: () => ({ listing: state.listing, isLoading: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'renter', email: 'test@example.com' } }) }));
vi.mock('@/hooks/useRequiredDocuments', () => ({ useListingRequiredDocuments: () => ({ data: state.docs, isLoading: false, isError: state.requirementsError, refetch: state.retry }) }));
vi.mock('@/hooks/useDocumentsOnFile', () => ({ useDocumentsOnFile: () => ({ data: { docsOnFile: false } }) }));
vi.mock('@/hooks/useReviews', () => ({ useListingAverageRating: () => ({ data: null }) }));
vi.mock('@/hooks/useSellerVerifiedBadge', () => ({ useSellerVerifiedBadge: () => ({ verified: false, loading: false }) }));
vi.mock('@/hooks/useLegalDocument', () => ({ useLegalDocument: () => ({ data: { id: 'legal', content_hash: 'hash' } }) }));
vi.mock('@/hooks/useCheckoutFunnel', () => ({ useCheckoutFunnel: () => ({ markCompleted: vi.fn() }) }));
vi.mock('@/hooks/useTermsGate', () => ({ useTermsGate: () => ({ reset: vi.fn(), preparing: false }) }));
vi.mock('@/lib/edge/invokeFunction', () => ({ invokeEdge: vi.fn().mockResolvedValue({ data: { tax_cents: 0 }, error: null }) }));
vi.mock('@/lib/rentalCheckoutAnalytics', () => ({ trackRentalCheckout: vi.fn() }));
vi.mock('@/components/booking', () => ({
  SlotSelector: () => null, TowingHandoffPanel: () => null,
  ContactInfoWizard: ({ onComplete }: any) => <button onClick={() => onComplete(state.contact)}>Save contact</button>,
  BusinessInfoStep: ({ onBusinessInfoChange, onComplete }: any) => <button onClick={() => { onBusinessInfoChange(state.business); onComplete(); }}>Save business</button>,
}));
vi.mock('@/components/booking/RentalVerificationPanel', () => ({ default: ({ onComplete }: any) => <button onClick={() => onComplete({ attestedAt: '2026-10-09', documentVersion: 'v1', insuranceAnswer: 'yes' })}>Save verification</button> }));
vi.mock('@/components/checkout/CheckoutAgreementCards', () => ({ default: () => <p>Rental agreement form</p> }));
vi.mock('@/components/checkout/OrderReviewStage', () => ({ default: () => <p>Booking review</p> }));
vi.mock('@/components/booking/InsuranceEducationCard', () => ({ InsuranceEducationCard: () => null }));
vi.mock('@/components/journey', () => ({ TrustModule: () => null, DOCUMENT_TRUST_POINTS: [], DOCUMENT_DISCLAIMER: '' }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Footer', () => ({ default: () => null }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/listing-detail/DateSelectionModal', () => ({ default: () => null }));
vi.mock('@/components/referrals/ReferralCodeField', () => ({ ReferralCodeField: () => null }));
import BookingCheckout from '@/pages/BookingCheckout';

beforeEach(() => {
  cleanup(); localStorage.clear(); sessionStorage.clear(); state.docs = []; state.requirementsError = false; state.retry.mockClear();
  HTMLElement.prototype.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
});
function mountDetails() {
  render(<MemoryRouter initialEntries={['/book/listing-a?start=2026-11-01&end=2026-11-02']}><Routes><Route path="/book/:listingId" element={<BookingCheckout />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
}
function completeContactAndBusiness() {
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  expect(screen.queryByRole('button', { name: 'Save contact' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save business' }));
  expect(screen.queryByRole('button', { name: 'Save business' })).not.toBeInTheDocument();
}
it('replaces each Details form, skips documents when none are configured, and preserves back navigation', () => {
  mountDetails();
  expect(screen.queryByRole('button', { name: 'Save business' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save verification' })).not.toBeInTheDocument();
  expect(screen.queryByText('Rental agreement form')).not.toBeInTheDocument();
  completeContactAndBusiness();
  expect(screen.queryByText('Documents selected by this host')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save verification' }));
  expect(screen.queryByRole('button', { name: 'Save verification' })).not.toBeInTheDocument();
  expect(screen.getByText('Rental agreement form')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Rental details sections' })).getByRole('button', { name: /Contact/ }));
  expect(screen.getByText('Contact details saved')).toBeInTheDocument();
  expect(screen.queryByText('Rental agreement form')).not.toBeInTheDocument();
});
it('shows only this listing’s document request and Continue replaces it with verification', () => {
  state.docs = [{ id: 'coi', listing_id: 'listing-a', document_type: 'certificate_of_insurance', title: 'Kitchen insurance proof', is_required: true, deadline_type: 'before_approval' }];
  mountDetails(); completeContactAndBusiness();
  expect(screen.getByText('Kitchen insurance proof')).toBeInTheDocument();
  expect(screen.queryByText('Business License')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save verification' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue without uploads' }));
  expect(screen.queryByText('Kitchen insurance proof')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save verification' })).toBeInTheDocument();
});
it('blocks progress and offers retry when host requirements cannot load', () => {
  state.requirementsError = true;
  mountDetails(); completeContactAndBusiness();
  expect(screen.getByRole('alert')).toHaveTextContent("couldn't load this host's document requirements");
  fireEvent.click(screen.getByRole('button', { name: 'Retry requirements' }));
  expect(state.retry).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Save verification' })).not.toBeInTheDocument();
});
