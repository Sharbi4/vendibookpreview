import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import MessageHostButton from '../MessageHostButton';
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), open: vi.fn().mockResolvedValue('conversation-1') }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'renter' } }) }));
vi.mock('@/hooks/useConversations', () => ({ useConversations: () => ({ getOrCreateConversation: mocks.open }) }));
vi.mock('@/lib/analytics', () => ({ trackHostContacted: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
it('opens the host conversation and retains the booking reference', async () => {
  render(<MessageHostButton listingId="listing-1" hostId="host-1" bookingId="booking-1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Message Host' }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/messages/conversation-1?booking=booking-1'));
  expect(mocks.open).toHaveBeenCalledWith('listing-1', 'host-1');
});
