import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessageHostForm from '../MessageHostForm';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  insert: vi.fn(),
  invoke: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
  trackHostContacted: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useConversations', () => ({ useConversations: () => ({ getOrCreateConversation: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/analytics', () => ({ trackHostContacted: mocks.trackHostContacted, trackFormSubmit: vi.fn() }));
vi.mock('@/lib/messageSafety', () => ({ sendMarketplaceMessage: vi.fn(), messageSendError: () => 'error' }));
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
  mocks.user = null;
  vi.clearAllMocks();
});

describe('MessageHostForm guest inquiry', () => {
  it('lets a logged-out buyer ask a question without being sent to sign in', async () => {
    mocks.insert.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderForm();

    const ask = screen.getByRole('button', { name: /ask the seller/i });
    expect(ask).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/your email/i), { target: { value: 'buyer@example.org' } });
    fireEvent.change(screen.getByPlaceholderText(/^name$/i), { target: { value: 'Pat Buyer' } });
    fireEvent.click(ask);

    await waitFor(() => expect(screen.getByText(/question sent/i)).toBeInTheDocument());

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const row = mocks.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      listing_id: 'listing-1',
      host_id: 'host-1',
      email: 'buyer@example.org',
      name: 'Pat Buyer',
      phone: null,
      source: 'guest_inquiry',
    });
    expect(row.message).toContain('Coffee Trailer');
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.invoke).toHaveBeenCalledWith('notify-listing-lead', { body: { lead_id: row.id } });
    expect(mocks.trackHostContacted).toHaveBeenCalledWith('listing-1');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('does not save a lead without a valid email', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/your email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /ask the seller/i }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('silently drops submissions that fill the hidden honeypot field', async () => {
    const { container } = renderForm();
    fireEvent.change(screen.getByPlaceholderText(/your email/i), { target: { value: 'bot@example.org' } });
    fireEvent.change(container.querySelector('input[name="website"]') as HTMLInputElement, { target: { value: 'spam.example' } });
    fireEvent.click(screen.getByRole('button', { name: /ask the seller/i }));

    await waitFor(() => expect(screen.getByText(/question sent/i)).toBeInTheDocument());
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('keeps the direct-message flow for signed-in users', () => {
    mocks.user = { id: 'buyer-1' };
    renderForm();
    expect(screen.queryByPlaceholderText(/your email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });
});
