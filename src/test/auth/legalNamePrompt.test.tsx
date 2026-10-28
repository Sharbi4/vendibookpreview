import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const db = vi.hoisted(() => ({ profile: {} as Record<string, unknown>, updates: [] as Record<string, unknown>[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1', app_metadata: { provider: 'google' } } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async () => ({ data: false, error: null }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.profile, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => { db.updates.push(patch); return { error: null }; } }),
    }),
  },
}));

import LegalNamePrompt from '@/components/auth/LegalNamePrompt';

describe('confirm legal name prompt', () => {
  beforeEach(() => { db.updates = []; db.profile = { full_name: 'Gabriel', first_name: null, last_name: null, name_parts_confirmed: true }; });

  it('keeps Save reachable: it is not a direct child of the dialog content that hides direct-child buttons', async () => {
    render(<LegalNamePrompt><p>page</p></LegalNamePrompt>);
    const save = await screen.findByRole('button', { name: 'Save and continue' });
    const hider = save.closest('[class*="[&>button]:hidden"]');
    expect(hider).not.toBeNull();
    expect(save.parentElement).not.toBe(hider);
  });

  it('starts from the Google first name and saves first and last name', async () => {
    render(<LegalNamePrompt><p>page</p></LegalNamePrompt>);
    const first = await screen.findByLabelText('Legal first name');
    expect((first as HTMLInputElement).value).toBe('Gabriel');
    fireEvent.change(screen.getByLabelText('Legal last name'), { target: { value: 'Gandelman' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(db.updates).toEqual([{ first_name: 'Gabriel', last_name: 'Gandelman', full_name: 'Gabriel Gandelman', legal_first_name: 'Gabriel', legal_last_name: 'Gandelman', name_parts_confirmed: true }]));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save and continue' })).toBeNull());
  });

  it('asks a Google sign-up with a complete-looking name to confirm it once, and lets them change it', async () => {
    db.profile = { full_name: 'Big Mike', first_name: 'Big', last_name: 'Mike', name_parts_confirmed: false };
    render(<LegalNamePrompt><p>page</p></LegalNamePrompt>);
    expect(await screen.findByText('Is this your legal name?')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Legal first name'), { target: { value: 'Michael' } });
    fireEvent.change(screen.getByLabelText('Legal last name'), { target: { value: 'Johnson' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and continue' }));
    await waitFor(() => expect(db.updates[0]).toMatchObject({ first_name: 'Michael', last_name: 'Johnson', legal_last_name: 'Johnson', name_parts_confirmed: true }));
  });

  it('stays closed for a confirmed, complete name', async () => {
    db.profile = { full_name: 'Maria Lopez', first_name: 'Maria', last_name: 'Lopez', name_parts_confirmed: true };
    render(<LegalNamePrompt><p>page</p></LegalNamePrompt>);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
