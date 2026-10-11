import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentsCard } from './DocumentsCard';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'renter' } }) }));
vi.mock('@/hooks/useTransactionDocuments', () => ({
  useTransactionDocuments: () => ({ docs: [{ id: 'doc', document_type: 'rental_agreement', status: 'completed', signers: [] }], kinds: ['rental_checkin', 'rental_checkout'], reload: vi.fn() }),
}));
it('keeps signed history accessible without offering new reports on closed bookings', () => {
  render(<DocumentsCard scope={{ booking_id: 'booking' }} readOnly />);
  expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Prepare/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Review & sign/ })).not.toBeInTheDocument();
  expect(screen.getByText(/This booking is closed/)).toBeInTheDocument();
});
