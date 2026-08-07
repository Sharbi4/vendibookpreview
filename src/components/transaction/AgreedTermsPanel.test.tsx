/**
 * AgreedTermsPanel — frontend tests
 *
 * Verifies:
 *  1. Numbers rendered match the transaction_terms snapshot resolved via
 *     the primary `terms_id` lookup (lines, total, currency formatting).
 *  2. Legacy fallback resolution (via sale_transaction_id) is clearly
 *     flagged in the UI so admins can tell which lookup branch fired.
 *  3. Error / missing-snapshot state renders the "unavailable" message.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgreedTermsPanel from './AgreedTermsPanel';
import type { AgreedTermsRow } from '@/hooks/useSaleTerms';

// ---- Mock the supabase client used by useSaleTerms ---------------------
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn((_table: string) => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

const baseSnapshot = {
  termsVersion: 'v3',
  payment_method: 'paypal_checkout',
  pricing: {
    lines: [
      { label: 'Base price', amountCents: 10000, kind: 'base' },
      { label: 'Delivery fee', amountCents: 2500, kind: 'fee' },
      { label: 'Security deposit', amountCents: 20000, kind: 'deposit' },
      { label: 'Total', amountCents: 32500, kind: 'total' },
    ],
    totalCents: 32500,
  },
  policies: {
    cancellation: 'Refunds within 24 hours.',
    acknowledgements: ['I agree to the rules', 'I confirm the pickup window'],
  },
};

const primaryRow: AgreedTermsRow = {
  id: 'terms_primary',
  sale_transaction_id: 'sale_1',
  terms_version: 'v3',
  transaction_mode: 'sale',
  payment_method: 'paypal_checkout',
  subtotal_cents: 10000,
  deposit_cents: 20000,
  commission_cents: 1290,
  renter_fee_cents: 0,
  total_cents: 32500,
  acknowledged_at: '2026-05-01T12:00:00Z',
  snapshot: baseSnapshot,
  resolvedVia: 'terms_id',
};

const legacyRow: AgreedTermsRow = {
  ...primaryRow,
  id: 'terms_legacy',
  resolvedVia: 'sale_transaction_id',
};

const renderPanel = (props: React.ComponentProps<typeof AgreedTermsPanel>) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AgreedTermsPanel {...props} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  eqMock.mockClear();
  maybeSingleMock.mockReset();
});

describe('AgreedTermsPanel', () => {
  it('renders numbers, currency formatting, and acknowledgements from the primary terms_id lookup', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: primaryRow, error: null });

    renderPanel({ saleId: 'sale_1', termsId: 'terms_primary' });

    await waitFor(() =>
      expect(screen.getByText('What buyer and seller agreed to')).toBeInTheDocument(),
    );

    // Every line item + its formatted currency renders
    expect(screen.getByText('Base price')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Delivery fee')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('Security deposit')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('$325.00')).toBeInTheDocument();

    // Cancellation + acknowledgements come from snapshot
    expect(screen.getByText('Refunds within 24 hours.')).toBeInTheDocument();
    expect(screen.getByText('I agree to the rules')).toBeInTheDocument();

    // Terms version + payment method badges
    expect(screen.getByText(/Terms v3/i)).toBeInTheDocument();
    expect(screen.getByText(/paypal checkout/i)).toBeInTheDocument();

    // Primary lookup must NOT display the "legacy lookup" flag
    expect(screen.queryByText(/legacy lookup/i)).not.toBeInTheDocument();

    // Primary lookup path was taken — first call filtered by id.
    expect(eqMock).toHaveBeenCalledWith('id', 'terms_primary');
  });

  it('flags the legacy fallback lookup when only sale_transaction_id resolves', async () => {
    // Primary lookup returns nothing, fallback returns the row.
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: legacyRow, error: null });

    renderPanel({ saleId: 'sale_1', termsId: 'terms_missing' });

    await waitFor(() =>
      expect(screen.getByText(/legacy lookup/i)).toBeInTheDocument(),
    );

    // Numbers still render correctly from the fallback row
    expect(screen.getByText('$325.00')).toBeInTheDocument();

    // Confirm both lookup branches were attempted, primary then fallback.
    expect(eqMock).toHaveBeenNthCalledWith(1, 'id', 'terms_missing');
    expect(eqMock).toHaveBeenNthCalledWith(2, 'sale_transaction_id', 'sale_1');
  });

  it('renders the "unavailable" message when no snapshot exists on either branch', async () => {
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    renderPanel({ saleId: 'sale_1', termsId: null });

    await waitFor(() =>
      expect(
        screen.getByText(/Agreed terms snapshot unavailable/i),
      ).toBeInTheDocument(),
    );
  });
});
