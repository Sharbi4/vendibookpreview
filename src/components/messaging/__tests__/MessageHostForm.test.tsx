import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessageHostForm from '../MessageHostForm';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  insert: vi.fn(),
  getOrCreateConversation: vi.fn(),
  sendMessage: vi.fn(),
  invoke: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
  trackHostContacted: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useConversations', () => ({ useConversations: () => ({ getOrCreateConversation: mocks.getOrCreateConversation }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/analytics', () => ({ trackHostContacted: mocks.trackHostContacted, trackFormSubmit: vi.fn() }));
vi.mock('@/lib/messageSafety', () => ({ sendMarketplaceMessage: mocks.sendMessage, messageSendError: () => 'error' }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: mocks.insert }),
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mocks.navigate,
}));

const renderForm = () =>
  render(
    <MemoryRouter>
      <MessageHostForm listingId="listing-1" hostId="host-1" listingTitle="Coffee Trailer" />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  mocks.user = null;
  vi.clearAllMocks();
});

describe('MessageHostForm seller routing', () => {
  it('lets a guest send a message with name, email and phone (no sign-in)', async () => {
    mocks.insert.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValue({});
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(mocks.insert).not.toHaveBeenCalled(); // phone + email required
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ana Ruiz' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '602-555-0100' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      listing_id: 'listing-1', host_id: 'host-1', email: 'ana@example.com', phone: '602-555-0100', source: 'guest_inquiry',
    })));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('keeps the direct-message flow for signed-in users', () => {
    mocks.user = { id: 'buyer-1' };
    renderForm();
    expect(screen.queryByPlaceholderText(/your email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });
  it('restores the request after sign-in and clears it only after a successful send', async () => {
    sessionStorage.setItem('listingMessageDraft', JSON.stringify({ listingId: 'listing-1', hostId: 'host-1', message: 'Please show the generator.' }));
    mocks.user = { id: 'buyer-1' };
    mocks.getOrCreateConversation.mockResolvedValue('thread-1');
    mocks.sendMessage.mockResolvedValue({ id: 'message-1' });
    renderForm();
    expect(screen.getByRole('textbox', { name: 'Your message' })).toHaveValue('Please show the generator.');
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/messages/thread-1'));
    expect(mocks.sendMessage).toHaveBeenCalledWith('conversation', 'thread-1', 'Please show the generator.');
    expect(sessionStorage.getItem('listingMessageDraft')).toBeNull();
  });
});

describe('listing message draft and delivery', () => {
  it('prefills an editable walkthrough request without sending anything', () => {
    mocks.user = { id: 'buyer-1' };
    renderForm();
    expect(screen.getByRole('textbox', { name: 'Your message' })).toHaveValue(
      'Hi! I’m interested in "Coffee Trailer". Could you share a video walkthrough here on Vendibook?'
    );
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('saves the edited draft through the guarded RPC before navigating', async () => {
    mocks.user = { id: 'buyer-1' };
    mocks.getOrCreateConversation.mockResolvedValue('thread-1');
    mocks.sendMessage.mockResolvedValue({ id: 'message-1' });
    renderForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), { target: { value: 'Is the griddle included?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/messages/thread-1'));
    expect(mocks.sendMessage).toHaveBeenCalledWith('conversation', 'thread-1', 'Is the griddle included?');
  });
  it('keeps the draft and does not navigate when the server rejects it', async () => {
    mocks.user = { id: 'buyer-1' };
    mocks.getOrCreateConversation.mockResolvedValue('thread-1');
    mocks.sendMessage.mockRejectedValue(new Error('Contact information is not allowed.'));
    renderForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), { target: { value: 'Email buyer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(screen.getByRole('textbox', { name: 'Your message' })).toHaveValue('Email buyer@example.com');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
