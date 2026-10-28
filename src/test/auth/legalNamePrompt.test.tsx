import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const db = vi.hoisted(() => ({ profile: { full_name: 'Gabriel', first_name: null, last_name: null } as Record<string, string | null>, updates: [] as Record<string, string>[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async () => ({ data: false, error: null }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.profile, error: null }) }) }),
      update: (patch: Record<string, string>) => ({ eq: async () => { db.updates.push(patch); return { error: null }; } }),
    }),
  },
}));

import LegalNamePrompt from '@/components/auth/LegalNamePrompt';

describe('confirm legal name prompt', () => {
  beforeEach(() => { db.updates = []; });

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
    await waitFor(() => expect(db.updates).toEqual([{ first_name: 'Gabriel', last_name: 'Gandelman', full_name: 'Gabriel Gandelman' }]));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save and continue' })).toBeNull());
  });
});
