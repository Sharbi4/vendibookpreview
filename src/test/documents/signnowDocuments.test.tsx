import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { inviteIdForEmail } from '../../../supabase/functions/_shared/signnow';

const invokeMock = vi.fn();
const rows: Array<Record<string, unknown>> = [];

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    order: chain,
    eq: () => Promise.resolve({ data: rows, error: null }),
  });
  return {
    supabase: {
      from: () => builder,
      functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'buyer-1', email: 'buyer@example.com' } }),
}));

import { DocumentsCard } from '@/components/documents/DocumentsCard';

describe('signnow invite mapping', () => {
  it('maps each signer to their own invite id (never the first one for everyone)', () => {
    const invites = [
      { id: 'inv-buyer', email: 'Buyer@Example.com', role_name: 'Buyer' },
      { id: 'inv-seller', email: 'seller@example.com', role_name: 'Seller' },
    ];
    expect(inviteIdForEmail(invites, 'buyer@example.com')).toBe('inv-buyer');
    expect(inviteIdForEmail(invites, 'SELLER@example.com')).toBe('inv-seller');
    expect(inviteIdForEmail(invites, 'nobody@example.com')).toBeUndefined();
  });
});

describe('DocumentsCard', () => {
  beforeEach(() => {
    rows.length = 0;
    invokeMock.mockReset();
  });

  it('renders nothing when SignNow is unconfigured (no document rows)', async () => {
    const { container } = render(<DocumentsCard scope={{ transaction_id: 'tx-1' }} />);
    await waitFor(() => expect(container.textContent).not.toContain('Loading documents'));
    expect(container.textContent).toBe('');
  });

  it('shows per-party status and a Review & sign action for the current signer', async () => {
    rows.push({
      id: 'doc-1',
      document_type: 'bill_of_sale',
      status: 'sent',
      signed_pdf_path: null,
      created_at: new Date().toISOString(),
      signers: [
        { role: 'buyer', user_id: 'buyer-1', email: 'buyer@example.com', signed_at: null },
        { role: 'seller', user_id: 'seller-1', email: 'seller@example.com', signed_at: new Date().toISOString() },
      ],
    });
    render(<DocumentsCard scope={{ transaction_id: 'tx-1' }} title="Bill of sale" />);
    expect((await screen.findAllByText(/Bill of sale/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Buyer: Awaiting signature/i)).toBeTruthy();
    expect(await screen.findByText(/Seller: Signed/i)).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Review & sign/i })).toBeTruthy();
  });

  it('offers the signed PDF once completed', async () => {
    rows.push({
      id: 'doc-2',
      document_type: 'rental_agreement',
      status: 'completed',
      signed_pdf_path: 'doc-2.pdf',
      created_at: new Date().toISOString(),
      signers: [
        { role: 'renter', user_id: 'buyer-1', email: 'buyer@example.com', signed_at: new Date().toISOString() },
        { role: 'host', user_id: 'host-1', email: 'host@example.com', signed_at: new Date().toISOString() },
      ],
    });
    render(<DocumentsCard scope={{ booking_id: 'bk-1' }} />);
    expect(await screen.findByRole('button', { name: /Signed PDF/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Review & sign/i })).toBeNull();
  });
});
