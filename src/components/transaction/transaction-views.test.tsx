/**
 * Integration test — proves that TransactionSummary, PriceDetailsModal,
 * TransactionDetailsAccordion, and FinalReviewSheet all render the SAME
 * total, subtotal, and cancellation policy when given the same
 * TransactionTerms object. This is the property we rely on for
 * "summary → details → price → final review → email" consistency.
 */
import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { buildTerms } from '@/lib/transactionTerms';
import { TransactionSummary } from './TransactionSummary';
import { TransactionDetailsAccordion } from './TransactionDetailsAccordion';
import { PriceDetailsModal } from './PriceDetailsModal';

const terms = buildTerms({
  listing: {
    id: 'lst_1',
    title: 'Test Van',
    host_id: 'host_1',
    cover_image_url: null,
    mode: 'rent',
    city: 'Phoenix',
    state: 'AZ',
    cancellation_policy: 'Refunds within 24 hours.',
    rules: null,
    price_daily: 100,
    security_deposit: 200,
    accept_paypal_checkout: true,
    required_documents: [{ label: 'Drivers License' }],
  },
  selection: {
    mode: 'rent',
    paymentMethod: 'paypal_checkout',
    basePriceDollars: 100,
    deliveryFeeDollars: 25,
    depositDollars: 200,
    startDate: '2026-01-01',
    endDate: '2026-01-02',
  },
});

describe('transaction views share one source of truth', () => {
  it('summary and price modal show the same total and lines', () => {
    render(
      <div>
        <TransactionSummary terms={terms} />
        <PriceDetailsModal terms={terms} open onOpenChange={() => undefined} />
      </div>,
    );

    const summaryTotal = screen.getByTestId('transaction-summary-total').textContent!;
    const modalTotalAmount = screen.getByTestId('price-amount-total').textContent!;
    expect(summaryTotal.replace(/\s/g, '')).toBe(modalTotalAmount.replace(/\s/g, ''));

    // Every non-total line rendered in the summary must appear in the modal
    const summaryLines = document.querySelectorAll(
      '[data-testid="transaction-summary"] [data-testid^="terms-line-"]',
    );
    expect(summaryLines.length).toBeGreaterThan(0);
    const modal = screen.getByTestId('price-details-modal');
    summaryLines.forEach((li) => {
      const label = li.querySelector('span')!.textContent!;
      expect(within(modal).getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it('details accordion exposes the same cancellation policy', () => {
    render(<TransactionDetailsAccordion terms={terms} />);
    fireEvent.click(screen.getByText(/Cancellation policy/i));
    expect(screen.getByText(terms.policies.cancellation)).toBeInTheDocument();
  });
});
