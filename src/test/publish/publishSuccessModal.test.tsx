import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublishSuccessModal } from '@/components/listing-wizard/PublishSuccessModal';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) },
}));

const baseListing = {
  id: 'abc-123',
  title: '2020 Concession Trailer',
  coverImageUrl: null,
  category: 'concession_trailer',
  mode: 'sale',
  address: 'Phoenix, AZ',
  priceDaily: null,
  priceWeekly: null,
  priceSale: 45000,
};

const readiness = [
  { label: 'Photos requirement met', met: true },
  { label: 'Title & description complete', met: true },
  { label: 'Valid sale price', met: true },
  { label: 'Location & logistics complete', met: true },
  { label: 'Payment method selected', met: true },
];

const renderModal = (props: Partial<Parameters<typeof PublishSuccessModal>[0]> = {}) =>
  render(
    <MemoryRouter>
      <PublishSuccessModal
        open
        onOpenChange={() => {}}
        listing={baseListing}
        paymentMethods={{ paypalCheckout: true, payInPerson: false }}
        readiness={readiness}
        onViewListing={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );

describe('PublishSuccessModal seller clarity', () => {
  it('A) PayPal/online only: shows online checkout enabled + online next steps, no pay-in-person row', () => {
    renderModal();
    expect(screen.getByText('Online checkout with PayPal')).toBeInTheDocument();
    expect(screen.queryByText('Pay in Person', { selector: 'li span' })).not.toBeInTheDocument();
    expect(screen.getByText(/buyers can pay\s*securely through Vendibook with PayPal/i)).toBeInTheDocument();
    expect(screen.queryByText(/choose either available option/i)).not.toBeInTheDocument();
    // readiness + financing note render for sale
    expect(screen.getByText('Listing readiness')).toBeInTheDocument();
    expect(screen.getByText('Payment method selected')).toBeInTheDocument();
    expect(screen.getByText(/Buyers can finance this listing/i)).toBeInTheDocument();
  });

  it('B) Pay in Person only: shows in-person copy and no online commission claim for that transaction', () => {
    renderModal({ paymentMethods: { paypalCheckout: false, payInPerson: true } });
    expect(screen.getByText('Pay in Person')).toBeInTheDocument();
    expect(screen.queryByText('Online checkout with PayPal')).not.toBeInTheDocument();
    expect(screen.getByText(/arrange payment directly at pickup or delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/does not charge the\s*online-sale commission on a pay-in-person transaction/i)).toBeInTheDocument();
    expect(screen.queryByText(/buyers can pay\s*securely through Vendibook with PayPal/i)).not.toBeInTheDocument();
  });

  it('C) Both enabled: says buyers may choose either option', () => {
    renderModal({ paymentMethods: { paypalCheckout: true, payInPerson: true } });
    expect(screen.getByText('Online checkout with PayPal')).toBeInTheDocument();
    expect(screen.getByText('Pay in Person')).toBeInTheDocument();
    expect(screen.getByText(/choose either available option/i)).toBeInTheDocument();
  });

  it('D) Rental: no sale payment summary, no financing copy, rental next steps only', () => {
    renderModal({
      listing: { ...baseListing, mode: 'rent', priceDaily: 250, priceSale: null },
      paymentMethods: null,
      readiness: readiness.filter((r) => r.label !== 'Payment method selected'),
    });
    expect(screen.queryByText('How buyers can pay')).not.toBeInTheDocument();
    expect(screen.queryByText(/finance this listing/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Payment method selected')).not.toBeInTheDocument();
    expect(screen.getByText(/Renters can now find your listing/i)).toBeInTheDocument();
  });

  it('F) no Stripe text anywhere in the modal', () => {
    const { container } = renderModal({
      paymentMethods: { paypalCheckout: true, payInPerson: true },
    });
    expect(container.textContent).not.toMatch(/stripe/i);
  });
});
