import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/components/listing-detail/AddressAutocomplete', () => ({ AddressAutocomplete: ({ id, value, onChange }: any) => <input id={id} value={value} onChange={event => onChange(event.target.value)} /> }));
import { ContactInfoWizard } from '@/components/booking/ContactInfoWizard';
import PurchaseStepDelivery from '@/components/purchase-wizard/PurchaseStepDelivery';
beforeEach(() => { localStorage.clear(); mocks.invoke.mockReset().mockResolvedValue({ data: { decision: 'accept' } }); });
afterEach(cleanup);
it('requires a checked contact address before saving the rental details, including after edits', async () => {
  const complete = vi.fn();
  render(<MemoryRouter><ContactInfoWizard onComplete={complete} initialData={{ firstName: 'Test', lastName: 'Renter', phoneNumber: '6025550123', address1: '123 Main St', address2: 'Suite 4', city: 'Phoenix', state: 'AZ', zipCode: '85001' }} /></MemoryRouter>);
  fireEvent.click(screen.getByTestId('booking-insurance-ack'));
  fireEvent.click(screen.getByTestId('booking-terms-agree'));
  fireEvent.click(screen.getByTestId('contact-save-continue'));
  expect(complete).not.toHaveBeenCalled();
  expect(await screen.findByRole('alert')).toHaveTextContent('Check your address');
  fireEvent.click(screen.getByRole('button', { name: 'Check address' }));
  await screen.findByText('Address checked with Google.');
  fireEvent.change(screen.getByLabelText(/^ZIP/), { target: { value: '85002' } });
  fireEvent.click(screen.getByTestId('contact-save-continue'));
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Check address' }));
  await screen.findByText('Address checked with Google.');
  fireEvent.click(screen.getByTestId('contact-save-continue'));
  await waitFor(() => expect(complete).toHaveBeenCalledWith(expect.objectContaining({ zipCode: '85002', address2: 'Suite 4' })));
});
function Delivery({ method }: { method: 'delivery' | 'vendibook_freight' | 'pickup' }) {
  const [address, setAddress] = useState('123 Main St, Phoenix, AZ 85001');
  const [ready, setReady] = useState(false);
  return <><PurchaseStepDelivery fulfillmentOptions={[method]} fulfillmentSelected={method} setFulfillmentSelected={vi.fn()}
    deliveryAddress={address} setDeliveryAddress={setAddress} setDeliveryCoords={vi.fn()} deliveryFee={50} deliveryRadiusMiles={50}
    deliveryDistanceInfo={{ distance: 3, isOutsideRadius: false }} isFreightSellerPaid={true} freightCost={500} hasValidEstimate={true}
    isEstimating={false} estimateError={null} estimate={null} isAddressComplete={true} setIsAddressComplete={vi.fn()}
    fetchFreightEstimate={vi.fn()} clearEstimate={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} embedded
    onCanContinueChange={setReady} preferredDate="2026-11-01" setPreferredDate={vi.fn()} preferredWindow="morning"
    setPreferredWindow={vi.fn()} onSiteContact="Test Renter" setOnSiteContact={vi.fn()} />
    <button disabled={!ready}>Next checkout step</button></>;
}
it.each(['delivery', 'vendibook_freight'] as const)('requires address checking for sale %s and invalidates after edits', async method => {
  render(<MemoryRouter><Delivery method={method} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Next checkout step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Check address' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next checkout step' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Delivery address *'), { target: { value: '456 Main St, Phoenix, AZ 85001' } });
  expect(screen.getByRole('button', { name: 'Next checkout step' })).toBeDisabled();
  expect(screen.queryByText('$500.00')).not.toBeInTheDocument();
});
it('does not require a delivery address for pickup', () => {
  render(<MemoryRouter><Delivery method="pickup" /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Next checkout step' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Check address' })).not.toBeInTheDocument();
});
