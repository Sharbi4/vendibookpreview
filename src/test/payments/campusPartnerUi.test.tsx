/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

const state = vi.hoisted(() => ({
  check: {} as any,
  config: {} as any,
  configQueue: [] as any[],
  uses: [] as any[],
  calls: [] as any[],
  events: [] as any[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: async (name: string, { body }: any) => {
        state.calls.push({ name, body });
        if (name === 'campus-partner-code') return { data: state.check, error: null };
        if (name === 'square-rental-payment') return { data: body.action === 'config' ? (state.configQueue.length ? state.configQueue.shift() : state.config) : {}, error: null };
        return { data: {}, error: null };
      },
    },
    from: () => {
      const q: any = {
        select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
        then: (ok: any) => Promise.resolve({ data: state.uses, error: null }).then(ok),
      };
      return q;
    },
  },
}));
vi.mock('@/hooks/useAnalyticsEvents', () => ({
  trackEventToDb: (event: string, category: string, payload: any) => { state.events.push({ event, category, payload }); },
}));
vi.mock('@/lib/rentalCheckoutAnalytics', () => ({ trackRentalCheckout: vi.fn() }));
vi.mock('@/lib/squareWebSdk', () => ({ loadSquareWebSdk: vi.fn(() => new Promise(() => {})) }));

import CampusPartnerCodeField, { usePersistedPartnerCode } from '@/components/checkout/CampusPartnerCodeField';
import CampusPartnerBenefit from '@/components/checkout/CampusPartnerBenefit';
import RentalPaymentPanel from '@/components/booking/RentalPaymentPanel';
import { MemoryRouter } from 'react-router-dom';

const INVALID = "That Campus Partner code isn't active. Check the code with your school or continue without it.";
const EXPIRED = 'This Campus Partner code has expired. Check with your school for the current code.';
const LIMIT = "You've already used the available Campus Partner benefit for this transaction type.";

function Harness({ kind = 'purchase', storageKey = 'purchase:l1', saleTransactionId }: { kind?: 'rental' | 'purchase'; storageKey?: string; saleTransactionId?: string }) {
  const [applied, setApplied] = usePersistedPartnerCode(storageKey);
  const [other] = useState('keep-me');
  return (
    <div>
      <span data-testid="other-state">{other}</span>
      <CampusPartnerCodeField kind={kind} listingId="l1" saleTransactionId={saleTransactionId} applied={applied} onApply={setApplied} />
    </div>
  );
}

const enter = async (code: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Have a school or partner code\?/ }));
  fireEvent.change(screen.getByLabelText(/School or partner code/), { target: { value: code } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Apply' })); });
};

describe('CampusPartnerCodeField', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    state.calls = []; state.events = []; state.uses = [];
  });

  it('starts as a compact "Have a school or partner code?" link', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /Have a school or partner code\?/ })).toBeTruthy();
    expect(screen.queryByLabelText(/School or partner code/)).toBeNull();
  });

  it('applies a valid purchase code: school, credit, code and Remove; sends normalized code and sale id', async () => {
    state.check = { valid: true, promo_code_id: 'p1', code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000 };
    render(<Harness saleTransactionId="11111111-1111-4111-8111-111111111111" />);
    await enter(' pima 27 ');
    expect(state.calls[0].body).toEqual({ code: 'PIMA27', kind: 'purchase', listing_id: 'l1', sale_transaction_id: '11111111-1111-4111-8111-111111111111' });
    expect(await screen.findByText('Pima Community College')).toBeTruthy();
    expect(screen.getByText(/Campus Partner benefit applied/)).toBeTruthy();
    expect(screen.getByText('-$250.00')).toBeTruthy();
    expect(screen.getByText('PIMA27')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    const names = state.events.map((e) => e.event);
    expect(names).toEqual(['partner_code_entered', 'partner_code_valid', 'partner_credit_applied']);
    expect(state.events[2].payload).toMatchObject({ promo_code_id: 'p1', partner_name: 'Pima Community College', transaction_type: 'purchase', credit_cents: 25_000 });
  });

  it.each([
    ['invalid', INVALID],
    ['expired', EXPIRED],
    ['limit_reached', LIMIT],
  ])('shows the %s message without clearing other checkout state', async (reason, message) => {
    state.check = { valid: false, reason, message };
    render(<Harness />);
    await enter('NOPE27');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByTestId('other-state')).toHaveTextContent('keep-me');
    expect(state.events.at(-1)).toMatchObject({ event: 'partner_code_invalid', payload: { reason } });
  });

  it('Remove clears the code and the stored copy', async () => {
    state.check = { valid: true, promo_code_id: 'p1', code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000 };
    render(<Harness />);
    await enter('PIMA27');
    expect(sessionStorage.getItem('vb_campus_code:purchase:l1')).toContain('PIMA27');
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(screen.queryByTestId('campus-partner-applied')).toBeNull();
    expect(screen.getByLabelText(/School or partner code/)).toHaveValue('');
    expect(sessionStorage.getItem('vb_campus_code:purchase:l1')).toBeNull();
    expect(state.events.at(-1)).toMatchObject({ event: 'partner_credit_removed' });
  });

  it('restores an applied purchase code after reload and re-checks it with the server', async () => {
    sessionStorage.setItem('vb_campus_code:purchase:l1', JSON.stringify({ code: 'PIMA27', partnerName: 'Pima Community College', creditCents: 25_000 }));
    state.check = { valid: true, promo_code_id: 'p1', code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000 };
    render(<Harness />);
    expect(screen.getByText('Pima Community College')).toBeTruthy();
    await waitFor(() => expect(state.calls.length).toBe(1));
  });

  it('drops a restored code the server no longer accepts and says why', async () => {
    sessionStorage.setItem('vb_campus_code:purchase:l1', JSON.stringify({ code: 'OLD26', partnerName: 'Old School', creditCents: 25_000 }));
    state.check = { valid: false, reason: 'expired', message: EXPIRED };
    render(<Harness />);
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED);
    expect(sessionStorage.getItem('vb_campus_code:purchase:l1')).toBeNull();
  });

  it('rental before pricing shows the 10% / $100 terms', async () => {
    state.check = { valid: true, promo_code_id: 'p2', code: 'EMCC27', partner_name: 'Estrella Mountain Community College', rental_percent: 10, rental_cap_cents: 10_000 };
    render(<Harness kind="rental" storageKey="rental:b1" />);
    await enter('emcc27');
    expect(await screen.findByText('10% off the rental subtotal, up to $100.00')).toBeTruthy();
    // Rental credit is confirmed by the payment quote, not by the field.
    expect(state.events.map((e) => e.event)).not.toContain('partner_credit_applied');
  });
});

describe('RentalPaymentPanel with a Campus Partner code', () => {
  beforeEach(() => { cleanup(); sessionStorage.clear(); state.calls = []; state.events = []; });

  it('re-prices on the server and the Pay button shows the exact Square amount', async () => {
    sessionStorage.setItem('vb_campus_code:rental:b1', JSON.stringify({ code: 'PIMA27', partnerName: 'Pima Community College' }));
    state.config = {
      provider: 'square', environment: 'sandbox', application_id: 'app', location_id: 'loc', amount_cents: 102_900, currency: 'USD',
      partner: { valid: true, code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 10_000 },
    };
    render(<MemoryRouter><RentalPaymentPanel bookingId="b1" listingId="l1" hostId="h1" listingHref="/l" totalUsd={1129} flow="request" onPaid={() => {}} /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /Pay \$1,029\.00/ })).toBeTruthy();
    expect(state.calls[0].body).toEqual({ action: 'config', booking_id: 'b1', partner_code: 'PIMA27' });
    // Pay-later page (no order summary): the panel shows credit and total due itself.
    expect(screen.getByText('Total due today')).toBeTruthy();
    expect(screen.getAllByText('-$100.00').length).toBeGreaterThan(0);
  });

  it('a code the booking cannot use is dropped with its message; checkout continues without it', async () => {
    sessionStorage.setItem('vb_campus_code:rental:b1', JSON.stringify({ code: 'PIMA27', partnerName: 'Pima Community College' }));
    state.configQueue = [
      { provider: 'square', environment: 'sandbox', application_id: 'app', location_id: 'loc', amount_cents: 112_900, currency: 'USD',
        partner: { valid: false, reason: 'limit_reached', message: LIMIT } },
    ];
    state.config = { provider: 'square', environment: 'sandbox', application_id: 'app', location_id: 'loc', amount_cents: 112_900, currency: 'USD', partner: null };
    render(<MemoryRouter><RentalPaymentPanel bookingId="b1" listingId="l1" hostId="h1" listingHref="/l" totalUsd={1129} flow="request" onPaid={() => {}} /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent(LIMIT);
    expect(await screen.findByRole('button', { name: /Pay \$1,129\.00/ })).toBeTruthy();
    expect(state.calls.at(-1).body).toEqual({ action: 'config', booking_id: 'b1' });
  });
});

describe('CampusPartnerBenefit', () => {
  beforeEach(() => { cleanup(); });

  it('shows school, code and savings on confirmation/receipt screens', async () => {
    state.uses = [{ code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000, status: 'completed', redemption_kind: 'purchase' }];
    render(<CampusPartnerBenefit saleTransactionId="s1" />);
    expect(await screen.findByText('Campus Partner benefit')).toBeTruthy();
    expect(screen.getByText('Pima Community College')).toBeTruthy();
    expect(screen.getByText('PIMA27')).toBeTruthy();
    expect(screen.getByTestId('campus-partner-benefit')).toHaveTextContent("You saved $250.00 with your school's Vendibook benefit.");
  });

  it('renders nothing without a redemption', async () => {
    state.uses = [];
    const { container } = render(<CampusPartnerBenefit bookingRequestId="b1" />);
    await act(async () => { await Promise.resolve(); });
    expect(container.innerHTML).toBe('');
  });
});

