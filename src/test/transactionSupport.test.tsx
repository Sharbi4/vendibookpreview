import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ caseRow: null as any, error: null as any }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ data: state.caseRow, error: state.error }), then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve) };
  return q;
} } }));
vi.mock('@/lib/paypalClient', () => ({ getPayPalConfig: async () => ({ environment: 'sandbox' }) }));
import OrderCaseSection from '@/components/disputes/OrderCaseSection';
beforeEach(() => { cleanup(); state.caseRow = null; state.error = null; });
const mount = () => render(<MemoryRouter><OrderCaseSection orderId="order1" viewerRole="buyer" canReport /></MemoryRouter>);
describe('transaction support', () => {
  it('offers PayPal independently before a Vendibook case is opened, preserving sandbox', async () => {
    mount();
    expect(await screen.findByRole('link', { name: /Open PayPal Resolution Center/ })).toHaveAttribute('href', 'https://www.sandbox.paypal.com/disputes/');
    expect(screen.getByRole('button', { name: /Report a problem/ })).toBeInTheDocument();
  });
  it('shows provider and internal case states separately and links the canonical case', async () => {
    state.caseRow = { id: 'c1', case_number: 'VB-1', status: 'awaiting_admin', issue_type: 'item_not_received', description: 'Delivery has not arrived.', evidence_links: {}, paypal_dispute_status: 'UNDER_REVIEW', paypal_dispute_id: 'PP-1', created_at: '2026-09-19T12:00:00Z' };
    mount();
    expect(await screen.findByText('PayPal: UNDER_REVIEW')).toBeInTheDocument();
    expect(screen.getByText(/^Vendibook: /)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open case details' })).toHaveAttribute('href', '/dashboard/transactions/order1/case/c1');
  });
  it('does not treat a failed case query as permission to open another case', async () => {
    state.error = new Error('Offline'); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load support");
    expect(screen.queryByRole('button', { name: /Report a problem/ })).toBeNull();
  });
});
